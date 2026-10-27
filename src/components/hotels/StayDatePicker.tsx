import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function StayDatePicker({ label, value, min, onChange }: { label: string; value: Date; min: Date; onChange: (date: Date) => void }) {
  return <Popover><PopoverTrigger asChild><Button variant="outline" aria-label={label} className="h-12 w-full justify-start gap-3 bg-card text-left font-normal"><CalendarIcon className="h-4 w-4 shrink-0 text-primary" /><span className="flex flex-col"><span className="text-[11px] text-muted-foreground">{label}</span><span className="text-sm font-semibold">{format(value, "dd MMM yyyy")}</span></span></Button></PopoverTrigger><PopoverContent align="start" className="w-auto p-0"><Calendar mode="single" selected={value} defaultMonth={value} disabled={{ before: new Date(min.getFullYear(), min.getMonth(), min.getDate()) }} onSelect={date => { if (date) onChange(date); }} className="pointer-events-auto p-3" /></PopoverContent></Popover>;
}