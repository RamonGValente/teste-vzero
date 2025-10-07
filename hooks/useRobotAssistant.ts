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
    personality: "curioso, animado e super útil",
    voice: "brasileiro natural",
    capabilities: [
      "responder qualquer pergunta",
      "ensinar sobre tecnologia",
      "criar histórias interativas",
      "resolver problemas complexos",
      "conversar sobre qualquer assunto"
    ]
  };

  const simulateAIResponse = async (userMessage: string): Promise<string> => {
    setIsProcessing(true);
    setRobotAnimation('thinking');
    
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));
    
    const responses: Record<string, string[]> = {
      greetings: [
        "Olá! Eu sou o RoboZ! 🤖 Estou aqui para ajudar você!",
        "E aí! RoboZ na área! Pronto para conversar?",
        "Oi! Que bom ver você! Sou seu assistente virtual!"
      ],
      
      questions: [
        "Interessante! Sobre isso posso te dizer que ",
        "Boa pergunta! Na minha análise, ",
        "Adoro esse tema! Vou explicar: "
      ],
      
      creative: [
        "Vamos criar algo juntos! Que tal ",
        "Tenho uma ideia incrível: ",
        "Inspirado no que você disse: "
      ],
      
      help: [
        "Posso te ajudar! A solução é ",
        "Claro! Vamos passo a passo: ",
        "Sem problemas! Recomendo: "
      ]
    };

    const lowerMessage = userMessage.toLowerCase();
    let category: string = 'questions';
    
    if (/oi|olá|hello|opa|e aí/.test(lowerMessage)) {
      category = 'greetings';
    } else if (/criar|ideia|inventar|fazer|desenvolver/.test(lowerMessage)) {
      category = 'creative';
    } else if (/ajuda|problema|como fazer|dúvida|socorro/.test(lowerMessage)) {
      category = 'help';
    }

    const baseResponse = responses[category][Math.floor(Math.random() * responses[category].length)];
    
    let fullResponse: string = baseResponse;
    
    if (category === 'questions') {
      const topics: Record<string, string> = {
        tecnologia: "a tecnologia está transformando nosso mundo de formas incríveis!",
        programação: "programar é uma habilidade super poderosa para o futuro!",
        futuro: "o futuro é cheio de possibilidades emocionantes!",
        inteligência: "a IA está revolucionando como vivemos e trabalhamos!"
      };
      
      const detectedTopic = Object.keys(topics).find(topic => 
        lowerMessage.includes(topic)
      ) || 'tecnologia';
      
      fullResponse += topics[detectedTopic];
    }
    
    if (category === 'creative') {
      const ideas: string[] = [
        "desenvolver um app mobile incrível!",
        "criar um projeto de automação inteligente!",
        "fazer um sistema web inovador!",
        "criar uma experiência digital única!"
      ];
      fullResponse += ideas[Math.floor(Math.random() * ideas.length)];
    }
    
    if (category === 'help') {
      const solutions: string[] = [
        "vamos dividir em etapas menores!",
        "pesquise exemplos e adapte para seu caso!",
        "a prática constante é a chave do sucesso!",
        "experimente diferentes abordagens!"
      ];
      fullResponse += solutions[Math.floor(Math.random() * solutions.length)];
    }

    fullResponse += " O que mais você quer saber? 🚀";
    
    setIsProcessing(false);
    setRobotAnimation('speaking');
    
    return fullResponse;
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
      const aiResponse = await simulateAIResponse(userMessage);
      
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
        content: 'Ops! Meu sistema falhou. Vamos tentar de novo? 🔧', 
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
        content: "Olá! Eu sou o RoboZ! 🤖 Como posso ajudar você hoje?", 
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