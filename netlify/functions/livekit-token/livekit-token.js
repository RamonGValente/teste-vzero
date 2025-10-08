const { AccessToken } = require('livekit-server-sdk');

exports.handler = async (event) => {
  console.log('LiveKit Token Function: Received request', {
    method: event.httpMethod,
    body: event.body
  });

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { roomId, userId } = body;

    console.log('Generating token for:', { roomId, userId });

    // Validate required fields
    if (!roomId || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: roomId and userId are required' 
        })
      };
    }

    // Get LiveKit credentials from environment variables
    const apiKey = process.env.VITE_LIVEKIT_API_KEY;
    const apiSecret = process.env.VITE_LIVEKIT_API_SECRET;

    console.log('LiveKit credentials check:', {
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret
    });

    if (!apiKey || !apiSecret) {
      console.error('LiveKit credentials not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'LiveKit credentials not configured on server' 
        })
      };
    }

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: userId, // You can customize this
      ttl: 2 * 60 * 60, // 2 hours
    });

    // Add grants
    at.addGrant({
      roomJoin: true,
      room: roomId,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canPublishSources: ['camera', 'microphone'],
      hidden: false,
      recorder: false,
    });

    // Generate token
    const token = await at.toJwt();

    console.log('Token generated successfully for user:', userId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        token,
        roomId,
        identity: userId
      })
    };

  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate token: ' + error.message 
      })
    };
  }
};