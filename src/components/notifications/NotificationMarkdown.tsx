import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";

interface NotificationMarkdownProps {
  content: string;
  className?: string;
}

const NotificationMarkdown = memo(({ content, className }: NotificationMarkdownProps) => {
  const remarkPlugins = useMemo(() => [remarkGfm, remarkMath, remarkBreaks], []);
  const rehypePlugins = useMemo(() => [rehypeKatex], []);

  const components = useMemo(
    () => ({
      p: ({ children }: { children?: React.ReactNode }) => (
        <p className="mb-2 last:mb-0">{children}</p>
      ),
      h1: ({ children }: { children?: React.ReactNode }) => (
        <h1 className="text-base font-bold mt-3 mb-2 first:mt-0">{children}</h1>
      ),
      h2: ({ children }: { children?: React.ReactNode }) => (
        <h2 className="text-sm font-bold mt-3 mb-2 first:mt-0">{children}</h2>
      ),
      h3: ({ children }: { children?: React.ReactNode }) => (
        <h3 className="text-sm font-semibold mt-2 mb-1 first:mt-0">{children}</h3>
      ),
      ul: ({ children }: { children?: React.ReactNode }) => (
        <ul className="list-disc pl-5 my-2 space-y-0.5">{children}</ul>
      ),
      ol: ({ children }: { children?: React.ReactNode }) => (
        <ol className="list-decimal pl-5 my-2 space-y-0.5">{children}</ol>
      ),
      li: ({ children }: { children?: React.ReactNode }) => (
        <li className="leading-snug">{children}</li>
      ),
      a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:opacity-80"
        >
          {children}
        </a>
      ),
      blockquote: ({ children }: { children?: React.ReactNode }) => (
        <blockquote className="border-l-2 border-primary/50 bg-primary/5 pl-3 pr-2 py-1 my-2 rounded-r-md">
          {children}
        </blockquote>
      ),
      code: ({ className, children }: { className?: string; children?: React.ReactNode }) =>
        className ? (
          <code className="font-mono text-xs">{children}</code>
        ) : (
          <code className="bg-muted px-1 py-0.5 rounded text-[0.85em] font-mono">{children}</code>
        ),
      pre: ({ children }: { children?: React.ReactNode }) => (
        <pre className="bg-muted rounded-md p-2 my-2 overflow-x-auto text-xs">
          <code className="font-mono">{children}</code>
        </pre>
      ),
      hr: () => <hr className="my-2 border-border" />,
      table: ({ children }: { children?: React.ReactNode }) => (
        <div className="overflow-x-auto my-2 rounded-md border border-border">
          <table className="min-w-full text-xs">{children}</table>
        </div>
      ),
      th: ({ children }: { children?: React.ReactNode }) => (
        <th className="border-b border-border bg-muted/50 px-2 py-1.5 text-left font-medium">
          {children}
        </th>
      ),
      td: ({ children }: { children?: React.ReactNode }) => (
        <td className="border-b border-border/50 px-2 py-1.5 align-top">{children}</td>
      ),
      strong: ({ children }: { children?: React.ReactNode }) => (
        <strong className="font-semibold">{children}</strong>
      ),
    }),
    []
  );

  return (
    <div className={cn("break-words text-inherit max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {content ?? ""}
      </ReactMarkdown>
    </div>
  );
});

export default NotificationMarkdown;
