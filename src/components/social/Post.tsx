import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Post = {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  expires_at: string;
  status: "active" | "fixed" | "deleted";
};

export default function Post({ post }: { post: Post }) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [userVote, setUserVote] = useState<"heart" | "bomb" | null>(null);
  const [counts, setCounts] = useState({ hearts: 0, bombs: 0 });

  // timer
  useEffect(() => {
    const tick = () => {
      const now = new Date().getTime();
      const expires = new Date(post.expires_at).getTime();
      const diff = expires - now;
      if (diff <= 0) {
        setTimeLeft("EXPIRADO");
        checkResult();
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [post.expires_at]);

  // votes
  const refreshVotes = async () => {
    const { data } = await supabase
      .from("post_votes" as any)
      .select("vote_type")
      .eq("post_id", post.id);
    const hearts = (data || []).filter(v => v.vote_type === "heart").length;
    const bombs = (data || []).filter(v => v.vote_type === "bomb").length;
    setCounts({ hearts, bombs });
  };

  const fetchUserVote = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return;
    const { data } = await supabase
      .from("post_votes" as any)
      .select("vote_type")
      .eq("post_id", post.id)
      .eq("user_id", uid)
      .maybeSingle();
    setUserVote((data as any)?.vote_type ?? null);
  };

  useEffect(() => {
    refreshVotes();
    fetchUserVote();
  }, [post.id]);

  const vote = async (voteType: "heart" | "bomb") => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return;
    // upsert by unique(user_id, post_id)
    await supabase.from("post_votes" as any).delete().eq("post_id", post.id).eq("user_id", uid);
    await supabase.from("post_votes" as any).insert({ user_id: uid, post_id: post.id, vote_type: voteType });
    setUserVote(voteType);
    refreshVotes();
  };

  
    const checkResult = async () => {
      try {
        await supabase.rpc('finalize_post', { p_post_id: post.id });
      } catch (e) {
        console.error(e);
      }
    };


  if (post.status === "deleted") return null;

  const total = counts.hearts + counts.bombs || 1;

  return (
    <Card className={`mb-4 ${post.status === "fixed" ? "border-green-500" : ""}`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">{post.title}</h3>
          <div className="text-xs px-2 py-1 rounded-full bg-muted">⏰ {timeLeft}{post.status === "fixed" ? " ✅ FIXADO" : ""}</div>
        </div>
        {post.image_url && <img src={post.image_url} alt="post" className="rounded mb-3 max-h-96 w-full object-cover" />}
        {post.content && <p className="mb-3 text-sm text-muted-foreground">{post.content}</p>}
        <div className="flex gap-2 mb-3">
          <Button variant={userVote === "heart" ? "default" : "outline"} onClick={() => vote("heart")}>❤️ {counts.hearts}</Button>
          <Button variant={userVote === "bomb" ? "default" : "outline"} onClick={() => vote("bomb")}>💣 {counts.bombs}</Button>
        </div>
        <div className="h-2 w-full rounded overflow-hidden flex">
          <div className="bg-red-500" style={{ width: `${(counts.hearts/total)*100}%` }} />
          <div className="bg-gray-800" style={{ width: `${(counts.bombs/total)*100}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}
