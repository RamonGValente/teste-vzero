import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type Post = {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  expires_at: string;
  created_at: string;
  status: "active" | "fixed" | "deleted";
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    user_code: string | null;
  } | null;
};

interface PostProps {
  post: Post;
}

export default function PostComponent({ post }: PostProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [userVote, setUserVote] = useState<string | null>(null);
  const [voteCounts, setVoteCounts] = useState({ hearts: 0, bombs: 0 });
  const [expired, setExpired] = useState(false);

  // Calcular tempo restante
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const expires = new Date(post.expires_at);
      const difference = expires - now;

      if (difference <= 0) {
        setTimeLeft('EXPIRADO');
        setExpired(true);
        checkPostResult();
        return;
      }

      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / (1000 * 60)) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [post]);

  // Buscar votos
  useEffect(() => {
    fetchVotes();
    checkUserVote();
  }, [post.id]);

  const fetchVotes = async () => {
    const { data: votes, error } = await supabase
      .from('post_votes')
      .select('vote_type')
      .eq('post_id', post.id);

    if (error) {
      console.error('Erro ao buscar votos:', error);
      return;
    }

    if (votes) {
      const hearts = votes.filter(v => v.vote_type === 'heart').length;
      const bombs = votes.filter(v => v.vote_type === 'bomb').length;
      setVoteCounts({ hearts, bombs });
    }
  };

  const checkUserVote = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: vote } = await supabase
      .from('post_votes')
      .select('vote_type')
      .eq('post_id', post.id)
      .eq('user_id', user.id)
      .single();

    setUserVote(vote?.vote_type || null);
  };

  const handleVote = async (voteType: string) => {
    if (expired) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Você precisa estar logado para votar');
      return;
    }

    try {
      // Se já votou, remove o voto anterior
      if (userVote) {
        await supabase
          .from('post_votes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
      }

      // Adiciona novo voto
      const { error } = await supabase
        .from('post_votes')
        .insert([{ 
          user_id: user.id, 
          post_id: post.id, 
          vote_type: voteType 
        }]);

      if (error) throw error;

      setUserVote(userVote === voteType ? null : voteType);
      fetchVotes();
    } catch (error) {
      console.error('Erro ao votar:', error);
    }
  };

  const checkPostResult = async () => {
    if (post.status !== 'active') return;

    const { data: votes, error } = await supabase
      .from('post_votes')
      .select('vote_type')
      .eq('post_id', post.id);

    if (error || !votes) return;

    const hearts = votes.filter(v => v.vote_type === 'heart').length;
    const bombs = votes.filter(v => v.vote_type === 'bomb').length;

    try {
      if (hearts > bombs) {
        // Post fica fixo
        await supabase
          .from('posts')
          .update({ status: 'fixed' })
          .eq('id', post.id);
      } else {
        // Post é deletado e usuário penalizado
        await supabase
          .from('posts')
          .update({ status: 'deleted' })
          .eq('id', post.id);

        // Penalidade desativada no cliente (RLS) 
}
    } catch (error) {
      console.error('Erro ao processar resultado:', error);
    }
  };

  if (post.status === 'deleted') {
    return null;
  }

  const totalVotes = voteCounts.hearts + voteCounts.bombs;
  const heartPercentage = totalVotes > 0 ? (voteCounts.hearts / totalVotes) * 100 : 50;
  const bombPercentage = totalVotes > 0 ? (voteCounts.bombs / totalVotes) * 100 : 50;

  // Função para obter iniciais do nome
  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Obter nome de exibição
  const getDisplayName = () => {
    return post.profiles?.full_name || `Usuário ${post.profiles?.user_code || ''}`;
  };

  return (
    <div className={`bg-card rounded-lg border p-4 ${
      post.status === 'fixed' 
        ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
        : expired 
          ? 'border-gray-300 bg-muted/50'
          : 'border-border'
    }`}>
      
      {/* Cabeçalho com informações do autor */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-8 w-8">
          <AvatarImage 
            src={post.profiles?.avatar_url || ''} 
            alt={getDisplayName()}
          />
          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
            {getInitials(post.profiles?.full_name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">
            {getDisplayName()}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(post.created_at).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          expired 
            ? 'bg-muted text-muted-foreground' 
            : post.status === 'fixed'
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
        }`}>
          ⏰ {timeLeft}
          {post.status === 'fixed' && ' ✅'}
        </div>
      </div>

      {/* Conteúdo do post */}
      <div className="ml-11"> {/* Offset para alinhar com o avatar */}
        <h3 className="text-lg font-semibold text-foreground mb-2">{post.title}</h3>

        {post.image_url && (
          <div className="mb-3">
            {post.image_url.includes('/video') || post.image_url.endsWith('.mp4') || post.image_url.endsWith('.mov') ? (
              <video 
                src={post.image_url} 
                controls 
                className="w-full rounded-lg max-h-96 object-cover"
              />
            ) : (
              <img 
                src={post.image_url} 
                alt="Post" 
                className="w-full rounded-lg max-h-96 object-cover"
              />
            )}
          </div>
        )}

        <p className="text-foreground mb-4 whitespace-pre-wrap leading-relaxed">{post.content}</p>

        {/* Sistema de votação */}
        <div className="flex gap-3 mb-3">
          <button 
            onClick={() => handleVote('heart')}
            disabled={expired}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
              userVote === 'heart' 
                ? 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-900 dark:text-red-300' 
                : expired
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-muted text-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/50'
            }`}
          >
            ❤️ {voteCounts.hearts}
          </button>

          <button 
            onClick={() => handleVote('bomb')}
            disabled={expired}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
              userVote === 'bomb' 
                ? 'bg-gray-300 text-gray-800 border border-gray-400 dark:bg-gray-700 dark:text-gray-300' 
                : expired
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-muted text-foreground hover:bg-gray-200 hover:text-gray-800 dark:hover:bg-gray-700'
            }`}
          >
            💣 {voteCounts.bombs}
          </button>
        </div>

        {/* Barra de progresso visual */}
        {totalVotes > 0 && (
          <div className="flex h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="bg-red-500 transition-all duration-500"
              style={{ width: `${heartPercentage}%` }}
              title={`${voteCounts.hearts} corações`}
            />
            <div 
              className="bg-gray-600 transition-all duration-500"
              style={{ width: `${bombPercentage}%` }}
              title={`${voteCounts.bombs} bombas`}
            />
          </div>
        )}
        
        {expired && totalVotes === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Postagem expirou sem votos
          </p>
        )}
      </div>
    </div>
  );
}