
import { createContext, useContext, useState, useEffect } from 'react';

type Language = 'pt' | 'en' | 'es';

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const translations = {
  pt: {
    'auth.welcome': 'Mensagens que se apagam na memória',
    'auth.getStarted': 'Começar',
    'auth.description': 'Entre ou crie sua conta para começar',
    'auth.signIn': 'Entrar',
    'auth.signUp': 'Cadastrar',
    'auth.email': 'E-mail',
    'auth.password': 'Senha',
    'auth.fullName': 'Nome completo',
    'auth.signingIn': 'Entrando...',
    'auth.signingUp': 'Cadastrando...',
    'auth.loginError': 'Erro ao fazer login',
    'auth.signupError': 'Erro ao criar conta',
    'auth.loginSuccess': 'Login realizado com sucesso',
    'auth.signupSuccess': 'Conta criada com sucesso',
    'auth.unexpectedError': 'BEM-VINDO(a)',
    'contacts.addByEmail': 'Adicionar por e-mail',
    'contacts.add': 'Adicionar',
    'chat.typeMessage': 'Digite uma mensagem...',
    'chat.send': 'Enviar',
  },
  en: {
    'auth.welcome': 'Messages that fade from memory',
    'auth.getStarted': 'Get Started',
    'auth.description': 'Sign in or create your account to begin',
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.fullName': 'Full Name',
    'auth.signingIn': 'Signing In...',
    'auth.signingUp': 'Signing Up...',
    'auth.loginError': 'Login error',
    'auth.signupError': 'Signup error',
    'auth.loginSuccess': 'Login successful',
    'auth.signupSuccess': 'Account created successfully',
    'auth.unexpectedError': 'Unexpected error',
    'contacts.addByEmail': 'Add by email',
    'contacts.add': 'Add',
    'chat.typeMessage': 'Type a message...',
    'chat.send': 'Send',
  },
  es: {
    'auth.welcome': 'Mensajes que se desvanecen de la memoria',
    'auth.getStarted': 'Comenzar',
    'auth.description': 'Inicia sesión o crea tu cuenta para empezar',
    'auth.signIn': 'Iniciar Sesión',
    'auth.signUp': 'Registrarse',
    'auth.email': 'Correo',
    'auth.password': 'Contraseña',
    'auth.fullName': 'Nombre completo',
    'auth.signingIn': 'Iniciando sesión...',
    'auth.signingUp': 'Registrando...',
    'auth.loginError': 'Error de inicio de sesión',
    'auth.signupError': 'Error de registro',
    'auth.loginSuccess': 'Inicio de sesión exitoso',
    'auth.signupSuccess': 'Cuenta creada exitosamente',
    'auth.unexpectedError': 'Error inesperado',
    'contacts.addByEmail': 'Agregar por correo',
    'contacts.add': 'Agregar',
    'chat.typeMessage': 'Escribe un mensaje...',
    'chat.send': 'Enviar',
  },
};

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('language') as Language;
      if (saved) return saved;
      
      // Auto-detect language
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('pt')) return 'pt';
      if (browserLang.startsWith('es')) return 'es';
      return 'en';
    }
    return 'pt';
  });

  const setLanguageAndSave = (lang: Language) => {
    localStorage.setItem('language', lang);
    setLanguage(lang);
  };

  const toggleLanguage = () => {
    const languages: Language[] = ['pt', 'en', 'es'];
    const currentIndex = languages.indexOf(language);
    const nextIndex = (currentIndex + 1) % languages.length;
    setLanguageAndSave(languages[nextIndex]);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  const value = {
    language,
    setLanguage: setLanguageAndSave,
    toggleLanguage,
    t,
  };

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
