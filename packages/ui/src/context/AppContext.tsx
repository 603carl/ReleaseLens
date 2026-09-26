import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Repository, ReleaseCandidate } from '../types/domain.ts';

interface AppState {
  repository: Repository | null;
  releaseCandidate: ReleaseCandidate | null;
  setRepository: (repo: Repository | null) => void;
  setReleaseCandidate: (rc: ReleaseCandidate | null) => void;
}

const AppContext = createContext<AppState | null>(null);

const REPO_STORAGE_KEY = 'releaselens:repository';
const RC_STORAGE_KEY = 'releaselens:releaseCandidate';

export function AppProvider({ children }: { children: ReactNode }) {
  const [repository, setRepositoryState] = useState<Repository | null>(() => {
    try {
      const saved = localStorage.getItem(REPO_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as Repository) : null;
    } catch {
      return null;
    }
  });

  const [releaseCandidate, setReleaseCandidateState] = useState<ReleaseCandidate | null>(() => {
    try {
      const saved = localStorage.getItem(RC_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as ReleaseCandidate) : null;
    } catch {
      return null;
    }
  });

  const setRepository = (repo: Repository | null) => {
    setRepositoryState(repo);
    try {
      if (repo) {
        localStorage.setItem(REPO_STORAGE_KEY, JSON.stringify(repo));
      } else {
        localStorage.removeItem(REPO_STORAGE_KEY);
      }
    } catch {
      // storage unavailable
    }
  };

  const setReleaseCandidate = (rc: ReleaseCandidate | null) => {
    setReleaseCandidateState(rc);
    try {
      if (rc) {
        localStorage.setItem(RC_STORAGE_KEY, JSON.stringify(rc));
      } else {
        localStorage.removeItem(RC_STORAGE_KEY);
      }
    } catch {
      // storage unavailable
    }
  };

  // Sync if storage changes across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === REPO_STORAGE_KEY) {
        setRepositoryState(e.newValue ? JSON.parse(e.newValue) : null);
      }
      if (e.key === RC_STORAGE_KEY) {
        setReleaseCandidateState(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <AppContext.Provider value={{ repository, releaseCandidate, setRepository, setReleaseCandidate }}>
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}
