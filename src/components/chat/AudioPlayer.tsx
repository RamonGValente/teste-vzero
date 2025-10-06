import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Download } from 'lucide-react';

interface Props {
  src: string;
  onFirstPlay?: () => void;
}

const fmt = (sec: number) => {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2,'0')}`;
};

export const AudioPlayer = ({ src, onFirstPlay }: Props) => {
  const stop = (e: any) => { e.stopPropagation?.(); };
  const audioRef = useRef<HTMLAudioElement>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [firstPlayed, setFirstPlayed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => {
      setDuration(audio.duration || 0);
      setReady(true);
    };
    const onTime = () => setCurrent(audio.currentTime);
    const onEnd = () => setPlaying(false);
    const onErr = () => {
      setError('Falha ao carregar/tocar o áudio.');
      setPlaying(false);
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('error', onErr);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('error', onErr);
    };
  }, [src]);

  const progress = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!firstPlayed) {
      setFirstPlayed(true);
      onFirstPlay?.();
    }
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      try {
        await audio.play();
        setPlaying(true);
      } catch (e) {
        setError('Reprodução bloqueada pelo navegador. Clique novamente.');
      }
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !ready) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const t = Math.max(0, Math.min(1, ratio)) * (duration || 0);
    audio.currentTime = t;
    setCurrent(t);
  };

  return (
    <div className="w-full max-w-[340px]" onClick={stop} onMouseDown={stop} onPointerDown={stop}>
      {/* elemento de áudio real (invisível) */}
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-sm">
        <Button size="icon" variant="secondary" onClick={(e) => { e.stopPropagation(); toggle(); }} className="rounded-full bg-white/20 hover:bg-white/30 border-0">
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        <div className="flex-1 select-none">
          <div className="text-xs opacity-95 mb-1">{error ? error : 'Mensagem de áudio'}</div>
          <div className="h-2 w-full rounded-full bg-white/25 overflow-hidden cursor-pointer" onClick={(e) => { e.stopPropagation(); seek(e); }} title="Arraste para buscar">
            <div className="h-full bg-white/90 rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-[11px] mt-1 opacity-90">
            <span>{fmt(current)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        {src && (
          <a href={src} download onClick={(e)=>e.stopPropagation()} className="ml-1 opacity-90 hover:opacity-100 transition" title="Baixar">
            <Download className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
};
