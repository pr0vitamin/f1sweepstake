import { createClient } from "@/lib/supabase/server";
import { DriverForm } from "@/components/admin/forms/driver-form";
import { notFound } from "next/navigation";
import { Driver, Team } from "@/lib/types/database";

// Define the correct type for Next.js 15+ App Router params
// params is now a Promise that resolves to the params object
type Props = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EditDriverPage({ params }: Props) {
    // Await params first (Next.js 15 async params requirement)
    const { id } = await params;

    const supabase = await createClient();

    // Parallel fetch: Driver and Active Teams
    const [driverRes, teamsRes] = await Promise.all([
        supabase.from("drivers").select("*").eq("id", id).single(),
        supabase.from("teams").select("*").eq("is_active", true).order("name"),
    ]);

    const driver = driverRes.data;
    const teams = teamsRes.data;

    if (driverRes.error || !driver) {
        notFound();
    }

    if (teamsRes.error || !teams) {
        return <div>Error loading teams</div>;
    }

    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Edit Driver</h2>
            </div>
            <div className="border rounded-lg p-8">
                <DriverForm
                    initialData={driver as Driver}
                    teams={teams as Team[]}
                />
            </div>
        </div>
    );
}
