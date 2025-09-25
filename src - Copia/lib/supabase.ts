import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const supabaseUrl = 'https://amkfdpyuaurfarxcrodx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFta2ZkcHl1YXVyZmFyeGNyb2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNDUxNzUsImV4cCI6MjA2NjYyMTE3NX0.z-NzXBcb93C9uM42eoNyugLh2iKnt2Kd6gVQ-O6LGMw';

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});