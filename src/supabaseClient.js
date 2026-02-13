
import { createClient } from '@supabase/supabase-js';

// Project ID extracted from user's connection string
const supabaseUrl = 'https://hmuenoziucgyjtctgify.supabase.co';

const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtdWVub3ppdWNneWp0Y3RnaWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NjcyNDAsImV4cCI6MjA4NjU0MzI0MH0.M_cqXKnes1wnsg24-nS5fZV_QHbgk14wPlp4V2kje34';

export const supabase = createClient(supabaseUrl, supabaseKey);
