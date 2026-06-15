import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  Rocket,
  Sparkles,
  Trophy,
  MessageSquare,
  Globe,
  Bell,
  ArrowRight,
  Clock,
  Loader2,
  BookOpen,
  Users,
  Shield,
  Zap,
  Star,
  Settings,
  Heart,
  Flag,
  Award,
  Lightbulb,
  Target,
  Share2,
  Lock,
  Eye,
  Palette,
  Gift,
  Layers,
  Code,
  Database,
  Cloud,
  Link,
  Compass,
  GraduationCap,
  Search,
  RefreshCw,
  CheckCircle,
  Mail,
  Calendar,
  Monitor,
  Smartphone,
  Download,
  FileText,
  BarChart,
  TrendingUp,
  UserPlus,
  BookMarked,
} from "lucide-react";

const ICON_MAP: Record<string, typeof Rocket> = {
  Rocket, Sparkles, Trophy, MessageSquare, Globe, Bell, Clock,
  BookOpen, Users, Shield, Zap, Star, Settings, Heart, Flag,
  Award, Lightbulb, Target, Share2, Lock, Eye, Palette, Gift,
  Layers, Code, Database, Cloud, Link, Compass, GraduationCap,
  Search, RefreshCw, CheckCircle, Mail, Calendar, Monitor,
  Smartphone, Download, FileText, BarChart, TrendingUp, UserPlus, BookMarked,
};

interface ContentBlock {
  type: "text" | "list" | "table";
  content?: string;
  items?: string[];
  headers?: string[];
  rows?: string[][];
}

interface DbFeature {
  id: string;
  title: string;
  description: ContentBlock[];
  category: string;
  icon_name: string;
  target_date: string | null;
  status: string;
  sort_order: number;
}

const statusConfig = {
  planned: { label: "Planned", class: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  "in-development": { label: "In Development", class: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  testing: { label: "Testing", class: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
} as const;

function getDaysToTarget(dateStr: string): { label: string; urgent: boolean } {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return { label: "Past due", urgent: true };
  if (days === 0) return { label: "Due today", urgent: true };
  if (days === 1) return { label: "1 day left", urgent: true };
  if (days <= 7) return { label: `${days} days left`, urgent: true };
  return { label: `${days} days left`, urgent: false };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function renderDescriptionBlock(block: ContentBlock, bi: number) {
  if (block.type === "text") {
    return <p key={bi}>{block.content}</p>;
  }
  if (block.type === "list" && block.items) {
    return (
      <ul key={bi} className="list-disc space-y-1 pl-4">
        {block.items.map((item, ii) => (
          <li key={ii}>{item}</li>
        ))}
      </ul>
    );
  }
  if (block.type === "table" && block.headers && block.rows && block.headers.length > 0) {
    return (
      <div key={bi} className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {block.headers.map((header, hi) => (
                <th key={hi} className="px-4 py-2.5 text-left font-medium text-foreground/80 whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri} className="border-b last:border-0 hover:bg-muted/20">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2 text-muted-foreground">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return null;
}

export default function UpcomingFeatures() {
  const { data: features = [], isLoading } = useQuery({
    queryKey: ["upcoming_features"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("upcoming_features")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbFeature[];
    },
  });

  const categories = [...new Set(features.map((f) => f.category))];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <div className="border-b bg-gradient-to-b from-primary/5 to-background">
          <div className="container max-w-4xl px-4 py-10 sm:py-14">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Rocket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold">
                  Upcoming Features
                </h1>
                <p className="text-xs text-muted-foreground">
                  A look at what we are building next.
                </p>
              </div>
            </div>
          </div>
        </div>

        {features.length === 0 ? (
          <div className="container max-w-4xl px-4 py-16 text-center">
            <Rocket className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No upcoming features announced yet. Check back soon.</p>
          </div>
        ) : (
          <div className="container max-w-4xl px-4 py-8 space-y-10">
            {categories.map((category) => {
              const catFeatures = features.filter((f) => f.category === category);
              return (
                <section key={category}>
                  <h2 className="text-lg font-semibold mb-4 text-foreground/80">
                    {category}
                  </h2>
                  <div className="space-y-4">
                    {catFeatures.map((feature) => {
                      const IconComp = ICON_MAP[feature.icon_name] || Rocket;
                      const countdown = feature.target_date
                        ? getDaysToTarget(feature.target_date)
                        : null;
                      return (
                        <Card
                          key={feature.id}
                          className="group border-border/60 hover:border-primary/40 transition-colors"
                        >
                          <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="p-2.5 bg-primary/5 rounded-lg shrink-0 mt-0.5">
                                <IconComp className="h-5 w-5 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <CardTitle className="text-base font-semibold">
                                  {feature.title}
                                </CardTitle>
                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                  <Badge
                                    variant="outline"
                                    className={statusConfig[feature.status as keyof typeof statusConfig]?.class ?? ""}
                                  >
                                    {statusConfig[feature.status as keyof typeof statusConfig]?.label ?? feature.status}
                                  </Badge>
                                  {feature.target_date && (
                                    <>
                                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        Target: {formatDate(feature.target_date)}
                                      </span>
                                      <span
                                        className={`text-xs flex items-center gap-1 ${
                                          countdown!.urgent
                                            ? "text-destructive font-medium"
                                            : "text-muted-foreground"
                                        }`}
                                      >
                                        <ArrowRight className="h-3 w-3" />
                                        {countdown!.label}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="text-sm text-muted-foreground space-y-2">
                            {feature.description.map((block, bi) => (
                              renderDescriptionBlock(block, bi)
                            ))}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
