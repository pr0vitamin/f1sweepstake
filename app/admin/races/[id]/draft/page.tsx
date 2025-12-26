import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { DraftConfig } from "@/components/admin/draft-config";
import { DraftOrderEntry } from "@/lib/draft-order";

type Props = {
    params: Promise<{ id: string }>;
}

export default async function DraftConfigPage({ params }: Props) {
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
                <h2 className="text-3xl font-bold tracking-tight">Draft Configuration</h2>
                <div className="text-muted-foreground">
                    {race.name}
                </div>
            </div>
            <div className="h-full py-6">
                <DraftConfig
                    raceId={race.id}
                    roundNumber={race.round_number}
                    initialDraftOrder={race.draft_order as DraftOrderEntry[]}
                />
            </div>
        </div>
    );
}
