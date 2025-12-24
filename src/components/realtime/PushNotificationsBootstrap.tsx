import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { withOneSignal } from '@/integrations/onesignal/oneSignal';

type PushPayload = {
  title?: string;
  body?: string;
  icon?: string;
  image?: string;
  data?: { url?: string };
};

export function PushNotificationsBootstrap() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('/sounds/alertasom.mp3');
    audioRef.current.preload = 'auto';
  }, []);

  // OneSignal: toast + som no primeiro plano + clique
  useEffect(() => {
    const extract = (e: any) => {
      const n = e?.notification ?? e?.result?.notification ?? null;
      const data = n?.additionalData ?? n?.data ?? {};
      return {
        title: n?.title ?? n?.headings?.pt ?? n?.headings?.en ?? 'UDG',
        body: n?.body ?? n?.contents?.pt ?? n?.contents?.en ?? '',
        icon: n?.icon,
        image: n?.image,
        url: data?.url ?? n?.url ?? n?.launchURL,
      } as PushPayload & { url?: string };
    };

    const onForeground = (event: any) => {
      const p = extract(event);
      if (!p.title && !p.body) return;
      play();
      toast(`${p.title}${p.body ? ` — ${p.body}` : ''}`);
    };

    const onClick = (event: any) => {
      const p = extract(event);
      if (p?.url) window.location.href = p.url;
    };

    withOneSignal(async (OneSignal) => {
      try {
        OneSignal.Notifications.addEventListener('foregroundWillDisplay', onForeground);
      } catch {}
      try {
        OneSignal.Notifications.addEventListener('click', onClick);
      } catch {}
    });

    return () => {
      withOneSignal(async (OneSignal) => {
        try {
          OneSignal.Notifications.removeEventListener('foregroundWillDisplay', onForeground);
        } catch {}
        try {
          OneSignal.Notifications.removeEventListener('click', onClick);
        } catch {}
      });
    };
  }, []);

  const play = async () => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
      }
    } catch {
      // autoplay restrictions
    }
  };

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event?.data || event.data.type !== 'PUSH_RECEIVED') return;
      const payload = (event.data.payload || {}) as PushPayload;
      play();
      toast.custom(
        () => (
          <div className='flex items-center gap-3 px-3 py-2'>
            <div className='h-8 w-8 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0'>
              {payload.image || payload.icon ? (
                <img src={(payload.image || payload.icon) as string} alt='Avatar' className='h-full w-full object-cover' />
              ) : (
                <span className='text-xs font-semibold'>!</span>
              )}
            </div>
            <div className='min-w-0'>
              <div className='font-semibold leading-5'>{payload.title || 'UDG'}</div>
              <div className='text-xs text-muted-foreground truncate max-w-[280px]'>{payload.body || ''}</div>
            </div>
          </div>
        ),
        {
          duration: 4000,
          onClick: () => {
            const url = payload?.data?.url;
            if (url) window.location.href = url;
          },
        }
      );
    };

    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, []);

  return null;
}
