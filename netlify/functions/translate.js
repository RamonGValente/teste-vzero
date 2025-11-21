// netlify/functions/translate.js
// O `require('node-fetch')` foi REMOVIDO para usar o `fetch` nativo do Node.js, resolvendo o erro 502 (Bad Gateway).

exports.handler = async (event) => {
  // Configuração CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { text, targetLang = 'pt', type = 'translate' } = JSON.parse(event.body);
    
    console.log('Processing translation request:', { 
      type, 
      textLength: text?.length,
      targetLang 
    });

    if (!text || text.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Text is required' })
      };
    }

    // Servidores LibreTranslate prioritários (Lista mantida com 5 opções resilientes)
    const servers = [
      {
        url: 'https://libretranslate.com',
        priority: 1
      },
      {
        url: 'https://translate.argosopentech.com', 
        priority: 2
      },
      {
        url: 'https://libretranslate.de',
        priority: 3
      },
      { 
        url: 'https://t.public.vern.cc', 
        priority: 4
      },
      {
        url: 'https://lt.vern.cc',
        priority: 5
      }
    ];

    // Ordenar por prioridade
    servers.sort((a, b) => a.priority - b.priority);

    let lastError = null;
    const TIMEOUT_MS = 15000; // Tempo limite aumentado para 15 segundos

    for (const server of servers) {
      try {
        console.log(`Trying server: ${server.url}`);
        
        const endpoint = type === 'detect' ? '/detect' : '/translate';
        const url = `${server.url}${endpoint}`;

        const requestBody = type === 'detect' 
          ? { q: text }
          : {
              q: text,
              source: 'auto',
              target: targetLang,
              format: 'text'
            };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          console.log(`Success from ${server.url}`);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              data: data,
              server: server.url
            })
          };
        } else {
          // Tentar ler a resposta de erro do servidor de tradução
          let errorDetails = `Server returned ${response.status}`;
          try {
            const errorJson = await response.json();
            errorDetails += `: ${JSON.stringify(errorJson)}`;
          } catch {
            // Ignorar se a resposta não for JSON
          }
          console.warn(`Server ${server.url} returned ${response.status} - ${errorDetails}`);
          lastError = new Error(`Server returned ${response.status} at ${server.url}`);
        }
      } catch (error) {
        // Capturar erro de conexão ou timeout
        console.warn(`Server ${server.url} failed:`, error.message);
        lastError = error;
        continue;
      }
    }

    // Se chegou aqui, todos os servidores falharam
    throw lastError || new Error('All translation servers failed');

  } catch (error) {
    console.error('Error in translate function:', error);
    
    // Retornar erro específico para o frontend
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        code: 'TRANSLATION_SERVICE_UNAVAILABLE'
      })
    };
  }
};