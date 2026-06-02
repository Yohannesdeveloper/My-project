import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const client =
  supabaseUrl && supabaseAnonKey
    ? createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
    : null;

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

export const getSupabaseClient = () => client;
