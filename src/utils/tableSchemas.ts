
// Mapeamentos simples por tabela (pode ser expandido conforme necessidade)
export const tablePrimaryKeys: Record<string, string> = {
  profiles: 'id',
  posts: 'id',
  comments: 'id',
  likes: 'id',
  post_votes: 'id',
  communities: 'id',
  community_members: 'id',
  community_posts: 'id',
  conversations: 'id',
  conversation_participants: 'id',
  messages: 'id',
  followers: 'id',
  friend_requests: 'id',
  friendships: 'id',
  mentions: 'id',
  last_viewed: 'id',
}
