import { createClient } from "@/lib/supabase/server";
import { RaceForm } from "@/components/admin/forms/race-form";
import { notFound } from "next/navigation";
import { Race } from "@/lib/types/database";

type Props = {
    params: Promise<{ id: string }>;
}

export default async function EditRacePage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: race, error } = await supabase
        .from("races")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !race) {
        notFound();
    }

    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Edit Race</h2>
            </div>
            <div className="border rounded-lg p-8">
                <RaceForm
                    seasonId={race.season_id}
                    initialData={race as Race}
                />
            </div>
        </div>
    );
}
