import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AIRequest {
  action: 'suggest_replies' | 'moderate_content'
  content: string
  context?: string[]
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Invalid user')
    }

    const { action, content, context }: AIRequest = await req.json()
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')

    if (!perplexityApiKey) {
      throw new Error('Perplexity API key not configured')
    }

    let result

    if (action === 'suggest_replies') {
      result = await generateReplySuggestions(content, context || [], perplexityApiKey)
    } else if (action === 'moderate_content') {
      result = await moderateContent(content, perplexityApiKey)
    } else {
      throw new Error('Invalid action')
    }

    console.log(`AI ${action} completed for user ${user.id}`)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('AI Assistant Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

async function generateReplySuggestions(lastMessage: string, context: string[], apiKey: string) {
  const contextString = context.length > 0 ? context.join('\n') : ''
  
  const prompt = `Com base na última mensagem recebida e no contexto da conversa, sugira 3 respostas rápidas em português brasileiro (máximo 20 caracteres cada). Seja casual e amigável.

Contexto da conversa:
${contextString}

Última mensagem recebida: "${lastMessage}"

Responda apenas com as 3 sugestões separadas por |, exemplo: "Entendi!|Legal!|Vamos ver"`

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente que gera sugestões de resposta rápida para conversas de chat. Seja conciso, casual e amigável.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 100,
    }),
  })

  const data = await response.json()
  const suggestions = data.choices[0].message.content.split('|').map((s: string) => s.trim())
  
  return { suggestions: suggestions.slice(0, 3) }
}

async function moderateContent(content: string, apiKey: string) {
  const prompt = `Analise o seguinte texto e determine se contém:
1. Palavras ofensivas, xingamentos ou linguagem tóxica
2. Discurso de ódio, discriminação ou bullying
3. Conteúdo sexual explícito ou inadequado

Texto: "${content}"

Responda apenas com: APROVADO (se estiver OK) ou REJEITADO|motivo (se houver problemas)`

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [
        {
          role: 'system',
          content: 'Você é um moderador de conteúdo que analisa mensagens para detectar linguagem ofensiva, discurso de ódio ou conteúdo inadequado.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 50,
    }),
  })

  const data = await response.json()
  const result = data.choices[0].message.content.trim()
  
  if (result.startsWith('APROVADO')) {
    return { approved: true, reason: null }
  } else if (result.startsWith('REJEITADO')) {
    const reason = result.split('|')[1] || 'Conteúdo inadequado detectado'
    return { approved: false, reason }
  }
  
  return { approved: true, reason: null }
}