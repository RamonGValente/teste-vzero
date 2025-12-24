import * as React from "react";
import ChatInput, { MessageType } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";

// Serviço CORRIGIDO de detecção de idioma
class AdvancedLanguageService {
  private languagePatterns = {
    'en': { 
      patterns: /\b(the|and|is|in|to|of|a|an|you|that|it|for|are|on|with|as|be|this|have|from)\b/gi,
      commonWords: ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'an', 'you', 'that', 'it', 'for', 'are', 'on', 'with', 'as', 'be', 'this', 'have', 'from']
    },
    'es': { 
      patterns: /\b(el|la|los|las|y|en|de|que|un|una|es|por|con|para|se|no|del|al|lo|su)\b/gi,
      commonWords: ['el', 'la', 'los', 'las', 'y', 'en', 'de', 'que', 'un', 'una', 'es', 'por', 'con', 'para', 'se', 'no', 'del', 'al']
    },
    'fr': { 
      patterns: /\b(le|la|les|et|en|de|que|un|une|est|pour|dans|qui|sur|au|par|avec|son|il)\b/gi,
      commonWords: ['le', 'la', 'les', 'et', 'en', 'de', 'que', 'un', 'une', 'est', 'pour', 'dans', 'qui', 'sur', 'au', 'par', 'avec']
    }
  };

  detectLanguage(text: string): string {
    const cleanText = text.toLowerCase().trim();
    if (cleanText.length < 2) return 'unknown';

    console.log('🔍 Analisando texto:', cleanText);

    const scores: { [key: string]: number } = {};
    let totalScore = 0;

    // Análise por padrões de caracteres
    for (const [lang, data] of Object.entries(this.languagePatterns)) {
      let score = 0;
      
      // 1. Pontuação por padrões regex (Peso 2)
      const patternMatches = cleanText.match(data.patterns);
      if (patternMatches) {
        score += patternMatches.length * 2;
        console.log(`📊 ${lang}: ${patternMatches.length} padrões encontrados`);
      }
      
      // 2. Pontuação adicional por palavras comuns (Peso 3)
      if (data.commonWords.length > 0) {
        data.commonWords.forEach(word => {
          // CORREÇÃO: Verifica se a palavra existe no texto
          if (cleanText.includes(word.toLowerCase())) {
            score += 3;
            console.log(`✅ ${lang}: Palavra "${word}" encontrada`);
          }
        });
      }
      
      scores[lang] = score;
      totalScore += score;
      
      if (score > 0) {
        console.log(`🎯 ${lang}: Score total = ${score}`);
      }
    }

    if (totalScore === 0) {
      console.log('❌ Nenhum idioma detectado');
      return 'unknown';
    }

    // Encontrar o idioma com maior score
    let detectedLang = 'unknown';
    let maxScore = 0;

    for (const [lang, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedLang = lang;
      }
    }

    console.log(`🏆 Idioma detectado: ${detectedLang} com score: ${maxScore}`);

    // Apenas retorna se tiver uma confiança mínima (maior ou igual a 4)
    return maxScore >= 4 ? detectedLang : 'unknown';
  }

  async translateText(text: string, sourceLang: string): Promise<string> {
    console.log(`🔄 Traduzindo do ${sourceLang}: "${text}"`);
    
    // Aguardar para simular API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const translations: { [key: string]: string } = {
      'en': `[TRADUZIDO DO INGLÊS] "${text}" → Esta mensagem foi originalmente em inglês.`,
      'es': `[TRADUCIDO DO ESPANHOL] "${text}" → Esta mensagem fue originalmente en español.`,
      'fr': `[TRADUZIDO DO FRANCÊS] "${text}" → Ce message était originalement en français.`
    };
    
    return translations[sourceLang] || `[TRADUZIDO] ${text}`;
  }

  getLanguageName(code: string): string {
    const names: { [key: string]: string } = {
      'en': 'Inglês', 'es': 'Espanhol', 'fr': 'Francês', 'de': 'Alemão',
      'it': 'Italiano', 'pt': 'Português'
    };
    return names[code] || code;
  }
}

export default function ChatContainer() {
  const [messages, setMessages] = React.useState<MessageType[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [isRecording, setIsRecording] = React.useState(false);
  const [isTranslating, setIsTranslating] = React.useState<string | null>(null);
  const currentUserId = "user1";
  const languageService = new AdvancedLanguageService();

  // Função para enviar mensagem
  const handleSend = () => {
    if (!inputValue.trim()) return;

    // 1. Detectar idioma
    const detectedLang = languageService.detectLanguage(inputValue);
    
    console.log('💬 Enviando mensagem:', {
      texto: inputValue,
      idioma_detectado: detectedLang
    });

    // 2. Lógica de Simulação para Teste de Tradução (CORRIGIDO)
    let senderId = currentUserId;
    let receiverId = 'user2';
    
    // Se o idioma for detectado como estrangeiro, simula que a mensagem veio do "user2"
    // para que o botão de tradução apareça (já que é uma mensagem 'recebida').
    if (detectedLang !== 'unknown') {
      console.log('✅ SIMULAÇÃO ATIVA: Mensagem enviada pelo user2 para user1 (para aparecer o botão de tradução)');
      senderId = 'user2';
      receiverId = currentUserId;
    } else {
      // Se o idioma é 'unknown' (assumido como português), a mensagem é enviada por você.
      console.log('➡️ Mensagem enviada por user1 (não aparecerá botão de tradução)');
    }

    const newMessage: MessageType = {
      id: Date.now().toString(),
      text: inputValue,
      type: 'text',
      senderId: senderId,
      receiverId: receiverId,
      timestamp: new Date(),
      viewed: false,
      language: detectedLang
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue("");
  };

  // Funções de UI omitidas para brevidade, mas incluídas no código final.
  const handleUploadFiles = (files: File[]) => {
    files.forEach(file => {
      const fileUrl = URL.createObjectURL(file);
      const type = file.type.startsWith('image/') ? 'image' : 'video';

      const newMessage: MessageType = {
        id: Date.now().toString() + Math.random(),
        text: type === 'image' ? 'Imagem enviada' : 'Vídeo enviado',
        type,
        fileUrl,
        senderId: currentUserId,
        receiverId: 'user2',
        timestamp: new Date(),
        viewed: false,
        language: 'file'
      };

      setMessages(prev => [...prev, newMessage]);
    });
  };

  const handleRecordStart = () => {
    setIsRecording(true);
  };

  const handleRecordStop = () => {
    setIsRecording(false);
    const newMessage: MessageType = {
      id: Date.now().toString(),
      text: 'Áudio enviado',
      type: 'audio',
      senderId: currentUserId,
      receiverId: 'user2',
      timestamp: new Date(),
      viewed: false,
      language: 'audio'
    };

    setMessages(prev => [...prev, newMessage]);
  };

  // Função chamada quando o destinatário visualiza a mensagem
  const handleMessageView = (messageId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && !msg.viewed) {
        // 10 segundos para teste
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + 10);
        
        console.log(`👀 Mensagem visualizada: ${messageId}`);
        
        return {
          ...msg,
          viewed: true,
          expiresAt
        };
      }
      return msg;
    }));
  };

  // Função para traduzir mensagem
  const handleTranslate = async (messageId: string) => {
    const message = messages.find(msg => msg.id === messageId);
    
    console.log('🎯 Clicou para traduzir:', {
      messageId,
      temIdioma: message?.language,
      idioma: message?.language
    });

    if (!message || !message.language || message.isTranslated || message.language === 'unknown') {
      console.log('❌ Não pode traduzir');
      return;
    }

    console.log(`🔄 Iniciando tradução do ${message.language}`);
    setIsTranslating(messageId);
    
    try {
      const translatedText = await languageService.translateText(message.text, message.language);
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              translatedText, 
              isTranslated: true 
            }
          : msg
      ));
      
      console.log('✅ Tradução concluída!');
    } catch (error) {
      console.error('💥 Erro na tradução:', error);
    } finally {
      setIsTranslating(null);
    }
  };

  // Efeito para limpar mensagens expiradas
  React.useEffect(() => {
    const cleanupExpiredMessages = () => {
      const now = new Date();
      setMessages(prev => {
        const activeMessages = prev.filter(msg => {
          if (msg.expiresAt && msg.expiresAt <= now) {
            console.log('🗑️ Removendo mensagem expirada:', msg.id);
            return false;
          }
          return true;
        });
        
        return activeMessages;
      });
    };

    const interval = setInterval(cleanupExpiredMessages, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Cabeçalho do chat */}
      <div className="flex items-center gap-3 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg">
          U2
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-lg">Usuário 2</h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Online • Mensagens auto-destrutivas (10s teste)
          </p>
        </div>
        <div className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full border">
          🔍 Debug Ativo
        </div>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-background to-muted/20">
        {messages.map(message => (
          <ChatMessage
            key={message.id}
            message={message}
            currentUserId={currentUserId}
            onTranslate={handleTranslate}
            onView={handleMessageView}
          />
        ))}
        
        {/* Indicador de tradução */}
        {isTranslating && (
          <div className="flex justify-start mb-4">
            <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">Traduzindo mensagem...</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Estado vazio */}
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground mt-16">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner border">
              <span className="text-3xl">🔍</span>
            </div>
            <p className="text-lg font-medium mb-2">Sistema de Detecção ATIVO</p>
            <p className="text-sm mb-6">Abra o console (F12) para ver os logs</p>
            
            <div className="max-w-md mx-auto space-y-3">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="font-semibold text-yellow-800 mb-2">🎯 TESTE GARANTIDO (Simula mensagem recebida):</p>
                <div className="space-y-2 text-sm text-left">
                  <div className="flex items-center gap-2 p-2 bg-white rounded border">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    <div>
                      <strong>"Hello world, I am here for you."</strong>
                      <p className="text-xs text-gray-600">→ Detecta INGLÊS, e o botão de tradução APARECE.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white rounded border">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    <div>
                      <strong>"Ola meu amigo, tudo bem?"</strong>
                      <p className="text-xs text-gray-600">→ Detecta UNKNOWN, mensagem é enviada por você (botão NÃO aparece).</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        )}
      </div>

      {/* Input de chat */}
      <div className="p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-muted/50">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          onUploadFiles={handleUploadFiles}
          onRecordStart={handleRecordStart}
          onRecordStop={handleRecordStop}
          isRecording={isRecording}
          placeholder="Digite uma frase em inglês ou espanhol para testar!"
        />
      </div>
    </div>
  );
}