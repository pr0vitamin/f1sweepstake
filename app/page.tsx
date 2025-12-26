import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If user is logged in, go to dashboard
  if (user) {
    redirect("/dashboard");
  }

  // Public landing page for non-authenticated users
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted">
      <div className="text-center space-y-8 p-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">
            🏎️ F1 Sweepstakes
          </h1>
          <p className="text-xl text-muted-foreground max-w-md mx-auto">
            Draft your drivers, score points, compete with friends.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/auth/login">Sign In</Link>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Invite-only. Contact your admin for access.
        </p>
      </div>
    </main>
  );
}
