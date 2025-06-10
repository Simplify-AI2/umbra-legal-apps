import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dhndhxglrscettstgfyx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRobmRoeGdscnNjZXR0c3RnZnl4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzE5OTI2OCwiZXhwIjoyMDYyNzc1MjY4fQ.nZbdGcjBPru_GcIZjMGwUJgrenIY5TvymbwrKqEGFms';

export const supabase = createClient(supabaseUrl, supabaseServiceKey); 