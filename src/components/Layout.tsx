import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, Grid, UserSquare2, 
  ArrowLeftRight, Bell, HelpCircle, BarChart3, ShieldCheck, 
  Settings, Search, Sun, PanelLeftClose, LogOut, CheckCircle2, X,
  Building2, Command, Globe, RotateCcw, ChevronDown, UserPlus,
  Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiFetch } from '../utils/apiConfig';

export const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message, type } }));
};

const TRANSLATIONS: Record<string, Record<string, string>> = {
  EN: {
    operations: 'OPERATIONS',
    governance: 'GOVERNANCE & REGISTRY',
    compliance: 'AUDIT & COMPLIANCE',
    dashboard: 'Command Center',
    applications: 'Applications Queue',
    refunds: 'Refund Dispatches',
    transactions: 'Settlement Journal',
    services: 'Service Schemes',
    users: 'Citizen Directory',
    operators: 'Seva Kendra Operators',
    support: 'Citizen Grievances',
    analytics: 'SLA Analytics',
    audit: 'Security Audit Logs',
    notifications: 'Broadcast Dispatches',
    settings: 'System Configuration',
    quickActions: 'Quick Actions',
    searchPlaceholder: 'Search applications, citizens, operators...',
    logout: 'End Officer Session',
  },
  HI: {
    operations: 'संचालन (Operations)',
    governance: 'शासन एवं नागरिक रजिस्ट्री',
    compliance: 'ऑडिट एवं अनुपालन',
    dashboard: 'कमांड सेंटर (Dashboard)',
    applications: 'आवेदन कतार (Applications)',
    refunds: 'रिफंड प्रेषण (Refunds)',
    transactions: 'निपटान पत्रिका (Transactions)',
    services: 'सेवा योजनाएं (Services)',
    users: 'नागरिक निर्देशिका (Citizens)',
    operators: 'सेवा केंद्र संचालक (Operators)',
    support: 'नागरिक शिकायतें (Grievances)',
    analytics: 'एसएलए विश्लेषण (Analytics)',
    audit: 'सुरक्षा ऑडिट लॉग (Audit Logs)',
    notifications: 'प्रसारण प्रेषण (Broadcasts)',
    settings: 'सिस्टम कॉन्फ़िगरेशन (Settings)',
    quickActions: 'त्वरित कार्रवाई',
    searchPlaceholder: 'आवेदन, नागरिक, संचालक खोजें...',
    logout: 'सत्र समाप्त करें (Logout)',
  },
  GU: {
    operations: 'કામગીરી (Operations)',
    governance: 'શાસન અને નાગરિક નોંધણી',
    compliance: 'ઓડિટ અને પાલન',
    dashboard: 'કમાન્ડ સેન્ટર (Dashboard)',
    applications: 'અરજી કતાર (Applications)',
    refunds: 'રીફંડ ચૂકવણી (Refunds)',
    transactions: 'પતાવટ પત્રિકા (Transactions)',
    services: 'સેવા યોજનાઓ (Services)',
    users: 'નાગરિક નિર્દેશિકા (Citizens)',
    operators: 'સેવા કેન્દ્ર સંચાલકો (Operators)',
    support: 'નાગરિક ફરિયાદો (Grievances)',
    analytics: 'એસએલએ વિશ્લેષણ (Analytics)',
    audit: 'સુરક્ષા ઓડિટ લૉગ્સ (Audit Logs)',
    notifications: 'પ્રસારણ સંદેશાઓ (Broadcasts)',
    settings: 'સિસ્ટમ રૂપરેખાંકન (Settings)',
    quickActions: 'ઝડપી ક્રિયાઓ',
    searchPlaceholder: 'અરજીઓ, નાગરિકો, સંચાલકો શોધો...',
    logout: 'સત્ર સમાપ્ત કરો (Logout)',
  },
  MR: {
    operations: 'कार्यान्वयन (Operations)',
    governance: 'शासन व नागरिक नोंदवही',
    compliance: 'ऑडिट व अनुपालन',
    dashboard: 'कमांड सेंटर (Dashboard)',
    applications: 'अर्ज रांग (Applications)',
    refunds: 'परतावा वितरण (Refunds)',
    transactions: 'व्यवहार नोंदवही (Transactions)',
    services: 'सेवा योजना (Services)',
    users: 'नागरिक निर्देशिका (Citizens)',
    operators: 'सेवा केंद्र चालक (Operators)',
    support: 'नागरिक तक्रारी (Grievances)',
    analytics: 'कामगिरी विश्लेषण (Analytics)',
    audit: 'सुरक्षा ऑडिट नोंदी (Audit Logs)',
    notifications: 'सूचना प्रसारण (Broadcasts)',
    settings: 'प्रणाली संरचना (Settings)',
    quickActions: 'त्वरित कृती',
    searchPlaceholder: 'अर्ज, नागरिक, चालक शोधा...',
    logout: 'सत्र समाप्त करा (Logout)',
  }
};

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState<{message: string, type: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentLang, setCurrentLang] = useState<string>(() => localStorage.getItem('cybersave_admin_lang') || 'EN');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [notifCount, setNotifCount] = useState(12);
  const { admin, logout, updateAdmin } = useAuth();
  const { socket } = useSocket();

  const currentTranslations = TRANSLATIONS[currentLang] || TRANSLATIONS.EN;

  const LANGUAGES = [
    { code: 'EN', label: 'English (EN)' },
    { code: 'HI', label: 'हिन्दी (Hindi)' },
    { code: 'GU', label: 'ગુજરાતી (Gujarati)' },
    { code: 'MR', label: 'मराठी (Marathi)' },
  ];

  const handleSelectLanguage = (code: string) => {
    setCurrentLang(code);
    localStorage.setItem('cybersave_admin_lang', code);
    setShowLangMenu(false);
    window.dispatchEvent(new CustomEvent('cybersave_lang_changed', { detail: { lang: code } }));
    showToast(`Language set to ${code === 'HI' ? 'हिन्दी (Hindi)' : code === 'GU' ? 'ગુજરાતી (Gujarati)' : code === 'MR' ? 'मराठी (Marathi)' : 'English'}`);
  };

  const handleQuickAction = async (action: string) => {
    setShowQuickActions(false);
    switch (action) {
      case 'ENROLL_CITIZEN':
        navigate('/users');
        break;
      case 'ADD_OPERATOR':
        navigate('/operators');
        break;
      case 'REVIEW_APPLICATIONS':
        navigate('/applications');
        break;
      case 'PROCESS_REFUNDS':
        navigate('/refunds');
        break;
      case 'EXPORT_AUDIT':
        try {
          const res = await apiFetch('/api/v1/audit-logs');
          const json = await res.json();
          const logs = Array.isArray(json) ? json : (json?.logs || []);
          const headers = ['Event ID', 'Timestamp', 'User', 'Action', 'Details', 'IP'];
          const rows = logs.map((l: any) => [
            `"${l.id || ''}"`,
            `"${l.timestamp || l.createdAt || ''}"`,
            `"${l.user || l.userName || ''}"`,
            `"${l.action || ''}"`,
            `"${(l.details || l.resource || '').replace(/"/g, '""')}"`,
            `"${l.ipAddress || ''}"`
          ]);
          const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\r\n');
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `cybersave_security_audit_${new Date().toISOString().slice(0, 10)}.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          showToast('Security audit log exported to CSV!');
        } catch (e) {
          showToast('Failed to export audit log', 'error');
        }
        break;
    }
  };

  useEffect(() => {
    const handleToast = (e: any) => {
      setToast(e.detail);
      setTimeout(() => setToast(null), 3500);
    };
    window.addEventListener('cybersave_toast', handleToast);
    return () => window.removeEventListener('cybersave_toast', handleToast);
  }, []);

  // Live permission updates from Super Admin via WebSockets
  useEffect(() => {
    if (socket && admin?.id) {
      const handlePermissionsUpdated = (data: { id: string; permissions: string[] }) => {
        if (data?.id === admin.id) {
          updateAdmin({ permissions: data.permissions });
          window.dispatchEvent(new CustomEvent('cybersave_toast', {
            detail: { message: 'Your administrative access permissions have been updated in real-time.', type: 'success' }
          }));
        }
      };

      const handleForceLogout = (data: any) => {
        if (!data?.userId || data.userId === admin.id) {
          showToast(data?.message || 'Your account has been suspended by an Administrator.', 'error');
          setTimeout(() => {
            logout();
            navigate('/login');
          }, 1200);
        }
      };

      socket.on('operator_permissions_updated', handlePermissionsUpdated);
      socket.on('force_logout', handleForceLogout);
      socket.on('operator_suspended', handleForceLogout);

      return () => {
        socket.off('operator_permissions_updated', handlePermissionsUpdated);
        socket.off('force_logout', handleForceLogout);
        socket.off('operator_suspended', handleForceLogout);
      };
    }
  }, [socket, admin?.id, logout, navigate, updateAdmin]);

  const navSections = [
    {
      title: currentTranslations.operations,
      items: [
        { icon: <LayoutDashboard size={18} />, label: currentTranslations.dashboard, path: '/', requiredPermission: 'DASHBOARD' },
        { icon: <FileText size={18} />, label: currentTranslations.applications, path: '/applications', requiredPermission: 'APPLICATIONS' },
        { icon: <RotateCcw size={18} />, label: currentTranslations.refunds, path: '/refunds', requiredPermission: 'REFUNDS' },
        { icon: <ArrowLeftRight size={18} />, label: currentTranslations.transactions, path: '/transactions', requiredPermission: 'TRANSACTIONS' },
      ]
    },
    {
      title: currentTranslations.governance,
      items: [
        { icon: <Grid size={18} />, label: currentTranslations.services, path: '/services', requiredPermission: 'SERVICES' },
        { icon: <Users size={18} />, label: currentTranslations.users, path: '/users', requiredPermission: 'USERS' },
        { icon: <UserSquare2 size={18} />, label: currentTranslations.operators, path: '/operators', requiredPermission: 'OPERATORS' },
      ]
    },
    {
      title: currentTranslations.compliance,
      items: [
        { icon: <HelpCircle size={18} />, label: currentTranslations.support, path: '/support', requiredPermission: 'SUPPORT' },
        { icon: <BarChart3 size={18} />, label: currentTranslations.analytics, path: '/analytics', requiredPermission: 'ANALYTICS' },
        { icon: <ShieldCheck size={18} />, label: currentTranslations.audit, path: '/audit', requiredPermission: 'AUDIT' },
        { icon: <Bell size={18} />, label: currentTranslations.notifications, path: '/notifications', requiredPermission: 'NOTIFICATIONS' },
        { icon: <Settings size={18} />, label: currentTranslations.settings, path: '/settings', requiredPermission: 'SETTINGS' },
      ]
    }
  ];

  const isSuperAdmin = 
    admin?.email === 'admin@cybersave.com' || 
    admin?.email === 'officer.admin@cybersave.gov.in' ||
    admin?.role === 'SUPER_ADMIN' ||
    (Array.isArray(admin?.permissions) && (admin.permissions.includes('ALL') || admin.permissions.includes('SUPER_ADMIN')));

  const userPermissions = Array.isArray(admin?.permissions) ? admin.permissions : [];

  const hasAccess = (requiredPermission?: string) => {
    // Super Admins have unrestricted access
    if (isSuperAdmin) return true;
    
    // Strict Least Privilege Access for Sub-Admins and Seva Kendra Operators:
    // ONLY allowed / ticked options should be accessible and displayed.
    if (!requiredPermission) return false;
    return userPermissions.includes(requiredPermission);
  };

  // Route protection: Enforce least privilege routing access
  const allNavItems = navSections.flatMap(s => s.items);
  useEffect(() => {
    if (isSuperAdmin) return;
    const currentPath = location.pathname;
    const matchedItem = allNavItems.find(item => item.path === currentPath || (item.path !== '/' && currentPath.startsWith(item.path)));
    if (matchedItem && !hasAccess(matchedItem.requiredPermission)) {
      // Find the first authorized navigation route for this sub-admin
      const firstAllowed = allNavItems.find(item => hasAccess(item.requiredPermission));
      if (firstAllowed) {
        navigate(firstAllowed.path, { replace: true });
      }
    }
  }, [location.pathname, isSuperAdmin, userPermissions]);

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
              item => hasAccess(item.requiredPermission)
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
        {/* Global Operational Header Bar Matching Reference Image */}
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
          {/* Universal Search Input matching Reference */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '8px 14px',
            width: '380px',
            gap: '10px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}>
            <Search size={16} color="#64748B" />
            <input
              type="text"
              placeholder={currentTranslations.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  navigate(`/applications?q=${encodeURIComponent(searchQuery.trim())}`);
                }
              }}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '13px',
                color: '#0F172A',
                width: '100%'
              }}
            />
          </div>

          {/* Header Right Actions matching Reference */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            {/* Language Switcher Dropdown (EN v) */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setShowLangMenu(!showLangMenu);
                  setShowNotifMenu(false);
                  setShowQuickActions(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#475569',
                  padding: '4px 8px',
                  borderRadius: '6px'
                }}
              >
                <span>{currentLang}</span>
                <ChevronDown size={14} color="#64748B" />
              </button>

              {showLangMenu && (
                <div style={{
                  position: 'absolute',
                  top: '120%',
                  right: 0,
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)',
                  minWidth: '160px',
                  padding: '6px',
                  zIndex: 100
                }}>
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleSelectLanguage(lang.code)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 12px',
                        background: currentLang === lang.code ? '#EFF6FF' : 'transparent',
                        color: currentLang === lang.code ? '#2563EB' : '#1E293B',
                        fontWeight: currentLang === lang.code ? 700 : 500,
                        fontSize: '12.5px',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span>{lang.label}</span>
                      {currentLang === lang.code && <CheckCircle2 size={13} color="#2563EB" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme Toggle Button */}
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
              <Sun size={18} strokeWidth={2} />
            </div>

            {/* Notifications Button with Red Badge 12 */}
            <div style={{ position: 'relative' }}>
              <div 
                onClick={() => {
                  setShowNotifMenu(!showNotifMenu);
                  setShowLangMenu(false);
                  setShowQuickActions(false);
                }}
                style={{ 
                  position: 'relative', 
                  cursor: 'pointer', 
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Notifications"
              >
                <Bell size={18} color="#334155" strokeWidth={2} />
                <span style={{
                  position: 'absolute',
                  top: -2,
                  right: -4,
                  minWidth: '18px',
                  height: '18px',
                  borderRadius: '9px',
                  background: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: '10px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  boxShadow: '0 1px 3px rgba(239, 68, 68, 0.4)'
                }}>
                  {notifCount}
                </span>
              </div>

              {/* Notification Popover Dropdown */}
              {showNotifMenu && (
                <div style={{
                  position: 'absolute',
                  top: '140%',
                  right: -40,
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  boxShadow: '0 12px 30px -5px rgba(0,0,0,0.15)',
                  width: '320px',
                  padding: '12px',
                  zIndex: 100
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                      Operational Dispatches ({notifCount})
                    </div>
                    <button 
                      onClick={() => {
                        setNotifCount(0);
                        showToast('All notifications marked as read');
                      }}
                      style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Mark all read
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                    <div style={{ padding: '8px', background: '#F8FAFC', borderRadius: '8px', fontSize: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>New PAN Application CS-2026-9024</div>
                      <div style={{ color: '#64748B', fontSize: '11px', marginTop: '2px' }}>Priya Sharma submitted application • 5 mins ago</div>
                    </div>
                    <div style={{ padding: '8px', background: '#F8FAFC', borderRadius: '8px', fontSize: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>Aadhaar Correction Dispatch</div>
                      <div style={{ color: '#64748B', fontSize: '11px', marginTop: '2px' }}>Centre #1024 uploaded verification documents • 18 mins ago</div>
                    </div>
                    <div style={{ padding: '8px', background: '#F8FAFC', borderRadius: '8px', fontSize: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>Refund Claim Approved</div>
                      <div style={{ color: '#64748B', fontSize: '11px', marginTop: '2px' }}>Claim #REF-9024 processed for ₹50.00 • 35 mins ago</div>
                    </div>
                  </div>

                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        setShowNotifMenu(false);
                        navigate('/notifications');
                      }}
                      style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      View All Dispatches &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Blue Quick Actions Button matching Reference Image */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setShowQuickActions(!showQuickActions);
                  setShowLangMenu(false);
                  setShowNotifMenu(false);
                }}
                style={{
                  background: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '9px',
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
                  transition: 'background 0.15s ease'
                }}
              >
                <span>{currentTranslations.quickActions}</span>
              </button>

              {/* Quick Actions Dropdown Menu */}
              {showQuickActions && (
                <div style={{
                  position: 'absolute',
                  top: '125%',
                  right: 0,
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  boxShadow: '0 12px 30px -5px rgba(0,0,0,0.15)',
                  minWidth: '220px',
                  padding: '6px',
                  zIndex: 100
                }}>
                  <button
                    onClick={() => handleQuickAction('ENROLL_CITIZEN')}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 12px',
                      background: 'transparent',
                      color: '#1E293B',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <UserPlus size={15} color="#2563EB" />
                    <span>Enroll Citizen</span>
                  </button>

                  <button
                    onClick={() => handleQuickAction('ADD_OPERATOR')}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 12px',
                      background: 'transparent',
                      color: '#1E293B',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <UserSquare2 size={15} color="#059669" />
                    <span>Add Seva Kendra Operator</span>
                  </button>

                  <button
                    onClick={() => handleQuickAction('REVIEW_APPLICATIONS')}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 12px',
                      background: 'transparent',
                      color: '#1E293B',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <FileText size={15} color="#D97706" />
                    <span>Review Applications Queue</span>
                  </button>

                  <button
                    onClick={() => handleQuickAction('PROCESS_REFUNDS')}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 12px',
                      background: 'transparent',
                      color: '#1E293B',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <RotateCcw size={15} color="#DC2626" />
                    <span>Process Refund Dispatches</span>
                  </button>

                  <div style={{ height: '1px', background: '#F1F5F9', margin: '4px 0' }} />

                  <button
                    onClick={() => handleQuickAction('EXPORT_AUDIT')}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 12px',
                      background: 'transparent',
                      color: '#1E293B',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Download size={15} color="#475569" />
                    <span>Export Audit Logs CSV</span>
                  </button>
                </div>
              )}
            </div>

            <div 
              onClick={() => navigate('/settings')}
              title="Click to view & edit admin profile settings"
              style={{
                borderLeft: '1px solid #E2E8F0',
                paddingLeft: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'opacity 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              {admin?.avatarUrl && admin.avatarUrl.trim() !== '' ? (
                <img
                  src={admin.avatarUrl}
                  alt={admin.name || 'Administrator'}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1.5px solid #2563EB',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                  onError={(e) => {
                    // Fallback to initials if image link is broken
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: '#1E40AF',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}>
                  {admin?.name
                    ? admin.name.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                    : 'SA'}
                </div>
              )}
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                  {admin?.name || 'Super Administrator'}
                </div>
                <div style={{ fontSize: '10.5px', color: '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
                  Super Administrator Active
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
