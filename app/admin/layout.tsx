import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { Separator } from "@/components/ui/separator";

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
        <div className="flex min-h-screen flex-col space-y-6 p-8 pb-16">
            <div className="flex flex-col space-y-0.5">
                <h2 className="text-2xl font-bold tracking-tight">Admin Dashboard</h2>
                <p className="text-muted-foreground">
                    Manage F1 Sweepstakes data and configuration.
                </p>
            </div>
            <Separator className="my-6" />
            <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
                <aside className="-mx-4 lg:w-1/5">
                    <AdminNav />
                </aside>
                <div className="flex-1 lg:max-w-4xl">{children}</div>
            </div>
        </div>
    );
}
