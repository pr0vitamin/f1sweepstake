"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Season } from "@/lib/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, Pencil, Settings, Trash } from "lucide-react";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const columns: ColumnDef<Season>[] = [
    {
        accessorKey: "year",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Year
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => <span className="font-bold text-lg">{row.getValue("year")}</span>
    },
    {
        accessorKey: "is_current",
        header: "Status",
        cell: ({ row }) => {
            const isCurrent = row.getValue("is_current");
            if (isCurrent) {
                return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Current Season</Badge>
            }
            return <Badge variant="secondary">Archived</Badge>
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const season = row.original;

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
                            <Link href={`/admin/seasons/${season.id}`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit Season
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/admin/points?season=${season.id}`}>
                                <Settings className="mr-2 h-4 w-4" />
                                Configure Points
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
