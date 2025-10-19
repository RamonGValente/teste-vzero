import { useState } from "react";
import { X, Home, Search, MessageCircle, Users, User, Shield, Sun, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface TutorialProps {
  onComplete: () => void;
}

const tutorialSteps = [
  {
    title: "Bem-vindo ao UndoinG! 🎉",
    description: "Vamos fazer um tour rápido pelas funcionalidades principais do sistema.",
    icon: Home,
    gradient: "from-violet-500/20 to-purple-500/20",
  },
  {
    title: "Feed de Postagens 📱",
    description: "No Feed você pode criar postagens, reagir com emojis, comentar e interagir com outros usuários. É o coração da nossa rede social!",
    icon: Home,
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  {
    title: "Explorar Conteúdos 🔍",
    description: "Na seção Explorar, descubra novos conteúdos, tendências e usuários interessantes para seguir.",
    icon: Search,
    gradient: "from-green-500/20 to-emerald-500/20",
  },
  {
    title: "Mensagens Privadas 💬",
    description: "Converse em tempo real com seus amigos! Envie mensagens de texto, áudio, imagens e vídeos. Crie salas privadas para conversas em grupo.",
    icon: MessageCircle,
    gradient: "from-pink-500/20 to-rose-500/20",
  },
  {
    title: "Comunidades 👥",
    description: "Participe de comunidades, crie discussões e conecte-se com pessoas que compartilham seus interesses.",
    icon: Users,
    gradient: "from-orange-500/20 to-amber-500/20",
  },
  {
    title: "Seu Perfil ⭐",
    description: "Personalize seu perfil, veja suas postagens e gerencie suas informações pessoais.",
    icon: User,
    gradient: "from-indigo-500/20 to-blue-500/20",
  },
  {
    title: "Código UDG 🔑",
    description: "Seu código único UDG está no menu lateral. Compartilhe com amigos para que eles possam te adicionar facilmente!",
    icon: Copy,
    gradient: "from-teal-500/20 to-cyan-500/20",
  },
  {
    title: "Modo Stealth 🕶️",
    description: "Ative o Modo Stealth para ocultar o aplicativo. Configure um PIN de 6 dígitos e acesse usando métodos específicos por plataforma (calculadora, discador, etc).",
    icon: Shield,
    gradient: "from-purple-500/20 to-violet-500/20",
  },
  {
    title: "Temas Personalizados 🎨",
    description: "Alterne entre modo claro e escuro usando o botão no menu lateral. Personalize sua experiência visual!",
    icon: Sun,
    gradient: "from-yellow-500/20 to-orange-500/20",
  },
  {
    title: "Tudo Pronto! 🚀",
    description: "Você está pronto para começar! Explore, conecte-se e divirta-se no UndoinG. Bem-vindo à comunidade!",
    icon: Home,
    gradient: "from-violet-500/20 to-fuchsia-500/20",
  },
];

export function Tutorial({ onComplete }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;
  const step = tutorialSteps[currentStep];
  const Icon = step.icon;

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-2xl relative overflow-hidden shadow-2xl border-2">
        {/* Background gradient decoration */}
        <div className={`absolute inset-0 bg-gradient-to-br ${step.gradient} opacity-50`} />
        
        {/* Content */}
        <div className="relative p-8 md:p-12">
          {/* Skip button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSkip}
            className="absolute top-4 right-4 hover:bg-background/50"
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Progress bar */}
          <div className="mb-8">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Passo {currentStep + 1} de {tutorialSteps.length}
            </p>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-6 rounded-full bg-gradient-to-br from-primary to-secondary shadow-lg">
              <Icon className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>

          {/* Title and Description */}
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {step.title}
          </h2>
          <p className="text-center text-muted-foreground text-lg md:text-xl mb-8 leading-relaxed">
            {step.description}
          </p>

          {/* Navigation buttons */}
          <div className="flex gap-4 justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex-1"
            >
              Anterior
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
            >
              {currentStep === tutorialSteps.length - 1 ? "Começar!" : "Próximo"}
            </Button>
          </div>

          {/* Step indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {tutorialSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? "w-8 bg-primary"
                    : index < currentStep
                    ? "w-2 bg-primary/50"
                    : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
