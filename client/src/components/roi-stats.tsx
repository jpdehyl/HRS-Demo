import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, FileSearch, Phone, Target } from "lucide-react";

interface ROIStatsProps {
  callsWithPrep: number;
  callsWithoutPrep: number;
  meetingsWithPrep: number;
  meetingsWithoutPrep: number;
}

export function ROIStats({
  callsWithPrep,
  callsWithoutPrep,
  meetingsWithPrep,
  meetingsWithoutPrep
}: ROIStatsProps) {
  const conversionWithPrep = callsWithPrep > 0
    ? ((meetingsWithPrep / callsWithPrep) * 100).toFixed(1)
    : "0.0";
  const conversionWithoutPrep = callsWithoutPrep > 0
    ? ((meetingsWithoutPrep / callsWithoutPrep) * 100).toFixed(1)
    : "0.0";

  const multiplier = parseFloat(conversionWithoutPrep) > 0
    ? (parseFloat(conversionWithPrep) / parseFloat(conversionWithoutPrep)).toFixed(1)
    : "N/A";

  const hasData = callsWithPrep > 0 || callsWithoutPrep > 0;

  if (!hasData) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Your Intel ROI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <FileSearch className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Start using call prep to see your ROI</p>
            <p className="text-sm mt-1">We'll track your conversion rates automatically</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Your Intel ROI
          </CardTitle>
          {multiplier !== "N/A" && parseFloat(multiplier) > 1 && (
            <Badge className="bg-green-600 text-white font-bold text-lg px-3 py-1">
              {multiplier}x Better
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          This week's performance comparison
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* With Prep */}
          <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border-2 border-green-500">
            <div className="flex items-center gap-2 mb-3">
              <FileSearch className="h-4 w-4 text-green-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-green-600">
                With Intel
              </span>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-3xl font-bold text-green-600">{conversionWithPrep}%</p>
                <p className="text-xs text-muted-foreground">conversion rate</p>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t">
                <span className="text-muted-foreground">
                  <Phone className="h-3 w-3 inline mr-1" />
                  {callsWithPrep} calls
                </span>
                <span className="font-semibold text-green-600">
                  <Target className="h-3 w-3 inline mr-1" />
                  {meetingsWithPrep} meetings
                </span>
              </div>
            </div>
          </div>

          {/* Without Prep */}
          <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border-2 border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Phone className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Without Intel
              </span>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-3xl font-bold text-slate-600 dark:text-slate-400">
                  {conversionWithoutPrep}%
                </p>
                <p className="text-xs text-muted-foreground">conversion rate</p>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t">
                <span className="text-muted-foreground">
                  <Phone className="h-3 w-3 inline mr-1" />
                  {callsWithoutPrep} calls
                </span>
                <span className="font-semibold">
                  <Target className="h-3 w-3 inline mr-1" />
                  {meetingsWithoutPrep} meetings
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Insight */}
        {multiplier !== "N/A" && parseFloat(multiplier) > 1 && (
          <div className="mt-4 p-3 bg-white dark:bg-slate-900 rounded-lg border border-green-200 dark:border-green-900">
            <p className="text-sm text-center">
              <span className="font-bold text-green-600">
                💡 Using research = {multiplier}x better results
              </span>
              <br />
              <span className="text-muted-foreground text-xs">
                Keep prepping to maximize your conversion rate!
              </span>
            </p>
          </div>
        )}

        {multiplier === "N/A" && callsWithoutPrep === 0 && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <p className="text-sm text-center text-blue-700 dark:text-blue-400">
              🎯 You're using intel on all your calls - great work!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
