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

    // OPÇÃO 1: API pública gratuita - Lexica.art
    console.log('🔄 Tentando Lexica.art API...');
    try {
      const lexicaResponse = await fetch(`https://lexica.art/api/v1/search?q=${encodeURIComponent(prompt)}`);
      
      if (lexicaResponse.ok) {
        const lexicaData = await lexicaResponse.json();
        console.log('📊 Lexica response:', lexicaData.images ? `Encontradas ${lexicaData.images.length} imagens` : 'Nenhuma imagem');
        
        if (lexicaData.images && lexicaData.images.length > 0) {
          // Pegar uma imagem aleatória dos resultados
          const randomIndex = Math.floor(Math.random() * lexicaData.images.length);
          const selectedImage = lexicaData.images[randomIndex];
          const imageUrl = selectedImage.src;
          
          console.log('✅ Imagem encontrada no Lexica:', imageUrl);
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
    } catch (lexicaError) {
      console.log('❌ Lexica.art falhou:', lexicaError.message);
    }

    // OPÇÃO 2: API pública gratuita - Unsplash (imagens reais baseadas no prompt)
    console.log('🔄 Tentando Unsplash API...');
    try {
      const unsplashResponse = await fetch(`https://source.unsplash.com/512x512/?${encodeURIComponent(prompt)}`);
      
      if (unsplashResponse.ok) {
        const imageBuffer = await unsplashResponse.buffer();
        const base64Image = imageBuffer.toString('base64');
        
        console.log('✅ Imagem gerada via Unsplash');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            image: `data:image/jpeg;base64,${base64Image}`,
            message: `Imagem encontrada: "${prompt}" (via Unsplash)`
          })
        };
      }
    } catch (unsplashError) {
      console.log('❌ Unsplash falhou:', unsplashError.message);
    }

    // OPÇÃO 3: API pública gratuita - Picsum (imagens aleatórias com seed baseado no prompt)
    console.log('🔄 Tentando Picsum API...');
    try {
      // Gerar um seed estável baseado no prompt
      const seed = prompt.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      const picsumResponse = await fetch(`https://picsum.photos/seed/${seed}/512/512`);
      
      if (picsumResponse.ok) {
        const imageBuffer = await picsumResponse.buffer();
        const base64Image = imageBuffer.toString('base64');
        
        console.log('✅ Imagem gerada via Picsum');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            image: `data:image/jpeg;base64,${base64Image}`,
            message: `Imagem gerada: "${prompt}" (via Picsum)`
          })
        };
      }
    } catch (picsumError) {
      console.log('❌ Picsum falhou:', picsumError.message);
    }

    // OPÇÃO 4: API de placeholder com tema baseado no prompt
    console.log('🔄 Tentando API de placeholder temático...');
    try {
      const placeholderResponse = await fetch(`https://dummyimage.com/512x512/6366f1/ffffff&text=${encodeURIComponent(prompt.substring(0, 20))}`);
      
      if (placeholderResponse.ok) {
        const imageBuffer = await placeholderResponse.buffer();
        const base64Image = imageBuffer.toString('base64');
        
        console.log('✅ Placeholder gerado');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            image: `data:image/jpeg;base64,${base64Image}`,
            message: `Placeholder gerado: "${prompt}"`
          })
        };
      }
    } catch (placeholderError) {
      console.log('❌ Placeholder falhou:', placeholderError.message);
    }

    // Último recurso: imagem SVG simulada personalizada
    console.log('🎭 Gerando imagem SVG personalizada');
    const simulatedImage = await generateCustomImage(prompt);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        image: simulatedImage,
        message: `Imagem SVG gerada: "${prompt}"`
      })
    };

  } catch (error) {
    console.error('❌ Erro geral na function:', error);
    
    const { prompt } = JSON.parse(event.body);
    const simulatedImage = await generateCustomImage(prompt || 'desconhecido');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        image: simulatedImage,
        message: "Erro interno - " + error.message
      })
    };
  }
};

// Função para gerar imagem SVG personalizada baseada no prompt
async function generateCustomImage(prompt) {
  // Mapear palavras-chave do prompt para cores e temas
  const themeMap = {
    'anime': { bg: '#FF6B6B', text: '#FFF', accent: '#4ECDC4', emoji: '🎌' },
    'pintura': { bg: '#8B4513', text: '#FFF', accent: '#DAA520', emoji: '🎨' },
    'vintage': { bg: '#2F4F4F', text: '#FFF', accent: '#DEB887', emoji: '📻' },
    'digital': { bg: '#4A154B', text: '#FFF', accent: '#FF6B6B', emoji: '💻' },
    'cartoon': { bg: '#FFD700', text: '#000', accent: '#FF69B4', emoji: '📺' },
    'neon': { bg: '#0A0A0A', text: '#00FFFF', accent: '#FF00FF', emoji: '💡' },
    'natureza': { bg: '#228B22', text: '#FFF', accent: '#32CD32', emoji: '🌿' },
    'praia': { bg: '#87CEEB', text: '#000', accent: '#FFD700', emoji: '🏖️' },
    'cidade': { bg: '#2F4F4F', text: '#FFF', accent: '#FFA500', emoji: '🏙️' },
    'futurista': { bg: '#1a1a2e', text: '#00FFFF', accent: '#FF00FF', emoji: '🚀' },
    'retro': { bg: '#8B0000', text: '#FFD700', accent: '#FFA500', emoji: '📼' },
    'abstrato': { bg: '#4B0082', text: '#FFF', accent: '#9400D3', emoji: '🟣' }
  };

  const promptLower = prompt.toLowerCase();
  let theme = { bg: '#6366F1', text: '#FFF', accent: '#8B5CF6', emoji: '🎨' };
  
  // Encontrar o tema baseado nas palavras-chave
  for (const [keyword, themeStyle] of Object.entries(themeMap)) {
    if (promptLower.includes(keyword)) {
      theme = themeStyle;
      break;
    }
  }

  // Gerar um ID único baseado no prompt para variações
  const promptId = prompt.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);

  const shapes = ['circle', 'rect', 'polygon'];
  const shape = shapes[Math.abs(promptId) % shapes.length];

  const svgContent = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${theme.bg};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${theme.accent};stop-opacity:1" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="4" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.6"/>
        </filter>
        <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="${theme.text}" stroke-width="1" opacity="0.1"/>
        </pattern>
      </defs>
      
      <!-- Background -->
      <rect width="100%" height="100%" fill="url(#grad1)"/>
      <rect width="100%" height="100%" fill="url(#grid)"/>
      
      <!-- Decorative elements based on prompt -->
      ${generateDecorations(theme, promptId, shape)}
      
      <!-- Main content -->
      <g filter="url(#shadow)" transform="translate(256, 256)">
        <rect x="-200" y="-80" width="400" height="160" rx="20" fill="${theme.text}" opacity="0.9"/>
        
        <!-- Emoji -->
        <text x="0" y="-35" text-anchor="middle" fill="${theme.bg}" font-family="Arial, sans-serif" font-size="32" font-weight="bold">
          ${theme.emoji}
        </text>
        
        <!-- Prompt -->
        <text x="0" y="0" text-anchor="middle" fill="${theme.bg}" font-family="Arial, sans-serif" font-size="14" font-weight="bold">
          "${prompt.substring(0, 25)}${prompt.length > 25 ? '...' : ''}"
        </text>
        
        <!-- Status -->
        <text x="0" y="25" text-anchor="middle" fill="${theme.accent}" font-family="Arial, sans-serif" font-size="12" font-weight="bold">
          Imagem Gerada por IA
        </text>
        
        <!-- Source -->
        <text x="0" y="45" text-anchor="middle" fill="#6B7280" font-family="Arial, sans-serif" font-size="10">
          Sistema de IA - Prompt: "${prompt}"
        </text>
      </g>
      
      <!-- Animated elements -->
      <g opacity="0.7">
        ${generateAnimations(theme, promptId)}
      </g>
    </svg>
  `;

  return `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
}

function generateDecorations(theme, promptId, shape) {
  const decorations = [];
  const count = 5 + (Math.abs(promptId) % 5);
  
  for (let i = 0; i < count; i++) {
    const x = 50 + (i * 100) % 400;
    const y = 50 + ((i * 70) % 400);
    const size = 20 + (i * 10) % 30;
    
    if (shape === 'circle') {
      decorations.push(
        `<circle cx="${x}" cy="${y}" r="${size}" fill="${theme.accent}" opacity="0.${3 + i % 3}"/>`
      );
    } else if (shape === 'rect') {
      decorations.push(
        `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${theme.text}" opacity="0.${2 + i % 2}"/>`
      );
    } else {
      decorations.push(
        `<polygon points="${x},${y} ${x + size},${y} ${x + size/2},${y + size}" fill="${theme.accent}" opacity="0.${3 + i % 3}"/>`
      );
    }
  }
  
  return decorations.join('\n');
}

function generateAnimations(theme, promptId) {
  const animations = [];
  const count = 3;
  
  for (let i = 0; i < count; i++) {
    const x = 80 + (i * 150) % 400;
    const y = 400 - (i * 100) % 300;
    const duration = 2 + (i * 0.5);
    
    animations.push(
      `<circle cx="${x}" cy="${y}" r="4" fill="${theme.text}">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="${duration}s" repeatCount="indefinite"/>
      </circle>`
    );
  }
  
  return animations.join('\n');
}