
import { useAuth } from '@/components/auth/AuthProvider';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { ChatApp } from '@/components/chat/ChatApp';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <ChatApp />;
};

export default Index;
