// netlify/functions/translate.js
const fetch = require('node-fetch');

exports.handler = async (event) => {
  // Configuração CORS para permitir chamadas do seu frontend
  const headers = {
    'Access-Control-Allow-Origin': '*', // Em produção, substitua '*' pelo seu domínio
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Responder imediatamente a solicitações OPTIONS (Preflight do navegador)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { text, targetLang = 'pt', type = 'translate' } = JSON.parse(event.body);
    
    if (!text || text.trim().length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Text is required' })
      };
    }

    // Lista de instâncias públicas do LibreTranslate.
    // Nota: Instâncias públicas podem sair do ar ou limitar requisições.
    // A ordem define a prioridade de tentativa.
    const servers = [
      { url: 'https://translate.argosopentech.com', priority: 1 }, // Geralmente estável
      { url: 'https://libretranslate.de', priority: 2 },           // Popular, às vezes lento
      { url: 'https://lt.vern.cc', priority: 3 },                  // Alternativa comum
      { url: 'https://translate.terraprint.co', priority: 4 }      // Alternativa
    ];

    let lastError = null;

    // Loop para tentar cada servidor se o anterior falhar
    for (const server of servers) {
      try {
        const endpoint = type === 'detect' ? '/detect' : '/translate';
        const url = `${server.url}${endpoint}`;

        console.log(`Attempting request to: ${url} [Type: ${type}]`);

        // Configuração do corpo da requisição conforme doc do LibreTranslate
        const requestBody = type === 'detect' 
          ? { q: text }
          : {
              q: text,
              source: 'auto', // Deixa a API descobrir o idioma de origem
              target: targetLang,
              format: 'text',
              alternatives: 0
            };

        // Timeout de 6 segundos para não travar se um servidor estiver "pendurado"
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

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
          
          // Padronização da resposta para o frontend
          // Se for detect: a API retorna array [{language: "en", confidence: ...}]
          // Se for translate: a API retorna { translatedText: "..." }
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              data: data,
              serverUsed: server.url
            })
          };
        } else {
          const errorText = await response.text();
          console.warn(`Server ${server.url} error ${response.status}: ${errorText}`);
          lastError = new Error(`Server ${server.url} returned ${response.status}`);
        }
      } catch (error) {
        console.warn(`Server ${server.url} failed connection:`, error.message);
        lastError = error;
        // Continua para o próximo servidor no loop
        continue;
      }
    }

    // Se saiu do loop, todos falharam
    throw lastError || new Error('All translation servers failed');

  } catch (error) {
    console.error('Translation function fatal error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Service temporarily unavailable. Please try again later.',
        details: error.message
      })
    };
  }
};