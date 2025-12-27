import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { Separator } from "@/components/ui/separator";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/auth/login");
    }

    // Check if user is admin
    const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

    if (!profile?.is_admin) {
        return redirect("/protected");
    }

    return (
        <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span className="hidden sm:inline">Back to App</span>
                        </Link>
                        <Separator orientation="vertical" className="h-6" />
                        <span className="font-bold">Admin Dashboard</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Suspense fallback={<div className="h-8 w-8 rounded-full bg-muted animate-pulse" />}>
                            <AuthButton />
                        </Suspense>
                        <ThemeSwitcher />
                    </div>
                </div>
            </header>

            <div className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
                    <aside className="lg:w-1/5">
                        <AdminNav />
                    </aside>
                    <div className="flex-1 lg:max-w-4xl">{children}</div>
                </div>
            </div>
        </div>
    );
}
