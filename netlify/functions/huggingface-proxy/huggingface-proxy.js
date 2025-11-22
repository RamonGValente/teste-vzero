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

    // CORREÇÃO: Verificar se o token está configurado corretamente
    const hfToken = process.env.HUGGINGFACE_TOKEN;
    
    if (!hfToken || hfToken === 'hf_your_token_here') {
      console.log('❌ Token do Hugging Face não configurado ou inválido');
      const simulatedImage = await generateSimulatedImage(prompt);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          image: simulatedImage,
          message: "Token HUGGINGFACE_TOKEN não configurado corretamente no Netlify"
        })
      };
    }

    console.log('✅ Token do Hugging Face encontrado');

    // Tentar Hugging Face primeiro
    console.log('🔄 Tentando Hugging Face API...');
    const response = await fetch(
      "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            num_inference_steps: 20,
            guidance_scale: 7.5,
            width: 512,
            height: 512
          },
          options: {
            wait_for_model: true,
            use_cache: true
          }
        })
      }
    );

    console.log('📊 Status da resposta Hugging Face:', response.status);

    // CORREÇÃO: Tratamento melhorado da resposta
    if (response.ok) {
      console.log('✅ Hugging Face respondeu com sucesso');
      const imageBuffer = await response.buffer();
      
      // Verificar se a resposta é uma imagem válida (tamanho mínimo)
      if (imageBuffer.length < 100) {
        const responseText = imageBuffer.toString();
        console.log('❌ Resposta não é imagem válida:', responseText.substring(0, 200));
        throw new Error('API retornou dados inválidos em vez de imagem');
      }
      
      const base64Image = imageBuffer.toString('base64');
      console.log('✅ Imagem gerada com sucesso, tamanho:', imageBuffer.length, 'bytes');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          image: `data:image/jpeg;base64,${base64Image}`,
          message: `Imagem gerada com sucesso: "${prompt}"`
        })
      };
    } else {
      // Tentar parse do erro
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorText = await response.text();
        console.log('❌ Erro detalhado Hugging Face:', errorText);
        errorMessage = errorText;
      } catch (e) {
        console.log('❌ Erro Hugging Face (sem corpo):', response.status);
      }
      throw new Error(`Hugging Face API error: ${errorMessage}`);
    }

  } catch (error) {
    console.error('❌ Erro na function:', error);
    
    // Tentar fallback para APIs alternativas
    try {
      console.log('🔄 Tentando fallback para Lexica.art...');
      const { prompt } = JSON.parse(event.body);
      
      // Lexica.art API para buscar imagens relacionadas
      const lexicaResponse = await fetch(`https://lexica.art/api/v1/search?q=${encodeURIComponent(prompt)}`);
      
      if (lexicaResponse.ok) {
        const lexicaData = await lexicaResponse.json();
        if (lexicaData.images && lexicaData.images.length > 0) {
          // Pegar a primeira imagem de melhor qualidade
          const bestImage = lexicaData.images[0];
          const imageUrl = bestImage.src;
          
          console.log('✅ Encontrada imagem no Lexica.art:', imageUrl);
          const imageResponse = await fetch(imageUrl);
          const imageBuffer = await imageResponse.buffer();
          const base64Image = imageBuffer.toString('base64');
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              image: `data:image/jpeg;base64,${base64Image}`,
              message: `Imagem encontrada: "${prompt}" (via Lexica.art)`
            })
          };
        }
      }
    } catch (fallbackError) {
      console.error('❌ Fallback Lexica.art falhou:', fallbackError);
    }

    // Último fallback: imagem simulada
    console.log('🎭 Usando modo simulação como último recurso');
    const { prompt } = JSON.parse(event.body);
    const simulatedImage = await generateSimulatedImage(prompt || 'desconhecido');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        image: simulatedImage,
        message: "Modo simulação - Verifique o token HUGGINGFACE_TOKEN e logs"
      })
    };
  }
};

// Função para gerar imagem simulada (apenas como fallback)
async function generateSimulatedImage(prompt) {
  const styles = {
    'anime': { bg: '#FF6B6B', text: '#FFF', accent: '#4ECDC4' },
    'pintura': { bg: '#8B4513', text: '#FFF', accent: '#DAA520' },
    'vintage': { bg: '#2F4F4F', text: '#FFF', accent: '#DEB887' },
    'digital': { bg: '#4A154B', text: '#FFF', accent: '#FF6B6B' },
    'cartoon': { bg: '#FFD700', text: '#000', accent: '#FF69B4' },
    'neon': { bg: '#0A0A0A', text: '#00FFFF', accent: '#FF00FF' },
    'default': { bg: '#6366F1', text: '#FFF', accent: '#8B5CF6' }
  };

  const promptLower = prompt.toLowerCase();
  let style = styles.default;
  
  if (promptLower.includes('anime')) style = styles.anime;
  else if (promptLower.includes('pintura')) style = styles.pintura;
  else if (promptLower.includes('vintage')) style = styles.vintage;
  else if (promptLower.includes('digital')) style = styles.digital;
  else if (promptLower.includes('cartoon')) style = styles.cartoon;
  else if (promptLower.includes('neon')) style = styles.neon;

  const svgContent = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${style.bg};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${style.accent};stop-opacity:1" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="4" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.6"/>
        </filter>
        <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="${style.text}" stroke-width="1" opacity="0.1"/>
        </pattern>
      </defs>
      
      <!-- Background -->
      <rect width="100%" height="100%" fill="url(#grad1)"/>
      <rect width="100%" height="100%" fill="url(#grid)"/>
      
      <!-- Decorative elements -->
      <circle cx="100" cy="100" r="60" fill="${style.text}" opacity="0.1"/>
      <circle cx="400" cy="400" r="80" fill="${style.text}" opacity="0.1"/>
      <circle cx="300" cy="150" r="40" fill="${style.accent}" opacity="0.2"/>
      
      <!-- Main content -->
      <g filter="url(#shadow)" transform="translate(256, 256)">
        <rect x="-200" y="-80" width="400" height="160" rx="20" fill="${style.text}" opacity="0.9"/>
        
        <!-- Title -->
        <text x="0" y="-40" text-anchor="middle" fill="${style.bg}" font-family="Arial, sans-serif" font-size="24" font-weight="bold">
          🎨 IA Generativa
        </text>
        
        <!-- Prompt -->
        <text x="0" y="-10" text-anchor="middle" fill="${style.bg}" font-family="Arial, sans-serif" font-size="16" font-weight="bold">
          "${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}"
        </text>
        
        <!-- Status -->
        <text x="0" y="20" text-anchor="middle" fill="${style.accent}" font-family="Arial, sans-serif" font-size="14" font-weight="bold">
          ⚡ Modo Simulação
        </text>
        
        <!-- Instructions -->
        <text x="0" y="45" text-anchor="middle" fill="#6B7280" font-family="Arial, sans-serif" font-size="12">
          Configure uma API real para imagens verdadeiras
        </text>
      </g>
      
      <!-- Footer -->
      <text x="256" y="490" text-anchor="middle" fill="${style.text}" font-family="Arial, sans-serif" font-size="10" opacity="0.8">
        Sistema de IA - Fluxo funcionando perfeitamente
      </text>
      
      <!-- Animated sparkles -->
      <g opacity="0.6">
        <circle cx="80" cy="400" r="3" fill="${style.accent}">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="450" cy="80" r="2" fill="${style.text}">
          <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/>
        </circle>
        <circle cx="400" cy="200" r="4" fill="${style.accent}">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2.5s" repeatCount="indefinite"/>
        </circle>
      </g>
    </svg>
  `;

  return `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
}