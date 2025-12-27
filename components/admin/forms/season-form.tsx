"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Season } from "@/lib/types/database";

const formSchema = z.object({
    year: z.coerce.number().min(2000, "Year must be > 2000").max(2100, "Year must be < 2100"),
    is_current: z.boolean().default(false),
});

interface SeasonFormProps {
    initialData?: Season;
}

export function SeasonForm({ initialData }: SeasonFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            year: initialData?.year || new Date().getFullYear(),
            is_current: initialData?.is_current ?? false,
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        const supabase = createClient();

        try {
            if (initialData) {
                // If setting to current, we might need to unset others, but let's assume one active for now
                // Or handle it via trigger? Supabase doesn't enforce single true row easily without partial index
                // For now, let's just update.
                if (values.is_current) {
                    // Unset other current seasons first if this one is becoming current
                    await supabase
                        .from("seasons")
                        .update({ is_current: false })
                        .neq("id", initialData.id);
                }

                const { error } = await supabase
                    .from("seasons")
                    .update({
                        year: values.year,
                        is_current: values.is_current,
                    })
                    .eq("id", initialData.id);

                if (error) throw error;
            } else {
                if (values.is_current) {
                    await supabase
                        .from("seasons")
                        .update({ is_current: false })
                        .neq("id", "00000000-0000-0000-0000-000000000000"); // Hacky neq
                }

                const { error } = await supabase
                    .from("seasons")
                    .insert({
                        year: values.year,
                        is_current: values.is_current,
                    });

                if (error) throw error;
            }

            router.push("/admin/seasons");
            router.refresh();
        } catch (error) {
            console.error("Error saving season:", error);
            alert("Error saving season");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-lg">
                <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Season Year</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="is_current"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                    Current Season
                                </FormLabel>
                                <FormDescription>
                                    This will set this season as the active one.
                                </FormDescription>
                            </div>
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {initialData ? "Update Season" : "Create Season"}
                </Button>
            </form>
        </Form>
    );
}
