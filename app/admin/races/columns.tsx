"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Race } from "@/lib/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash, Trophy, Loader2 } from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { useState, useTransition } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteRace } from "../actions";

function RaceActionsCell({ race }: { race: Race }) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteRace(race.id);
            if (!result.success) {
                setError(result.error || "Failed to delete race");
            } else {
                setShowDeleteDialog(false);
            }
        });
    };

    return (
        <>
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
                    <DropdownMenuItem asChild>
                        <Link href={`/admin/races/${race.id}/results`}>
                            <Trophy className="mr-2 h-4 w-4" />
                            Manage Results
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => setShowDeleteDialog(true)}
                    >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete Race
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
                setShowDeleteDialog(open);
                if (!open) setError(null);
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Race</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{race.name}</strong> (Round {race.round_number})?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded-md">
                            {error}
                        </div>
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <Button
                            onClick={handleDelete}
                            disabled={isPending}
                            variant="destructive"
                        >
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

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
            return <span>{format(parseISO(dateStr), "MMM d, yyyy")}</span>
        }
    },
    {
        accessorKey: "picks_open",
        header: "Status",
        cell: ({ row }) => {
            const picksOpen = row.getValue("picks_open") as boolean;
            const resultsFinalized = row.original.results_finalized;
            const hasDraftOrder = !!row.original.draft_order;

            if (resultsFinalized) {
                return <Badge variant="secondary">Completed</Badge>;
            }
            if (picksOpen) {
                return <Badge className="bg-green-600 hover:bg-green-700">Draft Open</Badge>;
            }
            if (hasDraftOrder) {
                return <Badge variant="outline" className="border-amber-500 text-amber-600">Awaiting Results</Badge>;
            }
            return <Badge variant="outline" className="border-dashed">Upcoming</Badge>;
        },
    },
    {
        id: "actions",
        cell: ({ row }) => <RaceActionsCell race={row.original} />,
    },
];
