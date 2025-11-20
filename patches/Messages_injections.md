# Injeções em `src/pages/Messages.tsx` (mantendo seu layout)

> Procure os locais indicados e **adicione** os blocos abaixo. Não substitua o arquivo inteiro.

## 1) IMPORTS (no topo)
```ts
import { Languages, Trash2 } from "lucide-react";
import { translateText } from "@/services/translation";
import "@/styles/undoing.css";
```

## 2) STATES (perto de outros `useState`)
```ts
const [translated, setTranslated] = useState<Record<string,string>>({});
const [sourceLang, setSourceLang] = useState<Record<string,string|null>>({});
const [deletingIds, setDeletingIds] = useState<Record<string, number>>({});
const [remaining, setRemaining] = useState<Record<string, number>>({});
```

## 3) Idioma base do usuário
> Garanta que seu `profile` traga `preferred_language`.
```ts
const uiLang = (typeof navigator !== "undefined" && navigator.language ? navigator.language : "pt-BR").slice(0,2);
const effectiveLang = (profile?.preferred_language || uiLang || "pt").slice(0,2);
```

## 4) Ao visualizar mensagens recebidas, iniciar o timer de 2 minutos
```ts
useEffect(() => {
  if (!messages || !user) return;
  (async () => {
    for (const m of messages) {
      if (m.user_id !== user.id && !m.viewed_at) {
        try { await supabase.rpc("mark_message_viewed", { p_message_id: m.id, p_viewer: user.id }); } catch {}
      }
    }
  })();
}, [messages, user]);
```

## 5) Relógio regressivo (mm:ss)
```ts
useEffect(() => {
  const id = setInterval(() => {
    setRemaining(prev => {
      const next = { ...prev };
      (messages || []).forEach((m:any) => {
        if (!m.expires_at || m.is_deleted) return;
        const diff = Math.max(0, Math.floor((new Date(m.expires_at).getTime() - Date.now())/1000));
        next[m.id] = diff;
      });
      return next;
    });
  }, 1000);
  return () => clearInterval(id);
}, [messages]);
```

## 6) Excluir automaticamente quando zerar
```ts
useEffect(() => {
  (async () => {
    for (const m of (messages || [])) {
      if (!m.expires_at || m.is_deleted) continue;
      if ((remaining[m.id] ?? 0) === 0) {
        try { await supabase.rpc("expire_and_delete_message", { p_message_id: m.id }); } catch {}
      }
    }
  })();
}, [remaining, messages]);
```

## 7) Handlers
```ts
const handleTranslate = async (msg:any) => {
  if (!msg?.content) return;
  try {
    const { translated, source_language } = await translateText(msg.content, effectiveLang);
    setTranslated(p => ({ ...p, [msg.id]: translated }));
    setSourceLang(p => ({ ...p, [msg.id]: source_language || msg.detected_language || null }));
  } catch (e) { console.error("translate error", e); }
};

const handleDelete = async (msg:any) => {
  try {
    await supabase.from("message_deletions_user").insert({
      message_id: msg.id, conversation_id: msg.conversation_id, user_id: user?.id,
      original_content: msg.content, original_language: msg.detected_language ?? null,
    });
    await supabase.from("messages").update({
      is_deleted: true, content: "🔒 Mensagem apagada", deleted_at: new Date().toISOString(),
    }).eq("id", msg.id);

    setDeletingIds(prev => ({ ...prev, [msg.id]: 10 }));
    const t = setInterval(() => {
      setDeletingIds(prev => {
        const v = (prev[msg.id] ?? 0) - 1;
        const n = { ...prev };
        if (v <= 0) { clearInterval(t); delete n[msg.id]; supabase.from("messages").update({ content: "UnDoInG" }).eq("id", msg.id); }
        else n[msg.id] = v;
        return n;
      });
    }, 1000);
  } catch (e) { console.error("delete error", e); }
};

const shouldShowTranslate = (m:any) => {
  const lang = (m.detected_language || sourceLang[m.id] || "").slice(0,2);
  return lang && lang !== effectiveLang;
};
```

## 8) Dentro do Card de cada mensagem (linha de ações + tradução + estados)
> Adicione **fora** do `<p>` que contém o texto, para evitar `<div>` dentro de `<p>`.
```tsx
<div className={cn("flex items-center gap-3 text-xs mt-2", isOwn ? "justify-end" : "justify-start")}>
  {shouldShowTranslate(message) && (
    <button onClick={(e)=>{e.preventDefault(); handleTranslate(message);}} className="opacity-80 hover:opacity-100 inline-flex items-center gap-1" title="Traduzir">
      <Languages className="h-3 w-3" /> Traduzir
    </button>
  )}
  <button onClick={(e)=>{e.preventDefault(); handleDelete(message);}} className="opacity-80 hover:opacity-100 inline-flex items-center gap-1" title="Excluir">
    <Trash2 className="h-3 w-3" /> Excluir
  </button>
  {!!message.expires_at && !message.is_deleted && (
    <span className="text-[11px] opacity-80 ml-auto countdown-pill">
      {(() => {
        const r = remaining[message.id] ?? null;
        if (r === null) return null;
        const mm = Math.floor(r/60);
        const ss = String(r%60).padStart(2,"0");
        return <>Auto-exclusão em {mm}:{ss}</>;
      })()}
    </span>
  )}
</div>

{translated[message.id] && (
  <div className="mt-2 border-l-2 pl-3">
    <div className="text-[11px] uppercase tracking-wider opacity-60">
      Idioma de origem: {(sourceLang[message.id] || message.detected_language || "desconhecido")}
    </div>
    <div className="whitespace-pre-wrap translated-text">
      {translated[message.id]}
    </div>
  </div>
)}

{message.is_deleted && (
  <div className="text-xs mt-2">
    {deletingIds[message.id] ? (
      <span className="undoing font-semibold">UnDoInG • {deletingIds[message.id]}s</span>
    ) : message.content === "UnDoInG" ? (
      <span className="undoing font-semibold">UnDoInG</span>
    ) : (
      <span className="opacity-70">🔒 Mensagem apagada</span>
    )}
  </div>
)}
```
