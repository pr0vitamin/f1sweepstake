import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
    const supabase = await createClient();

    // Fetch some basic stats
    const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: raceCount } = await supabase.from('races').select('*', { count: 'exact', head: true });
    const { count: teamCount } = await supabase.from('teams').select('*', { count: 'exact', head: true });

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{userCount ?? 0}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Races</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{raceCount ?? 0}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Teams</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{teamCount ?? 0}</div>
                </CardContent>
            </Card>
        </div>
    );
}
