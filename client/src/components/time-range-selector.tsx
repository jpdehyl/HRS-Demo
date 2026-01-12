import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

export type TimeRange = "7d" | "14d" | "30d" | "90d" | "ytd";

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  className?: string;
  compact?: boolean;
}

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string; shortLabel: string }[] = [
  { value: "7d", label: "7 Days", shortLabel: "7D" },
  { value: "14d", label: "14 Days", shortLabel: "14D" },
  { value: "30d", label: "30 Days", shortLabel: "30D" },
  { value: "90d", label: "90 Days", shortLabel: "90D" },
  { value: "ytd", label: "Year to Date", shortLabel: "YTD" },
];

export function TimeRangeSelector({
  value,
  onChange,
  className,
  compact = false
}: TimeRangeSelectorProps) {
  return (
    <div className={cn("flex items-center gap-1 p-1 bg-muted/50 rounded-lg", className)}>
      {!compact && (
        <Calendar className="h-4 w-4 text-muted-foreground ml-2 mr-1" />
      )}
      {TIME_RANGE_OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? "default" : "ghost"}
          size="sm"
          onClick={() => onChange(option.value)}
          className={cn(
            "h-7 px-3 text-xs font-medium transition-all",
            value === option.value
              ? "shadow-sm"
              : "hover:bg-background/80"
          )}
        >
          {compact ? option.shortLabel : option.label}
        </Button>
      ))}
    </div>
  );
}

export function getTimeRangeLabel(range: TimeRange): string {
  const option = TIME_RANGE_OPTIONS.find(o => o.value === range);
  return option?.label || "7 Days";
}

export function getTimeRangeDays(range: TimeRange): number {
  switch (range) {
    case "7d": return 7;
    case "14d": return 14;
    case "30d": return 30;
    case "90d": return 90;
    case "ytd": {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    }
    default: return 7;
  }
}
