# Patch: erro inesperado ao logar (listener de atenção)

Arquivos incluídos:
- `src/components/realtime/RealtimeAttentionListener.tsx` (substitua o atual)
- `src/components/system/ErrorBoundary.tsx` (opcional: envolva seu App)
- `supabase/sql/04_attention_realtime_fix.sql` (rode uma vez; ignore erro 42710)

Uso do ErrorBoundary (opcional):
```tsx
import { ErrorBoundary } from '@/components/system/ErrorBoundary';
import App from './App';

export default function Root() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
```
