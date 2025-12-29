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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Driver, Team } from "@/lib/types/database";

const formSchema = z.object({
    first_name: z.string().min(2, "First name is too short"),
    last_name: z.string().min(2, "Last name is too short"),
    abbreviation: z.string().length(3, "Abbreviation must be exactly 3 letters").toUpperCase(),
    driver_number: z.preprocess(
        (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
        z.number().min(1, "Number must be > 0").max(99, "Number must be < 100")
    ),
    team_id: z.string().uuid("Please select a team"),
    is_active: z.boolean().default(true),
});

interface DriverFormProps {
    initialData?: Driver;
    teams: Team[];
}

export function DriverForm({ initialData, teams }: DriverFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    type FormValues = {
        first_name: string;
        last_name: string;
        abbreviation: string;
        driver_number: number;
        team_id: string;
        is_active: boolean;
    };

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            first_name: initialData?.first_name || "",
            last_name: initialData?.last_name || "",
            abbreviation: initialData?.abbreviation || "",
            driver_number: initialData?.driver_number || 0,
            team_id: initialData?.team_id || "",
            is_active: initialData?.is_active ?? true,
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        const supabase = createClient();

        try {
            if (initialData) {
                const { error } = await supabase
                    .from("drivers")
                    .update({
                        first_name: values.first_name,
                        last_name: values.last_name,
                        abbreviation: values.abbreviation,
                        driver_number: values.driver_number,
                        team_id: values.team_id,
                        is_active: values.is_active,
                    })
                    .eq("id", initialData.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("drivers")
                    .insert({
                        first_name: values.first_name,
                        last_name: values.last_name,
                        abbreviation: values.abbreviation,
                        driver_number: values.driver_number,
                        team_id: values.team_id,
                        is_active: values.is_active,
                    });

                if (error) throw error;
            }

            router.push("/admin/drivers");
            router.refresh();
        } catch (error: any) {
            console.error("Error saving driver:", error);
            alert(`Error saving driver: ${error?.message || 'Unknown error'}`);
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
                        name="first_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Max" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="last_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Verstappen" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="abbreviation"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Abbreviation (3 Letters)</FormLabel>
                                <FormControl>
                                    <Input placeholder="VER" maxLength={3} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="driver_number"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Number</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="1" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="team_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Team</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a team" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {teams.map((team) => (
                                        <SelectItem key={team.id} value={team.id}>
                                            {team.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                                <FormLabel>Active</FormLabel>
                            </div>
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {initialData ? "Update Driver" : "Create Driver"}
                </Button>
            </form>
        </Form>
    );
}
