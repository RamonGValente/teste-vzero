exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { text, targetLang = 'pt', type = 'translate' } = JSON.parse(event.body);

    if (!text || !text.trim()) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Text required' }) };
    }

    // ============================================================
    // ESTRATÉGIA 1: LIBRETRANSLATE (Vários Servidores)
    // ============================================================
    const libreServers = [
      'https://translate.argosopentech.com',
      'https://libretranslate.de',
      'https://lt.vern.cc'
    ];

    // Função auxiliar de fetch com timeout
    const fetchWithTimeout = async (url, options, timeout = 4000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    };

    // Tentar LibreTranslate primeiro (Detecção ou Tradução)
    for (const server of libreServers) {
      try {
        const endpoint = type === 'detect' ? '/detect' : '/translate';
        const body = type === 'detect' 
          ? { q: text } 
          : { q: text, source: 'auto', target: targetLang, format: 'text' };

        const response = await fetchWithTimeout(`${server}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (response.ok) {
          const data = await response.json();
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, data: data, source: 'LibreTranslate' })
          };
        }
      } catch (e) {
        console.log(`LibreTranslate server ${server} failed, trying next...`);
      }
    }

    // ============================================================
    // ESTRATÉGIA 2: MYMEMORY API (Backup Robusto)
    // MyMemory é excelente, mas não tem endpoint de "detect". 
    // Usaremos apenas para tradução.
    // ============================================================
    
    if (type === 'translate') {
      try {
        console.log('Falling back to MyMemory API...');
        // MyMemory usa GET. Ex: en|pt (inglês para portugues). 
        // Como não sabemos a origem, usamos 'Autodetect' implícito tentando adivinhar ou fixo.
        // Para garantir, tentamos 'en|pt' se falhar o auto.
        
        // Nota: MyMemory requer par de idiomas. O padrão "auto" deles funciona omitindo a origem.
        const email = ""; // Se tiver email, aumenta o limite, mas funciona sem.
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|${targetLang}${email ? `&de=${email}` : ''}`;

        const response = await fetchWithTimeout(url, { method: 'GET' }, 6000);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.responseStatus === 200) {
             return {
              statusCode: 200,
              headers,
              body: JSON.stringify({ 
                success: true, 
                data: { translatedText: data.responseData.translatedText },
                source: 'MyMemory'
              })
            };
          }
        }
      } catch (e) {
        console.log('MyMemory failed:', e);
      }
    }

    // ============================================================
    // FALLBACK FINAL: Simulação de Detecção (se tudo falhar)
    // ============================================================
    if (type === 'detect') {
        // Se as APIs falharam, não bloqueamos o fluxo. Retornamos unknown.
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, data: [{ language: "unknown" }] })
        };
    }

    throw new Error('All translation services unavailable');

  } catch (error) {
    console.error('Fatal error:', error);
    return {
      statusCode: 500, // Retornamos 500 para o frontend saber que deu erro
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};