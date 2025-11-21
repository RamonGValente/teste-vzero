// netlify/functions/translate.js
import fetch from 'node-fetch';

export const handler = async (event, context) => {
  // Habilitar CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
  };

  // Responder a requisições OPTIONS para CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { text, targetLang = 'pt', type = 'translate' } = JSON.parse(event.body);

    console.log('Translation request:', { type, text: text?.substring(0, 50), targetLang });

    // Servidores LibreTranslate alternativos
    const servers = [
      'https://libretranslate.com',
      'https://translate.argosopentech.com',
      'https://libretranslate.de'
    ];

    let lastError = null;

    for (const server of servers) {
      try {
        console.log(`Trying server: ${server}`);
        
        const url = type === 'detect' 
          ? `${server}/detect`
          : `${server}/translate`;

        const bodyData = type === 'detect'
          ? { q: text }
          : {
              q: text,
              source: 'auto',
              target: targetLang,
              format: 'text'
            };

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(bodyData),
          timeout: 10000 // 10 segundos timeout
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`Success from ${server}`, type === 'detect' ? data : { translated: data.translatedText?.substring(0, 50) });
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true, 
              data,
              server: server
            })
          };
        } else {
          console.warn(`Server ${server} returned ${response.status}`);
          lastError = new Error(`Server ${server} returned ${response.status}`);
        }
      } catch (error) {
        console.warn(`Server ${server} failed:`, error.message);
        lastError = error;
        continue;
      }
    }

    // Se todos os servidores falharem, usar detecção básica
    if (type === 'detect') {
      console.log('Using fallback language detection');
      const detectedLang = detectLanguageFallback(text);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          data: [{ language: detectedLang, confidence: 0.5 }],
          fallback: true
        })
      };
    }

    throw lastError || new Error('Todos os servidores de tradução falharam');

  } catch (error) {
    console.error('Erro na função de tradução:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message,
        fallback: true
      })
    };
  }
};

// Função de fallback para detecção de idioma
function detectLanguageFallback(text) {
  const portugueseWords = ['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'em', 'no', 'na', 'é', 'são', 'com', 'que', 'para', 'por', 'com', 'não', 'sim', 'olá', 'obrigado'];
  const englishWords = ['the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'is', 'are', 'with', 'and', 'but', 'or', 'hello', 'thank', 'you', 'yes', 'no'];
  
  const textLower = text.toLowerCase();
  let ptCount = 0;
  let enCount = 0;

  portugueseWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = textLower.match(regex);
    if (matches) ptCount += matches.length;
  });

  englishWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = textLower.match(regex);
    if (matches) enCount += matches.length;
  });

  return ptCount >= enCount ? 'pt' : 'en';
}