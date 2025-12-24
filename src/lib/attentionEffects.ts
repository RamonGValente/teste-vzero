let lastAttentionEffectAt = 0;

/**
 * Evita efeitos duplicados (Realtime + Push) disparando em sequência.
 * Retorna true quando é OK executar o efeito agora.
 */
export function shouldRunAttentionEffect(cooldownMs = 1400): boolean {
  const now = Date.now();
  if (now - lastAttentionEffectAt < cooldownMs) return false;
  lastAttentionEffectAt = now;
  return true;
}

export function runShakeEffect(durationMs = 700) {
  try {
    document.body.classList.add('shake');
    window.setTimeout(() => document.body.classList.remove('shake'), durationMs);
  } catch {
    // noop
  }
}

export function runAttentionVibration() {
  try {
    if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
  } catch {
    // noop
  }
}
