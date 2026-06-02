import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/landing/LandingPage";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  
  // If Supabase isn't configured, just show the landing page
  if (!supabase) {
    return <LandingPage />;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}
