import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
    CheckCircle2,
    AlertTriangle,
    Mail,
    ArrowLeft,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
} from "@/components/ui/card";

export default function UnsubscribePage() {
    const [params] = useSearchParams();

    const urlEmail = useMemo(() => {
        const value = params.get("email")?.trim() || "";
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        return isValid ? value : "";
    }, [params]);
    const success = Number(params.get("success")?.trim()) === 1 || false;
    const [email, setEmail] = useState(urlEmail);
    const [step, setStep] = useState<
        "input" | "confirm" | "done"
    >(success ? "done" : urlEmail ? "confirm" : "input");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleUnsubscribe = async () => {
        setLoading(true);
        setError("");

        try {
            const { data, error } = await supabase.functions.invoke(
                "unsubscribe-newsletter",
                {
                    body: { email },
                }
            );

            if (error) throw error;

            if (data?.redirectUrl) {
                window.location.href = data.redirectUrl;
                return;
            }

            setStep("done");
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />

            <main className="container flex-1 flex items-center justify-center px-4 py-10">
                <Card className="w-full max-w-lg">
                    <CardContent className="p-8 space-y-6">

                        {/* ERROR */}
                        {error && (
                            <p className="text-sm text-destructive text-center">
                                {error}
                            </p>
                        )}

                        {/* DONE */}
                        {step === "done" && (
                            <div className="text-center space-y-6">
                                <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />

                                <h1 className="text-2xl font-bold">
                                    Successfully Unsubscribed
                                </h1>

                                <p className="text-muted-foreground text-sm">
                                    <span className="font-medium text-foreground">
                                        {email}
                                    </span>{" "}
                                    has been removed from the newsletter.
                                </p>

                                <Button asChild>
                                    <Link to="/">
                                        <ArrowLeft className="h-4 w-4 mr-2" />
                                        Back Home
                                    </Link>
                                </Button>
                            </div>
                        )}

                        {/* INPUT STEP */}
                        {step === "input" && (
                            <div className="space-y-5 text-center">
                                <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />

                                <div className="space-y-1">
                                    <h1 className="text-xl font-semibold">
                                        Enter your email to unsubscribe
                                    </h1>
                                    <p className="text-sm text-muted-foreground">
                                        We'll remove this email from our newsletter list.
                                    </p>
                                </div>

                                <div className="space-y-2 text-left">
                                    <label
                                        htmlFor="email"
                                        className="text-sm font-medium text-muted-foreground"
                                    >
                                        Email address
                                    </label>

                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full"
                                    />
                                </div>

                                <Button
                                    className="w-full"
                                    disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
                                    onClick={() => setStep("confirm")}
                                >
                                    Continue
                                </Button>
                            </div>
                        )}

                        {/* CONFIRM STEP */}
                        {step === "confirm" && (
                            <div className="space-y-3 text-center">
                                <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />

                                <h1 className="text-xl font-semibold">
                                    Confirm Unsubscribe
                                </h1>

                                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <div className="border-2 border-ghost flex items-center justify-center gap-2 px-2 py-1 rounded-lg">
                                        <Mail className="h-4 w-4" />
                                        <span className="text-foreground font-medium break-all">
                                            {email}
                                        </span></div>
                                </div>

                                <Button
                                    className="w-full"
                                    onClick={handleUnsubscribe}
                                    disabled={loading}
                                >
                                    {loading ? "Unsubscribing..." : "Confirm"}
                                </Button>

                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => setStep("input")}
                                >
                                    Change email
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>

            <Footer />
        </div>
    );
}