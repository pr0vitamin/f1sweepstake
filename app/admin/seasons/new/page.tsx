import { SeasonForm } from "@/components/admin/forms/season-form";

export default function NewSeasonPage() {
    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Create Season</h2>
            </div>
            <div className="border rounded-lg p-8">
                <SeasonForm />
            </div>
        </div>
    );
}
