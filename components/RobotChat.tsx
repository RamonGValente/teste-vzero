import React, { useState, useRef, useEffect } from 'react';
import { useRobotAssistant } from '@/hooks/useRobotAssistant';
import AnimatedRobot from './AnimatedRobot';

export const RobotChat: React.FC = () => {
  const {
    isRobotActive,
    conversation,
    isProcessing,
    robotAnimation,
    robotConfig,
    sendMessageToRobot,
    startConversation,
    closeConversation
  } = useRobotAssistant();

  const [userInput, setUserInput] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'nearest'
    });
  }, [conversation]);

  useEffect(() => {
    if (isRobotActive && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isRobotActive]);

  const handleSendMessage = (): void => {
    if (!userInput.trim() || isProcessing) return;
    sendMessageToRobot(userInput);
    setUserInput('');
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickQuestion = (question: string): void => {
    sendMessageToRobot(question);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      closeConversation();
    }
  };

  return (
    <div className="robot-chat-system">
      {!isRobotActive && (
        <div className="floating-robot-container">
          <div className="robot-speech-bubble">
            👋 Toque para conversar!
          </div>
          <div 
            className="robot-avatar"
            onClick={startConversation}
            role="button"
            aria-label="Abrir chat com assistente virtual"
          >
            <AnimatedRobot 
              currentAnimation="idle" 
              size="medium"
            />
          </div>
        </div>
      )}

      {isRobotActive && (
        <div 
          className="robot-chat-overlay"
          onClick={handleBackdropClick}
        >
          <div 
            className="robot-chat-interface"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="chat-header">
              <div className="robot-avatar-small">
                <AnimatedRobot 
                  currentAnimation={robotAnimation} 
                  size="small"
                />
              </div>
              <div className="chat-info">
                <h3>{robotConfig.name}</h3>
                <span>
                  {isProcessing ? 'Pensando...' : 'Online • Toque para fechar'}
                </span>
              </div>
              <button 
                className="close-chat" 
                onClick={closeConversation}
                aria-label="Fechar chat"
              >
                ✕
              </button>
            </div>

            <div className="messages-container">
              {conversation.length === 0 ? (
                <div className="welcome-message">
                  <p>👋 Olá! Eu sou o {robotConfig.name}!</p>
                  <p>Posso te ajudar com:</p>
                  <ul>
                    {robotConfig.capabilities.map((capability, index) => (
                      <li key={index}>• {capability}</li>
                    ))}
                  </ul>
                  <p>Faça sua pergunta! 🚀</p>
                </div>
              ) : (
                conversation.map((msg, index) => (
                  <div key={index} className={`message ${msg.type}`}>
                    <div className="message-content">
                      {msg.content}
                    </div>
                    <div className="message-time">
                      {msg.timestamp.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                ))
              )}
              
              {isProcessing && (
                <div className="thinking-indicator">
                  <div className="thinking-dots">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </div>
                  <span>{robotConfig.name} está pensando...</span>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            <div className="input-section">
              <div className="input-container">
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Pergunte algo para ${robotConfig.name}...`}
                  disabled={isProcessing}
                  enterKeyHint="send"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={isProcessing || !userInput.trim()}
                  className="send-button"
                  aria-label="Enviar mensagem"
                >
                  {isProcessing ? '⏳' : '🚀'}
                </button>
              </div>
              
              {conversation.length <= 2 && (
                <div className="quick-questions">
                  <span>Tente perguntar:</span>
                  <div className="quick-buttons">
                    <button 
                      onClick={() => handleQuickQuestion('Como funciona o sistema?')}
                      disabled={isProcessing}
                    >
                      🤔 Sistema
                    </button>
                    <button 
                      onClick={() => handleQuickQuestion('Dicas de uso')}
                      disabled={isProcessing}
                    >
                      💡 Dicas
                    </button>
                    <button 
                      onClick={() => handleQuickQuestion('Recursos disponíveis')}
                      disabled={isProcessing}
                    >
                      🚀 Recursos
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RobotChat;