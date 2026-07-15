import { X, PanelRightOpen } from "lucide-react";
import { useAIPanel } from "@/components/admin/AIPanelContext";

interface MobileNavSidebarProps {
  children: React.ReactNode;
  collapseToMobile?: boolean;
  open?: boolean;
  setOpen?: (open: boolean) => void;
}

export function MobileNavSidebar({ children, collapseToMobile = false, open = false, setOpen }: MobileNavSidebarProps) {
  const { open: panelOpen, panelWidth } = useAIPanel();

  const visibility = collapseToMobile ? "" : "md:hidden";
  const hideButton = panelOpen && !collapseToMobile;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed top-1/2 -translate-y-1/2 z-30 bg-background px-1.5 py-4 shadow-md hover:bg-accent flex-col items-center gap-1 transition-all duration-300 ease-in-out group ${visibility} ${hideButton ? "opacity-0 pointer-events-none" : "opacity-100 flex"} ${collapseToMobile ? "left-0 rounded-r-md border border-l-0" : "right-0 rounded-l-md border border-r-0"
          }`}
        title="Open Navigation"
      >
        <PanelRightOpen className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:scale-110" />
        <span className="text-[10px] font-medium text-muted-foreground tracking-wider flex flex-col items-center leading-none">
          {"NAV".split("").map((c, i) => <span key={i}>{c}</span>)}
        </span>
      </button>

      {open && (
        <div className={`fixed inset-0 z-40 bg-black/50 ${visibility}`} onClick={() => setOpen(false)} />
      )}

      <div
        className={`fixed top-0 bottom-0 z-50 w-[75vw] sm:w-[35vw] bg-background shadow-xl transition-transform duration-300 ease-in-out ${visibility} ${collapseToMobile ? "left-0 border-r" : "right-0 border-l"
          } ${open ? "translate-x-0" : collapseToMobile ? "-translate-x-full" : "translate-x-full"
          }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
            Navigation
          </span>
          <button onClick={() => setOpen(false)} className="p-1 hover:bg-accent rounded-md transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-2 overflow-y-auto h-[calc(100%-48px)]">
          {children}
        </div>
      </div>
    </>
  );
}
