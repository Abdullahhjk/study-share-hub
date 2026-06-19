import { createContext, useContext, useState, ReactNode } from "react";

interface AIPanelContextType {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const AIPanelContext = createContext<AIPanelContextType>({
  open: false,
  setOpen: () => {},
});

export function AIPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <AIPanelContext.Provider value={{ open, setOpen }}>
      {children}
    </AIPanelContext.Provider>
  );
}

export const useAIPanel = () => useContext(AIPanelContext);
