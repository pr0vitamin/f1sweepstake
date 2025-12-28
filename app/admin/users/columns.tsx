"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Profile, Season } from "@/lib/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, Shield, ShieldOff, UserCheck, UserX, Copy, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { updateUser, copyUserPoints } from "./actions";

// Extended table meta to include seasons
declare module '@tanstack/react-table' {
    interface TableMeta<TData> {
        seasons?: Season[];
        users?: Profile[];
    }
}

function UserActionsCell({ user, allUsers, seasons }: { user: Profile; allUsers: Profile[]; seasons: Season[] }) {
    const [isPending, startTransition] = useTransition();
    const [showCopyDialog, setShowCopyDialog] = useState(false);
    const [sourceUserId, setSourceUserId] = useState<string>("");
    const [seasonId, setSeasonId] = useState<string>("");
    const [copyResult, setCopyResult] = useState<{ success?: boolean; message?: string } | null>(null);

    const handleToggleActive = () => {
        startTransition(async () => {
            await updateUser(user.id, { is_active: !user.is_active });
        });
    };

    const handleToggleAdmin = () => {
        startTransition(async () => {
            await updateUser(user.id, { is_admin: !user.is_admin });
        });
    };

    const handleCopyPoints = () => {
        if (!sourceUserId || !seasonId) return;

        setCopyResult(null);
        startTransition(async () => {
            const result = await copyUserPoints(sourceUserId, user.id, seasonId);
            if (result.success) {
                setCopyResult({
                    success: true,
                    message: `Successfully copied ${result.copiedCount} picks from source user`
                });
            } else {
                setCopyResult({ success: false, message: result.error });
            }
        });
    };

    const otherUsers = allUsers.filter(u => u.id !== user.id);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
                        {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                        onClick={() => navigator.clipboard.writeText(user.id)}
                    >
                        Copy ID
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleToggleActive}>
                        {user.is_active ? (
                            <>
                                <UserX className="mr-2 h-4 w-4" />
                                Deactivate User
                            </>
                        ) : (
                            <>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Activate User
                            </>
                        )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleToggleAdmin}>
                        {user.is_admin ? (
                            <>
                                <ShieldOff className="mr-2 h-4 w-4" />
                                Remove Admin
                            </>
                        ) : (
                            <>
                                <Shield className="mr-2 h-4 w-4" />
                                Make Admin
                            </>
                        )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowCopyDialog(true)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Points From...
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={showCopyDialog} onOpenChange={(open) => {
                setShowCopyDialog(open);
                if (!open) {
                    setSourceUserId("");
                    setSeasonId("");
                    setCopyResult(null);
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Copy Points to {user.display_name}</DialogTitle>
                        <DialogDescription>
                            Copy all picks from another user for a specific season.
                            This is useful when someone takes over mid-season.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Source User</label>
                            <Select value={sourceUserId} onValueChange={setSourceUserId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select user to copy from..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {otherUsers.map((u) => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.display_name} ({u.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Season</label>
                            <Select value={seasonId} onValueChange={setSeasonId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select season..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {seasons.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.year} {s.is_current && "(Current)"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {copyResult && (
                            <div className={`p-3 rounded-md text-sm ${copyResult.success
                                    ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                                    : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                                }`}>
                                {copyResult.message}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCopyDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCopyPoints}
                            disabled={!sourceUserId || !seasonId || isPending}
                        >
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Copy Points
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export const columns: ColumnDef<Profile>[] = [
    {
        accessorKey: "display_name",
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
    },
    {
        accessorKey: "email",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Email
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            return <span className="text-muted-foreground">{row.getValue("email")}</span>;
        },
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
        accessorKey: "is_admin",
        header: "Role",
        cell: ({ row }) => {
            const isAdmin = row.getValue("is_admin");
            return (
                <Badge variant={isAdmin ? "destructive" : "outline"}>
                    {isAdmin ? "Admin" : "User"}
                </Badge>
            );
        },
    },
    {
        id: "actions",
        cell: ({ row, table }) => {
            const meta = table.options.meta;
            return (
                <UserActionsCell
                    user={row.original}
                    allUsers={table.getCoreRowModel().rows.map(r => r.original)}
                    seasons={meta?.seasons || []}
                />
            );
        },
    },
];
