"use client";

import { useState, useMemo } from "react";
import { Profile, Season } from "@/lib/types/database";
import { DataTable } from "@/components/admin/data-table";
import { columns } from "./columns";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface UsersTableProps {
    users: Profile[];
    seasons: Season[];
}

export function UsersTable({ users, seasons }: UsersTableProps) {
    const [emailFilter, setEmailFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [roleFilter, setRoleFilter] = useState<string>("all");

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            // Email filter
            if (emailFilter && !user.email.toLowerCase().includes(emailFilter.toLowerCase())) {
                return false;
            }

            // Status filter
            if (statusFilter === "active" && !user.is_active) return false;
            if (statusFilter === "inactive" && user.is_active) return false;

            // Role filter
            if (roleFilter === "admin" && !user.is_admin) return false;
            if (roleFilter === "user" && user.is_admin) return false;

            return true;
        });
    }, [users, emailFilter, statusFilter, roleFilter]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
                <Input
                    placeholder="Filter by email..."
                    value={emailFilter}
                    onChange={(e) => setEmailFilter(e.target.value)}
                    className="max-w-sm"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                    {filteredUsers.length} of {users.length} users
                </span>
            </div>
            <DataTable
                columns={columns}
                data={filteredUsers}
                meta={{ seasons }}
            />
        </div>
    );
}
