import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  MessageSquare,
  Send,
  Loader2,
  Sparkles,
  ChevronRight
} from "lucide-react";

interface ConversationalResponse {
  question: string;
  answer: string;
  dataPoints: { label: string; value: string | number }[];
  followUpQuestions: string[];
  confidence: string;
}

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  dataPoints?: { label: string; value: string | number }[];
  followUpQuestions?: string[];
  confidence?: string;
  timestamp: Date;
}

interface ConversationalBIProps {
  quickQuestions?: string[];
  period?: number;
}

export function ConversationalBI({ quickQuestions = [], period = 7 }: ConversationalBIProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      const res = await apiRequest("POST", `/api/ai-reports/ask?period=${period}`, { question });
      return res.json() as Promise<ConversationalResponse>;
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        type: "assistant",
        content: data.answer,
        dataPoints: data.dataPoints,
        followUpQuestions: data.followUpQuestions,
        confidence: data.confidence,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: (error) => {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: "assistant",
        content: "I'm having trouble processing that question. Please try again or rephrase your question.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || askMutation.isPending) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    askMutation.mutate(inputValue.trim());
    setInputValue("");
  };

  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      content: question,
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, userMessage]);
    askMutation.mutate(question);
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const confidenceColors: Record<string, string> = {
    high: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    low: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
  };

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <CardTitle>Ask AI Anything</CardTitle>
        </div>
        <CardDescription>
          Ask questions about your sales data in plain English
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Questions */}
        {messages.length === 0 && quickQuestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.slice(0, 6).map((q, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleQuickQuestion(q)}
                  disabled={askMutation.isPending}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <ScrollArea className="h-[300px] pr-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.type === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {message.type === "assistant" && (
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium">AI Response</span>
                        {message.confidence && (
                          <Badge
                            className={`text-xs ${confidenceColors[message.confidence] || confidenceColors.medium}`}
                          >
                            {message.confidence}
                          </Badge>
                        )}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                    {/* Data Points */}
                    {message.dataPoints && message.dataPoints.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-xs font-medium mb-2">Key Data Points:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {message.dataPoints.map((dp, i) => (
                            <div key={i} className="bg-background/50 rounded p-2">
                              <p className="text-xs text-muted-foreground">{dp.label}</p>
                              <p className="text-sm font-semibold">{dp.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Follow-up Questions */}
                    {message.followUpQuestions && message.followUpQuestions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-xs font-medium mb-2">Follow-up questions:</p>
                        <div className="space-y-1">
                          {message.followUpQuestions.map((q, i) => (
                            <Button
                              key={i}
                              variant="ghost"
                              size="sm"
                              className="text-xs h-auto py-1 px-2 justify-start w-full"
                              onClick={() => handleQuickQuestion(q)}
                              disabled={askMutation.isPending}
                            >
                              <ChevronRight className="h-3 w-3 mr-1" />
                              {q}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {askMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Analyzing your data...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about calls, leads, coaching, or performance..."
            disabled={askMutation.isPending}
            className="flex-1"
          />
          <Button type="submit" disabled={!inputValue.trim() || askMutation.isPending}>
            {askMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
