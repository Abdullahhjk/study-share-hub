import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import JSZip from "jszip";

import { Download as DownloadIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

interface Item {
  title: string;
  signedUrl: string;
}

export default function DownloadPage() {
  const [params] = useSearchParams();
  const code = params.get("code") || "";
  const requestId = params.get("requestId") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const callFn = async (action: "info" | "consume") => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/redeem-download-code?code=${encodeURIComponent(
      code
    )}&requestId=${encodeURIComponent(requestId)}&action=${action}`;

    const r = await fetch(url, {
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });

    return r.json();
  };

  useEffect(() => {
    if (!code || !requestId) {
      setError("Missing code or requestId");
      setLoading(false);
      return;
    }

    callFn("info")
      .then((d) => {
        if (d.error) setError(d.error);
        else setItems(d.items || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [code, requestId]);

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = async () => {
    setLoading(true);

    try {
      const d = await callFn("consume");

      if (d.error) {
        setError(d.error);
        return;
      }

      const list: Item[] = d.items || items;

      if (list.length === 1) {
        const res = await fetch(list[0].signedUrl);
        const blob = await res.blob();
        triggerDownload(blob, `${list[0].title}.pdf`);
      } else {
        const zip = new JSZip();

        await Promise.all(
          list.map(async (it) => {
            const res = await fetch(it.signedUrl);
            const blob = await res.blob();
            zip.file(`${it.title}.pdf`, blob);
          })
        );

        const zipBlob = await zip.generateAsync({ type: "blob" });
        triggerDownload(zipBlob, `notes-${requestId}.zip`);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center text-destructive">
        {error}
      </div>
    );

  const current = items[selectedIdx];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-4 sm:py-8">
        <div className="min-h-screen bg-background p-4">
          <div className="grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-4 max-w-6xl mx-auto">

            {/* SIDEBAR */}
            <aside className="w-full md:w-64 space-y-1 bg-muted-background rounded-lg border p-2 md:sticky md:top-[110px] md:self-start">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                Notes
              </div>
              <hr className="w-full" />

              {items.map((it, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIdx(i)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${selectedIdx === i
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                    }`}
                >
                  {it.title}
                </button>
              ))}
            </aside>

            {/* CONTENT */}
            <div className="border rounded-lg p-4 space-y-4">

              {current && (
                <div
                  className="relative w-full h-[600px] border rounded-lg overflow-hidden"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <iframe
                    src={`${current.signedUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    title={current.title}
                    className="w-full h-full"
                  />
                </div>
              )}

              <Button onClick={handleDownload} className="w-full">
                <DownloadIcon className="h-4 w-4 mr-2" />
                Download All
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}