import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAIPanel } from "@/components/admin/AIPanelContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Cpu, Database, Server, GitBranch, Route, Layout, Shield, Brain, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Section {
  id: string;
  title: string;
  description: string;
  content: string;
  contextForArchon: string;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  overview: <Cpu className="h-5 w-5" />,
  "db-schema": <Database className="h-5 w-5" />,
  "edge-functions": <Server className="h-5 w-5" />,
  migrations: <GitBranch className="h-5 w-5" />,
  "frontend-routes": <Route className="h-5 w-5" />,
  "component-arch": <Layout className="h-5 w-5" />,
  "auth-security": <Shield className="h-5 w-5" />,
  "archon-system": <Brain className="h-5 w-5" />,
};

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(<strong key={keyIdx++}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={keyIdx++}>{match[3]}</em>);
    } else if (match[4]) {
      parts.push(<code key={keyIdx++} className="bg-muted px-1.5 py-0.5 rounded text-sm">{match[4]}</code>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
}

function MarkdownTable({ markdown }: { markdown: string }) {
  const lines = markdown.trim().split("\n");
  const tableLines = lines.filter((l) => l.startsWith("|"));
  if (tableLines.length < 2) return <pre className="text-sm whitespace-pre-wrap">{markdown}</pre>;

  const parseRow = (line: string) =>
    line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());

  const headers = parseRow(tableLines[0]);
  const dataLines = tableLines.slice(2);

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataLines.map((line, i) => {
            const cells = parseRow(line);
            return (
              <tr key={i} className="border-b last:border-0">
                {cells.map((c, j) => (
                  <td key={j} className="px-3 py-2">
                    {renderInlineMarkdown(c)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SectionContent({ section }: { section: Section }) {
  const content = section.content;
  const parts = content.split(/(\|.*\|[\s\S]*?(?=\n[^|]|\n\n|$))/g);

  return (
    <div className="space-y-4">
      {parts.map((part, i) => {
        const trimmed = part.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith("|") && trimmed.includes("|")) {
          return <MarkdownTable key={i} markdown={trimmed} />;
        }

        if (trimmed.startsWith("```")) {
          const lines = trimmed.split("\n");
          const lang = lines[0].replace("```", "").trim();
          const code = lines.slice(1, -1).join("\n");
          return (
            <pre key={i} className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
              <code>{code}</code>
            </pre>
          );
        }

        return trimmed.split("\n").map((line, j) => {
          const key = `${i}-${j}`;
          if (line.startsWith("### ")) return <h3 key={key} className="text-lg font-semibold mt-4">{renderInlineMarkdown(line.replace("### ", ""))}</h3>;
          if (line.startsWith("## ")) return <h2 key={key} className="text-xl font-bold mt-6">{renderInlineMarkdown(line.replace("## ", ""))}</h2>;
          if (line.startsWith("# ")) return <h1 key={key} className="text-2xl font-bold">{renderInlineMarkdown(line.replace("# ", ""))}</h1>;
          if (line.startsWith("- **")) {
            const match = line.match(/^- \*\*(.+?)\*\*:? ?(.*)$/);
            if (match) return <div key={key} className="ml-4"><span className="font-semibold">{match[1]}</span>{match[2] ? ": " : ""}{renderInlineMarkdown(match[2])}</div>;
          }
          if (line.startsWith("- ")) return <div key={key} className="ml-4">• {renderInlineMarkdown(line.replace(/^- /, ""))}</div>;
          if (line.match(/^\d+\./)) return <div key={key} className="ml-4">{renderInlineMarkdown(line)}</div>;
          if (line === "---") return <hr key={key} className="my-4" />;
          if (line.trim()) return <p key={key} className="text-sm leading-relaxed">{renderInlineMarkdown(line)}</p>;
          return null;
        });
      })}
    </div>
  );
}

export default function SystemBlueprint() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadedSection, setLoadedSection] = useState<string | null>(null);
  const { setSystemContext, clearSystemContext, setOpen, setActivePanel } = useAIPanel();

  useEffect(() => {
    const fetchBlueprint = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("system-blueprint", { body: {} });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        setSections(data.sections || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBlueprint();
  }, []);

  const loadIntoArchon = (section: Section) => {
    setSystemContext(section.contextForArchon);
    setLoadedSection(section.id);
    setActivePanel("archon");
    setOpen(true);
    toast.success(`Loaded "${section.title}" into ARCHON`, {
      description: "ARCHON now has context about this section. Ask it anything.",
    });
  };

  const clearArchonContext = () => {
    clearSystemContext();
    setLoadedSection(null);
    toast.info("Cleared system context from ARCHON");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Scanning system architecture...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Failed to Load</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 container max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Cpu className="h-8 w-8 text-primary" />
            System Blueprint
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete architecture overview. Load any section into ARCHON for AI-assisted exploration.
          </p>
        </div>
        {loadedSection && (
          <Button variant="outline" size="sm" onClick={clearArchonContext}>
            Clear ARCHON Context
          </Button>
        )}
      </div>

      {loadedSection && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="text-sm">
              <span className="font-medium">{sections.find((s) => s.id === loadedSection)?.title}</span> is loaded into ARCHON.
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Ask ARCHON anything about this section.</span>
          </CardContent>
        </Card>
      )}

      <Accordion type="single" collapsible className="space-y-4">
        {sections.map((section) => (
          <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-4">
            <AccordionTrigger className="py-4 hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                <span className="text-primary">{SECTION_ICONS[section.id] || <Cpu className="h-5 w-5" />}</span>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {section.title}
                    {loadedSection === section.id && (
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                        Loaded
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">{section.description}</div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="flex justify-end mb-4">
                <Button
                  size="sm"
                  variant={loadedSection === section.id ? "outline" : "default"}
                  onClick={() => loadedSection === section.id ? clearArchonContext() : loadIntoArchon(section)}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  {loadedSection === section.id ? "Unload from ARCHON" : "Load into ARCHON"}
                </Button>
              </div>
              <SectionContent section={section} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      </div>
      <Footer />
    </div>
  );
}
