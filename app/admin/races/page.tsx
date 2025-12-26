import { createClient } from "@/lib/supabase/server";
import { DataTable } from "@/components/admin/data-table";
import { columns } from "./columns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Race } from "@/lib/types/database";

export default async function RacesPage() {
    const supabase = await createClient();

    const { data: races, error } = await supabase
        .from("races")
        .select("*")
        .order("round_number", { ascending: true });

    if (error) {
        console.error("Error fetching races:", error);
        return <div>Error loading races</div>;
    }

    const typedRaces = races as Race[];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Races</h1>
                <Button asChild>
                    <Link href="/admin/races/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Race
                    </Link>
                </Button>
            </div>
            <DataTable columns={columns} data={typedRaces} />
        </div>
    );
}
