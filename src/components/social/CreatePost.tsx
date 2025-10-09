import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CreatePost({ onPostCreated }: { onPostCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from("post-images")
      .upload(fileName, file);
    if (!error) {
      const { data: pub } = supabase.storage.from("post-images").getPublicUrl(fileName);
      setImage(pub.publicUrl);
    }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return;

    // Check penalty
    const { data: penalty } = await supabase
      .from("user_penalties" as any)
      .select("*")
      .eq("user_id", uid)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (penalty) {
      alert("Você está temporariamente proibido de postar por avaliação negativa.");
      return;
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const { error } = await supabase
      .from("posts" as any)
      .insert({
        user_id: uid,
        title,
        content,
        image_url: image,
        expires_at: expiresAt.toISOString(),
        status: "active"
      });
    if (!error) {
      setTitle("");
      setContent("");
      setImage(null);
      onPostCreated();
    }
  };

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Textarea
            placeholder="Conte algo..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])}
            disabled={uploading}
          />
          <Button type="submit" disabled={uploading || !title.trim()}>
            {uploading ? "Enviando..." : "Criar Post (1h)"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
