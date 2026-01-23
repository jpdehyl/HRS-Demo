import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import logoPath from "@assets/bsa-logo.png";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#2a2a2a]" />
      {Array.from({ length: 60 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${Math.random() * 3 + 1}px`,
            height: `${Math.random() * 3 + 1}px`,
            backgroundColor: Math.random() > 0.7 ? "#E5C100" : "#ffd54f",
            left: `${Math.random() * 50}%`,
            top: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.5 + 0.2,
            animation: `twinkle ${2 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
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

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      setLocation("/dashboard");
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
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
        {/* Texture overlays */}
        <div className="absolute inset-0 bg-gradient-mesh z-[1]" />
        <div className="absolute inset-0 bg-dots opacity-20 z-[2]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2a2a2a] via-transparent to-[#2a2a2a]/30 z-[3]" />

        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-8">
          <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-3xl px-14 py-12 shadow-2xl animate-scale-in">
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
        {/* Subtle background texture */}
        <div className="absolute inset-0 bg-dots opacity-[0.02]" />

        <div className="w-full max-w-md relative z-10">
          <div className="mb-12 text-center lg:text-left animate-fade-in-down">
            <img src={logoPath} alt="BSA Solutions" className="h-12 mx-auto lg:mx-0 mb-8" />
            <h2 className="text-4xl font-display font-bold text-foreground mb-3 tracking-tight">Welcome back</h2>
            <p className="text-lg text-muted-foreground">Sign in to access your dashboard</p>
          </div>

          <Card className="border-0 lg:border lg:border-border/50 lg:shadow-xl lg:bg-card/95 lg:backdrop-blur-sm rounded-2xl animate-fade-in-up">
            <CardContent className="pt-6 lg:pt-8 px-0 lg:px-8">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2 animate-fade-in-up animate-stagger-1">
                  <Label htmlFor="email" className="text-base font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    className="h-12 text-base"
                    {...form.register("email")}
                    data-testid="input-email"
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2 animate-fade-in-up animate-stagger-2">
                  <Label htmlFor="password" className="text-base font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="h-12 pr-12 text-base"
                      {...form.register("password")}
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="cta"
                  className="w-full h-12 text-base animate-fade-in-up animate-stagger-3"
                  disabled={isLoading}
                  data-testid="button-submit"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-6 px-0 lg:px-8 lg:pb-8 animate-fade-in animate-stagger-4">
              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/signup" className="text-primary hover:text-primary/80 hover:underline font-semibold transition-colors" data-testid="link-signup">
                  Sign up
                </Link>
              </div>
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back">
                ← Back to home
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
