'use client'
import { createContext, ReactNode, useMemo, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export interface AppContextType {
  user: any;
  projectId: string | null;
  projectSessionId: string | null;
  availableModels: string[];
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

function extractIdsFromPath(pathname: string): { projectId: string | null, projectSessionId: string | null } {
  // Example path: /project/[project-id]/[project-session-id]
  const match = pathname.match(/\/project\/([^/]+)\/([^/]+)/);
  if (match) {
    return { projectId: match[1], projectSessionId: match[2] };
  }
  return { projectId: null, projectSessionId: null };
}

export function ClientAppContextProvider({ user, children }: { user: any, children: ReactNode }) {
  const pathname = usePathname();
  const { projectId, projectSessionId } = useMemo(() => extractIdsFromPath(pathname), [pathname]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("claude-opus-4-20250514");

  useEffect(() => {
    fetch('/api/backbone/list-available-models')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.models)) {
          setAvailableModels(data.models);
          // If the current selectedModel is not in the new list, update it
          if (!data.models.includes(selectedModel)) {
            setSelectedModel(data.models[0] || "claude-opus-4-20250514");
          }
        }
      })
      .catch(() => setAvailableModels([]));
  }, []);

  const value = useMemo(
    () => ({ user, projectId, projectSessionId, availableModels, selectedModel, setSelectedModel }),
    [user, projectId, projectSessionId, availableModels, selectedModel]
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
} 