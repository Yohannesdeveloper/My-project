import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create the client if environment variables are available
// Returns null during build time when env vars aren't set
const client =
  supabaseUrl && supabaseAnonKey
    ? createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
    : null;

// Export a getter that throws a clear error if used without configuration
// This prevents runtime errors and makes the issue obvious
export const supabaseBrowser = new Proxy({} as NonNullable<typeof client>, {
  get(_target, prop) {
    if (!client) {
      throw new Error(
        "Supabase client not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
      );
    }
    return client[prop as keyof typeof client];
  },
});

// Export the raw client for null checks
export const getSupabaseClient = () => client;

