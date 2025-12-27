import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

// Map action to badge variant
function getActionBadge(action: string) {
    switch (action) {
        case "create":
            return <Badge className="bg-green-600">Create</Badge>;
        case "update":
            return <Badge className="bg-blue-600">Update</Badge>;
        case "delete":
            return <Badge variant="destructive">Delete</Badge>;
        default:
            return <Badge variant="secondary">{action}</Badge>;
    }
}

// Format entity type for display
function formatEntityType(entityType: string) {
    return entityType
        .replace(/_/g, " ")
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export default async function ChangelogPage() {
    const supabase = await createClient();

    // Fetch changelog entries with user profile info
    const { data: entries, error } = await supabase
        .from("changelog")
        .select("*, profile:profiles(email, display_name)")
        .order("created_at", { ascending: false })
        .limit(100);

    if (error) {
        return (
            <div className="flex-1 space-y-4">
                <h2 className="text-3xl font-bold tracking-tight">Changelog</h2>
                <Card>
                    <CardContent className="p-6">
                        <p className="text-muted-foreground">Error loading changelog: {error.message}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Changelog</h2>
                    <p className="text-muted-foreground">
                        View all changes made to the system
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>
                        Showing the last 100 changes
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!entries || entries.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                            No changelog entries yet
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[180px]">Timestamp</TableHead>
                                    <TableHead className="w-[100px]">Action</TableHead>
                                    <TableHead className="w-[150px]">Entity Type</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {entries.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="font-mono text-sm">
                                            {format(new Date(entry.created_at), "MMM d, yyyy HH:mm:ss")}
                                        </TableCell>
                                        <TableCell>
                                            {getActionBadge(entry.action)}
                                        </TableCell>
                                        <TableCell>
                                            {formatEntityType(entry.entity_type)}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {entry.profile?.display_name || entry.profile?.email || "System"}
                                        </TableCell>
                                        <TableCell className="max-w-md">
                                            <ChangeDetails
                                                action={entry.action}
                                                entityType={entry.entity_type}
                                                oldValue={entry.old_value}
                                                newValue={entry.new_value}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Component to display change details
function ChangeDetails({
    action,
    entityType,
    oldValue,
    newValue
}: {
    action: string;
    entityType: string;
    oldValue: any;
    newValue: any;
}) {
    if (action === "create" && newValue) {
        // Show what was created
        const name = getEntityName(newValue, entityType);
        return <span className="text-green-600">Created: {name}</span>;
    }

    if (action === "delete" && oldValue) {
        // Show what was deleted
        const name = getEntityName(oldValue, entityType);
        return <span className="text-red-600">Deleted: {name}</span>;
    }

    if (action === "update" && oldValue && newValue) {
        // Show what changed
        const changes = getChangedFields(oldValue, newValue);
        if (changes.length === 0) return <span className="text-muted-foreground">No changes detected</span>;

        return (
            <span className="text-blue-600">
                Updated: {changes.slice(0, 3).join(", ")}
                {changes.length > 3 && ` +${changes.length - 3} more`}
            </span>
        );
    }

    return <span className="text-muted-foreground">-</span>;
}

// Extract a display name from entity data
function getEntityName(data: any, entityType: string): string {
    if (!data) return "Unknown";

    switch (entityType) {
        case "profiles":
            return data.display_name || data.email || "User";
        case "seasons":
            return `${data.year} Season`;
        case "teams":
            return data.name || "Team";
        case "drivers":
            return `${data.first_name || ""} ${data.last_name || ""}`.trim() || "Driver";
        case "races":
            return data.name || "Race";
        case "race_results":
            return `Result (Position ${data.position || "N/A"})`;
        case "picks":
            return `Pick (Round ${data.draft_round || "?"})`;
        case "point_mappings":
            return `P${data.position} → ${data.points} pts`;
        default:
            return data.name || data.id || "Entity";
    }
}

// Get list of changed field names
function getChangedFields(oldValue: any, newValue: any): string[] {
    const changes: string[] = [];
    const allKeys = new Set([...Object.keys(oldValue || {}), ...Object.keys(newValue || {})]);

    for (const key of allKeys) {
        // Skip metadata fields
        if (["id", "created_at", "updated_at"].includes(key)) continue;

        if (JSON.stringify(oldValue?.[key]) !== JSON.stringify(newValue?.[key])) {
            changes.push(key.replace(/_/g, " "));
        }
    }

    return changes;
}
