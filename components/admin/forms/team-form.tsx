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
import { Team } from "@/lib/types/database";

const formSchema = z.object({
    name: z.string().min(2, {
        message: "Name must be at least 2 characters.",
    }),
    color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
        message: "Must be a valid hex color code (e.g. #FF0000).",
    }),
    is_active: z.boolean().default(true),
});

interface TeamFormProps {
    initialData?: Team;
    seasonId: string;
}

export function TeamForm({ initialData, seasonId }: TeamFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: initialData?.name || "",
            color: initialData?.color || "#000000",
            is_active: initialData?.is_active ?? true,
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        const supabase = createClient();

        try {
            if (initialData) {
                // Update existing team
                const { error } = await supabase
                    .from("teams")
                    .update({
                        name: values.name,
                        color: values.color,
                        is_active: values.is_active,
                    })
                    .eq("id", initialData.id);

                if (error) throw error;
            } else {
                // Create new team
                const { error } = await supabase
                    .from("teams")
                    .insert({
                        name: values.name,
                        color: values.color,
                        is_active: values.is_active,
                        season_id: seasonId,
                    });

                if (error) throw error;
            }

            router.push("/admin/teams");
            router.refresh();
        } catch (error) {
            console.error("Error saving team:", error);
            // You could add toast notification here
            alert("Error saving team. Check console for details.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-lg">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Team Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Red Bull Racing" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="color"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Color (Hex)</FormLabel>
                                <div className="flex gap-2">
                                    <FormControl>
                                        <Input placeholder="#000000" {...field} />
                                    </FormControl>
                                    <div
                                        className="w-10 h-10 rounded border shrink-0"
                                        style={{ backgroundColor: field.value }}
                                    />
                                </div>
                                <FormDescription>
                                    Used for badges and charts.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="is_active"
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
                                        Active
                                    </FormLabel>
                                    <FormDescription>
                                        Include in draft options?
                                    </FormDescription>
                                </div>
                            </FormItem>
                        )}
                    />
                </div>
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {initialData ? "Update Team" : "Create Team"}
                </Button>
            </form>
        </Form>
    );
}
