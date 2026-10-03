import React, { createContext, useContext, useState, useEffect } from 'react';

interface AdminContextType {
  isAdmin: boolean;
  adminPasscode: string;
  login: (code: string) => boolean;
  logout: () => void;
  openAdminModal: () => void;
  closeAdminModal: () => void;
  isModalOpen: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const VALID_PASSCODES = [
  '@Hackmeifyoucan~',
  '@Hackmeifyoucan',
  '@Hackmeifyoucan$$~',
  'kelvin0078',
  '0712539685'
];

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem('kw_portfolio_is_admin') === 'true';
    } catch {
      return false;
    }
  });

  const [adminPasscode, setAdminPasscode] = useState<string>(() => {
    try {
      return localStorage.getItem('kw_portfolio_admin_passcode') || '@Hackmeifyoucan~';
    } catch {
      return '@Hackmeifyoucan~';
    }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const login = (code: string): boolean => {
    const trimmed = code.trim();
    if (trimmed === adminPasscode || VALID_PASSCODES.includes(trimmed)) {
      setIsAdmin(true);
      try {
        localStorage.setItem('kw_portfolio_is_admin', 'true');
      } catch (err) {
        console.warn(err);
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAdmin(false);
    try {
      localStorage.removeItem('kw_portfolio_is_admin');
    } catch (err) {
      console.warn(err);
    }
  };

  const openAdminModal = () => setIsModalOpen(true);
  const closeAdminModal = () => setIsModalOpen(false);

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        adminPasscode,
        login,
        logout,
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
