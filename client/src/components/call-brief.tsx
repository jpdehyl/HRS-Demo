import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Target,
  AlertTriangle,
  MessageSquare,
  HelpCircle,
  Shield,
  Zap,
  Copy,
  Check,
  ChevronDown,
  Sparkles,
  Package,
  TrendingUp
} from "lucide-react";
import type { ResearchPacket, Lead } from "@shared/schema";

interface PainPointData {
  pain: string;
  severity: string;
  hawkRidgeSolution?: string;
}

interface ProductMatchData {
  productId?: string;
  productName: string;
  category?: string;
  matchScore: number;
  rationale: string;
  valueProposition?: string;
}

interface ObjectionHandle {
  objection: string;
  response: string;
}

interface CallBriefProps {
  lead: Lead;
  researchPacket: ResearchPacket | null;
  isOnCall?: boolean;
}

export function CallBrief({ lead, researchPacket, isOnCall = false }: CallBriefProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [objectionsOpen, setObjectionsOpen] = useState(false);
  const [questionsOpen, setQuestionsOpen] = useState(true);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);

    // Clear any existing timeout
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }

    copyTimeoutRef.current = setTimeout(() => {
      setCopiedField(null);
      copyTimeoutRef.current = null;
    }, 2000);
  }, []);

  if (!researchPacket) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center text-muted-foreground">
          <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No intel available for this lead.</p>
          <p className="text-xs mt-1">Generate a research dossier first.</p>
        </CardContent>
      </Card>
    );
  }

  const painPointsJson = researchPacket.painPointsJson as PainPointData[] | null;
  const productMatchesJson = researchPacket.productMatchesJson as ProductMatchData[] | null;
  const dossierJson = researchPacket.dossierJson as {
    openingLine?: string;
    theAsk?: string;
    discoveryQuestions?: string[];
    objectionHandles?: ObjectionHandle[];
    buyingTriggers?: string[];
    talkTrack?: string[];
  } | null;

  const painPoints = painPointsJson || [];
  const productMatches = productMatchesJson || [];
  const openingLine = dossierJson?.openingLine || extractOpeningLine(researchPacket.talkTrack);
  const theAsk = dossierJson?.theAsk || extractTheAsk(researchPacket.talkTrack);
  const discoveryQuestions = dossierJson?.discoveryQuestions || parseQuestions(researchPacket.discoveryQuestions);
  const objectionHandles = dossierJson?.objectionHandles || parseObjections(researchPacket.objectionHandles);
  const buyingTriggers = dossierJson?.buyingTriggers || [];

  function extractOpeningLine(talkTrack: string | null): string | null {
    if (!talkTrack) return null;
    const lines = talkTrack.split('\n');
    const idx = lines.findIndex(l => l.toLowerCase().includes('opening'));
    if (idx >= 0 && idx < lines.length - 1) return lines[idx + 1]?.trim();
    return lines[0]?.replace(/^Opening Line:\s*/i, '').trim() || null;
  }

  function extractTheAsk(talkTrack: string | null): string | null {
    if (!talkTrack) return null;
    const lines = talkTrack.split('\n');
    const idx = lines.findIndex(l => l.toLowerCase().includes('the ask'));
    if (idx >= 0 && idx < lines.length - 1) return lines[idx + 1]?.trim();
    return null;
  }

  function parseQuestions(questions: string | null): string[] {
    if (!questions) return [];
    return questions.split('\n').filter(q => q.trim()).map(q => q.replace(/^\d+\.\s*/, '').trim());
  }

  function parseObjections(objections: string | null): ObjectionHandle[] {
    if (!objections) return [];
    const result: ObjectionHandle[] = [];
    const lines = objections.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const match = line.match(/^["\u201c]?(.+?)["\u201d]?\s*[-:→]\s*(.+)$/);
      if (match) {
        result.push({ objection: match[1].trim(), response: match[2].trim() });
      }
    }
    return result;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const topProduct = productMatches.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))[0];

  return (
    <Card className={isOnCall ? "border-green-500/50 bg-green-50/5" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          Call Brief: {lead.contactName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className={isOnCall ? "h-[500px]" : "h-[400px]"}>
          <div className="space-y-4 pr-2">
            {openingLine && (
              <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-medium text-primary flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    OPENING LINE
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(openingLine, 'opening')}
                    data-testid="button-copy-opening"
                  >
                    {copiedField === 'opening' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <p className="text-sm italic">{openingLine}</p>
              </div>
            )}

            {topProduct && (
              <div className="p-3 rounded-md bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-400">TOP PRODUCT MATCH</span>
                  <Badge variant="outline" className="ml-auto text-green-600 border-green-300">
                    {topProduct.matchScore}%
                  </Badge>
                </div>
                <p className="text-sm font-medium">{topProduct.productName}</p>
                <p className="text-xs text-muted-foreground mt-1">{topProduct.rationale}</p>
                {topProduct.valueProposition && (
                  <p className="text-xs text-green-700 dark:text-green-400 mt-2">
                    <strong>Value:</strong> {topProduct.valueProposition}
                  </p>
                )}
              </div>
            )}

            {painPoints.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  <span className="text-xs font-medium">PAIN POINTS ({painPoints.length})</span>
                </div>
                <div className="space-y-2">
                  {painPoints.slice(0, 3).map((pp, i) => (
                    <div key={i} className="p-2 rounded-md bg-muted/30 text-sm">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className={`shrink-0 text-xs ${getSeverityColor(pp.severity)}`}>
                          {pp.severity?.toUpperCase() || 'MED'}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{pp.pain}</p>
                          {pp.hawkRidgeSolution && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              → {pp.hawkRidgeSolution}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {buyingTriggers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs font-medium">BUYING TRIGGERS</span>
                </div>
                <ul className="space-y-1">
                  {buyingTriggers.slice(0, 3).map((trigger, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <TrendingUp className="h-3 w-3 mt-1 shrink-0 text-yellow-500" />
                      <span>{trigger}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Collapsible open={questionsOpen} onOpenChange={setQuestionsOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                <HelpCircle className="h-3 w-3 text-blue-500" />
                <span className="text-xs font-medium">DISCOVERY QUESTIONS ({discoveryQuestions.length})</span>
                <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${questionsOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <ul className="space-y-2">
                  {discoveryQuestions.slice(0, 5).map((q, i) => (
                    <li key={i} className="text-sm p-2 rounded-md bg-blue-50/50 dark:bg-blue-950/20 flex items-start gap-2">
                      <span className="text-xs font-mono text-blue-600 shrink-0">{i + 1}.</span>
                      <span className="flex-1">{q}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 shrink-0"
                        onClick={() => copyToClipboard(q, `q-${i}`)}
                      >
                        {copiedField === `q-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>

            {objectionHandles.length > 0 && (
              <Collapsible open={objectionsOpen} onOpenChange={setObjectionsOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                  <Shield className="h-3 w-3 text-purple-500" />
                  <span className="text-xs font-medium">OBJECTION HANDLES ({objectionHandles.length})</span>
                  <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${objectionsOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="space-y-2">
                    {objectionHandles.map((oh, i) => (
                      <div key={i} className="p-2 rounded-md bg-purple-50/50 dark:bg-purple-950/20 text-sm">
                        <p className="font-medium text-purple-700 dark:text-purple-300">"{oh.objection}"</p>
                        <p className="text-muted-foreground mt-1">→ {oh.response}</p>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {theAsk && (
              <div className="p-3 rounded-md bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-3 w-3 text-amber-600" />
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">THE ASK</span>
                </div>
                <p className="text-sm font-medium">{theAsk}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
