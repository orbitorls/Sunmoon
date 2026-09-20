"use client"

import { DayPicker, type DayPickerProps, type PropsBase, type PropsSingle, type PropsSingleRequired, type PropsMulti, type PropsMultiRequired, type PropsRange, type PropsRangeRequired } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = DayPickerProps

type SingleCalendarProps = PropsBase & PropsSingle
type SingleRequiredCalendarProps = PropsBase & PropsSingleRequired
type MultiCalendarProps = PropsBase & PropsMulti
type MultiRequiredCalendarProps = PropsBase & PropsMultiRequired
type RangeCalendarProps = PropsBase & PropsRange
type RangeRequiredCalendarProps = PropsBase & PropsRangeRequired

function Calendar(props: SingleCalendarProps): React.ReactElement
function Calendar(props: SingleRequiredCalendarProps): React.ReactElement
function Calendar(props: MultiCalendarProps): React.ReactElement
function Calendar(props: MultiRequiredCalendarProps): React.ReactElement
function Calendar(props: RangeCalendarProps): React.ReactElement
function Calendar(props: RangeRequiredCalendarProps): React.ReactElement
function Calendar({ className, classNames, showOutsideDays = true, ...props }: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: "p-3",
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1",
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day_button: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        range_start: "rounded-l-md",
        range_end: "rounded-r-md",
        range_middle: "bg-accent text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
