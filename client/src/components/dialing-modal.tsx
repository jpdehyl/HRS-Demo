import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Phone, Loader2, MessageSquare, AlertTriangle, Target, Copy, ExternalLink, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { Lead, ResearchPacket } from "@shared/schema";

interface DialingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
}

export function DialingModal({ open, onOpenChange, lead }: DialingModalProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isDialing, setIsDialing] = useState(false);

  const { data: researchPacket, isLoading } = useQuery<ResearchPacket | null>({
    queryKey: [`/api/leads/${lead?.id}/research`],
    enabled: open && !!lead?.id,
  });

  const handleDial = () => {
    if (!lead?.contactPhone) {
      toast({ title: "No phone number", description: "This lead doesn't have a phone number", variant: "destructive" });
      return;
    }
    setIsDialing(true);
    setTimeout(() => {
      onOpenChange(false);
      navigate(`/coaching?phone=${encodeURIComponent(lead.contactPhone || "")}&leadId=${lead.id}`);
    }, 500);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
  };

  const getOpener = (packet: ResearchPacket | null): string => {
    if (!packet?.talkTrack) return "";
    const firstLine = packet.talkTrack.split('\n').find((line: string) => line.trim());
    return firstLine || "";
  };

  const getPainPoint = (packet: ResearchPacket | null): string => {
    if (!packet) return "";
    const painSignals = packet.painSignals;
    if (painSignals) {
      const firstPain = painSignals.split('\n').find((line: string) => line.trim());
      if (firstPain) return firstPain;
    }
    const talkTrack = packet.talkTrack || "";
    const painLine = talkTrack.split('\n').find((line: string) => 
      line.toLowerCase().includes("pain") || 
      line.toLowerCase().includes("challenge") ||
      line.toLowerCase().includes("struggle")
    );
    return painLine || "";
  };

  const getTheAsk = (packet: ResearchPacket | null): string => {
    if (!packet?.talkTrack) return "Would you be open to a brief call to discuss how we can help?";
    const askLine = packet.talkTrack.split('\n').find((line: string) => 
      line.toLowerCase().includes("ask") || 
      line.toLowerCase().includes("meeting") ||
      line.toLowerCase().includes("call")
    );
    return askLine || "Would you be open to a brief call to discuss how we can help?";
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-hawk-blue" />
              Calling {lead.contactName}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <span>{lead.companyName}</span>
            <span>|</span>
            <span>{lead.contactPhone}</span>
            {lead.fitScore && (
              <>
                <span>|</span>
                <Badge variant="secondary" className="font-mono">
                  Fit: {lead.fitScore}
                </Badge>
              </>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : researchPacket ? (
          <div className="space-y-4 py-4">
            <Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader className="py-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <span className="font-bold text-lg">Opener</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed">{getOpener(researchPacket)}</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => copyToClipboard(getOpener(researchPacket), "Opener")}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20">
              <CardHeader className="py-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <span className="font-bold text-lg">Top Pain Point</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed">{getPainPoint(researchPacket)}</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => copyToClipboard(getPainPoint(researchPacket), "Pain point")}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20">
              <CardHeader className="py-3">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  <span className="font-bold text-lg">The Ask</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed">{getTheAsk(researchPacket)}</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => copyToClipboard(getTheAsk(researchPacket), "The ask")}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="py-6 text-center text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="font-medium">No research available for this lead</p>
            <p className="text-sm mt-1">Research will be generated automatically</p>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => {
              onOpenChange(false);
              navigate(`/call-prep/${lead.id}`);
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Full Prep
          </Button>
          <Button 
            className="flex-1 bg-hawk-blue hover:bg-hawk-blue-600 text-white"
            onClick={handleDial}
            disabled={isDialing}
          >
            {isDialing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Phone className="h-4 w-4 mr-2" />
            )}
            {isDialing ? "Connecting..." : "Dial Now"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
