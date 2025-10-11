import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Moon, Globe } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useTranslation } from '@/components/i18n/LanguageProvider';

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toggleTheme } = useTheme();
  const { t, toggleLanguage } = useTranslation();

  const handleEmailClick = () => {
    const emailAddress = 'sistemasrtr@gmail.com';
    const subject = 'Contato-Undoing';
    const mailtoLink = `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}`;
    
    window.location.href = mailtoLink;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(t('auth.loginError'));
        console.error('Sign-in error:', error);
      } else {
        toast.success(t('auth.loginSuccess'));
      }
    } catch (error) {
      toast.error(t('auth.unexpectedError'));
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl, data: { full_name: fullName } },
      });
      if (error) {
        toast.error(t('auth.signupError'));
        console.error('Sign-up error:', error);
      } else {
        toast.success(t('auth.signupSuccess'));
      }
    } catch (error) {
      toast.error(t('auth.unexpectedError'));
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 flex-1 flex flex-col justify-center">
        <div className="text-center">
          {/* Logo levemente menor */}
          <div className="flex justify-center mb-4">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-32 md:h-40 lg:h-52 w-auto object-contain select-none"
              draggable={false}
            />
          </div>
          <p className="text-muted-foreground mt-2">{t('auth.welcome')}</p>
        </div>

        <div className="flex justify-center gap-2 mb-6">
          <Button variant="outline" size="sm" onClick={toggleTheme} className="w-10 h-10 p-0">
            <Moon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={toggleLanguage} className="w-10 h-10 p-0">
            <Globe className="h-4 w-4" />
          </Button>
        </div>

        <Card className="backdrop-blur-sm bg-background/80 border-0 shadow-xl">
          <CardHeader>
            <CardTitle>{t('auth.getStarted')}</CardTitle>
            <CardDescription>{t('auth.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t('auth.signIn')}</TabsTrigger>
                <TabsTrigger value="signup">{t('auth.signUp')}</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <Input
                    type="email"
                    placeholder={t('auth.email')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Input
                    type="password"
                    placeholder={t('auth.password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t('auth.signingIn') : t('auth.signIn')}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <Input
                    type="text"
                    placeholder={t('auth.fullName')}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                  <Input
                    type="email"
                    placeholder={t('auth.email')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Input
                    type="password"
                    placeholder={t('auth.password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t('auth.signingUp') : t('auth.signUp')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Rodapé */}
      <footer className="w-full text-center py-4 mt-8">
        <button
          onClick={handleEmailClick}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm"
        >
          Todos os Direitos Reservados RTR-Sistemas
        </button>
      </footer>
    </div>
  );
};