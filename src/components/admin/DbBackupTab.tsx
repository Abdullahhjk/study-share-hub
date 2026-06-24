import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Database, Download, Loader2, CheckCircle2, AlertCircle,
  Code,
} from "lucide-react";

export default function DbBackupTab() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [size, setSize] = useState("");
  const [edgeFunctionsIncluded, setEdgeFunctionsIncluded] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);
    setEdgeFunctionsIncluded(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "db-backup",
        { body: {} },
      );

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.sql) throw new Error("No backup data returned");

      const sql = data.sql;
      const blob = new Blob([sql], { type: "application/sql" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `db-backup-${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const kb = (blob.size / 1024).toFixed(1);
      setSize(kb + " KB");
      setEdgeFunctionsIncluded(!!data.edgeFunctionsIncluded);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center gap-2">
        <Database className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Database Backup</h2>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Full Database Export</CardTitle>
              <CardDescription className="mt-1">
                Downloads everything needed to recover a blank database:
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {loading ? "Generating..." : success ? size : "Ready"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              All tables (schema + data) — no PK/FK constraints
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              Custom ENUM types
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              Row-Level Security policies
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              Functions / RPCs
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              Triggers
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              Cron jobs
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              Extensions
            </li>
            <li className="flex items-center gap-2">
              <Code className="h-3.5 w-3.5 shrink-0 text-primary" />
              Edge function {edgeFunctionsIncluded ? "names & versions" : "references"} (source in supabase/functions/)
            </li>
          </ul>

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleDownload}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {loading ? "Generating backup..." : "Download Full Backup"}
            </Button>

            {success && (
              <div className="flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                Backup downloaded ({size})
              </div>
            )}

            {error && (
              <div className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recovery Instructions</CardTitle>
          <CardDescription>How to restore from this backup</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Create a new Supabase project</li>
            <li>Open the SQL Editor in the Supabase dashboard</li>
            <li>Copy the entire contents of the downloaded SQL file</li>
            <li>Paste into the SQL Editor and run</li>
            <li>Deploy edge functions from local source:
              <code className="block ml-4 mt-1 text-xs bg-muted px-2 py-1 rounded">
                supabase functions deploy &lt;name&gt;
              </code>
            </li>
            <li>Set required secrets for edge functions:
              <code className="block ml-4 mt-1 text-xs bg-muted px-2 py-1 rounded">
                supabase secrets set KEY=value
              </code>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
