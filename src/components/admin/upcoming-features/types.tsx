import {
  Rocket, Sparkles, Trophy, MessageSquare, Globe, Bell, Clock,
  BookOpen, Users, Shield, Zap, Star, Settings, Heart, Flag,
  Award, Lightbulb, Target, Share2, Lock, Eye, Palette, Gift,
  Layers, Code, Database, Cloud, Link, Compass, GraduationCap,
  Search, RefreshCw, CheckCircle, Mail, Calendar, Monitor,
  Smartphone, Download as DownloadIcon, FileText, BarChart, TrendingUp, UserPlus,
  BookMarked,
} from "lucide-react";

export const ICON_MAP: Record<string, typeof Rocket> = {
  Rocket, Sparkles, Trophy, MessageSquare, Globe, Bell, Clock,
  BookOpen, Users, Shield, Zap, Star, Settings, Heart, Flag,
  Award, Lightbulb, Target, Share2, Lock, Eye, Palette, Gift,
  Layers, Code, Database, Cloud, Link, Compass, GraduationCap,
  Search, RefreshCw, CheckCircle, Mail, Calendar, Monitor,
  Smartphone, Download: DownloadIcon, FileText, BarChart, TrendingUp, UserPlus, BookMarked,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

export interface ContentBlock {
  type: "text" | "list" | "table";
  content?: string;
  items?: string[];
  headers?: string[];
  rows?: string[][];
}

export interface DbFeature {
  id: string;
  title: string;
  description: ContentBlock[];
  category: string;
  icon_name: string;
  target_date: string | null;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FeatureForm {
  title: string;
  category: string;
  icon_name: string;
  target_date: string;
  status: string;
  description: ContentBlock[];
}

export const defaultForm: FeatureForm = {
  title: "",
  category: "General",
  icon_name: "Rocket",
  target_date: "",
  status: "planned",
  description: [{ type: "text", content: "" }],
};

export const statusOptions = [
  { value: "planned", label: "Planned" },
  { value: "in-development", label: "In Development" },
  { value: "testing", label: "Testing" },
  { value: "completed", label: "Completed" },
  { value: "deployed", label: "Deployed" },
];

export function validateFeatureJson(parsed: unknown): string[] {
  const errors: string[] = [];
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    errors.push("Expected a JSON object, but got something else.");
    return errors;
  }
  const obj = parsed as Record<string, unknown>;
  if (!obj.title || typeof obj.title !== "string") {
    errors.push('"title" is required (string)');
  }
  if (!obj.category || typeof obj.category !== "string") {
    errors.push('"category" is required (string), e.g. "General", "Teachers"');
  }
  if (!obj.icon_name || typeof obj.icon_name !== "string" || !ICON_MAP[obj.icon_name]) {
    errors.push(`"icon_name" is required (string), one of: ${ICON_NAMES.slice(0, 8).join(", ")}...`);
  }
  if (obj.target_date !== undefined && obj.target_date !== null && typeof obj.target_date !== "string") {
    errors.push('"target_date" must be a string (ISO date) or omitted');
  }
  if (!obj.status || typeof obj.status !== "string") {
    errors.push(`"status" is required (string), one of: ${statusOptions.map(s => s.value).join(", ")}`);
  }
  if (!obj.description) {
    errors.push('"description" is required — array of content blocks');
  } else if (!Array.isArray(obj.description)) {
    errors.push('"description" must be an array of content blocks');
  } else {
    obj.description.forEach((block: unknown, i: number) => {
      if (!block || typeof block !== "object" || Array.isArray(block)) {
        errors.push(`description[${i}]: Expected object, got ${Array.isArray(block) ? "array" : typeof block}`);
      } else {
        const b = block as Record<string, unknown>;
        if (!b.type || !["text", "list", "table"].includes(b.type as string)) {
          errors.push(`description[${i}]: "type" must be "text", "list", or "table"`);
        }
        if (b.type === "text") {
          if (typeof b.content !== "string") {
            errors.push(`description[${i}]: "content" is required (string) for text blocks`);
          }
        }
        if (b.type === "list") {
          if (!Array.isArray(b.items) || b.items.length === 0 || !b.items.every((it: unknown) => typeof it === "string")) {
            errors.push(`description[${i}]: "items" is required (string[]) for list blocks`);
          }
        }
        if (b.type === "table") {
          if (!Array.isArray(b.headers) || b.headers.length === 0 || !b.headers.every((h: unknown) => typeof h === "string")) {
            errors.push(`description[${i}]: "headers" is required (string[]) for table blocks`);
          }
          if (!Array.isArray(b.rows) || !b.rows.every((r: unknown) => Array.isArray(r))) {
            errors.push(`description[${i}]: "rows" is required (string[][]) for table blocks`);
          }
        }
      }
    });
  }
  return errors;
}

export function mergeWithDefaults(parsed: Record<string, unknown>): FeatureForm {
  return {
    title: typeof parsed.title === "string" ? parsed.title : "",
    category: typeof parsed.category === "string" ? parsed.category : "General",
    icon_name: typeof parsed.icon_name === "string" && ICON_MAP[parsed.icon_name] ? parsed.icon_name : "Rocket",
    target_date: typeof parsed.target_date === "string" ? parsed.target_date : "",
    status: typeof parsed.status === "string" && statusOptions.some(s => s.value === parsed.status) ? parsed.status : "planned",
    description: Array.isArray(parsed.description) ? (parsed.description as ContentBlock[]) : [{ type: "text", content: "" }],
  };
}

export function validateImportItem(parsed: unknown, index: number): string[] {
  const errors: string[] = [];
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    errors.push(`Item ${index + 1}: Expected an object, got ${Array.isArray(parsed) ? "array" : typeof parsed}`);
    return errors;
  }
  const obj = parsed as Record<string, unknown>;
  if (!obj.title || typeof obj.title !== "string") {
    errors.push(`Item ${index + 1}: Missing required "title" field (string)`);
  }
  if (obj.description !== undefined && !Array.isArray(obj.description)) {
    errors.push(`Item ${index + 1}: "description" must be an array of content blocks`);
  }
  return errors;
}

export function renderDescriptionPreview(block: ContentBlock, bi: number) {
  if (block.type === "text") {
    return <p key={bi}>{block.content}</p>;
  }
  if (block.type === "list" && block.items) {
    return (
      <ul key={bi} className="list-disc pl-4 space-y-0.5">
        {block.items.map((item, ii) => (
          <li key={ii}>{item}</li>
        ))}
      </ul>
    );
  }
  if (block.type === "table" && block.headers && block.rows && block.headers.length > 0) {
    return (
      <div key={bi} className="overflow-x-auto rounded border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/50">
              {block.headers.map((header, hi) => (
                <th key={hi} className="px-2 py-1 text-left font-semibold font-medium whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.slice(0, 3).map((row, ri) => (
              <tr key={ri} className="border-b last:border-0">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-2 py-1">{cell}</td>
                ))}
              </tr>
            ))}
            {block.rows.length > 3 && (
              <tr>
                <td colSpan={block.headers.length} className="px-2 py-1 text-muted-foreground italic">
                  ... {block.rows.length - 3} more rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }
  return null;
}
