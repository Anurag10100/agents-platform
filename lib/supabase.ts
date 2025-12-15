import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// For single-user mode, we use localStorage as fallback when Supabase is not configured
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Create Supabase client (will be null if not configured)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Default user ID for single-user mode
export const DEFAULT_USER_ID = 'single-user';

// Helper to get current user ID
export function getCurrentUserId(): string {
  // In single-user mode, use default ID
  // Later, this will integrate with Supabase Auth
  return DEFAULT_USER_ID;
}
