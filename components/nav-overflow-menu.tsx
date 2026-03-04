"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, LogOut, Sun, Moon, Laptop } from "lucide-react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { updateDisplayName } from "@/app/(dashboard)/profile/actions";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useTransition } from "react";

interface NavOverflowMenuProps {
    displayName: string;
}

export function NavOverflowMenu({ displayName }: NavOverflowMenuProps) {
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const [editOpen, setEditOpen] = useState(false);
    const [name, setName] = useState(displayName);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/auth/login");
    };

    const handleSaveName = () => {
        const trimmed = name.trim();
        if (!trimmed) { setError("Display name cannot be empty"); return; }
        if (trimmed === displayName) { setEditOpen(false); return; }

        setError(null);
        startTransition(async () => {
            try {
                const result = await updateDisplayName(trimmed);
                if (result.success) {
                    setEditOpen(false);
                    router.refresh();
                } else {
                    setError(result.error || "Failed to update");
                }
            } catch {
                setError("Failed to update display name");
            }
        });
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden">
                        <MoreVertical className="h-5 w-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
                        {displayName}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                        setName(displayName);
                        setError(null);
                        setEditOpen(true);
                    }}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Name
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                        <DropdownMenuRadioItem value="light">
                            <Sun className="mr-2 h-4 w-4" /> Light
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="dark">
                            <Moon className="mr-2 h-4 w-4" /> Dark
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="system">
                            <Laptop className="mr-2 h-4 w-4" /> System
                        </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Edit name dialog (triggered from overflow menu) */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Edit Display Name</DialogTitle>
                        <DialogDescription>
                            This is how other players see you in the draft and leaderboard.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your display name"
                            maxLength={30}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                            disabled={isPending}
                            autoFocus
                        />
                        {error && <p className="text-sm text-destructive">{error}</p>}
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveName} disabled={isPending || !name.trim()} size="sm">
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
