import { createClient } from "@/lib/supabase/server";
import { UsersTable } from "./users-table";

export default async function UsersPage() {
    const supabase = await createClient();

    // Fetch all seasons for the copy points feature
    const { data: seasons } = await supabase
        .from("seasons")
        .select("*")
        .order("year", { ascending: false });

    // Fetch all users with their profiles
    const { data: users, error } = await supabase
        .from("profiles")
        .select("*")
        .order("display_name", { ascending: true });

    if (error) {
        return (
            <div className="flex-1 space-y-4">
                <h2 className="text-3xl font-bold tracking-tight">Users</h2>
                <p className="text-muted-foreground">Error loading users: {error.message}</p>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Users</h2>
            </div>
            <UsersTable
                users={users || []}
                seasons={seasons || []}
            />
        </div>
    );
}
