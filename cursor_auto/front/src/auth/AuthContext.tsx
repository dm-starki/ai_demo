import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { UserPublic } from '../api/api.js';
import { useRefreshMutation } from '../api/api.js';

type Ctx = {
  user: UserPublic | null;
  setUser: (u: UserPublic | null) => void;
  accessVersion: number;
  bumpAccess: () => void;
  logout: () => void;
};

const AuthContext = createContext<Ctx | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [accessVersion, setAccessVersion] = useState(0);
  const [refresh] = useRefreshMutation();

  const bumpAccess = useCallback(() => setAccessVersion((v) => v + 1), []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    setUser(null);
    bumpAccess();
  }, [bumpAccess]);

  const refreshLoop = useCallback(async () => {
    const rt = sessionStorage.getItem('refreshToken');
    if (!rt) return;
    try {
      const data = await refresh({ refreshToken: rt }).unwrap();
      sessionStorage.setItem('accessToken', data.accessToken);
      sessionStorage.setItem('refreshToken', data.refreshToken);
      setUser(data.user);
      bumpAccess();
    } catch {
      logout();
    }
  }, [refresh, bumpAccess, logout]);

  useEffect(() => {
    void refreshLoop();
    const id = window.setInterval(() => {
      void refreshLoop();
    }, 60 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [refreshLoop]);

  const value = useMemo(
    () => ({ user, setUser, accessVersion, bumpAccess, logout }),
    [user, accessVersion, bumpAccess, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const v = useContext(AuthContext);
  if (!v) throw new Error('AuthContext');
  return v;
};
