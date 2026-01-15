"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useRef, useEffect } from "react";
import { Mail, KeyRound, Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

type Step = "email" | "code";

export function OTPAuthForm({
    className,
    ...props
}: React.ComponentPropsWithoutRef<"div">) {
    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState<string[]>(Array(6).fill(""));
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const router = useRouter();

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        const supabase = createClient();
        setIsLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: false,
                },
            });
            if (error) throw error;
            setStep("code");
            setResendCooldown(60);
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        const supabase = createClient();
        setIsLoading(true);
        setError(null);

        const token = code.join("");

        try {
            const { error } = await supabase.auth.verifyOtp({
                email,
                token,
                type: "email",
            });
            if (error) throw error;
            router.push("/dashboard");
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (resendCooldown > 0) return;

        const supabase = createClient();
        setIsLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: false,
                },
            });
            if (error) throw error;
            setResendCooldown(60);
            setCode(Array(6).fill(""));
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCodeChange = (index: number, value: string) => {
        // Only allow digits
        if (value && !/^\d$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleCodePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        const newCode = [...code];
        for (let i = 0; i < pastedData.length; i++) {
            newCode[i] = pastedData[i];
        }
        setCode(newCode);
        // Focus the next empty input or the last one
        const nextEmptyIndex = newCode.findIndex((c) => !c);
        inputRefs.current[nextEmptyIndex === -1 ? 5 : nextEmptyIndex]?.focus();
    };

    const handleBackToEmail = () => {
        setStep("email");
        setCode(Array(6).fill(""));
        setError(null);
    };

    if (step === "code") {
        return (
            <div className={cn("flex flex-col gap-6", className)} {...props}>
                <Card>
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                            <KeyRound className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">Enter verification code</CardTitle>
                        <CardDescription className="text-base">
                            We&apos;ve sent a 6-digit code to <strong>{email}</strong>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleVerifyCode}>
                            <div className="flex flex-col gap-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="code-0" className="sr-only">
                                        Verification code
                                    </Label>
                                    <div className="flex justify-center gap-2">
                                        {code.map((digit, index) => (
                                            <Input
                                                key={index}
                                                id={`code-${index}`}
                                                ref={(el) => { inputRefs.current[index] = el; }}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleCodeChange(index, e.target.value)}
                                                onKeyDown={(e) => handleCodeKeyDown(index, e)}
                                                onPaste={handleCodePaste}
                                                className="h-12 w-10 text-center text-lg font-semibold"
                                                autoFocus={index === 0}
                                            />
                                        ))}
                                    </div>
                                </div>
                                {error && (
                                    <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded-md">
                                        {error}
                                    </p>
                                )}
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isLoading || code.some((c) => !c)}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        "Verify code"
                                    )}
                                </Button>
                                <div className="flex flex-col gap-2 text-center">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={handleResendCode}
                                        disabled={resendCooldown > 0 || isLoading}
                                    >
                                        {resendCooldown > 0
                                            ? `Resend code in ${resendCooldown}s`
                                            : "Resend code"}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="link"
                                        onClick={handleBackToEmail}
                                        className="text-muted-foreground"
                                    >
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Use a different email
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <Mail className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Sign in to F1 Sweepstakes</CardTitle>
                    <CardDescription>
                        Enter your email and we&apos;ll send you a verification code to
                        sign in. No password needed!
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSendCode}>
                        <div className="flex flex-col gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    autoFocus
                                />
                            </div>
                            {error && (
                                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded-md">
                                    {error}
                                </p>
                            )}
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending code...
                                    </>
                                ) : (
                                    <>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Send verification code
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
