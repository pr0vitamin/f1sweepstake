"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-3", className)}
            classNames={{
                // Container classes
                months: "flex flex-col sm:flex-row gap-4",
                month: "flex flex-col gap-4",
                // Caption (month/year header) - relative for absolute nav positioning
                month_caption: "flex justify-center pt-1 relative items-center h-10 w-full",
                caption_label: "text-sm font-medium",
                // Navigation - positioned at ends of caption with higher z-index
                nav: "absolute inset-x-0 top-0 flex justify-between items-center h-10 px-1 z-10",
                button_previous: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                ),
                button_next: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                ),
                // Month grid (table)
                month_grid: "w-full border-collapse",
                // Weekday header row
                weekdays: "flex w-full",
                weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center",
                // Week rows
                week: "flex w-full mt-2",
                // Day cells
                day: "h-9 w-9 text-center text-sm p-0 relative flex items-center justify-center",
                day_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
                ),
                // Day modifiers
                range_end: "day-range-end",
                selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
                today: "bg-accent text-accent-foreground rounded-md",
                outside: "text-muted-foreground opacity-50",
                disabled: "text-muted-foreground opacity-50",
                range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                hidden: "invisible",
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation }) => {
                    if (orientation === "left") return <ChevronLeft className="h-4 w-4" />
                    return <ChevronRight className="h-4 w-4" />
                }
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
