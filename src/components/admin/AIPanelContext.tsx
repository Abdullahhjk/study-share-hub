import { createContext, useContext, useState, ReactNode } from "react";

export type PanelTab = "archon" | "sql";

interface AIPanelContextType {
  open: boolean;
  setOpen: (v: boolean) => void;
  activePanel: PanelTab;
  setActivePanel: (v: PanelTab) => void;
  panelWidth: number;
  setPanelWidth: (v: number) => void;
}

const AIPanelContext = createContext<AIPanelContextType>({
  open: false,
  setOpen: () => {},
  activePanel: "archon",
  setActivePanel: () => {},
  panelWidth: 28.571,
  setPanelWidth: () => {},
});

export function AIPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelTab>("archon");
  const [panelWidth, setPanelWidth] = useState(28.571);
  return (
    <AIPanelContext.Provider value={{ open, setOpen, activePanel, setActivePanel, panelWidth, setPanelWidth }}>
      {children}
    </AIPanelContext.Provider>
  );
}

export const useAIPanel = () => useContext(AIPanelContext);
