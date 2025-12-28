import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MainNav } from "@/components/main-nav";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { NotificationBell } from "@/components/notification-bell";
import Link from "next/link";
import { Suspense } from "react";
import { Settings } from "lucide-react";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    // Check if user is admin for admin link
    const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin, display_name")
        .eq("id", user.id)
        .single();

    return (
        <main className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="flex items-center gap-2">
                            <span className="text-xl">🏎️</span>
                            <span className="font-bold hidden sm:inline whitespace-nowrap">F1 Sweepstakes</span>
                        </Link>
                        <MainNav />
                    </div>
                    <div className="flex items-center gap-2">
                        {profile?.is_admin && (
                            <Link
                                href="/admin"
                                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            >
                                <Settings className="h-4 w-4" />
                                <span className="hidden sm:inline">Admin</span>
                            </Link>
                        )}
                        <NotificationBell />
                        <Suspense fallback={<div className="h-8 w-8 rounded-full bg-muted animate-pulse" />}>
                            <AuthButton />
                        </Suspense>
                        <ThemeSwitcher />
                    </div>
                </div>
            </header>

            <div className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8">
                {children}
            </div>

            <footer className="border-t py-6 text-center text-xs text-muted-foreground">
                F1 Sweepstakes © {new Date().getFullYear()}
            </footer>
        </main>
    );
}
