"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Calendar,
    Users,
    Trophy,
    Flag,
    Settings,
    History,
    FileText
} from "lucide-react";

const navItems = [
    {
        title: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
    },
    {
        title: "Seasons",
        href: "/admin/seasons",
        icon: History,
    },
    {
        title: "Races",
        href: "/admin/races",
        icon: Flag,
    },
    {
        title: "Teams",
        href: "/admin/teams",
        icon: Users,
    },
    {
        title: "Drivers",
        href: "/admin/drivers",
        icon: Trophy,
    },
    {
        title: "Point Mappings",
        href: "/admin/points",
        icon: Settings,
    },
    {
        title: "Changelog",
        href: "/admin/changelog",
        icon: FileText,
    },
];

export function AdminNav() {
    const pathname = usePathname();

    return (
        <nav className="grid items-start gap-2">
            {navItems.map((item, index) => {
                const Icon = item.icon;
                return (
                    <Link
                        key={index}
                        href={item.href}
                        className={cn(
                            "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                            pathname === item.href ? "bg-accent text-accent-foreground" : "text-transparent"
                        )}
                    >
                        <Icon className="mr-2 h-4 w-4" />
                        <span>{item.title}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
