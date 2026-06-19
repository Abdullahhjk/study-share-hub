import { useState, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import AIChart from "./AIChart";
import "katex/dist/katex.min.css";

interface ChartData {
  type: "bar" | "line" | "pie" | "metric";
  title?: string;
  data: { name: string; value: number }[];
}

function tryParseChart(content: string): ChartData | null {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard not available */ }
  };
  return (
    <div className="my-3 rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/60 border-b border-border">
        <span className="text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider">{lang || "code"}</span>
        <button onClick={handleCopy} className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="overflow-x-auto p-3 text-sm font-mono leading-relaxed bg-[#1e1e2e]">
        <pre className="!my-0 !bg-transparent !p-0 !border-0">
          <code className="whitespace-pre">{code}</code>
        </pre>
      </div>
    </div>
  );
}

const AIMarkdown = memo(function AIMarkdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({ href, children, ...props }) => {
            if (href?.startsWith("http")) {
              return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
            }
            if (href) {
              return <Link to={href} className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">{children}</Link>;
            }
            return <a {...props}>{children}</a>;
          },
          code: ({ className, children, ...props }) => {
            return <code className={cn("bg-muted px-1.5 py-0.5 rounded text-sm", className)} {...props}>{children}</code>;
          },
          pre: ({ children }) => {
            const codeEl = children as React.ReactElement;
            const lang = ((codeEl?.props?.className || "").replace("language-", "") || "").trim();
            const code = String(codeEl?.props?.children || "");
            if (lang === "chart") {
              const chartData = tryParseChart(code.trim());
              if (chartData) return <AIChart key={code} spec={chartData} />;
            }
            return <CodeBlock key={code} lang={lang} code={code} />;
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full text-xs border-collapse border border-border">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-border bg-muted/50 px-2 py-1 text-left font-medium">{children}</th>,
          td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

export default AIMarkdown;
