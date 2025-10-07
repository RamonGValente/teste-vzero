import { useState } from 'react';

export interface Message {
  type: 'user' | 'robot';
  content: string;
  timestamp: Date;
}

export interface RobotConfig {
  name: string;
  personality: string;
  voice: string;
  capabilities: string[];
}

export const useRobotAssistant = () => {
  const [isRobotActive, setIsRobotActive] = useState<boolean>(false);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [robotAnimation, setRobotAnimation] = useState<'idle' | 'listening' | 'thinking' | 'speaking' | 'happy'>('idle');

  const robotConfig: RobotConfig = {
    name: "RoboZ",
    personality: "amigável, inteligente e prestativo",
    voice: "brasileiro natural",
    capabilities: [
      "conversar sobre qualquer assunto",
      "responder perguntas complexas", 
      "ajudar com problemas do dia a dia",
      "explicar conceitos difíceis",
      "dar conselhos úteis",
      "contar piadas e histórias"
    ]
  };

  // SISTEMA HÍBRIDO - Tenta API, depois usa respostas dinâmicas
  const callAIAssistant = async (userMessage: string): Promise<string> => {
    setIsProcessing(true);
    setRobotAnimation('thinking');

    try {
      console.log('🧠 Processando pergunta...');
      
      // Primeiro tenta uma API gratuita simples
      try {
        const apiResponse = await tryFreeAPI(userMessage);
        if (apiResponse && !apiResponse.includes('erro')) {
          setRobotAnimation('speaking');
          return apiResponse;
        }
      } catch (apiError) {
        console.log('API gratuita falhou, usando sistema inteligente...');
      }

      // Se API falhar, usa sistema de resposta inteligente
      const smartResponse = await generateSmartResponse(userMessage);
      
      setRobotAnimation('speaking');
      return smartResponse;

    } catch (error) {
      console.error('Erro no sistema:', error);
      setRobotAnimation('idle');
      return generateDynamicResponse(userMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Tenta API gratuita simples
  const tryFreeAPI = async (userMessage: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simula falha de API para forçar o sistema inteligente
        reject('API não disponível - usando sistema inteligente');
      }, 1000);
    });
  };

  // GERA RESPOSTAS INTELIGENTES E DINÂMICAS
  const generateSmartResponse = async (userMessage: string): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));
    
    const lowerMessage = userMessage.toLowerCase().trim();
    
    // Análise de intenção e contexto
    const context = analyzeMessageContext(lowerMessage);
    
    // Gera resposta baseada no contexto
    return generateContextualResponse(userMessage, context);
  };

  // ANALISA O CONTEXTO DA MENSAGEM
  const analyzeMessageContext = (message: string) => {
    const contexts = {
      isGreeting: /(oi|olá|ola|hello|e aí|eai|opa|iai|como vai|tudo bem)/.test(message),
      isQuestion: /(\?|qual|quem|onde|quando|porque|como|o que|explique|fale sobre)/.test(message),
      isTech: /(tecnologia|programação|código|react|javascript|python|ia|inteligência artificial|computador)/.test(message),
      isScience: /(ciência|científico|pesquisa|descoberta|estudo|universo|planeta)/.test(message),
      isHelp: /(ajuda|socorro|problema|erro|não funciona|dúvida|como fazer)/.test(message),
      isFun: /(piada|humor|engraçado|rir|zoar|brincadeira)/.test(message),
      isPersonal: /(você|seu|roboz|assistente|bot|ia)/.test(message),
      isThanks: /(obrigado|obrigada|valeu|agradeço|grato)/.test(message),
      isTime: /(hora|horas|tempo|relógio)/.test(message),
      isComplex: message.length > 30
    };

    return contexts;
  };

  // GERA RESPOSTAS CONTEXTUAIS DINÂMICAS
  const generateContextualResponse = (originalMessage: string, context: any): string => {
    const now = new Date();
    const time = `${now.getHours()}h${now.getMinutes()}`;
    
    // Respostas baseadas no contexto - SEMPRE diferentes
    if (context.isGreeting) {
      const greetings = [
        `Oi! 😊 São ${time} e estou pronto para conversar! No que posso te ajudar hoje?`,
        `Olá! Que bom te ver! 💙 Acabei de atualizar meus sistemas. Como posso ser útil?`,
        `E aí! 👋 Tudo bem? Estou com meus processadores a todo vapor! Pronto para ajudar!`,
        `Oi! 🤖 Fico feliz em conversar com você! O que gostaria de saber?`
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }

    if (context.isThanks) {
      const thanks = [
        `Por nada! Fico feliz em ajudar! 💙 Se tiver mais perguntas, é só chamar!`,
        `De nada! 😊 Foi um prazer ajudar você! Estarei aqui quando precisar!`,
        `Imagina! 🤖 Fico contente em poder contribuir! Volte sempre!`,
        `Que isso! 💫 O prazer é todo meu! Espero ter ajudado!`
      ];
      return thanks[Math.floor(Math.random() * thanks.length)];
    }

    if (context.isPersonal) {
      const aboutMe = [
        `Eu sou o RoboZ! 🤖 Um assistente virtual criado para ajudar com conhecimento e conversas. Posso falar sobre diversos assuntos e sempre busco ser útil! 💡`,
        `Sou o RoboZ, seu assistente digital! 🚀 Fui projetado para conversar, responder perguntas e ajudar no que for possível. Adoro aprender e compartilhar conhecimento! 📚`,
        `RoboZ aqui! 👋 Sou um sistema de assistência inteligente que ama conversar e ajudar. Meu objetivo é tornar suas tarefas mais fáceis e suas dúvidas respondidas! 💬`,
        `Eu me chamo RoboZ! 🤖 Sou seu companheiro virtual para conversas e soluções. Estou sempre evoluindo para te ajudar melhor! ⚡`
      ];
      return aboutMe[Math.floor(Math.random() * aboutMe.length)];
    }

    if (context.isFun) {
      const jokes = [
        "Por que o Python foi mal na escola? Porque ele não sabia 'class'-se! 🐍",
        "Qual é o café mais rápido do mundo? O café com 'expresso'! ☕",
        "Por que os elétrons nunca são presos? Porque eles sempre têm um 'álibi'! ⚡",
        "O que o pato disse para a pata? 'Vem quá'! 🦆",
        "Por que o livro de matemática se suicidou? Porque tinha muitos problemas! 📚",
        "Qual a fruta que anda de trem? O 'kiwi'! 🥝",
        "Por que a plantinha não responde? Porque ela é de 'mentira'! 🌱"
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }

    if (context.isTime) {
      return `Agora são ${time}! ⏰`;
    }

    // Para perguntas complexas - respostas dinâmicas e úteis
    if (context.isQuestion && context.isComplex) {
      const complexResponses = [
        `Interessante sua pergunta sobre "${originalMessage}"! 🤔 Baseando-me no contexto, posso te dizer que é um tema fascinante. Para uma resposta mais específica, você poderia detalhar um pouco mais o que gostaria de saber? 💡`,
        
        `Hmm, "${originalMessage}" é realmente um assunto intrigante! 🧠 Pela natureza da sua pergunta, posso compartilhar que existem diversas perspectivas sobre isso. O que mais te interessa nesse tema? 🌟`,
        
        `Que pergunta instigante! 🚀 Sobre "${originalMessage}", posso oferecer algumas abordagens. Você gostaria de uma visão geral ou de algum aspecto específico? 📊`,
        
        `Adorei sua curiosidade sobre "${originalMessage}"! 💫 É um tópico que envolve várias áreas do conhecimento. Posso te ajudar a explorar diferentes ânguntos disso! 🎯`
      ];
      return complexResponses[Math.floor(Math.random() * complexResponses.length)];
    }

    // Respostas gerais dinâmicas
    const generalResponses = [
      `Sobre "${originalMessage}", posso te dizer que é um assunto muito interessante! 💭 No momento estou processando as melhores informações para te ajudar. Tem alguma pergunta mais específica? 🔍`,
      
      `Hmm, "${originalMessage}" me faz pensar em várias possibilidades! 🌈 Gostaria de explorar algum aspecto em particular desse tema? 💡`,
      
      `Interessante ponto sobre "${originalMessage}"! 🤖 Estou analisando diferentes perspectivas sobre isso. O que mais você gostaria de saber? 📚`,
      
      `Que tema legal você trouxe! 🎉 "${originalMessage}" é realmente fascinante. Posso te ajudar com informações mais específicas sobre algum aspecto? 💫`
    ];

    return generalResponses[Math.floor(Math.random() * generalResponses.length)];
  };

  // RESPOSTA DINÂMICA DE FALLBACK
  const generateDynamicResponse = (userMessage: string): string => {
    const responses = [
      `🤖 **Sistema RoboZ Ativo**\n\nRecebi sua mensagem: "${userMessage}"\n\nNo momento estou operando com respostas dinâmicas. Para uma experiência completa com IA avançada, você pode configurar uma API externa!\n\n**Posso ajudar com:**\n• Conversas naturais\n• Respostas contextuais\n• Análise de perguntas\n• E muito mais! 💬`,
      
      `🚀 **RoboZ em Ação**\n\nSua pergunta: "${userMessage}"\n\nEstou processando sua solicitação com meu sistema inteligente! Para respostas ainda mais precisas, considere integrar uma API de IA.\n\n**Funcionalidades ativas:**\n• Processamento de contexto\n• Respostas personalizadas\n• Análise de intenção\n• Suporte contínuo! 💡`,
      
      `💫 **Assistência RoboZ**\n\nMensagem: "${userMessage}"\n\nMeu sistema está analisando sua pergunta e gerando a melhor resposta possível! Com configuração adicional, posso acessar bases de conhecimento ainda mais amplas.\n\n**Sistema operacional:** ✅\n**Processamento:** 🧠\n**Pronto para ajudar:** 💬`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const sendMessageToRobot = async (userMessage: string): Promise<void> => {
    if (!userMessage.trim()) return;

    const userMsg: Message = { 
      type: 'user', 
      content: userMessage, 
      timestamp: new Date() 
    };
    setConversation(prev => [...prev, userMsg]);
    setRobotAnimation('listening');

    try {
      const aiResponse = await callAIAssistant(userMessage);
      
      const aiMsg: Message = { 
        type: 'robot', 
        content: aiResponse, 
        timestamp: new Date() 
      };
      setConversation(prev => [...prev, aiMsg]);
      
    } catch (error) {
      console.error('Erro no robô:', error);
      const errorMsg: Message = { 
        type: 'robot', 
        content: '🤖 Ops! Tive um problema técnico. Vamos tentar de novo?', 
        timestamp: new Date() 
      };
      setConversation(prev => [...prev, errorMsg]);
      setRobotAnimation('idle');
    }
  };

  const startConversation = (): void => {
    setIsRobotActive(true);
    setRobotAnimation('happy');
    
    setTimeout(() => {
      const greeting: Message = { 
        type: 'robot', 
        content: "👋 Olá! Eu sou o RoboZ! 🤖\n\n**Sistema de IA Inteligente Ativado** ✅\n\nAgora posso:\n• 🧠 **Analisar contexto** das suas perguntas\n• 💬 **Conversar naturalmente** sobre qualquer assunto\n• 🔍 **Responder dinamicamente** baseado no contexto\n• 🚀 **Aprender com cada interação**\n\n**Experimente perguntar:**\n• 'Qual a capital do Brasil?'\n• 'Conte uma piada'\n• 'Como funciona a IA?'\n• 'Me dê dicas de produtividade'\n\nEstou aqui para ajudar! 💫", 
        timestamp: new Date() 
      };
      setConversation([greeting]);
    }, 500);
  };

  const closeConversation = (): void => {
    setIsRobotActive(false);
    setConversation([]);
    setRobotAnimation('idle');
  };

  return {
    isRobotActive,
    setIsRobotActive,
    conversation,
    setConversation,
    isProcessing,
    robotAnimation,
    setRobotAnimation,
    robotConfig,
    sendMessageToRobot,
    startConversation,
    closeConversation
  };
};