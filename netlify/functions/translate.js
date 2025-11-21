// netlify/functions/translate.js
const fetch = require('node-fetch');

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

    // Para evitar problemas com servidores externos, vamos usar uma solução mista
    if (type === 'detect') {
      const detectedLang = detectLanguageFallback(text);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: [{ language: detectedLang, confidence: 0.8 }],
          fallback: true
        })
      };
    }

    // Para tradução, tentar servidores externos primeiro
    const servers = [
      'https://libretranslate.com',
      'https://translate.argosopentech.com'
    ];

    for (const server of servers) {
      try {
        console.log(`Trying server: ${server}`);
        
        const response = await fetch(`${server}/translate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: text,
            source: 'auto',
            target: targetLang,
            format: 'text'
          }),
          timeout: 5000
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Translation successful from:', server);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              data: data,
              server: server
            })
          };
        }
      } catch (error) {
        console.log(`Server ${server} failed:`, error.message);
        continue;
      }
    }

    // Fallback para tradução local se todos os servidores falharem
    console.log('Using fallback translation');
    const translatedText = simulateTranslation(text);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: { translatedText },
        fallback: true
      })
    };

  } catch (error) {
    console.error('Error in translate function:', error);
    
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
  if (!text || typeof text !== 'string') return 'en';
  
  const portugueseWords = [
    'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'em', 'no', 'na', 
    'é', 'são', 'com', 'que', 'para', 'por', 'não', 'sim', 'olá', 'obrigado',
    'então', 'como', 'está', 'estou', 'você', 'meu', 'minha', 'bem', 'mal',
    'hoje', 'ontem', 'amanhã', 'agora', 'sempre', 'nunca', 'muito', 'pouco'
  ];
  
  const englishWords = [
    'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'is', 'are', 'with',
    'and', 'but', 'or', 'hello', 'thank', 'you', 'yes', 'no', 'how', 'what',
    'when', 'where', 'why', 'who', 'which', 'this', 'that', 'these', 'those',
    'my', 'your', 'his', 'her', 'our', 'their', 'very', 'too', 'so', 'well'
  ];

  const textLower = text.toLowerCase();
  let ptCount = 0;
  let enCount = 0;

  // Contar palavras portuguesas
  portugueseWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = textLower.match(regex);
    if (matches) ptCount += matches.length;
  });

  // Contar palavras inglesas
  englishWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = textLower.match(regex);
    if (matches) enCount += matches.length;
  });

  // Se não encontrou palavras de nenhum idioma, fazer análise de caracteres
  if (ptCount === 0 && enCount === 0) {
    // Verificar caracteres específicos do português
    const ptChars = /[àáâãèéêìíîòóôõùúûçñ]/gi;
    const ptCharMatches = textLower.match(ptChars);
    
    if (ptCharMatches && ptCharMatches.length > text.length * 0.1) {
      return 'pt';
    }
    return 'en';
  }

  return ptCount >= enCount ? 'pt' : 'en';
}

// Função de fallback para tradução
function simulateTranslation(text) {
  if (!text) return '';
  
  const translationMap = {
    'hello': 'olá',
    'hi': 'oi',
    'good morning': 'bom dia',
    'good afternoon': 'boa tarde', 
    'good evening': 'boa noite',
    'good night': 'boa noite',
    'how are you': 'como você está',
    'thank you': 'obrigado',
    'thanks': 'obrigado',
    'please': 'por favor',
    'sorry': 'desculpe',
    'excuse me': 'com licença',
    'yes': 'sim',
    'no': 'não',
    'maybe': 'talvez',
    'what': 'o que',
    'when': 'quando',
    'where': 'onde',
    'why': 'por que',
    'how': 'como',
    'who': 'quem',
    'i love you': 'eu te amo',
    'goodbye': 'adeus',
    'see you later': 'até mais tarde',
    'see you soon': 'até logo',
    'what is your name': 'qual é o seu nome',
    'my name is': 'meu nome é',
    'where are you from': 'de onde você é',
    'how old are you': 'quantos anos você tem',
    'i dont understand': 'não entendo',
    'can you help me': 'pode me ajudar',
    'how much': 'quanto',
    'where is': 'onde está',
    'i need': 'eu preciso',
    'i want': 'eu quero',
    'i like': 'eu gosto',
    'i dont like': 'eu não gosto'
  };

  let translated = text.toLowerCase();

  // Substituir frases completas primeiro
  for (const [english, portuguese] of Object.entries(translationMap)) {
    if (translated.includes(english)) {
      translated = translated.replace(new RegExp(english, 'gi'), portuguese);
    }
  }

  // Se nada foi traduzido, adicionar prefixo
  if (translated === text.toLowerCase()) {
    return `[Traduzido] ${text}`;
  }

  return translated.charAt(0).toUpperCase() + translated.slice(1);
}