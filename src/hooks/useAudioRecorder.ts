import { useCallback, useRef, useState } from 'react';

type RecorderState = 'idle' | 'recording' | 'stopped';

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  url: string;
  durationSec: number;
}

function pickMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/aac',
  ];
  // @ts-ignore
  if (typeof window !== 'undefined' && window.MediaRecorder) {
    // @ts-ignore
    const MR = window.MediaRecorder as any;
    for (const c of candidates) {
      if (MR.isTypeSupported?.(c)) return c;
    }
  }
  return 'audio/webm';
}

export const useAudioRecorder = () => {
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastRecording, setLastRecording] = useState<RecordingResult | null>(null);

  const chunks = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const mimeRef = useRef<string>(pickMimeType());

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const cleanup = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    recRef.current = null;
    clearTimer();
  };

  const start = useCallback(async () => {
    try {
      setError(null);
      setLastRecording(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunks.current = [];
      mimeRef.current = pickMimeType();
      // @ts-ignore
      const rec = new MediaRecorder(stream, { mimeType: mimeRef.current });
      recRef.current = rec;

      rec.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: mimeRef.current });
        const url = URL.createObjectURL(blob);
        const result: RecordingResult = {
          blob,
          mimeType: mimeRef.current,
          url,
          durationSec: elapsed,
        };
        setLastRecording(result);
        cleanup();
      };

      rec.start();
      setElapsed(0);
      setState('recording');
      timerRef.current = window.setInterval(() => setElapsed(prev => prev + 1), 1000);
    } catch (err: any) {
      console.error(err);
      setError('Não foi possível acessar o microfone. Verifique as permissões.');
      setState('idle');
      cleanup();
    }
  }, [elapsed]);

  const stop = useCallback(() => {
    if (recRef.current && recRef.current.state !== 'inactive') {
      recRef.current.stop();
      clearTimer();
      setState('stopped');
    }
  }, []);

  const cancel = useCallback(() => {
    try {
      if (recRef.current && recRef.current.state !== 'inactive') {
        recRef.current.stop();
      }
    } catch {}
    chunks.current = [];
    cleanup();
    setElapsed(0);
    setState('idle');
    setLastRecording(null);
  }, []);

  return {
    state,
    isRecording: state === 'recording',
    elapsed,
    lastRecording,
    error,
    start,
    stop,
    cancel,
  };
};
