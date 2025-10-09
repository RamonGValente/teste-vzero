import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import CreatePost from "./CreatePost";
import PostFeed from "./PostFeed";

type Post = {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  expires_at: string;
  created_at: string;
  status: "active" | "fixed" | "deleted";
};

export default function SocialNetwork() {
  const [posts, setPosts] = useState<Post[]>([]);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("posts" as any)
      .select("*")
      .neq("status", "deleted")
      .order("created_at", { ascending: false });
    if (!error && data) setPosts(data as any);
  };

  useEffect(() => {
    fetchPosts();
    const channel = supabase
      .channel("posts_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        fetchPosts
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <CreatePost onPostCreated={fetchPosts} />
      <PostFeed posts={posts} />
    </div>
  );
}
