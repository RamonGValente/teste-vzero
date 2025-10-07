// src/hooks/useAIAssistant.ts
import { useState } from 'react';

export const useAIAssistant = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const callOpenAI = async (userMessage: string, conversationHistory: any[]) => {
    setIsProcessing(true);
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "Você é o RoboZ, um assistente virtual amigável e útil que fala português brasileiro. Seja natural, conversacional e prestativo."
            },
            ...conversationHistory,
            { role: "user", content: userMessage }
          ],
          max_tokens: 150,
          temperature: 0.7
        })
      });

      const data = await response.json();
      return data.choices[0].message.content;
      
    } catch (error) {
      console.error('Erro na API OpenAI:', error);
      return "Desculpe, estou com problemas técnicos. Podemos tentar novamente?";
    } finally {
      setIsProcessing(false);
    }
  };

  return { callOpenAI, isProcessing };
};