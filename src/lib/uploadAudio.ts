import { supabase } from '@/lib/supabase';

function extFromMime(m: string): string {
  if (m.includes('webm')) return 'webm';
  if (m.includes('ogg')) return 'ogg';
  if (m.includes('mp4')) return 'm4a';
  if (m.includes('aac')) return 'aac';
  return 'webm';
}

const BUCKET_PREFERENCE = ['chat-audio', 'message-files', 'chat-files'] as const;

const safeId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

/**
 * Uploads audio and returns a public URL (assuming chosen bucket is public).
 * Tries buckets in BUCKET_PREFERENCE order.
 */
export async function uploadAudioForChat(
  blob: Blob,
  opts: { senderId: string; receiverId: string; mimeType?: string }
): Promise<{ url: string; fileName: string; bucket: string } | null> {
  const mime = opts.mimeType || blob.type || 'audio/webm';
  const ext = extFromMime(mime);
  const fileName = `${safeId()}.${ext}`;
  const key = `${opts.senderId}/${opts.receiverId}/${fileName}`;

  let lastErr: any = null;

  for (const bucket of BUCKET_PREFERENCE) {
    const { error: upErr } = await supabase.storage.from(bucket).upload(key, blob, {
      contentType: mime,
      upsert: false,
    });
    if (!upErr) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(key);
      if (data?.publicUrl) {
        return { url: data.publicUrl, fileName, bucket };
      }
    } else {
      lastErr = upErr;
    }
  }

  console.error('Falha no upload de áudio', lastErr);
  return null;
}
