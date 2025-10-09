import Post from "./Post";

type PostType = {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  expires_at: string;
  created_at: string;
  status: "active" | "fixed" | "deleted";
};

export default function PostFeed({ posts }: { posts: PostType[] }) {
  return (
    <div>
      {posts.map(p => <Post key={p.id} post={p} />)}
    </div>
  );
}
