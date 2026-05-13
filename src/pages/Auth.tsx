import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useAppSettings } from "@/hooks/useAppSettings";
import { sendEmail } from "@/lib/sendEmail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { TrendingUp } from "lucide-react";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  transactionPin: z.string().optional(),
  confirmPin: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.transactionPin && data.transactionPin.length > 0) {
    return /^\d{4}$/.test(data.transactionPin);
  }
  return true;
}, {
  message: "PIN must be exactly 4 digits",
  path: ["transactionPin"],
}).refine((data) => {
  if (data.transactionPin && data.transactionPin.length > 0) {
    return data.transactionPin === data.confirmPin;
  }
  return true;
}, {
  message: "PINs don't match",
  path: ["confirmPin"],
});

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const { settings } = useAppSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", phone: "", transactionPin: "", confirmPin: "", password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSignIn = async (values: SignInValues) => {
    setIsSubmitting(true);
    const { error } = await signIn(values.email, values.password);
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message || "Failed to sign in");
    } else {
      toast.success("Welcome back!");
      // Fire login alert email (non-blocking)
      sendEmail({
        type: "login_alert",
        userEmail: values.email,
        data: {
          time: new Date().toLocaleString(),
          device: navigator.userAgent.slice(0, 80),
          location: "Unknown",
        },
      });
      navigate("/");
    }
  };

  const handleSignUp = async (values: SignUpValues) => {
    setIsSubmitting(true);
    const { error } = await signUp(values.email, values.password, values.fullName);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("This email is already registered. Please sign in.");
      } else {
        toast.error(error.message || "Failed to create account");
      }
    } else {
      // Save optional phone & PIN after signup
      try {
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser) {
          if (values.phone) {
            await supabase.from("profiles").update({ phone_number: values.phone } as any).eq("user_id", newUser.id);
          }
          if (values.transactionPin && values.transactionPin.length === 4) {
            await supabase.rpc("set_transaction_pin", { p_pin: values.transactionPin });
          }
        }
      } catch (e) {
        console.error("Failed to save optional fields:", e);
      }
      // Fire welcome email
      sendEmail({
        type: "account_created",
        userEmail: values.email,
        data: { name: values.fullName },
      });
      toast.success("Account created successfully!");
      navigate("/");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <Seo
        title="Sign in or Create Account — Felans FX"
        description="Sign in or create your Felans FX account to access AI trade analysis, live trading and daily signals."
        path="/auth"
      />
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-secondary to-background">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-primary">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-display font-bold text-foreground">
          {settings.site_name}
        </span>
      </div>

      <Card className="w-full max-w-sm shadow-lg border-0">
        <Tabs defaultValue="signin" className="w-full">
          <CardHeader className="pb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent>
            <TabsContent value="signin" className="mt-0">
              <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    {...signInForm.register("email")}
                  />
                  {signInForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{signInForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    {...signInForm.register("password")}
                  />
                  {signInForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{signInForm.formState.errors.password.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full gradient-primary" disabled={isSubmitting}>
                  {isSubmitting ? <LoadingSpinner size="sm" /> : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    {...signUpForm.register("fullName")}
                  />
                  {signUpForm.formState.errors.fullName && (
                    <p className="text-xs text-destructive">{signUpForm.formState.errors.fullName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    {...signUpForm.register("email")}
                  />
                  {signUpForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{signUpForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone Number <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="+234 800 000 0000"
                    {...signUpForm.register("phone")}
                  />
                </div>

                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground">4-Digit Transaction PIN <span className="text-muted-foreground">(optional — set later in Profile)</span></p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Input
                        id="signup-pin"
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="PIN"
                        {...signUpForm.register("transactionPin")}
                      />
                      {signUpForm.formState.errors.transactionPin && (
                        <p className="text-xs text-destructive">{signUpForm.formState.errors.transactionPin.message}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Input
                        id="signup-confirm-pin"
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="Confirm"
                        {...signUpForm.register("confirmPin")}
                      />
                      {signUpForm.formState.errors.confirmPin && (
                        <p className="text-xs text-destructive">{signUpForm.formState.errors.confirmPin.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    {...signUpForm.register("password")}
                  />
                  {signUpForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{signUpForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirm Password</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="••••••••"
                    {...signUpForm.register("confirmPassword")}
                  />
                  {signUpForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive">{signUpForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full gradient-primary" disabled={isSubmitting}>
                  {isSubmitting ? <LoadingSpinner size="sm" /> : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground text-center max-w-xs">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
    </>
  );
};

export default Auth;
