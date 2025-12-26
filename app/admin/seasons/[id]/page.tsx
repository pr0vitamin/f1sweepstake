import { createClient } from "@/lib/supabase/server";
import { SeasonForm } from "@/components/admin/forms/season-form";
import { notFound } from "next/navigation";
import { Season } from "@/lib/types/database";

type Props = {
    params: Promise<{ id: string }>;
}

export default async function EditSeasonPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: season, error } = await supabase
        .from("seasons")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !season) {
        notFound();
    }

    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Edit Season</h2>
            </div>
            <div className="border rounded-lg p-8">
                <SeasonForm initialData={season as Season} />
            </div>
        </div>
    );
}
