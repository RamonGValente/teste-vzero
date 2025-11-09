// supabase/functions/translate/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type Payload = { text: string; targetLanguage?: string };

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

serve(async (req) => {
  try {
    const { text, targetLanguage = "pt" } = await req.json() as Payload;
    if (!text) return new Response(JSON.stringify({ error: "Missing text" }), { status: 400 });

    // Simple translate prompt using OpenAI
    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type":"application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Você é um tradutor. Detecte o idioma de origem e traduza preservando significado. Responda em JSON: {\"translated\": string, \"source_language\": string, \"target_language\": string }" },
          { role: "user", content: `Traduza o texto para ${targetLanguage}: ${text}` }
        ],
        temperature: 0.2
      })
    });
    const data = await completion.json();
    const content = data?.choices?.[0]?.message?.content || "";
    // try parse JSON, or fallback
    let result;
    try { result = JSON.parse(content); } catch {
      result = { translated: content, source_language: "auto", target_language: targetLanguage };
    }
    return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});