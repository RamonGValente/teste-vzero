// netlify/functions/translate.js
export const handler = async (event) => {
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

    const fetchWithTimeout = async (url, options, timeout = 4000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
      } catch (error) {
        clearTimeout(id);
        throw error;
      }
    };

    // --- ESTRATÉGIA PARA DETECÇÃO (TYPE = DETECT) ---
    if (type === 'detect') {
      const detectServers = [
        'https://translate.argosopentech.com/detect',
        'https://libretranslate.de/detect',
        'https://lt.vern.cc/detect'
      ];

      for (const serverUrl of detectServers) {
        try {
          const response = await fetchWithTimeout(serverUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: text })
          }, 3000); // Timeout rápido para tentar o próximo

          if (response.ok) {
            const data = await response.json();
            // LibreTranslate retorna: [{language: "en", confidence: 98}]
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({ success: true, data: data })
            };
          }
        } catch (e) {
          console.log(`Detect failed on ${serverUrl}, trying next...`);
        }
      }
      
      // Se todos falharem na detecção, retornamos 'unknown' em vez de erro 500
      // Isso permite que o frontend use a verificação local
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: false, data: [{ language: "unknown" }] })
      };
    }

    // --- ESTRATÉGIA PARA TRADUÇÃO (TYPE = TRANSLATE) ---
    // MyMemory é o melhor backup gratuito
    try {
      // Tenta LibreTranslate primeiro
      const response = await fetchWithTimeout('https://translate.argosopentech.com/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source: 'auto', target: targetLang })
      }, 3000);

      if (response.ok) {
        const data = await response.json();
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, data }) };
      }
    } catch (e) {
      console.log('LibreTranslate failed, trying MyMemory...');
    }

    // Fallback para MyMemory
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|${targetLang}`;
      const response = await fetchWithTimeout(url, { method: 'GET' }, 6000);
      
      if (response.ok) {
        const data = await response.json();
        if (data.responseStatus === 200) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true, 
              data: { translatedText: data.responseData.translatedText } 
            })
          };
        }
      }
    } catch (e) {
      console.log('MyMemory translation failed');
    }

    throw new Error('Translation services unavailable');

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};