import { createContext, useContext, useState, ReactNode } from "react";

interface AIPanelContextType {
  open: boolean;
  setOpen: (v: boolean) => void;
  panelWidth: number;
  setPanelWidth: (v: number) => void;
}

const AIPanelContext = createContext<AIPanelContextType>({
  open: false,
  setOpen: () => {},
  panelWidth: 28.571,
  setPanelWidth: () => {},
});

export function AIPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(28.571);
  return (
    <AIPanelContext.Provider value={{ open, setOpen, panelWidth, setPanelWidth }}>
      {children}
    </AIPanelContext.Provider>
  );
}

export const useAIPanel = () => useContext(AIPanelContext);
