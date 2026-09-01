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

    // Refresh profile data from DB
    const syncProfile = async () => {
      try {
        const primaryUrl = import.meta.env.VITE_BACKEND_URL || 'https://cybersave-6tfo.onrender.com';
        let res = await fetch(`${primaryUrl}/api/admin/profile`).catch(() => null);
        if (!res?.ok && primaryUrl !== 'https://cybersave-6tfo.onrender.com') {
          res = await fetch(`https://cybersave-6tfo.onrender.com/api/admin/profile`).catch(() => null);
        }
        if (res && res.ok) {
          const prof = await res.json();
          if (prof) {
            setAdmin((prev) => {
              const updated = {
                ...(prev || { id: 'admin-root-01', email: 'admin@cybersave.com', role: 'Super Admin', permissions: ['ALL', 'DASHBOARD', 'USERS', 'APPLICATIONS', 'OPERATORS', 'SETTINGS', 'REPORTS'] }),
                name: prof.name || prev?.name || 'Suresh Kumar Sharma',
                email: prof.email || prev?.email || 'admin@cybersave.com',
                phone: prof.phone !== undefined && prof.phone !== null && prof.phone !== '' ? prof.phone : prev?.phone,
                avatarUrl: prof.avatarUrl !== undefined ? prof.avatarUrl : prev?.avatarUrl,
                role: prev?.role || 'Super Admin',
                permissions: (prev?.permissions && prev.permissions.length > 0)
                  ? prev.permissions
                  : ['ALL', 'DASHBOARD', 'USERS', 'APPLICATIONS', 'OPERATORS', 'SETTINGS', 'REPORTS'],
              };
              localStorage.setItem('adminUser', JSON.stringify(updated));
              return updated;
            });
          }
        }
      } catch {}
    };

    if (storedToken) {
      syncProfile();
    }
    setLoading(false);
  }, []);

  // 30-Minute Inactivity Auto-Lock Tracker
  useEffect(() => {
    if (!token) return;

    const getTimeoutMs = () => {
      const minutesStr = localStorage.getItem('adminSessionTimeout') || '30';
      const minutes = parseInt(minutesStr, 10) || 30;
      return minutes * 60 * 1000;
    };

    let timeoutId: NodeJS.Timeout;

    const resetInactivityTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // 30 minutes of inactivity elapsed
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        sessionStorage.setItem('sessionExpiredMsg', 'Session expired due to 30 minutes of inactivity. Please log in again to continue.');
        setToken(null);
        setAdmin(null);
      }, getTimeoutMs());
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click'];
    events.forEach((evt) => window.addEventListener(evt, resetInactivityTimer, { passive: true }));
    resetInactivityTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((evt) => window.removeEventListener(evt, resetInactivityTimer));
    };
  }, [token]);

  const login = (newToken: string, newAdmin: Admin) => {
    localStorage.setItem('adminToken', newToken);
    localStorage.setItem('adminUser', JSON.stringify(newAdmin));
    sessionStorage.removeItem('sessionExpiredMsg');
    setToken(newToken);
    setAdmin(newAdmin);
  };

  const updateAdmin = (updatedData: Partial<Admin>) => {
    setAdmin((prev) => {
      const merged = { 
        ...(prev || { id: 'admin-root-01', email: 'officer.admin@cybersave.gov.in', role: 'Super Admin', permissions: ['ALL', 'DASHBOARD', 'USERS', 'APPLICATIONS', 'OPERATORS', 'SETTINGS', 'REPORTS'] }), 
        ...updatedData 
      } as Admin;
      if (!merged.permissions || merged.permissions.length === 0) {
        merged.permissions = ['ALL', 'DASHBOARD', 'USERS', 'APPLICATIONS', 'OPERATORS', 'SETTINGS', 'REPORTS'];
      }
      localStorage.setItem('adminUser', JSON.stringify(merged));
      return merged;
    });
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    sessionStorage.removeItem('sessionExpiredMsg');
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
