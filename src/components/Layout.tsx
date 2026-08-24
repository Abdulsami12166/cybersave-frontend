import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, Grid, UserSquare2, 
  ArrowLeftRight, Bell, HelpCircle, BarChart3, ShieldCheck, 
  Settings, Search, Sun, PanelLeftClose, LogOut, CheckCircle2, X,
  Building2, Command, Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message, type } }));
};

export default function Layout() {
  const navigate = useNavigate();
  const [toast, setToast] = useState<{message: string, type: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { admin, logout } = useAuth();
  const { socket } = useSocket();

  useEffect(() => {
    const handleToast = (e: any) => {
      setToast(e.detail);
      setTimeout(() => setToast(null), 3500);
    };
    window.addEventListener('cybersave_toast', handleToast);
    return () => window.removeEventListener('cybersave_toast', handleToast);
  }, []);

  // Force logout when administrator suspends this operator account
  useEffect(() => {
    if (socket && admin?.id) {
      const handleForceLogout = (data: any) => {
        if (!data?.userId || data.userId === admin.id) {
          showToast(data?.message || 'Your account has been suspended by an Administrator.', 'error');
          setTimeout(() => {
            logout();
            navigate('/login');
          }, 1200);
        }
      };

      socket.on('force_logout', handleForceLogout);
      socket.on('operator_suspended', handleForceLogout);

      return () => {
        socket.off('force_logout', handleForceLogout);
        socket.off('operator_suspended', handleForceLogout);
      };
    }
  }, [socket, admin?.id, logout, navigate]);

  const navSections = [
    {
      title: 'OPERATIONS',
      items: [
        { icon: <LayoutDashboard size={18} />, label: 'Command Center', path: '/', requiredPermission: 'DASHBOARD' },
        { icon: <FileText size={18} />, label: 'Applications Queue', path: '/applications', requiredPermission: 'APPLICATIONS' },
        { icon: <ArrowLeftRight size={18} />, label: 'Settlement Journal', path: '/transactions', requiredPermission: 'DASHBOARD' },
      ]
    },
    {
      title: 'GOVERNANCE & REGISTRY',
      items: [
        { icon: <Grid size={18} />, label: 'Service Schemes', path: '/services', requiredPermission: 'APPLICATIONS' },
        { icon: <Users size={18} />, label: 'Citizen Directory', path: '/users', requiredPermission: 'USERS' },
        { icon: <UserSquare2 size={18} />, label: 'Seva Kendra Operators', path: '/operators', requiredPermission: 'OPERATORS' },
      ]
    },
    {
      title: 'AUDIT & COMPLIANCE',
      items: [
        { icon: <HelpCircle size={18} />, label: 'Citizen Grievances', path: '/support', requiredPermission: 'DASHBOARD' },
        { icon: <BarChart3 size={18} />, label: 'SLA Analytics', path: '/analytics', requiredPermission: 'REPORTS' },
        { icon: <ShieldCheck size={18} />, label: 'Security Audit Logs', path: '/audit', requiredPermission: 'SETTINGS' },
        { icon: <Bell size={18} />, label: 'Broadcast Dispatches', path: '/notifications', requiredPermission: 'DASHBOARD' },
        { icon: <Settings size={18} />, label: 'System Configuration', path: '/settings', requiredPermission: 'SETTINGS' },
      ]
    }
  ];

  const defaultPermissions = ['DASHBOARD', 'USERS', 'APPLICATIONS', 'OPERATORS', 'SETTINGS', 'REPORTS'];
  const adminPermissions = (admin?.permissions && admin.permissions.length > 0)
    ? admin.permissions
    : defaultPermissions;

  const toggleDarkMode = () => {
    const root = document.documentElement;
    const isDark = root.style.filter.includes('invert');
    if (isDark) {
      root.style.filter = '';
      root.style.backgroundColor = '';
    } else {
      root.style.filter = 'invert(1) hue-rotate(180deg)';
      root.style.backgroundColor = '#ffffff';
    }
    root.style.transition = 'all 0.3s ease';
  };

  return (
    <div className="app-container">
      {/* Toast Notification Container */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999,
          background: toast.type === 'error' ? '#FEF2F2' : '#ECFDF5',
          border: `1px solid ${toast.type === 'error' ? '#FECACA' : '#A7F3D0'}`,
          color: toast.type === 'error' ? '#991B1B' : '#065F46',
          padding: '12px 18px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          fontSize: '13px',
          fontWeight: 600,
        }}>
          {toast.type === 'error' ? <X size={16} color="#991B1B" /> : <CheckCircle2 size={16} color="#065F46" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sidebar" style={{
        width: '270px',
        background: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflowY: 'auto'
      }}>
        {/* Portal Branding */}
        <div style={{
          padding: '20px 20px 16px 20px',
          borderBottom: '1px solid #F1F5F9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 900,
              fontSize: '18px',
              boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
            }}>
              C
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                <span style={{ color: '#2563EB' }}>Cyber</span>save
              </div>
              <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                National E-Gov Console
              </div>
            </div>
          </div>
        </div>

        {/* Grouped Navigation */}
        <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '18px', flex: 1 }}>
          {navSections.map((section, sIdx) => {
            const visibleItems = section.items.filter(
              item => !item.requiredPermission || adminPermissions.includes(item.requiredPermission)
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={sIdx}>
                <div style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  color: '#94A3B8',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '0 10px 6px 10px'
                }}>
                  {section.title}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {visibleItems.map((item, iIdx) => (
                    <NavLink
                      key={iIdx}
                      to={item.path}
                      className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                      end={item.path === '/'}
                      style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        borderRadius: '7px',
                        fontSize: '13px',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? '#1D4ED8' : '#475569',
                        background: isActive ? '#EFF6FF' : 'transparent',
                        textDecoration: 'none',
                        transition: 'all 0.15s ease'
                      })}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Operator Badge & Sign Out */}
        <div style={{
          padding: '14px 16px',
          borderTop: '1px solid #F1F5F9',
          background: '#FAFAFA'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '12px',
                color: '#334155'
              }}>
                {(admin?.name || admin?.email || 'AD').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                  {admin?.name || 'Principal Officer'}
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                  ID: CSC-IND-8841
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #FCA5A5',
              background: '#FEF2F2',
              color: '#DC2626',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <LogOut size={13} />
            <span>End Officer Session</span>
          </button>
        </div>
      </aside>

      {/* Main Administrative Workplace */}
      <div className="main-content" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflowY: 'auto',
        background: '#F8FAFC'
      }}>
        {/* Global Operational Header Bar */}
        <header style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '12px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}>
          {/* Universal Registry Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#F1F5F9',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '7px 14px',
            width: '360px',
            gap: '8px'
          }}>
            <Search size={15} color="#64748B" />
            <input
              type="text"
              placeholder="Search citizen, application ref, or service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '12.5px',
                color: '#0F172A',
                width: '100%'
              }}
            />
            <span style={{
              fontSize: '10.5px',
              fontWeight: 700,
              background: '#FFFFFF',
              color: '#64748B',
              padding: '2px 5px',
              borderRadius: '4px',
              border: '1px solid #CBD5E1'
            }}>
              ⌘K
            </span>
          </div>

          {/* Header Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#0F172A',
              fontWeight: 600,
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              padding: '5px 10px',
              borderRadius: '6px'
            }}>
              <Globe size={13} color="#2563EB" />
              <span>Center Node: DEL-01</span>
            </div>

            <div 
              onClick={toggleDarkMode}
              title="Toggle Display Theme"
              style={{
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Sun size={17} />
            </div>

            <div style={{ position: 'relative', cursor: 'pointer', padding: '6px' }}>
              <Bell size={17} color="#475569" />
              <span style={{
                position: 'absolute',
                top: 2,
                right: 2,
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#EF4444'
              }}></span>
            </div>

            <div style={{
              borderLeft: '1px solid #E2E8F0',
              paddingLeft: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#1E40AF',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                SA
              </div>
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                  Super Administrator
                </div>
                <div style={{ fontSize: '10.5px', color: '#10B981', fontWeight: 600 }}>
                  ● Active Duty
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main style={{ padding: '24px 28px', flex: 1 }}>
          <Outlet />
        </main>

        {/* Portal Footer */}
        <footer style={{
          padding: '14px 28px',
          borderTop: '1px solid #E2E8F0',
          background: '#FFFFFF',
          fontSize: '11.5px',
          color: '#64748B',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            Cybersave Operations Desk • <strong>Citizen Service Delivery Network</strong>
          </div>
          <div style={{ display: 'flex', gap: '14px' }}>
            <span>Audit Trail Enabled</span>
            <span>•</span>
            <span>Release 2.6.4</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
