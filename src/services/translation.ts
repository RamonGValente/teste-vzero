// src/services/translation.ts
import { supabase } from "@/integrations/supabase/client";

export async function translateText(text: string, target: string) {
  const { data, error } = await supabase.functions.invoke("detect-translate", {
    body: { text, targetLanguage: target },
    headers: { "Content-Type": "application/json" },
  });
  if (error) throw error;
  return data as { translated: string; source_language: string | null };
}
