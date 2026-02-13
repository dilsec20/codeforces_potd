
import { createClient } from '@supabase/supabase-js';

// Project ID extracted from user's connection string
const supabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co';

// REPLACE THIS WITH YOUR ACTUAL ANON KEY
const supabaseKey = 'REPLACE_ME_WITH_ANON_KEY';

export const supabase = supabaseKey !== 'REPLACE_ME_WITH_ANON_KEY'
    ? createClient(supabaseUrl, supabaseKey)
    : null;
