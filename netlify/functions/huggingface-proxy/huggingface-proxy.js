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

    if (!prompt || !image) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prompt e Imagem são obrigatórios para edição.' })
      };
    }

    console.log('🔮 Processando Edição IA - Prompt:', prompt);

    // Verificar se existe chave de API configurada
    const hfToken = process.env.HF_API_TOKEN;

    if (!hfToken) {
      throw new Error("HF_API_TOKEN não configurado. Usando processamento local.");
    }

    // MODELO: Instruct Pix2Pix (Especialista em seguir instruções de edição)
    // Ex: "make it look like a painting", "add fireworks", "turn day into night"
    const MODEL_ID = "timbrooks/instruct-pix2pix";
    const API_URL = `https://api-inference.huggingface.co/models/${MODEL_ID}`;

    // Preparar a imagem (remover prefixo data:image/...)
    const base64Image = image.replace(/^data:image\/\w+;base64,/, "");

    console.log('🚀 Enviando para Hugging Face Inference API...');

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      // Instruct Pix2Pix espera inputs (instrução) e image (base64 ou url)
      // A estrutura pode variar levemente dependendo da versão da API, 
      // esta é a padrão para inputs compostos
      body: JSON.stringify({
        inputs: {
          image: base64Image,
          prompt: prompt
        },
        parameters: {
          num_inference_steps: 20,
          image_guidance_scale: 1.5,
          guidance_scale: 7.5
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('⚠️ API HF respondeu com erro:', response.status, errorText);
      // Lança erro para cair no catch e ativar o fallback local
      throw new Error(`Falha na API externa: ${response.status}`);
    }

    // A API retorna o blob da imagem gerada
    const imageBuffer = await response.buffer();
    const resultBase64 = imageBuffer.toString('base64');

    console.log('✅ Imagem editada com sucesso pela nuvem!');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        image: `data:image/jpeg;base64,${resultBase64}`,
        message: `Edição realizada via IA Nuvem: "${prompt}"`
      })
    };

  } catch (error) {
    console.error('❌ Falha no Proxy (ativando fallback local):', error.message);
    
    // Retornamos success: false para o frontend saber que deve usar o processamento local
    // Isso é crucial: não geramos imagem falsa aqui, deixamos o Canvas do cliente fazer isso
    return {
      statusCode: 200, // Retorna 200 mas com success false para tratar no cliente
      headers,
      body: JSON.stringify({
        success: false,
        message: "API Indisponível, usando processamento neural local.",
        error: error.message
      })
    };
  }
};