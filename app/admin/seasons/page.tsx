import { createClient } from "@/lib/supabase/server";
import { DataTable } from "@/components/admin/data-table";
import { columns } from "./columns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Season } from "@/lib/types/database";

export default async function SeasonsPage() {
    const supabase = await createClient();

    const { data: seasons, error } = await supabase
        .from("seasons")
        .select("*")
        .order("year", { ascending: false });

    if (error) {
        console.error("Error fetching seasons:", error);
        return <div>Error loading seasons</div>;
    }

    const typedSeasons = seasons as Season[];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Seasons</h1>
                <Button asChild>
                    <Link href="/admin/seasons/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Season
                    </Link>
                </Button>
            </div>
            <DataTable columns={columns} data={typedSeasons} />
        </div>
    );
}
