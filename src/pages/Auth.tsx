import { Seo } from "@/components/Seo";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, ShieldCheck, TrendingUp, User, Phone, UserPlus, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useAppSettings } from "@/hooks/useAppSettings";
import { sendEmail } from "@/lib/sendEmail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="mt-1 text-xs text-destructive">{message}</p> : null;

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const { settings } = useAppSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      transactionPin: "",
      confirmPin: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const signUpPassword = signUpForm.watch("password") || "";
  const passwordStrength = useMemo(() => {
    let score = 0;
    if (signUpPassword.length >= 6) score += 1;
    if (/[A-Z]/.test(signUpPassword)) score += 1;
    if (/[0-9]/.test(signUpPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(signUpPassword)) score += 1;
    return Math.min(score, 4);
  }, [signUpPassword]);

  const handleSignIn = async (values: SignInValues) => {
    setIsSubmitting(true);
    const { error } = await signIn(values.email, values.password);
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message || "Failed to sign in");
      return;
    }

    toast.success("Welcome back!");
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
      return;
    }

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

    sendEmail({
      type: "account_created",
      userEmail: values.email,
      data: { name: values.fullName },
    });
    toast.success("Account created successfully!");
    navigate("/");
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fx-app">
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
      <div className="min-h-screen bg-fx-app text-foreground">
        <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-10 pt-5 safe-area-top">
          <div className="mb-6 flex items-center">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>

          <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,20,44,0.86),rgba(7,16,35,0.96))] px-5 pb-8 pt-7 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(32,214,199,0.18),transparent_33%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_30%)]" />
            <div className="pointer-events-none absolute right-[-28px] top-[90px] h-56 w-56 rounded-full bg-primary/10 blur-3xl" />

            <div className="relative z-10 mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,rgba(39,232,221,1),rgba(19,175,215,1))] shadow-[0_20px_50px_rgba(32,214,199,0.28)]">
                <TrendingUp className="h-8 w-8 text-white" strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl font-extrabold leading-none tracking-tight">
                FELANS <span className="text-primary">FX</span>
              </h1>
              <p className="mt-2 text-sm text-white/72">Trade Smarter. Grow Faster.</p>
            </div>

            {mode === "signup" && (
              <div className="relative z-10 mb-7 grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: ShieldCheck, title: "Secure & Trusted", text: "Bank-level security" },
                  { icon: Zap, title: "Fast & Easy", text: "Quick account setup" },
                  { icon: TrendingUp, title: "Powerful Tools", text: "Advance trading tools" },
                ].map(({ icon: Icon, title, text }) => (
                  <div key={title} className="flex flex-col items-center gap-2 px-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight text-white">{title}</p>
                      <p className="mt-1 text-xs leading-tight text-white/55">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="relative z-10 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,23,49,0.94),rgba(8,20,41,0.96))] p-4 sm:p-5">
              <div className="mb-5 grid grid-cols-2 border-b border-white/10 text-center">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={cn("pb-3 text-base font-semibold transition-colors", mode === "signin" ? "border-b-2 border-primary text-primary" : "text-white/45")}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={cn("pb-3 text-base font-semibold transition-colors", mode === "signup" ? "border-b-2 border-primary text-primary" : "text-white/45")}
                >
                  Sign Up
                </button>
              </div>

              {mode === "signin" ? (
                <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-5">
                  <div>
                    <Label htmlFor="signin-email" className="mb-2 block text-base text-white">Email</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
                      <Input id="signin-email" type="email" placeholder="you@example.com" {...signInForm.register("email")} className="h-16 rounded-2xl border-white/12 bg-black/20 pl-12 text-lg text-white placeholder:text-white/30 focus-visible:ring-primary/60" />
                    </div>
                    <FieldError message={signInForm.formState.errors.email?.message} />
                  </div>

                  <div>
                    <Label htmlFor="signin-password" className="mb-2 block text-base text-white">Password</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
                      <Input id="signin-password" type={showSignInPassword ? "text" : "password"} placeholder="Enter your password" {...signInForm.register("password")} className="h-16 rounded-2xl border-white/12 bg-black/20 pl-12 pr-12 text-lg text-white placeholder:text-white/30 focus-visible:ring-primary/60" />
                      <button type="button" onClick={() => setShowSignInPassword((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45">
                        {showSignInPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <FieldError message={signInForm.formState.errors.password?.message} />
                  </div>

                  <div className="flex items-center justify-between text-base">
                    <label className="flex items-center gap-3 text-white/78">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">✓</span>
                      Remember me
                    </label>
                    <button type="button" className="text-primary">Forgot password?</button>
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="h-16 w-full rounded-2xl gradient-primary text-[18px] font-bold shadow-primary">
                    {isSubmitting ? <LoadingSpinner size="sm" /> : <><Lock className="h-5 w-5" /> Sign In</>}
                  </Button>
                </form>
              ) : (
                <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                  <div>
                    <Label htmlFor="signup-name" className="mb-2 block text-base text-white">Full Name</Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
                      <Input id="signup-name" type="text" placeholder="Enter your full name" {...signUpForm.register("fullName")} className="h-14 rounded-2xl border-white/12 bg-black/20 pl-12 text-base text-white placeholder:text-white/30 focus-visible:ring-primary/60" />
                    </div>
                    <FieldError message={signUpForm.formState.errors.fullName?.message} />
                  </div>

                  <div>
                    <Label htmlFor="signup-email" className="mb-2 block text-base text-white">Email Address</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
                      <Input id="signup-email" type="email" placeholder="Enter your email address" {...signUpForm.register("email")} className="h-14 rounded-2xl border-white/12 bg-black/20 pl-12 text-base text-white placeholder:text-white/30 focus-visible:ring-primary/60" />
                    </div>
                    <FieldError message={signUpForm.formState.errors.email?.message} />
                  </div>

                  <div>
                    <Label htmlFor="signup-phone" className="mb-2 block text-base text-white">Phone Number</Label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
                      <Input id="signup-phone" type="tel" placeholder="Enter your phone number" {...signUpForm.register("phone")} className="h-14 rounded-2xl border-white/12 bg-black/20 pl-12 text-base text-white placeholder:text-white/30 focus-visible:ring-primary/60" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signup-password" className="mb-2 block text-base text-white">Create Password</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
                      <Input id="signup-password" type={showSignUpPassword ? "text" : "password"} placeholder="Create a strong password" {...signUpForm.register("password")} className="h-14 rounded-2xl border-white/12 bg-black/20 pl-12 pr-12 text-base text-white placeholder:text-white/30 focus-visible:ring-primary/60" />
                      <button type="button" onClick={() => setShowSignUpPassword((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45">
                        {showSignUpPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {[0, 1, 2, 3].map((idx) => (
                        <span key={idx} className={cn("h-1.5 flex-1 rounded-full bg-white/10", idx < passwordStrength && "bg-primary")} />
                      ))}
                      <span className="text-sm text-primary">{passwordStrength >= 3 ? "Strong" : passwordStrength >= 2 ? "Good" : "Weak"}</span>
                    </div>
                    <FieldError message={signUpForm.formState.errors.password?.message} />
                  </div>

                  <div>
                    <Label htmlFor="signup-confirm" className="mb-2 block text-base text-white">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
                      <Input id="signup-confirm" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm your password" {...signUpForm.register("confirmPassword")} className="h-14 rounded-2xl border-white/12 bg-black/20 pl-12 pr-12 text-base text-white placeholder:text-white/30 focus-visible:ring-primary/60" />
                      <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45">
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <FieldError message={signUpForm.formState.errors.confirmPassword?.message} />
                  </div>

                  <div className="hidden">
                    <Input {...signUpForm.register("transactionPin")} />
                    <Input {...signUpForm.register("confirmPin")} />
                  </div>

                  <label className="flex items-start gap-3 text-base text-white/78">
                    <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">✓</span>
                    <span>I agree to the <span className="text-primary">Terms of Service</span> and <span className="text-primary">Privacy Policy</span></span>
                  </label>

                  <Button type="submit" disabled={isSubmitting} className="h-16 w-full rounded-2xl gradient-primary text-[18px] font-bold shadow-primary">
                    {isSubmitting ? <LoadingSpinner size="sm" /> : <><UserPlus className="h-5 w-5" /> Create Account</>}
                  </Button>
                </form>
              )}

              <div className="my-6 flex items-center gap-4 text-white/40">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-sm">or continue with</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Google", icon: "G" },
                  { label: "Apple", icon: "" },
                  { label: "Email", icon: "✉" },
                ].map((item) => (
                  <button key={item.label} type="button" className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-black/20 text-base font-medium text-white hover:bg-white/5">
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative z-10 mt-8 flex items-start gap-4 rounded-2xl border border-white/6 bg-white/3 px-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[18px] font-semibold text-white">Your {mode === "signin" ? "funds and data" : "information"} {mode === "signin" ? "are protected" : "is protected"}</p>
                <p className="mt-1 text-base text-white/55">{mode === "signin" ? "Bank-level security & encryption" : "We use industry-standard encryption to keep your data safe."}</p>
              </div>
            </div>

            <div className="relative z-10 mt-8 space-y-3 text-center text-base text-white/55">
              {mode === "signin" ? (
                <>
                  <p>By continuing, you agree to our <span className="text-primary">Terms of Service</span> and <span className="text-primary">Privacy Policy</span></p>
                  <p>Need help? <span className="text-primary">Contact Support</span></p>
                </>
              ) : (
                <p>Already have an account? <button type="button" className="text-primary" onClick={() => setMode("signin")}>Sign In</button></p>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-white/40">{settings.site_name}</p>
        </div>
      </div>
    </>
  );
};

export default Auth;
