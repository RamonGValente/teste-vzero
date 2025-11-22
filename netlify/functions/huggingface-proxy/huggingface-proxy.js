const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { prompt, image } = JSON.parse(event.body);
    
    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prompt é obrigatório' })
      };
    }

    console.log('🔮 Processando IA - Prompt:', prompt);

    const DEEPAI_API_KEY = process.env.DEEPAI_API_KEY;

    if (!DEEPAI_API_KEY) {
      throw new Error('DEEPAI_API_KEY não configurada no Netlify');
    }

    console.log('🔑 Usando API do DeepAI');

    // Usar DeepAI API - Text to Image
    const response = await fetch('https://api.deepai.org/api/text2img', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Api-Key': DEEPAI_API_KEY
      },
      body: `text=${encodeURIComponent(prompt)}`
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro DeepAI:', response.status, errorText);
      throw new Error(`DeepAI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('📨 Resposta DeepAI:', result);
    
    if (!result.output_url) {
      throw new Error('Nenhuma URL de imagem retornada da DeepAI');
    }

    // Baixar a imagem gerada
    console.log('📥 Baixando imagem gerada...');
    const imageResponse = await fetch(result.output_url);
    
    if (!imageResponse.ok) {
      throw new Error(`Falha ao baixar imagem: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.buffer();
    const base64Image = imageBuffer.toString('base64');

    console.log('✅ Imagem processada com sucesso!');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        image: `data:image/jpeg;base64,${base64Image}`,
        message: `Imagem gerada com sucesso: "${prompt}"`
      })
    };

  } catch (error) {
    console.error('❌ Erro na function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        debug: "Verifique se a DEEPAI_API_KEY está configurada corretamente no Netlify"
      })
    };
  }
};