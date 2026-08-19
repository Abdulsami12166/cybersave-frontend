import React, { createContext, useContext, useState, useEffect } from 'react';

interface Admin {
  id: string;
  email: string;
  name?: string;
  role?: string;
  phone?: string;
  avatarUrl?: string;
  permissions: string[];
}

interface AuthContextType {
  admin: Admin | null;
  token: string | null;
  login: (token: string, admin: Admin) => void;
  updateAdmin: (updatedData: Partial<Admin>) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('adminToken');
    const storedAdmin = localStorage.getItem('adminUser');
    
    if (storedToken && storedAdmin) {
      setToken(storedToken);
      try {
        setAdmin(JSON.parse(storedAdmin));
      } catch (e) {
        console.error('Failed to parse adminUser from localStorage', e);
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newAdmin: Admin) => {
    localStorage.setItem('adminToken', newToken);
    localStorage.setItem('adminUser', JSON.stringify(newAdmin));
    setToken(newToken);
    setAdmin(newAdmin);
  };

  const updateAdmin = (updatedData: Partial<Admin>) => {
    setAdmin((prev) => {
      const merged = { ...(prev || { id: 'admin-1', email: 'admin@cybersave.com', permissions: ['all'] }), ...updatedData } as Admin;
      localStorage.setItem('adminUser', JSON.stringify(merged));
      return merged;
    });
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setToken(null);
    setAdmin(null);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ admin, token, login, updateAdmin, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
