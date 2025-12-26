import { createClient } from "@/lib/supabase/server";
import { DataTable } from "@/components/admin/data-table";
import { columns } from "./columns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { DriverWithTeam } from "@/lib/types/database";

export default async function DriversPage() {
    const supabase = await createClient();

    // Fetch drivers with team info
    const { data: drivers, error } = await supabase
        .from("drivers")
        .select("*, team:teams(*)")
        .order("driver_number", { ascending: true });

    if (error) {
        console.error("Error fetching drivers:", error);
        return <div>Error loading drivers</div>;
    }

    const typedDrivers = drivers as DriverWithTeam[];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Drivers</h1>
                <Button asChild>
                    <Link href="/admin/drivers/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Driver
                    </Link>
                </Button>
            </div>
            <DataTable columns={columns} data={typedDrivers} />
        </div>
    );
}
