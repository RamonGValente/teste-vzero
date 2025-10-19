import * as React from "react";
import { cn } from "@/lib/utils";
import { Paperclip, Mic, Square, Send } from "lucide-react";

type ChatInputProps = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onUploadFiles: (files: File[]) => void;
  onRecordStart: () => void;
  onRecordStop: () => void;
  isRecording?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

export default function ChatInput({
  value,
  onChange,
  onSend,
  onUploadFiles,
  onRecordStart,
  onRecordStop,
  isRecording,
  disabled,
  placeholder,
}: ChatInputProps) {
  const ref = React.useRef<HTMLTextAreaElement | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const resize = () => {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    };
    resize();
    const handler = () => resize();
    el.addEventListener("input", handler);
    return () => el.removeEventListener("input", handler);
  }, []);

  const pickFiles = () => fileRef.current?.click();
  const onPicked: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length) onUploadFiles(files);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex items-end gap-2">
      <button
        type="button"
        onClick={pickFiles}
        className="h-11 w-11 shrink-0 rounded-xl border flex items-center justify-center hover:bg-accent"
        title="Enviar foto ou vídeo"
      >
        <Paperclip size={18} />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        multiple
        onChange={onPicked}
      />

      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Digite uma mensagem..."}
        disabled={disabled}
        className={cn(
          "flex-1 min-h-[56px] max-h-52 resize-none rounded-xl border border-input bg-background/95",
          "px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground leading-5"
        )}
      />

      {!isRecording ? (
        <button
          type="button"
          onClick={onRecordStart}
          disabled={disabled}
          className="h-11 w-11 shrink-0 rounded-xl border flex items-center justify-center hover:bg-accent disabled:opacity-50"
          title="Gravar áudio"
        >
          <Mic size={18} />
        </button>
      ) : (
        <button
          type="button"
          onClick={onRecordStop}
          className="h-11 w-11 shrink-0 rounded-xl border flex items-center justify-center bg-destructive text-destructive-foreground hover:opacity-90"
          title="Parar gravação"
        >
          <Square size={18} />
        </button>
      )}

      <button
        type="button"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="h-11 shrink-0 rounded-xl px-4 border bg-primary text-primary-foreground disabled:opacity-50"
        title="Enviar"
      >
        <Send size={18} />
      </button>
    </div>
  );
}
