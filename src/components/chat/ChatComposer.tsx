import * as React from "react";
import { cn } from "@/lib/utils";
import { Paperclip, Mic, Square, Send } from "lucide-react";
import AttentionButton from "@/components/chat/AttentionButton";
import { sendAttentionCall, attentionErrorMessage } from "@/services/attentionCalls";

type Props = { onSend: (text: string, files?: File[], audioBlob?: Blob) => void; disabled?: boolean; };

export default function ChatComposer({ onSend, disabled }: Props) {
  const taRef = React.useRef<HTMLTextAreaElement | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const [text, setText] = React.useState("");
  const [isRecording, setIsRecording] = React.useState(false);
  const recRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<BlobPart[]>([]);

  React.useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    const resize = () => { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 220) + "px"; };
    resize();
    const handler = () => resize();
    el.addEventListener("input", handler);
    return () => el.removeEventListener("input", handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(); }
  };

  const doSend = (files?: File[]) => {
    const clean = text.trim();
    if (!clean && !(files && files.length > 0)) { return; }
      return
    onSend(clean, files);
    setText("");
    requestAnimationFrame(() => taRef.current?.focus());
  };

  const pickFiles = () => fileRef.current?.click();
  const onPicked: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length) doSend(files);
    if (fileRef.current) fileRef.current.value = "";
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (ev) => { if (ev.data.size) chunksRef.current.push(ev.data); };
      mr.onstop = () => {
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onSend("", undefined, blob);
      };
      recRef.current = mr;
      mr.start();
      setIsRecording(true);
    } catch (e) { console.error(e); alert("Não foi possível acessar o microfone."); }
  };

  const stopRec = () => { const mr = recRef.current; if (mr && mr.state !== "inactive") mr.stop(); recRef.current = null; };

  return (
    <div className="flex items-end gap-2">
      <button type="button" onClick={pickFiles} className="h-11 w-11 shrink-0 rounded-xl border flex items-center justify-center hover:bg-accent" title="Anexar mídia" disabled={disabled}>
        <Paperclip size={18} />
      </button>
      <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" multiple onChange={onPicked} />

      <textarea
        ref={taRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={handleKeyDown}
        placeholder="Digite uma mensagem (Shift+Enter = nova linha)" disabled={disabled}
        className={cn("flex-1 min-h-[56px] max-h-56 resize-none rounded-xl border border-input bg-background/95",
                      "px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground leading-5")}
      />

      {!isRecording ? (
        <button type="button" onClick={startRec} disabled={disabled} className="h-11 w-11 shrink-0 rounded-xl border flex items-center justify-center hover:bg-accent disabled:opacity-50" title="Gravar áudio">
          <Mic size={18} />
        </button>
      ) : (
        <button type="button" onClick={stopRec} className="h-11 w-11 shrink-0 rounded-xl border flex items-center justify-center bg-destructive text-destructive-foreground hover:opacity-90" title="Parar gravação">
          <Square size={18} />
        </button>
      )}

      <button type="button" onClick={() => doSend()} disabled={disabled || !text.trim()} className="h-11 shrink-0 rounded-xl px-4 border bg-primary text-primary-foreground disabled:opacity-50" title="Enviar">
        <Send size={18} />
      </button>
    </div>
  );
}

// Exemplo TSX de uso:
// <AttentionButton
//   receiverId={receiverId}
//   className="px-3 py-2 rounded-xl border"
//   label="Chamar Atenção"
//   onSuccess={() => toast.success('Alerta enviado!')}
//   onError={(msg) => toast.error(msg)}
// />

