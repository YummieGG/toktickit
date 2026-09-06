import { createContext, useContext, useState, useEffect, type ReactNode, type FC } from 'react';

export interface Requester {
  id: number | string;
  name: string;
  email: string;
}

interface RequesterContextType {
  requester: Requester | null;
  setRequester: (requester: Requester | null) => void;
}

const RequesterContext = createContext<RequesterContextType | undefined>(undefined);

export const RequesterProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [requester, setRequesterState] = useState<Requester | null>(() => {
    const saved = sessionStorage.getItem('toktickit_requester');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (requester) {
      sessionStorage.setItem('toktickit_requester', JSON.stringify(requester));
    } else {
      sessionStorage.removeItem('toktickit_requester');
    }
  }, [requester]);

  return (
    <RequesterContext.Provider value={{ requester, setRequester: setRequesterState }}>
      {children}
    </RequesterContext.Provider>
  );
};

export const useRequester = (): RequesterContextType => {
  const context = useContext(RequesterContext);
  if (context === undefined) {
    throw new Error('useRequester must be used within a RequesterProvider');
  }
  return context;
};
