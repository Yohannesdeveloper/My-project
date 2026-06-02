import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";

export async function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Return null if environment variables aren't available (e.g., during build)
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // The `set` method is called after a Server Component render.
          // This can happen in Server Components (not Server Actions/Route Handlers),
          // where cookie modification is not allowed. This is expected and safe to ignore.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.delete({ name, ...options });
        } catch {
          // The `delete` method is called after a Server Component render.
          // This can happen in Server Components (not Server Actions/Route Handlers),
          // where cookie modification is not allowed. This is expected and safe to ignore.
        }
      },
    },
  });
}

