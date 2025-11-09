import { supabase } from "@/integrations/supabase/client";
export type TranslationResult = { translated: string; source_language: string; target_language: string; };
export async function translateText(text: string, targetLanguage: string): Promise<TranslationResult> {
  const { data, error } = await supabase.functions.invoke("translate", { body: { text, targetLanguage } });
  if (error) throw error;
  return data as TranslationResult;
}