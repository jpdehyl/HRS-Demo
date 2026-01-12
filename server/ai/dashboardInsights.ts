import { GoogleGenAI } from "@google/genai";

function getAiClient() {
  const directKey = process.env.GEMINI_API_KEY;
  if (directKey) {
    return new GoogleGenAI({ apiKey: directKey });
  }

  const replitKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  const replitBase = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  if (replitKey && replitBase) {
    return new GoogleGenAI({
      apiKey: replitKey,
      httpOptions: { baseUrl: replitBase }
    });
  }

  throw new Error("No Gemini API key configured");
}

export interface DashboardInsight {
  id: string;
  type: "opportunity" | "warning" | "achievement" | "tip";
  title: string;
  message: string;
  metric?: string;
  action?: string;
  priority: number; // 1-5, higher is more important
}

export interface InsightsInput {
  callsInRange: number;
  previousCalls: number;
  qualifiedLeads: number;
  previousQualified: number;
  meetingsBooked: number;
  previousMeetings: number;
  conversionRate: number;
  previousConversionRate: number;
  connectRate: number;
  dailyActivity: Array<{ date: string; calls: number; qualified: number }>;
  dispositionBreakdown: Record<string, number>;
  topPerformingDays: string[];
  lowPerformingDays: string[];
  teamSize: number;
  isManager: boolean;
}

export async function generateDashboardInsights(
  input: InsightsInput
): Promise<DashboardInsight[]> {
  try {
    const ai = getAiClient();
    const model = ai.models.generateContent;

    const prompt = `You are a sales performance analyst. Analyze these sales metrics and generate 3-5 actionable insights.

## Current Period Metrics:
- Calls Made: ${input.callsInRange} (previous: ${input.previousCalls})
- Qualified Leads: ${input.qualifiedLeads} (previous: ${input.previousQualified})
- Meetings Booked: ${input.meetingsBooked} (previous: ${input.previousMeetings})
- Conversion Rate: ${input.conversionRate}% (previous: ${input.previousConversionRate}%)
- Connect Rate: ${input.connectRate}%
- Team Size: ${input.teamSize} ${input.isManager ? "(viewing as manager)" : "(individual SDR)"}

## Daily Activity Pattern:
${input.dailyActivity.map(d => `${d.date}: ${d.calls} calls, ${d.qualified} qualified`).join("\n")}

## Call Outcomes:
${Object.entries(input.dispositionBreakdown).map(([k, v]) => `${k}: ${v}`).join(", ")}

## Analysis Requested:
Generate 3-5 insights as a JSON array. Each insight should have:
- id: unique identifier (use "insight-1", "insight-2", etc.)
- type: "opportunity" | "warning" | "achievement" | "tip"
- title: short 3-5 word title
- message: 1-2 sentence actionable insight
- action: optional suggested action
- priority: 1-5 (5 = most important)

Focus on:
1. Trends (improving/declining metrics)
2. Pattern recognition (best days, times)
3. Conversion optimization opportunities
4. Anomalies or concerning patterns
5. Wins worth celebrating

Return ONLY valid JSON array, no markdown or explanation.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const text = response.text?.trim() || "[]";

    // Parse the JSON response
    let insights: DashboardInsight[];
    try {
      // Remove any markdown code blocks if present
      const cleanJson = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      insights = JSON.parse(cleanJson);
    } catch {
      // Fallback to rule-based insights if AI parsing fails
      insights = generateFallbackInsights(input);
    }

    return insights.slice(0, 5).sort((a, b) => b.priority - a.priority);
  } catch (error) {
    console.error("AI insights generation failed:", error);
    // Return rule-based insights as fallback
    return generateFallbackInsights(input);
  }
}

function generateFallbackInsights(input: InsightsInput): DashboardInsight[] {
  const insights: DashboardInsight[] = [];
  let id = 1;

  // Trend analysis
  const callsTrend = input.previousCalls > 0
    ? ((input.callsInRange - input.previousCalls) / input.previousCalls) * 100
    : 0;

  const qualifiedTrend = input.previousQualified > 0
    ? ((input.qualifiedLeads - input.previousQualified) / input.previousQualified) * 100
    : 0;

  const conversionChange = input.conversionRate - input.previousConversionRate;

  // Call volume insight
  if (callsTrend > 20) {
    insights.push({
      id: `insight-${id++}`,
      type: "achievement",
      title: "Strong call momentum",
      message: `Call volume is up ${Math.round(callsTrend)}% compared to the previous period. Keep this energy going!`,
      metric: "calls",
      priority: 4,
    });
  } else if (callsTrend < -20) {
    insights.push({
      id: `insight-${id++}`,
      type: "warning",
      title: "Call volume declining",
      message: `Call volume is down ${Math.round(Math.abs(callsTrend))}%. Consider blocking dedicated call time to get back on track.`,
      metric: "calls",
      action: "Schedule focused calling blocks",
      priority: 5,
    });
  }

  // Conversion insight
  if (conversionChange > 5) {
    insights.push({
      id: `insight-${id++}`,
      type: "achievement",
      title: "Conversion rate climbing",
      message: `Your conversion rate improved by ${conversionChange.toFixed(1)}%. Your approach is working—document what's changing!`,
      metric: "conversion",
      priority: 4,
    });
  } else if (conversionChange < -5) {
    insights.push({
      id: `insight-${id++}`,
      type: "warning",
      title: "Conversion needs attention",
      message: `Conversion rate dropped by ${Math.abs(conversionChange).toFixed(1)}%. Review recent calls for qualification criteria alignment.`,
      metric: "conversion",
      action: "Review call recordings from this period",
      priority: 5,
    });
  }

  // Pattern analysis
  const highCallDays = input.dailyActivity
    .filter(d => d.calls > 0)
    .sort((a, b) => b.calls - a.calls);

  if (highCallDays.length > 0) {
    const bestDay = highCallDays[0];
    insights.push({
      id: `insight-${id++}`,
      type: "tip",
      title: "Peak performance day",
      message: `${bestDay.date} was your strongest day with ${bestDay.calls} calls and ${bestDay.qualified} qualified leads. Try to replicate that rhythm.`,
      priority: 3,
    });
  }

  // Connect rate insight
  if (input.connectRate < 20) {
    insights.push({
      id: `insight-${id++}`,
      type: "tip",
      title: "Improve contact timing",
      message: "Connect rate is below 20%. Experiment with calling at different times or try the local presence feature.",
      metric: "connect_rate",
      action: "Test calling between 10-11am or 2-4pm",
      priority: 3,
    });
  } else if (input.connectRate > 40) {
    insights.push({
      id: `insight-${id++}`,
      type: "achievement",
      title: "Excellent connect rate",
      message: `${input.connectRate}% connect rate is well above average! Your timing and approach are paying off.`,
      metric: "connect_rate",
      priority: 2,
    });
  }

  // Meetings insight
  if (input.meetingsBooked > input.previousMeetings) {
    insights.push({
      id: `insight-${id++}`,
      type: "opportunity",
      title: "Meeting momentum building",
      message: `You booked ${input.meetingsBooked - input.previousMeetings} more meetings than last period. Push for a new personal record!`,
      metric: "meetings",
      priority: 3,
    });
  }

  return insights.slice(0, 5);
}
