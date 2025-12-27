"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Season } from "@/lib/types/database";

interface SeasonSelectorProps {
    seasons: Season[];
    currentSeasonId: string;
}

export function SeasonSelector({ seasons, currentSeasonId }: SeasonSelectorProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleSeasonChange = (seasonId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("season", seasonId);
        router.push(`?${params.toString()}`);
    };

    const currentSeason = seasons.find(s => s.id === currentSeasonId);

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Season:</span>
            <Select value={currentSeasonId} onValueChange={handleSeasonChange}>
                <SelectTrigger className="w-[140px]">
                    <SelectValue>
                        {currentSeason?.year || "Select season"}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {seasons.map((season) => (
                        <SelectItem key={season.id} value={season.id}>
                            {season.year} {season.is_current && "(Current)"}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
