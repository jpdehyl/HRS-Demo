import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Trophy,
  Sparkles
} from "lucide-react";

interface ExecutiveSummaryData {
  narrative: string;
  keyWins: string[];
  concerns: string[];
  recommendations: string[];
  generatedAt: string;
}

interface ExecutiveSummaryProps {
  data?: ExecutiveSummaryData;
  isLoading?: boolean;
}

export function ExecutiveSummary({ data, isLoading }: ExecutiveSummaryProps) {
  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Executive Summary</CardTitle>
          </div>
          <CardDescription>AI-generated analysis of your sales performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Executive Summary</CardTitle>
          </div>
          <CardDescription>AI-generated analysis of your sales performance</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No data available. Generate a report to see insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Executive Summary</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            Generated {new Date(data.generatedAt).toLocaleTimeString()}
          </Badge>
        </div>
        <CardDescription>AI-generated analysis of your sales performance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Narrative */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
            {data.narrative}
          </p>
        </div>

        {/* Three columns: Wins, Concerns, Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Key Wins */}
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-green-600 dark:text-green-400" />
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">
                  Key Wins
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {data.keyWins.map((win, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-green-800 dark:text-green-300">{win}</span>
                  </li>
                ))}
                {data.keyWins.length === 0 && (
                  <li className="text-sm text-green-700 dark:text-green-400 italic">
                    No specific wins identified this period
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Concerns */}
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Areas of Concern
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {data.concerns.map((concern, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <span className="text-amber-800 dark:text-amber-300">{concern}</span>
                  </li>
                ))}
                {data.concerns.length === 0 && (
                  <li className="text-sm text-amber-700 dark:text-amber-400 italic">
                    No major concerns identified
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  Recommendations
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {data.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-600 dark:text-blue-400 font-bold flex-shrink-0">
                      {index + 1}.
                    </span>
                    <span className="text-blue-800 dark:text-blue-300">{rec}</span>
                  </li>
                ))}
                {data.recommendations.length === 0 && (
                  <li className="text-sm text-blue-700 dark:text-blue-400 italic">
                    No specific recommendations at this time
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
