import { createClient } from "@/lib/supabase/server";
import { DataTable } from "@/components/admin/data-table";
import { columns } from "./columns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Team } from "@/lib/types/database";

export default async function TeamsPage() {
    const supabase = await createClient();

    // Fetch all teams using our database types
    const { data: teams, error } = await supabase
        .from("teams")
        .select("*")
        .order("name", { ascending: true });

    if (error) {
        console.error("Error fetching teams:", error);
        return <div>Error loading teams</div>;
    }

    // Cast to ensure type compatibility if needed, though supabase-js is usually good
    const typedTeams = teams as Team[];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
                <Button asChild>
                    <Link href="/admin/teams/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Team
                    </Link>
                </Button>
            </div>
            <DataTable columns={columns} data={typedTeams} />
        </div>
    );
}
