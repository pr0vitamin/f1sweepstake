"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Race } from "@/lib/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash } from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const columns: ColumnDef<Race>[] = [
    {
        accessorKey: "round_number",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Round
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
    },
    {
        accessorKey: "name",
        header: "Race",
        cell: ({ row }) => {
            return (
                <div className="flex flex-col">
                    <span className="font-medium">{row.getValue("name")}</span>
                    <span className="text-xs text-muted-foreground">{row.original.location}</span>
                </div>
            )
        }
    },
    {
        accessorKey: "race_date",
        header: "Date",
        cell: ({ row }) => {
            const dateStr = row.getValue("race_date") as string;
            // Postgres date 'YYYY-MM-DD' parses correctly with parseISO or new Date in modern browsers
            return <span>{format(parseISO(dateStr), "MMM d, yyyy")}</span>
        }
    },
    {
        accessorKey: "picks_open",
        header: "Status",
        cell: ({ row }) => {
            const isOpen = row.getValue("picks_open");
            const isFinalized = row.original.results_finalized;

            if (isFinalized) {
                return <Badge variant="secondary">Finalized</Badge>
            }
            return (
                <Badge variant={isOpen ? "default" : "outline"} className={!isOpen ? "border-dashed" : ""}>
                    {isOpen ? "Open" : "Adjusting"}
                </Badge>
            );
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const race = row.original;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                            <Link href={`/admin/races/${race.id}`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit Race
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            Import Results (Todo)
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                            <Trash className="mr-2 h-4 w-4" />
                            Delete Race
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
