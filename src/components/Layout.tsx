import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, Grid, UserSquare2, 
  ArrowLeftRight, Bell, HelpCircle, BarChart3, ShieldCheck, 
  Settings, Search, Sun, PanelLeftClose, CheckCircle2, X, LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message, type } }));
};

export default function Layout() {
  const [toast, setToast] = useState<{message: string, type: string} | null>(null);
  const { admin, logout } = useAuth();

  useEffect(() => {
    const handleToast = (e: any) => {
      setToast(e.detail);
      setTimeout(() => setToast(null), 3000);
    };
    window.addEventListener('cybersave_toast', handleToast);
    return () => window.removeEventListener('cybersave_toast', handleToast);
  }, []);

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/', requiredPermission: 'DASHBOARD' },
    { icon: <Users size={20} />, label: 'User Management', path: '/users', requiredPermission: 'USERS' },
    { icon: <FileText size={20} />, label: 'Applications', path: '/applications', requiredPermission: 'APPLICATIONS' },
    { icon: <Grid size={20} />, label: 'Services', path: '/services', requiredPermission: 'APPLICATIONS' },
    { icon: <UserSquare2 size={20} />, label: 'Operators', path: '/operators', requiredPermission: 'OPERATORS' },
    { icon: <ArrowLeftRight size={20} />, label: 'Transactions', path: '/transactions', requiredPermission: 'DASHBOARD' },
    { icon: <Bell size={20} />, label: 'Notifications', path: '/notifications', requiredPermission: 'DASHBOARD' },
    { icon: <HelpCircle size={20} />, label: 'Support Tickets', path: '/support', requiredPermission: 'DASHBOARD' },
    { icon: <BarChart3 size={20} />, label: 'Analytics', path: '/analytics', requiredPermission: 'REPORTS' },
    { icon: <ShieldCheck size={20} />, label: 'Audit Logs', path: '/audit', requiredPermission: 'SETTINGS' },
    { icon: <Settings size={20} />, label: 'Settings', path: '/settings', requiredPermission: 'SETTINGS' },
  ];

  const defaultPermissions = ['DASHBOARD', 'USERS', 'APPLICATIONS', 'OPERATORS', 'SETTINGS', 'REPORTS'];
  const adminPermissions = (admin?.email === 'admin@cybersave.com')
    ? defaultPermissions
    : (admin?.permissions && admin.permissions.length > 0 ? admin.permissions : ['DASHBOARD', 'APPLICATIONS']);

  const filteredNavItems = navItems.filter(item => !item.requiredPermission || adminPermissions.includes(item.requiredPermission));

  const toggleDarkMode = () => {
    // Ponytail minimal dark mode implementation
    const root = document.documentElement;
    const isDark = root.style.filter.includes('invert');
    if (isDark) {
      root.style.filter = '';
      root.style.backgroundColor = '';
    } else {
      root.style.filter = 'invert(1) hue-rotate(180deg)';
      root.style.backgroundColor = '#ffffff'; // The root inverted #ffffff will be #000000
    }
    root.style.transition = 'all 0.3s ease';
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="brand">
          <span style={{color: '#2563eb'}}>Cyber</span><span style={{color: '#111827'}}>save</span>
        </div>
        
        {filteredNavItems.map((item, index) => (
          <NavLink key={index} to={item.path} className={({isActive}) => isActive ? "nav-item active" : "nav-item"} end={item.path === '/'}>
            {item.icon} {item.label}
          </NavLink>
        ))}

        <div className="sidebar-spacer"></div>
        <div 
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            margin: '0 12px 10px 12px',
            borderRadius: 8,
            color: '#dc2626',
            backgroundColor: '#fef2f2',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            border: '1px solid #fecaca',
            transition: 'all 0.2s ease'
          }}
        >
          <LogOut size={17} color="#dc2626" />
          <span>Sign Out</span>
        </div>
        <div className="collapse-menu">
          <PanelLeftClose size={20} /> Collapse Menu
        </div>
      </div>

      <div className="main-content">
        <div className="header">
          <div className="search-bar">
            <Search size={18} color="#6b7280" />
            <input type="text" placeholder="Search..." />
          </div>
          <div className="header-right">
            <div style={{fontSize: '14px', fontWeight: 500, color: '#6b7280'}}>EN</div>
            <Sun size={20} color="#6b7280" onClick={toggleDarkMode} style={{cursor: 'pointer'}} />
            <div style={{position: 'relative'}}>
              <Bell size={20} color="#6b7280" />
              <div style={{position: 'absolute', top: -4, right: -4, background: '#ef4444', color: 'white', fontSize: '10px', borderRadius: '50%', width: 14, height: 14, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>12</div>
            </div>
            <button className="action-btn">Quick Actions</button>
            <div className="profile-widget">
              <img 
                src={admin?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(admin?.name || admin?.email || 'Admin')}&background=0D8ABC&color=fff`} 
                alt="Profile" 
                style={{width: 36, height: 36, borderRadius: '50%', objectFit: 'cover'}}
              />
              <div className="profile-info">
                <span className="profile-name">{admin?.name || (admin?.email === 'admin@cybersave.com' ? 'Super Administrator' : admin?.email?.split('@')[0])}</span>
                <span className="profile-role">{admin?.role || (admin?.email === 'admin@cybersave.com' ? 'Super Admin' : 'Sub-Admin / Operator')}</span>
              </div>
            </div>
            <button 
              onClick={logout} 
              title="Sign Out of Session"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)',
              }}
            >
              <LogOut size={15} color="#ffffff" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        <Outlet />
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, 
          background: toast.type === 'success' ? '#10b981' : '#ef4444', 
          color: 'white', padding: '12px 20px', borderRadius: 8, 
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          zIndex: 9999,
          animation: 'slideIn 0.3s ease-out forwards'
        }}>
          <CheckCircle2 size={20} />
          <span style={{fontWeight: 500, fontSize: 14}}>{toast.message}</span>
          <X size={16} style={{cursor: 'pointer', marginLeft: 8}} onClick={() => setToast(null)} />
        </div>
      )}
      <style>{`
        @keyframes slideIn {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
