import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  User,
  Target,
  MessageSquare,
  AlertTriangle,
  HelpCircle,
  Shield,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Sparkles,
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  Lightbulb,
  Link2,
} from "lucide-react";
import { SiLinkedin, SiX } from "react-icons/si";
import type { ResearchPacket, Lead } from "@shared/schema";

interface ResearchDisplayProps {
  research: ResearchPacket | null;
  lead: Lead;
  className?: string;
  onCopy?: (text: string, label: string) => void;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline" | "destructive";
}

function CopyButton({ text, label, onCopy }: { text: string; label: string; onCopy?: (text: string, label: string) => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    onCopy?.(text, label);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs"
      onClick={handleCopy}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 mr-1 text-green-500" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3 mr-1" />
          Copy
        </>
      )}
    </Button>
  );
}

function ResearchSection({ title, icon, children, defaultOpen = true, badge, badgeVariant = "secondary" }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium text-sm">{title}</span>
            {badge && (
              <Badge variant={badgeVariant} className="text-[10px] px-1.5 py-0">
                {badge}
              </Badge>
            )}
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 pb-3">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string | null }) {
  if (!confidence) return null;

  const config = {
    high: { label: "High Confidence", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
    medium: { label: "Medium Confidence", className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
    low: { label: "Low Confidence", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  };

  const conf = config[confidence as keyof typeof config] || config.medium;

  return (
    <Badge variant="outline" className={`text-[10px] ${conf.className}`}>
      {conf.label}
    </Badge>
  );
}

function parseJsonSafe(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

export function ResearchDisplay({ research, lead, className = "", onCopy }: ResearchDisplayProps) {
  if (!research) {
    return (
      <Card className={`${className}`}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Sparkles className="h-12 w-12 mb-4 opacity-30" />
          <p className="font-medium">No Research Available</p>
          <p className="text-sm mt-1">Click "Research" to generate intel for this lead</p>
        </CardContent>
      </Card>
    );
  }

  const painPoints = parseJsonSafe(research.painPointsJson) as Array<{ title?: string; description?: string; severity?: string }> | null;
  const productMatches = parseJsonSafe(research.productMatchesJson) as Array<{ product?: string; relevance?: number; reason?: string }> | null;
  const linkedInProfile = parseJsonSafe(research.linkedInProfileJson) as Record<string, unknown> | null;
  const xIntel = parseJsonSafe(research.xIntelJson) as Record<string, unknown> | null;

  return (
    <Card className={`border-l-4 border-l-hawk-blue ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-hawk-blue" />
            Lead Intelligence Dossier
          </CardTitle>
          <ConfidenceBadge confidence={research.confidence} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {lead.companyName} - {lead.contactName}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-1 p-4 pt-0">
            {/* Fit Score */}
            {research.fitScore && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-hawk-blue/10 to-transparent mb-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-hawk-blue" />
                  <span className="font-medium">Fit Score</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-3xl font-bold font-mono ${
                    research.fitScore >= 70 ? "text-green-600" :
                    research.fitScore >= 40 ? "text-amber-600" :
                    "text-red-600"
                  }`}>
                    {research.fitScore}
                  </span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
              </div>
            )}

            {/* Talk Track */}
            {research.talkTrack && (
              <ResearchSection
                title="Talk Track"
                icon={<MessageSquare className="h-4 w-4 text-blue-500" />}
                defaultOpen={true}
              >
                <div className="relative">
                  <div className="absolute top-0 right-0">
                    <CopyButton text={research.talkTrack} label="Talk track" onCopy={onCopy} />
                  </div>
                  <p className="text-sm whitespace-pre-wrap pr-16 leading-relaxed">
                    {research.talkTrack}
                  </p>
                </div>
              </ResearchSection>
            )}

            <Separator />

            {/* Pain Signals */}
            {research.painSignals && (
              <ResearchSection
                title="Pain Signals"
                icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
                badge={painPoints?.length ? `${painPoints.length} identified` : undefined}
              >
                <div className="relative">
                  <div className="absolute top-0 right-0">
                    <CopyButton text={research.painSignals} label="Pain signals" onCopy={onCopy} />
                  </div>
                  <div className="text-sm whitespace-pre-wrap pr-16 leading-relaxed">
                    {research.painSignals}
                  </div>
                </div>
                {painPoints && painPoints.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {painPoints.map((pain, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{pain.title || `Pain Point ${idx + 1}`}</span>
                          {pain.severity && (
                            <Badge variant="outline" className="text-[10px]">
                              {pain.severity}
                            </Badge>
                          )}
                        </div>
                        {pain.description && (
                          <p className="text-xs text-muted-foreground mt-1">{pain.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ResearchSection>
            )}

            <Separator />

            {/* Discovery Questions */}
            {research.discoveryQuestions && (
              <ResearchSection
                title="Discovery Questions"
                icon={<HelpCircle className="h-4 w-4 text-purple-500" />}
              >
                <div className="relative">
                  <div className="absolute top-0 right-0">
                    <CopyButton text={research.discoveryQuestions} label="Discovery questions" onCopy={onCopy} />
                  </div>
                  <div className="text-sm whitespace-pre-wrap pr-16 space-y-2">
                    {research.discoveryQuestions.split('\n').filter(q => q.trim()).map((question, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Lightbulb className="h-3 w-3 mt-1 text-purple-400 shrink-0" />
                        <span>{question.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ResearchSection>
            )}

            <Separator />

            {/* Objection Handles */}
            {research.objectionHandles && (
              <ResearchSection
                title="Objection Handles"
                icon={<Shield className="h-4 w-4 text-green-500" />}
              >
                <div className="relative">
                  <div className="absolute top-0 right-0">
                    <CopyButton text={research.objectionHandles} label="Objection handles" onCopy={onCopy} />
                  </div>
                  <div className="text-sm whitespace-pre-wrap pr-16 leading-relaxed">
                    {research.objectionHandles}
                  </div>
                </div>
              </ResearchSection>
            )}

            <Separator />

            {/* Company Intel */}
            {research.companyIntel && (
              <ResearchSection
                title="Company Intelligence"
                icon={<Building2 className="h-4 w-4 text-slate-500" />}
                defaultOpen={false}
              >
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {research.companyIntel}
                </div>
              </ResearchSection>
            )}

            {/* Contact Intel */}
            {research.contactIntel && (
              <ResearchSection
                title="Contact Intelligence"
                icon={<User className="h-4 w-4 text-slate-500" />}
                defaultOpen={false}
              >
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {research.contactIntel}
                </div>
              </ResearchSection>
            )}

            {/* Product Matches */}
            {productMatches && productMatches.length > 0 && (
              <ResearchSection
                title="Product Recommendations"
                icon={<TrendingUp className="h-4 w-4 text-hawk-blue" />}
                badge={`${productMatches.length} matches`}
                defaultOpen={false}
              >
                <div className="space-y-2">
                  {productMatches.map((match, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-md bg-hawk-blue/5 border border-hawk-blue/20"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{match.product}</span>
                        {match.relevance && (
                          <Badge variant="secondary" className="text-[10px]">
                            {match.relevance}% match
                          </Badge>
                        )}
                      </div>
                      {match.reason && (
                        <p className="text-xs text-muted-foreground mt-1">{match.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </ResearchSection>
            )}

            {/* LinkedIn Profile */}
            {linkedInProfile && Object.keys(linkedInProfile).length > 0 && (
              <ResearchSection
                title="LinkedIn Intel"
                icon={<SiLinkedin className="h-4 w-4 text-[#0A66C2]" />}
                defaultOpen={false}
              >
                <div className="text-sm space-y-2">
                  {linkedInProfile.headline && (
                    <p><span className="font-medium">Headline:</span> {String(linkedInProfile.headline)}</p>
                  )}
                  {linkedInProfile.location && (
                    <p><span className="font-medium">Location:</span> {String(linkedInProfile.location)}</p>
                  )}
                  {linkedInProfile.summary && (
                    <p className="whitespace-pre-wrap">{String(linkedInProfile.summary)}</p>
                  )}
                  {lead.contactLinkedIn && (
                    <a
                      href={lead.contactLinkedIn}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-hawk-blue hover:underline mt-2"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Profile
                    </a>
                  )}
                </div>
              </ResearchSection>
            )}

            {/* X/Twitter Intel */}
            {xIntel && Object.keys(xIntel).length > 0 && (
              <ResearchSection
                title="X/Twitter Intel"
                icon={<SiX className="h-4 w-4" />}
                defaultOpen={false}
              >
                <div className="text-sm whitespace-pre-wrap">
                  {typeof xIntel === 'string' ? xIntel : JSON.stringify(xIntel, null, 2)}
                </div>
              </ResearchSection>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default ResearchDisplay;
