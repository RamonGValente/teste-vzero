
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserLink } from "@/components/UserLink";

interface MentionTextProps { text: string; }

/** Transforma @username em link para o perfil do usuário. */
export const MentionText: React.FC<MentionTextProps> = ({ text }) => {
  const usernames = Array.from(new Set((text?.match(/@(\w+)/g) || []).map(s => s.slice(1))));

  const { data: users } = useQuery({
    queryKey: ["mention-users", usernames.join(",")],
    enabled: usernames.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username")
        .in("username", usernames);
      return data || [];
    },
  });

  if (!text || usernames.length === 0) return <>{text}</>;

  const map = new Map<string,string>();
  (users || []).forEach(u => map.set(u.username, u.id));

  const parts: React.ReactNode[] = [];
  let last = 0;
  const rx = /@(\w+)/g;
  let m: RegExpExecArray | null;

  while ((m = rx.exec(text)) !== null) {
    const start = m.index;
    const uname = m[1];
    if (start > last) parts.push(<span key={last}>{text.slice(last, start)}</span>);
    const id = map.get(uname);
    parts.push(id ? <UserLink key={start} userId={id} username={uname} className="text-primary font-semibold hover:underline" /> : <span key={start}>@{uname}</span>);
    last = rx.lastIndex;
  }
  if (last < text.length) parts.push(<span key={last}>{text.slice(last)}</span>);
  return <>{parts}</>;
};
