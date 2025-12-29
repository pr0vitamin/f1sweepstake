"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const handleCallback = async () => {
            const supabase = createClient();

            // Get the hash fragment from the URL (contains access_token, etc.)
            const hashParams = new URLSearchParams(
                window.location.hash.substring(1)
            );

            const accessToken = hashParams.get("access_token");
            const refreshToken = hashParams.get("refresh_token");
            const errorDescription = hashParams.get("error_description");

            if (errorDescription) {
                setError(errorDescription);
                return;
            }

            if (accessToken && refreshToken) {
                // Set the session using the tokens from the URL
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

                if (error) {
                    setError(error.message);
                    return;
                }

                // Redirect to protected page
                router.push("/dashboard");
                return;
            }

            // Also check for code exchange flow (if using PKCE with code)
            const code = new URLSearchParams(window.location.search).get("code");
            if (code) {
                const { error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) {
                    setError(error.message);
                    return;
                }
                router.push("/dashboard");
                return;
            }

            // No valid auth params found
            setError("No authentication parameters found in URL");
        };

        handleCallback();
    }, [router]);

    if (error) {
        return (
            <div className="flex min-h-svh w-full items-center justify-center p-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">
                        Authentication Error
                    </h1>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <a
                        href="/auth/login"
                        className="text-primary underline underline-offset-4"
                    >
                        Try again
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6">
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Signing you in...</p>
            </div>
        </div>
    );
}
