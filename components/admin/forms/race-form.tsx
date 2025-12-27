"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Race } from "@/lib/types/database";

const formSchema = z.object({
    name: z.string().min(2, "Name is too short"),
    location: z.string().min(2, "Location is too short"),
    round_number: z.coerce.number().min(1, "Round must be > 0"),
    race_date: z.date({
        required_error: "A date of race is required.",
    }),
    picks_open: z.boolean().default(false),
    results_finalized: z.boolean().default(false),
});

interface RaceFormProps {
    initialData?: Race;
    seasonId: string;
}

export function RaceForm({ initialData, seasonId }: RaceFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: initialData?.name || "",
            location: initialData?.location || "",
            round_number: initialData?.round_number || 1,
            race_date: initialData?.race_date ? new Date(initialData.race_date) : undefined,
            picks_open: initialData?.picks_open ?? false,
            results_finalized: initialData?.results_finalized ?? false,
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        const supabase = createClient();

        // Format date as YYYY-MM-DD for Postgres DATE type
        const formattedDate = format(values.race_date, "yyyy-MM-dd");

        try {
            if (initialData) {
                const { error } = await supabase
                    .from("races")
                    .update({
                        name: values.name,
                        location: values.location,
                        round_number: values.round_number,
                        race_date: formattedDate,
                        picks_open: values.picks_open,
                        results_finalized: values.results_finalized,
                    })
                    .eq("id", initialData.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("races")
                    .insert({
                        season_id: seasonId,
                        name: values.name,
                        location: values.location,
                        round_number: values.round_number,
                        race_date: formattedDate,
                        picks_open: values.picks_open,
                        results_finalized: values.results_finalized,
                    });

                if (error) throw error;
            }

            router.push("/admin/races");
            router.refresh();
        } catch (error: any) {
            console.error("Error saving race:", error);

            // Handle specific error cases
            let errorMessage = "Error saving race";

            if (error?.code === "23505" || error?.message?.includes("duplicate") || error?.message?.includes("unique")) {
                errorMessage = `Round ${values.round_number} already exists for this season. Please choose a different round number.`;
            } else if (error?.message) {
                errorMessage = error.message;
            }

            alert(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-lg">
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Race Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Bahrain Grand Prix" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Location</FormLabel>
                                <FormControl>
                                    <Input placeholder="Sakhir" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="round_number"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Round #</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="race_date"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Race Date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(field.value, "PPP")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) =>
                                                date < new Date("2024-01-01")
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="picks_open"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>Picks Open</FormLabel>
                                    <FormDescription>Can users pick?</FormDescription>
                                </div>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="results_finalized"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>Finalized</FormLabel>
                                    <FormDescription>Is race over?</FormDescription>
                                </div>
                            </FormItem>
                        )}
                    />
                </div>

                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {initialData ? "Update Race" : "Create Race"}
                </Button>
            </form>
        </Form>
    );
}
