"use client";

import { useEffect, useState } from "react";
import { Moon, Sun as SunIcon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

interface ThemeToggleProps {
    className?: string;
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
    const [theme, setTheme] = useState<Theme>("system");
    const [mounted, setMounted] = useState(false);

    // Handle mounting
    useEffect(() => {
        setMounted(true);
        const savedTheme = localStorage.getItem("theme") as Theme | null;
        if (savedTheme) {
            setTheme(savedTheme);
        }
    }, []);

    // Apply theme
    useEffect(() => {
        if (!mounted) return;

        const root = window.document.documentElement;
        root.classList.remove("light", "dark");

        let effectiveTheme = theme;
        if (theme === "system") {
            effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";
        }

        root.classList.add(effectiveTheme);
        localStorage.setItem("theme", theme);
    }, [theme, mounted]);

    // Listen for system theme changes
    useEffect(() => {
        if (!mounted || theme !== "system") return;

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = (e: MediaQueryListEvent) => {
            const root = window.document.documentElement;
            root.classList.remove("light", "dark");
            root.classList.add(e.matches ? "dark" : "light");
        };

        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    }, [theme, mounted]);

    if (!mounted) {
        return (
            <Button variant="outline" size="icon" className={cn("h-9 w-9", className)}>
                <SunIcon className="h-4 w-4" />
            </Button>
        );
    }

    const currentIcon =
        theme === "dark" ? (
            <Moon className="h-4 w-4" />
        ) : theme === "light" ? (
            <SunIcon className="h-4 w-4" />
        ) : (
            <Monitor className="h-4 w-4" />
        );

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className={cn("h-9 w-9", className)}
                    aria-label="เปลี่ยนธีม"
                >
                    {currentIcon}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={() => setTheme("light")}
                    className={cn(theme === "light" && "bg-accent")}
                >
                    <SunIcon className="h-4 w-4 mr-2" />
                    สว่าง
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme("dark")}
                    className={cn(theme === "dark" && "bg-accent")}
                >
                    <Moon className="h-4 w-4 mr-2" />
                    มืด
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme("system")}
                    className={cn(theme === "system" && "bg-accent")}
                >
                    <Monitor className="h-4 w-4 mr-2" />
                    ระบบ
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
