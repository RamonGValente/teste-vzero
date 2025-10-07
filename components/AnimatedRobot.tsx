import React, { useState, useRef } from 'react';

interface AnimatedRobotProps {
  currentAnimation?: 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy';
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export const AnimatedRobot: React.FC<AnimatedRobotProps> = ({ 
  currentAnimation = 'idle', 
  onClick,
  size = 'medium'
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isTouched, setIsTouched] = useState<boolean>(false);
  const robotRef = useRef<HTMLDivElement>(null);

  const handleRobotInteraction = () => {
    if (robotRef.current) {
      robotRef.current.style.transform = 'scale(0.95)';
      setTimeout(() => {
        if (robotRef.current) {
          robotRef.current.style.transform = 'scale(1)';
        }
      }, 150);
    }
    
    if (onClick) {
      onClick();
    }
  };

  const handleTouchStart = () => {
    setIsTouched(true);
  };

  const handleTouchEnd = () => {
    setIsTouched(false);
    handleRobotInteraction();
  };

  return (
    <div 
      ref={robotRef}
      className={`
        animated-robot 
        robot-${currentAnimation} 
        ${isHovered ? 'robot-hover' : ''}
        ${isTouched ? 'robot-touch' : ''}
        robot-${size}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleRobotInteraction}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="button"
      aria-label="Abrir chat com assistente virtual RoboZ"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleRobotInteraction();
        }
      }}
    >
      <div className="robot-head">
        <div className="robot-face">
          <div className="robot-eyes">
            <div className="eye left-eye"></div>
            <div className="eye right-eye"></div>
          </div>
          <div className="robot-mouth"></div>
        </div>
        <div className="robot-antenna"></div>
      </div>
      <div className="robot-body">
        <div className="robot-chest">
          <div className="robot-light"></div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedRobot;