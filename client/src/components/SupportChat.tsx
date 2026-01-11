import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Bot,
  User,
  Minimize2,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface SupportChatState {
  isOpen: boolean;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = "leadintel_support_chat";
const MAX_STORED_MESSAGES = 50;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function loadMessagesFromStorage(): Message[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
    }
  } catch (e) {
    console.error("Failed to load chat messages from storage:", e);
  }
  return [];
}

function saveMessagesToStorage(messages: Message[]): void {
  try {
    const toStore = messages.slice(-MAX_STORED_MESSAGES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (e) {
    console.error("Failed to save chat messages to storage:", e);
  }
}

export function SupportChat() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [state, setState] = useState<SupportChatState>({
    isOpen: false,
    messages: [],
    isLoading: false,
    error: null,
  });
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load messages from localStorage on mount
  useEffect(() => {
    const storedMessages = loadMessagesFromStorage();
    if (storedMessages.length > 0) {
      setState((prev) => ({ ...prev, messages: storedMessages }));
    }
  }, []);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (state.messages.length > 0) {
      saveMessagesToStorage(state.messages);
    }
  }, [state.messages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.messages, state.isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (state.isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [state.isOpen]);

  const toggleChat = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: !prev.isOpen, error: null }));
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || state.isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: trimmedInput,
      timestamp: new Date(),
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));
    setInputValue("");

    try {
      // Build conversation history for context
      const conversationHistory = state.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          message: trimmedInput,
          conversationHistory,
          userContext: {
            userId: user?.id,
            currentPage: location,
            userRole: user?.role,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to send message");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(data.timestamp),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
      }));
    } catch (error) {
      console.error("Support chat error:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send message. Please try again.",
      }));
    }
  }, [inputValue, state.isLoading, state.messages, user, location]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const clearChat = useCallback(() => {
    setState((prev) => ({ ...prev, messages: [] }));
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Chat Window */}
      {state.isOpen && (
        <Card
          className={cn(
            "fixed z-50 shadow-lg flex flex-col",
            // Desktop: bottom-right corner, fixed size
            "bottom-20 right-4 w-[400px] h-[500px]",
            // Mobile: full width, taller
            "max-sm:bottom-0 max-sm:right-0 max-sm:left-0 max-sm:w-full max-sm:h-[70vh] max-sm:rounded-b-none"
          )}
        >
          {/* Header */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-4 border-b shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">Support</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              {state.messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleChat}
                className="h-8 w-8"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          {/* Messages Area */}
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              <div ref={scrollRef} className="p-4 space-y-4">
                {/* Welcome message if no messages */}
                {state.messages.length === 0 && !state.isLoading && (
                  <div className="text-center py-8 px-4">
                    <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Hi! I'm your Lead Intel support assistant. How can I help
                      you today?
                    </p>
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Try asking about:
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {[
                          "Lead research",
                          "Call features",
                          "Salesforce sync",
                        ].map((topic) => (
                          <Button
                            key={topic}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setInputValue(`How do I use ${topic.toLowerCase()}?`);
                              inputRef.current?.focus();
                            }}
                          >
                            {topic}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages */}
                {state.messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-2",
                      message.role === "user" ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        "shrink-0 h-7 w-7 rounded-full flex items-center justify-center",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.role === "user" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                      <p
                        className={cn(
                          "text-[10px] mt-1",
                          message.role === "user"
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        )}
                      >
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {state.isLoading && (
                  <div className="flex gap-2">
                    <div className="shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">
                          Thinking...
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error message */}
                {state.error && (
                  <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-3 py-2">
                    {state.error}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          {/* Input Area */}
          <div className="p-3 border-t shrink-0">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                disabled={state.isLoading}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim() || state.isLoading}
                size="icon"
              >
                {state.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Floating Chat Bubble */}
      <Button
        onClick={toggleChat}
        className={cn(
          "fixed z-50 h-14 w-14 rounded-full shadow-lg",
          "bottom-4 right-4",
          "max-sm:bottom-4 max-sm:right-4",
          state.isOpen && "max-sm:hidden"
        )}
        size="icon"
      >
        {state.isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </Button>
    </>
  );
}
