import { useState, memo, useMemo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
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

const CodeBlock = memo(({ lang, code }: { lang: string; code: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (error) {}
  }, [code]);

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {lang || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="text-xs font-mono text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={lang || "text"}
        style={oneDark}
        customStyle={{ margin: 0, borderRadius: 0, fontSize: "0.8125rem" }}
        showLineNumbers={false}
        wrapLines
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
});

const AIMarkdown = memo(({ content }: { content: string }) => {
  const components = useMemo(
    () => ({
      h1: ({ children }: { children: React.ReactNode }) => (
        <h1 className="text-2xl font-bold mt-6 mb-4">
          {children}
        </h1>
      ),
      h2: ({ children }: { children: React.ReactNode }) => (
        <h2 className="text-xl font-semibold mt-5 mb-3">
          {children}
        </h2>
      ),
      h3: ({ children }: { children: React.ReactNode }) => (
        <h3 className="text-lg font-medium mt-4 mb-2">
          {children}
        </h3>
      ),
      ul: ({ children }: { children: React.ReactNode }) => (
        <ul className="list-disc pl-6 my-4 opacity-90">
          {children}
        </ul>
      ),
      ol: ({ children }: { children: React.ReactNode }) => (
        <ol className="list-decimal pl-6 my-4 opacity-90">
          {children}
        </ol>
      ),
      li: ({ children }: { children: React.ReactNode }) => (
        <li className="mb-2 last:mb-0">{children}</li>
      ),
      a: ({ href, children, ...props }: { href?: string; children: React.ReactNode }) => {
        if (href?.startsWith("http")) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-indigo-400 dark:decoration-indigo-500 text-inherit hover:opacity-70 transition-opacity"
              {...props}
            >
              {children}
            </a>
          );
        }
        if (href) {
          return (
            <Link
              to={href}
              className="underline decoration-primary/60 text-inherit hover:opacity-70 transition-opacity"
              {...props}
            >
              {children}
            </Link>
          );
        }
        return <a className="text-inherit" {...props}>{children}</a>;
      },
      code: ({ className, children, ...props }: { className?: string; children: React.ReactNode }) => (
        <code
          className={cn(
            "bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono",
            className
          )}
          {...props}
        >
          {children}
        </code>
      ),
      pre: ({ children }: { children: React.ReactNode }) => {
        const child = Array.isArray(children) ? children[0] : children;
        const className = child?.props?.className || "";
        const lang = className.replace("language-", "").trim();
        const code = String(child?.props?.children || "");

        if (lang === "chart") {
          const chart = tryParseChart(code);
          if (chart) return <AIChart spec={chart} />;
        }

        return <CodeBlock lang={lang} code={code} />;
      },
      table: ({ children }: { children: React.ReactNode }) => (
        <div className="overflow-x-auto my-6 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            {children}
          </table>
        </div>
      ),
      th: ({ children }: { children: React.ReactNode }) => (
        <th className="px-6 py-3 bg-gray-50 dark:bg-gray-800 text-left text-xs font-medium uppercase tracking-wider opacity-80">
          {children}
        </th>
      ),
      td: ({ children }: { children: React.ReactNode }) => (
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          {children}
        </td>
      ),
      blockquote: ({ children }: { children: React.ReactNode }) => (
        <blockquote className="border-l-4 border-green-400 dark:border-green-500 pl-4 py-1 my-4 italic opacity-80 bg-green-500/5 dark:bg-green-900/20 rounded-r-lg">
          {children}
        </blockquote>
      ),
    }),
    []
  );

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

export default AIMarkdown;
