"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DriverWithTeam } from "@/lib/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash, Loader2 } from "lucide-react";
import Link from "next/link";
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
import { deleteDriver } from "../actions";

function DriverActionsCell({ driver }: { driver: DriverWithTeam }) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteDriver(driver.id);
            if (!result.success) {
                setError(result.error || "Failed to delete driver");
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
                        <Link href={`/admin/drivers/${driver.id}`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Driver
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => setShowDeleteDialog(true)}
                    >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete Driver
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
                setShowDeleteDialog(open);
                if (!open) setError(null);
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Driver</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{driver.first_name} {driver.last_name}</strong>?
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

export const columns: ColumnDef<DriverWithTeam>[] = [
    {
        accessorKey: "driver_number",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    No.
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
    },
    {
        accessorKey: "last_name",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const driver = row.original;
            return (
                <div className="flex flex-col">
                    <span className="font-medium">{driver.first_name} {driver.last_name}</span>
                    <span className="text-xs text-muted-foreground">{driver.abbreviation}</span>
                </div>
            )
        }
    },
    {
        accessorKey: "team.name",
        header: "Team",
        cell: ({ row }) => {
            const team = row.original.team;
            if (!team) return <span className="text-muted-foreground">No Team</span>;
            return (
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: team.color }}
                    />
                    <span>{team.name}</span>
                </div>
            )
        }
    },
    {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => {
            const isActive = row.getValue("is_active");
            return (
                <Badge variant={isActive ? "default" : "secondary"}>
                    {isActive ? "Active" : "Inactive"}
                </Badge>
            );
        },
    },
    {
        id: "actions",
        cell: ({ row }) => <DriverActionsCell driver={row.original} />,
    },
];
