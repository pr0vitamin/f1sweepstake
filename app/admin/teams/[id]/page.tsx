import { createClient } from "@/lib/supabase/server";
import { TeamForm } from "@/components/admin/forms/team-form";
import { notFound } from "next/navigation";
import { Team } from "@/lib/types/database";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditTeamPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: team, error } = await supabase
        .from("teams")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !team) {
        notFound();
    }

    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Edit Team</h2>
            </div>
            <div className="border rounded-lg p-8">
                <TeamForm
                    seasonId={team.season_id}
                    initialData={team as Team}
                />
            </div>
        </div>
    );
}
