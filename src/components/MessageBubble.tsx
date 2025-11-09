import React, { useMemo, useState, useEffect } from "react";
import { useCountdown } from "../hooks/useCountdown";
import { detectLanguage } from "../lib/detectLanguage";
import { supabase } from "../lib/supabaseClient";
import "../styles/chat.css";

export type Message = {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string | null;
  media_urls: string[] | null;
  created_at: string;
  updated_at: string;
  viewed_at: string | null;
  expires_at: string | null;
  is_deleted: boolean;
};

type Props = {
  msg: Message;
  me: string;
  myLang: string;
};

export const MessageBubble: React.FC<Props> = ({ msg, me, myLang }) => {
  const isMine = msg.user_id === me;
  const { totalSec, label } = useCountdown(msg.expires_at);
  const [translated, setTranslated] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  const det = useMemo(() => (msg.content ? detectLanguage(msg.content) : null), [msg.content]);
  const showTimer = Boolean(msg.viewed_at && msg.expires_at && !msg.is_deleted);
  const expired = msg.is_deleted || (showTimer && totalSec === 0);

  async function handleTranslate() {
    if (!msg.content) return;
    setTranslating(true);
    try {
      const r = await fetch("/functions/v1/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg.content, source: det?.iso2 || "auto", target: myLang || "pt" })
      });
      const data = await r.json();
      setTranslated(data.translatedText || "");
    } finally {
      setTranslating(false);
    }
  }

  useEffect(() => {
    const markViewed = async () => {
      if (isMine || msg.viewed_at) return;
      await supabase.from("messages").update({ viewed_at: new Date().toISOString() }).eq("id", msg.id);
    };
    markViewed();
  }, [msg.id, msg.viewed_at, isMine]);

  if (expired) {
    return (
      <div className={`bubble ${isMine ? "mine" : "theirs"} vanish`}>
        <div className="deleted-text">Mensagem apagada para ambos usuários com total segurança.</div>
      </div>
    );
  }

  return (
    <div className={`bubble ${isMine ? "mine" : "theirs"}`}>
      {msg.content && (
        <div className="text">
          {translated ? (
            <>
              <div className="translated">{translated}</div>
              <div className="original small">Original: {msg.content}</div>
            </>
          ) : (
            <>{msg.content}</>
          )}
        </div>
      )}

      {msg.media_urls?.length ? (
        <div className="media-grid">
          {msg.media_urls.map((u, i) => (
            <a href={u} target="_blank" rel="noreferrer" key={i} className="media-item">Abrir arquivo</a>
          ))}
        </div>
      ) : null}

      <div className="meta">
        <div className="left">
          {det?.name && (
            <span className="lang-tag">Idioma: {det.name}{det.iso2 ? ` (${det.iso2})` : ""}</span>
          )}
          {det?.iso2 && det.iso2 !== (myLang || "pt") && msg.content && (
            <button className="btn translate" onClick={handleTranslate} disabled={translating}>
              {translating ? "Traduzindo..." : "Traduzir"}
            </button>
          )}
        </div>
        <div className="right">
          {showTimer && (
            <span className="timer" title="Mensagem será apagada ao zerar">
              <span className="clock"/> {label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
