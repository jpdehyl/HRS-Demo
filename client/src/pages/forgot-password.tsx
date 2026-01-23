import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import logoPath from "@assets/bsa-logo.png";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

function AnimatedBackground() {
  const particles = useMemo(() => 
    Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      width: Math.random() * 3 + 1,
      height: Math.random() * 3 + 1,
      isGold: Math.random() > 0.7,
      left: Math.random() * 50,
      top: Math.random() * 100,
      opacity: Math.random() * 0.5 + 0.2,
      duration: 2 + Math.random() * 4,
      delay: Math.random() * 3,
    })), []
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#2a2a2a]" />
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: `${p.width}px`,
            height: `${p.height}px`,
            backgroundColor: p.isGold ? "#E5C100" : "#ffd54f",
            left: `${p.left}%`,
            top: `${p.top}%`,
            opacity: p.opacity,
            animation: `twinkle ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to send reset email");
      }

      setEmailSent(true);
      toast({
        title: "Check your email",
        description: "If an account exists, we've sent password reset instructions.",
      });
    } catch (error) {
      toast({
        title: "Request failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <AnimatedBackground />
        <div className="absolute inset-0 bg-gradient-mesh z-[1]" />
        <div className="absolute inset-0 bg-dots opacity-20 z-[2]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2a2a2a] via-transparent to-[#2a2a2a]/30 z-[3]" />

        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-8">
          <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-3xl px-14 py-12 shadow-2xl">
            <h1 className="text-5xl xl:text-6xl font-display font-bold text-white mb-4 tracking-tighter text-center">
              Lead Intel
            </h1>
            <p className="text-lg xl:text-xl text-white/70 max-w-md text-center font-sans">
              AI-Powered Pre-Call Intelligence for Sales Teams
            </p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-background relative">
        <div className="absolute inset-0 bg-dots opacity-[0.02]" />

        <div className="w-full max-w-md relative z-10">
          <div className="mb-12 text-center lg:text-left">
            <img src={logoPath} alt="BSA Solutions" className="h-12 mx-auto lg:mx-0 mb-8" />
            <h2 className="text-4xl font-display font-bold text-foreground mb-3 tracking-tight">
              Reset password
            </h2>
            <p className="text-lg text-muted-foreground">
              Enter your email to receive reset instructions
            </p>
          </div>

          <Card className="border-0 lg:border lg:border-border/50 lg:shadow-xl lg:bg-card/95 lg:backdrop-blur-sm rounded-2xl">
            <CardContent className="pt-6 lg:pt-8 px-0 lg:px-8">
              {emailSent ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Check your email</h3>
                  <p className="text-muted-foreground mb-6">
                    We've sent password reset instructions to your email address.
                    The link will expire in 1 hour.
                  </p>
                  <Button variant="outline" onClick={() => setEmailSent(false)} className="mr-2">
                    Try another email
                  </Button>
                </div>
              ) : (
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-base font-medium">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@company.com"
                        autoComplete="email"
                        className="h-12 pl-10 text-base"
                        {...form.register("email")}
                      />
                    </div>
                    {form.formState.errors.email && (
                      <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="cta"
                    className="w-full h-12 text-base"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send reset link"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-6 px-0 lg:px-8 lg:pb-8">
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
