"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Flag, Trophy, LayoutGrid, Home } from "lucide-react";

const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/draft", label: "Draft", icon: LayoutGrid },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/races", label: "Races", icon: Flag },
];

export function MainNav() {
    const pathname = usePathname();

    return (
        <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href));

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                            isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                    >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
