import { Post } from './SocialNetwork';
import PostComponent from './Post';

interface PostFeedProps {
  posts: Post[];
}

export default function PostFeed({ posts }: PostFeedProps) {
  const activePosts = posts.filter(post => post.status === 'active');
  const fixedPosts = posts.filter(post => post.status === 'fixed');

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl mb-4">🌐</div>
        <h3 className="text-xl font-semibold text-foreground mb-3">Feed Social Vazio</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          Ainda não há postagens na rede social. Seja o primeiro a compartilhar algo incrível com a comunidade!
        </p>
        <div className="text-sm text-muted-foreground">
          💡 Dica: Use o botão "+" no canto inferior direito para criar sua primeira postagem
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      {/* Posts Fixados */}
      {fixedPosts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-4">
            <div className="w-2 h-8 bg-yellow-500 rounded-full"></div>
            <div>
              <h2 className="font-semibold text-foreground text-lg">Em Destaque</h2>
              <p className="text-sm text-muted-foreground">Postagens aprovadas pela comunidade</p>
            </div>
          </div>
          {fixedPosts.map(post => (
            <PostComponent key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* Posts Ativos */}
      <div className="space-y-4">
        {fixedPosts.length > 0 && (
          <div className="flex items-center gap-3 px-4">
            <div className="w-2 h-8 bg-primary rounded-full"></div>
            <div>
              <h2 className="font-semibold text-foreground text-lg">Postagens Recentes</h2>
              <p className="text-sm text-muted-foreground">Novas publicações da comunidade</p>
            </div>
          </div>
        )}
        {activePosts.map(post => (
          <PostComponent key={post.id} post={post} />
        ))}
      </div>

      {/* Mensagem do Final do Feed */}
      {activePosts.length > 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground text-sm">
            🎉 Você chegou ao final do feed por hoje!
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Volte mais tarde para ver novas postagens
          </div>
        </div>
      )}
    </div>
  );
}