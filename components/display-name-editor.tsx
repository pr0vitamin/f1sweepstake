"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Pencil } from "lucide-react";
import { updateDisplayName } from "@/app/(dashboard)/profile/actions";
import { useRouter } from "next/navigation";

interface DisplayNameEditorProps {
    currentName: string;
}

export function DisplayNameEditor({ currentName }: DisplayNameEditorProps) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(currentName);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleSave = () => {
        const trimmed = name.trim();
        if (!trimmed) {
            setError("Display name cannot be empty");
            return;
        }
        if (trimmed === currentName) {
            setOpen(false);
            return;
        }

        setError(null);
        startTransition(async () => {
            try {
                const result = await updateDisplayName(trimmed);
                if (result.success) {
                    setOpen(false);
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
        <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (isOpen) {
                setName(currentName);
                setError(null);
            }
        }}>
            <DialogTrigger asChild>
                <button className="group flex items-center gap-1.5 text-sm font-medium whitespace-nowrap hover:text-primary transition-colors">
                    Hey, {currentName}!
                    <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                </button>
            </DialogTrigger>
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
                        onKeyDown={(e) => e.key === "Enter" && handleSave()}
                        disabled={isPending}
                        autoFocus
                    />
                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                </div>
                <DialogFooter>
                    <Button
                        onClick={handleSave}
                        disabled={isPending || !name.trim()}
                        size="sm"
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
