import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type LoginResult = 'ok' | 'invalid' | 'locked' | 'error';

interface AdminContextType {
  isAdmin: boolean;
  adminToken: string;
  login: (code: string) => Promise<LoginResult>;
  logout: () => void;
  /** fetch() that adds the admin token. Use it for every POST / PATCH / DELETE. */
  adminFetch: (input: string, init?: RequestInit) => Promise<Response>;
  openAdminModal: () => void;
  closeAdminModal: () => void;
  isModalOpen: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

// Kept in sessionStorage: survives a page refresh, cleared when the tab is closed.
const TOKEN_KEY = 'kw_portfolio_admin_token';

function readToken(): string {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminToken, setAdminToken] = useState<string>(readToken);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Being "admin" simply means we hold a token. The server is what really enforces it.
  const isAdmin = adminToken !== '';

  const logout = useCallback(() => {
    setAdminToken('');
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch (err) {
      console.warn(err);
    }
  }, []);

  // One-time cleanup of the old insecure flags, and re-check any saved token with the server.
  useEffect(() => {
    try {
      localStorage.removeItem('kw_portfolio_is_admin');
      localStorage.removeItem('kw_portfolio_admin_passcode');
    } catch {
      /* ignore */
    }

    const saved = readToken();
    if (!saved) return;
    fetch('/api/admin/check', { headers: { Authorization: `Bearer ${saved}` } })
      .then((res) => {
        if (res.status === 401) logout();
      })
      .catch(() => {
        /* offline: keep the session, the server will still reject bad requests */
      });
  }, [logout]);

  // Global keyboard shortcut to toggle admin modal: Alt + L or Ctrl + Shift + L
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key.toLowerCase() === 'l') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l')) {
        e.preventDefault();
        setIsModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const login = async (code: string): Promise<LoginResult> => {
    const token = code.trim();
    if (!token) return 'invalid';
    try {
      const res = await fetch('/api/admin/check', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAdminToken(token);
        try {
          sessionStorage.setItem(TOKEN_KEY, token);
        } catch (err) {
          console.warn(err);
        }
        return 'ok';
      }
      if (res.status === 401) return 'invalid';
      if (res.status === 429) return 'locked';
      return 'error';
    } catch {
      return 'error';
    }
  };

  const adminFetch = useCallback(
    async (input: string, init: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${adminToken}`);
      if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      const res = await fetch(input, { ...init, headers });
      if (res.status === 401) logout(); // token no longer valid: drop back to public view
      return res;
    },
    [adminToken, logout]
  );

  const openAdminModal = () => setIsModalOpen(true);
  const closeAdminModal = () => setIsModalOpen(false);

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        adminToken,
        login,
        logout,
        adminFetch,
        openAdminModal,
        closeAdminModal,
        isModalOpen
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};