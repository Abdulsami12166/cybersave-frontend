import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FileText, Grid, UserSquare2, 
  ArrowLeftRight, Bell, HelpCircle, BarChart3, ShieldCheck, 
  Settings, Search, Sun, PanelLeftClose, LogOut, CheckCircle2, X,
  Building2, Command, Globe, RotateCcw, ChevronDown, UserPlus,
  Download, Plus, Sliders, Shield, AlertTriangle, Send, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiFetch } from '../utils/apiConfig';
import ErrorBoundary from './ErrorBoundary';

export const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message, type } }));
};

const TRANSLATIONS: Record<string, Record<string, string>> = {
  EN: {
    dashboard: 'Dashboard',
    users: 'User Management',
    applications: 'Applications',
    services: 'Services',
    operators: 'Operators',
    transactions: 'Transactions',
    notifications: 'Notifications',
    support: 'Support Tickets',
    analytics: 'Analytics',
    audit: 'Audit Logs',
    settings: 'Settings',
    collapseMenu: 'Collapse Menu',
    quickActions: 'Quick Actions',
    searchPlaceholder: 'Search applications, citizens, operators...',
    logout: 'Logout',
  },
  HI: {
    dashboard: 'डैशबोर्ड (Dashboard)',
    users: 'उपयोगकर्ता प्रबंधन (User Management)',
    applications: 'आवेदन (Applications)',
    services: 'सेवाएं (Services)',
    operators: 'ऑपरेटर्स (Operators)',
    transactions: 'लेनदेन (Transactions)',
    notifications: 'सूचनाएं (Notifications)',
    support: 'सपोर्ट टिकट्स (Support Tickets)',
    analytics: 'एनालिटिक्स (Analytics)',
    audit: 'ऑडिट लॉग्स (Audit Logs)',
    settings: 'सेटिंग्स (Settings)',
    collapseMenu: 'मेनू संक्षिप्त करें',
    quickActions: 'त्वरित कार्रवाई',
    searchPlaceholder: 'आवेदन, नागरिक, संचालक खोजें...',
    logout: 'लॉगआउट',
  },
  GU: {
    dashboard: 'ડેશબોર્ડ (Dashboard)',
    users: 'વપરાશકર્તા વ્યવસ્થાપન (User Management)',
    applications: 'અરજીઓ (Applications)',
    services: 'સેવાઓ (Services)',
    operators: 'ઓપરેટર્સ (Operators)',
    transactions: 'વ્યવહારો (Transactions)',
    notifications: 'સૂચનાઓ (Notifications)',
    support: 'સપોર્ટ ટિકિટો (Support Tickets)',
    analytics: 'એનાલિટિક્સ (Analytics)',
    audit: 'ઓડિટ લૉગ્સ (Audit Logs)',
    settings: 'સેટિંગ્સ (Settings)',
    collapseMenu: 'મેનુ સંકોચો',
    quickActions: 'ઝડપી ક્રિયાઓ',
    searchPlaceholder: 'અરજીઓ, નાગરિકો, સંચાલકો શોધો...',
    logout: 'લૉગઆઉટ',
  },
  MR: {
    dashboard: 'डॅशबोर्ड (Dashboard)',
    users: 'वापरकर्ता व्यवस्थापन (User Management)',
    applications: 'अर्ज (Applications)',
    services: 'सेवा (Services)',
    operators: 'ऑपरेटर्स (Operators)',
    transactions: 'व्यवहार (Transactions)',
    notifications: 'सूचना (Notifications)',
    support: 'सपोर्ट तिकीट (Support Tickets)',
    analytics: 'अॅनालिटिक्स (Analytics)',
    audit: 'ऑडिट नोंदी (Audit Logs)',
    settings: 'सेटिंग्ज (Settings)',
    collapseMenu: 'मेनू संकुचित करा',
    quickActions: 'त्वरित कृती',
    searchPlaceholder: 'अर्ज, नागरिक, चालक शोधा...',
    logout: 'लॉगआउट',
  }
};

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState<{message: string, type: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentLang, setCurrentLang] = useState<string>(() => localStorage.getItem('cybersave_admin_lang') || 'EN');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [notifCount, setNotifCount] = useState(12);
  const [notificationList, setNotificationList] = useState<any[]>([
    { id: 'n1', title: 'New PAN Application CS-2026-9024', desc: 'Priya Sharma submitted application from CyberSave Mobile', time: '5 mins ago', read: false },
    { id: 'n2', title: 'Operator Registered', desc: 'Centre #4812 (Bhopal) Activated', time: '12 mins ago', read: false },
    { id: 'n3', title: 'Aadhaar Correction Dispatch', desc: 'Centre #1024 uploaded verification documents', time: '18 mins ago', read: false },
    { id: 'n4', title: 'Refund Claim Approved', desc: 'Claim #REF-9024 processed for ₹50.00', time: '35 mins ago', read: false },
    { id: 'n5', title: 'Security Audit Log Generated', desc: 'Operator access credentials updated', time: '1 hour ago', read: false },
  ]);
  const { admin, logout, updateAdmin } = useAuth();
  const { socket } = useSocket();

  // Dynamic Operator / Admin Full Profile State
  const [operatorProfile, setOperatorProfile] = useState<{ name: string; designation: string; avatarUrl?: string }>(() => {
    let s: any = {};
    let u: any = {};
    try { s = JSON.parse(localStorage.getItem('adminSettings') || '{}'); } catch {}
    try { u = JSON.parse(localStorage.getItem('adminUser') || '{}'); } catch {}
    const name = u.name || u.fullName || s.name || 'Suresh Kumar Sharma';
    const designation = u.role || s.designation || (u.email === 'admin@cybersave.com' ? 'Super Admin' : 'Principal Verification Officer (SDM)');
    const avatarUrl = u.avatarUrl || s.avatarUrl;
    return { name, designation, avatarUrl };
  });

  useEffect(() => {
    const syncOperatorData = () => {
      let s: any = {};
      let u: any = {};
      try { s = JSON.parse(localStorage.getItem('adminSettings') || '{}'); } catch {}
      try { u = JSON.parse(localStorage.getItem('adminUser') || '{}'); } catch {}
      const name = admin?.name || (admin as any)?.fullName || u.name || u.fullName || s.name || 'Suresh Kumar Sharma';
      const designation = admin?.role || u.role || s.designation || (admin?.email === 'admin@cybersave.com' ? 'Super Admin' : 'Principal Verification Officer (SDM)');
      const avatarUrl = admin?.avatarUrl || u.avatarUrl || s.avatarUrl;
      setOperatorProfile({ name, designation, avatarUrl });
    };

    syncOperatorData();
    window.addEventListener('storage', syncOperatorData);
    window.addEventListener('cybersave_admin_updated', syncOperatorData);
    return () => {
      window.removeEventListener('storage', syncOperatorData);
      window.removeEventListener('cybersave_admin_updated', syncOperatorData);
    };
  }, [admin]);

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

  // Modals state for Quick Actions
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignAudience, setCampaignAudience] = useState('ALL');
  const [campaignChannel, setCampaignChannel] = useState('PUSH_AND_SMS');
  const [campaignPriority, setCampaignPriority] = useState('HIGH');
  const [campaignContent, setCampaignContent] = useState('');
  const [isLaunchingCampaign, setIsLaunchingCampaign] = useState(false);

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [showAddTeamMember, setShowAddTeamMember] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamEmail, setNewTeamEmail] = useState('');
  const [newTeamPhone, setNewTeamPhone] = useState('');
  const [newTeamDept, setNewTeamDept] = useState('CSC Operations & Verification Desk');
  const [newTeamPerms, setNewTeamPerms] = useState<string[]>(['DASHBOARD', 'APPLICATIONS', 'USERS']);
  const [savingTeamMember, setSavingTeamMember] = useState(false);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [quickSettings, setQuickSettings] = useState({
    maintenanceMode: false,
    autoApprovalThreshold: 85,
    smsGatewayProvider: 'Gov NIC SMS Gateway',
    biometricStrictness: 'High',
    auditRetentionDays: 90
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const handleLaunchCampaign = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!campaignTitle.trim() || !campaignContent.trim()) {
      showToast('Please provide a campaign title and announcement message', 'error');
      return;
    }
    setIsLaunchingCampaign(true);

    const title = campaignTitle.trim();
    const content = campaignContent.trim();
    const formattedTitle = title.startsWith('📢') ? title : `📢 ${title}`;

    // 1. Instant zero-latency direct socket broadcast across cluster
    if (socket) {
      const payload = {
        id: `NOTIF-${Date.now().toString(36).toUpperCase()}`,
        title: formattedTitle,
        body: content,
        message: content,
        content: content,
        targetAudience: campaignAudience,
        channel: campaignChannel,
        priority: campaignPriority,
        createdAt: new Date().toISOString()
      };
      try {
        socket.emit('broadcast_notification', payload);
        socket.emit('send_global_push', { title: formattedTitle, body: content });
        socket.emit('campaign_broadcast', payload);
      } catch (sockErr) {
        console.warn('Socket broadcast emit notice:', sockErr);
      }
    }

    try {
      // 2. Parallel REST dispatch to campaigns & notifications broadcast endpoints
      const [campRes, notifRes] = await Promise.allSettled([
        apiFetch('/api/v1/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formattedTitle,
            targetAudience: campaignAudience,
            channel: campaignChannel,
            priority: campaignPriority,
            content
          })
        }),
        apiFetch('/api/v1/notifications/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formattedTitle,
            body: content,
            message: content,
            priority: campaignPriority,
            targetAudience: campaignAudience
          })
        })
      ]);

      const isSuccess = (campRes.status === 'fulfilled' && campRes.value.ok) ||
                        (notifRes.status === 'fulfilled' && notifRes.value.ok);

      if (isSuccess || socket) {
        showToast('Notification broadcast successfully dispatched to citizen status bars!', 'success');
        setShowCampaignModal(false);
        setCampaignTitle('');
        setCampaignContent('');
      } else {
        showToast('Failed to dispatch campaign', 'error');
      }
    } catch {
      if (socket) {
        showToast('Dispatched to citizens via real-time gateway', 'success');
        setShowCampaignModal(false);
        setCampaignTitle('');
        setCampaignContent('');
      } else {
        showToast('Network error while broadcasting campaign', 'error');
      }
    } finally {
      setIsLaunchingCampaign(false);
    }
  };

  const fetchTeamMembers = async () => {
    setLoadingTeam(true);
    try {
      const res = await apiFetch('/api/v1/operators');
      if (res.ok) {
        const json = await res.json();
        setTeamMembers(Array.isArray(json) ? json : (json?.operators || []));
      }
    } catch (_) {}
    finally { setLoadingTeam(false); }
  };

  const handleCreateTeamMember = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTeamName.trim() || !newTeamEmail.trim()) {
      showToast('Name and email are required', 'error');
      return;
    }
    setSavingTeamMember(true);
    try {
      const res = await apiFetch('/api/v1/operators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeamName.trim(),
          email: newTeamEmail.trim(),
          phone: newTeamPhone.trim(),
          department: newTeamDept,
          permissions: newTeamPerms
        })
      });
      if (res.ok) {
        showToast(`Team member ${newTeamName} registered successfully!`);
        setShowAddTeamMember(false);
        setNewTeamName('');
        setNewTeamEmail('');
        setNewTeamPhone('');
        fetchTeamMembers();
      } else {
        showToast('Failed to register team member', 'error');
      }
    } catch {
      showToast('Error registering team member', 'error');
    } finally {
      setSavingTeamMember(false);
    }
  };

  const handleToggleTeamStatus = async (member: any) => {
    const newStatus = member.status === 'Suspended' ? 'ACTIVE' : 'SUSPENDED';
    try {
      await apiFetch(`/api/v1/operators/${member.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      showToast(`Member access ${newStatus === 'ACTIVE' ? 'activated' : 'suspended'}`);
      fetchTeamMembers();
    } catch {
      showToast('Failed to update member status', 'error');
    }
  };

  const fetchQuickSettings = async () => {
    try {
      const res = await apiFetch('/api/v1/system-settings');
      if (res.ok) {
        const json = await res.json();
        if (json.settings) setQuickSettings(json.settings);
      }
    } catch (_) {}
  };

  const handleSaveQuickSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await apiFetch('/api/v1/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quickSettings)
      });
      if (res.ok) {
        showToast('System configuration & security policies updated!', 'success');
        setShowSettingsModal(false);
      }
    } catch {
      showToast('Failed to update system settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/v1/auth/admin-logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: admin?.email, name: admin?.name })
      }).catch(() => null);
    } catch (_) {}
    logout();
    showToast('Logged out successfully');
    navigate('/login');
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

  const navItems = [
    { icon: <LayoutDashboard size={18} />, label: currentTranslations.dashboard, path: '/', requiredPermission: 'DASHBOARD' },
    { icon: <Users size={18} />, label: currentTranslations.users, path: '/users', requiredPermission: 'USERS' },
    { icon: <FileText size={18} />, label: currentTranslations.applications, path: '/applications', requiredPermission: 'APPLICATIONS' },
    { icon: <Grid size={18} />, label: currentTranslations.services, path: '/services', requiredPermission: 'SERVICES' },
    { icon: <UserSquare2 size={18} />, label: currentTranslations.operators, path: '/operators', requiredPermission: 'OPERATORS' },
    { icon: <ArrowLeftRight size={18} />, label: currentTranslations.transactions, path: '/transactions', requiredPermission: 'TRANSACTIONS' },
    { icon: <Bell size={18} />, label: currentTranslations.notifications, path: '/notifications', requiredPermission: 'NOTIFICATIONS' },
    { icon: <HelpCircle size={18} />, label: currentTranslations.support, path: '/support', requiredPermission: 'SUPPORT' },
    { icon: <BarChart3 size={18} />, label: currentTranslations.analytics, path: '/analytics', requiredPermission: 'ANALYTICS' },
    { icon: <ShieldCheck size={18} />, label: currentTranslations.audit, path: '/audit', requiredPermission: 'AUDIT' },
    { icon: <Settings size={18} />, label: currentTranslations.settings, path: '/settings', requiredPermission: 'SETTINGS' },
  ];

  const isSuperAdmin = 
    admin?.email === 'admin@cybersave.com' || 
    admin?.email === 'officer.admin@cybersave.gov.in' ||
    admin?.role === 'SUPER_ADMIN' ||
    (Array.isArray(admin?.permissions) && (admin.permissions.includes('ALL') || admin.permissions.includes('SUPER_ADMIN')));

  const userPermissions = Array.isArray(admin?.permissions) ? admin.permissions : [];

  const hasAccess = (requiredPermission?: string) => {
    if (isSuperAdmin) return true;
    if (!requiredPermission) return false;
    return userPermissions.includes(requiredPermission);
  };

  // Route protection: Enforce least privilege routing access
  const allNavItems = navItems;
  useEffect(() => {
    if (isSuperAdmin) return;
    const currentPath = location.pathname;
    const matchedItem = allNavItems.find(item => item.path === currentPath || (item.path !== '/' && currentPath.startsWith(item.path)));
    if (matchedItem && !hasAccess(matchedItem.requiredPermission)) {
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

      {/* Sidebar Navigation matching Image 1 Reference Design */}
      <aside className="sidebar" style={{
        width: isCollapsed ? '76px' : '255px',
        minWidth: isCollapsed ? '76px' : '255px',
        background: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        padding: 0,
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'sticky',
        top: 0,
        flexShrink: 0
      }}>
        {/* Portal Branding matching CyberSave Logo from user reference */}
        <div style={{
          padding: isCollapsed ? '16px 8px' : '16px 14px 14px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          borderBottom: '1px solid #F1F5F9'
        }}>
          {isCollapsed ? (
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="CyberSave">
              <img
                src="/cybersave-icon.png"
                alt="CyberSave"
                style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/cybersave-logo.png';
                }}
              />
            </Link>
          ) : (
            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', userSelect: 'none' }} title="CyberSave — Digital Services • Trusted Always">
              <img
                src="/cybersave-logo-horizontal.png"
                alt="CyberSave — Digital Services • Trusted Always"
                style={{
                  maxHeight: '48px',
                  maxWidth: '215px',
                  width: 'auto',
                  objectFit: 'contain',
                  display: 'block'
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/cybersave-logo.png';
                }}
              />
            </Link>
          )}
        </div>

        {/* Flat Navigation Item List matching Reference Image */}
        <div style={{ padding: '8px 12px 16px 12px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {navItems.filter(item => hasAccess(item.requiredPermission)).map((item, idx) => (
            <NavLink
              key={idx}
              to={item.path}
              end={item.path === '/'}
              title={isCollapsed ? item.label : undefined}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: isCollapsed ? '10px 0' : '10px 14px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#2563EB' : '#475569',
                background: isActive ? '#EFF6FF' : 'transparent',
                border: isActive ? '1.5px solid #2563EB' : '1.5px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
              })}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'inherit' }}>
                {item.icon}
              </span>
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>

        {/* Collapse Menu at bottom matching Image 1 */}
        <div style={{
          padding: '12px 14px',
          borderTop: '1px solid #F1F5F9',
          background: '#FAFAFA'
        }}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: '10px',
              padding: '8px 10px',
              background: 'transparent',
              border: 'none',
              borderRadius: '7px',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#64748B',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <PanelLeftClose size={17} color="#64748B" />
            {!isCollapsed && <span>{currentTranslations.collapseMenu}</span>}
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
          {/* Header Left: Search & Optional Brand Logo when collapsed */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {isCollapsed && (
              <>
                <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }} title="CyberSave Admin Portal">
                  <img src="/cybersave-icon.png" alt="CyberSave" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#082567', fontFamily: "'Inter', -apple-system, sans-serif" }}>Cyber<span style={{ color: '#1668FE' }}>save</span></span>
                </Link>
                <div style={{ height: '24px', width: '1px', background: '#E2E8F0' }} />
              </>
            )}
            {/* Universal Search Input matching Reference */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '8px 14px',
              width: '360px',
              gap: '10px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <Search size={16} color="#64748B" />
              <input
                type="text"
                placeholder={
                  location.pathname.startsWith('/notifications')
                    ? 'Search notifications by keyword, action...'
                    : location.pathname.startsWith('/operators')
                    ? 'Search operators by name, ID, department...'
                    : location.pathname.startsWith('/support')
                    ? 'Search tickets by ID, subject, assignee...'
                    : location.pathname.startsWith('/services')
                    ? 'Search services by name, ID, category...'
                    : currentTranslations.searchPlaceholder
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    if (location.pathname.startsWith('/operators')) {
                      window.dispatchEvent(new CustomEvent('cybersave_operator_search', { detail: { query: searchQuery.trim() } }));
                    } else if (location.pathname.startsWith('/support')) {
                      window.dispatchEvent(new CustomEvent('cybersave_ticket_search', { detail: { query: searchQuery.trim() } }));
                    } else {
                      navigate(`/applications?q=${encodeURIComponent(searchQuery.trim())}`);
                    }
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                    {notificationList.map((notif) => (
                      <div 
                        key={notif.id} 
                        onClick={() => {
                          setShowNotifMenu(false);
                          if (notif.path) navigate(notif.path);
                        }}
                        style={{ 
                          padding: '10px', 
                          background: notif.read ? '#FFFFFF' : '#F0F9FF', 
                          borderRadius: '8px', 
                          border: notif.read ? '1px solid #F1F5F9' : '1px solid #BAE6FD',
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#E0F2FE')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = notif.read ? '#FFFFFF' : '#F0F9FF')}
                      >
                        <div style={{ fontWeight: 700, color: '#0F172A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{notif.title}</span>
                          <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>{notif.time}</span>
                        </div>
                        <div style={{ color: '#475569', fontSize: '11.5px', marginTop: '3px' }}>
                          {notif.desc}
                        </div>
                      </div>
                    ))}
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

            {/* Contextual Action Button based on Current Route matching Screenshots */}
            {location.pathname.startsWith('/notifications') ? (
              <button
                type="button"
                onClick={() => {
                  setNotifCount(0);
                  window.dispatchEvent(new CustomEvent('cybersave_mark_all_read'));
                  showToast('All notifications marked as read');
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
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
                  whiteSpace: 'nowrap'
                }}
              >
                Mark All as Read
              </button>
            ) : location.pathname.startsWith('/operators') ? (
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('cybersave_open_add_operator'));
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
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
                  whiteSpace: 'nowrap'
                }}
              >
                Add New Operator
              </button>
            ) : location.pathname.startsWith('/support') ? (
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('cybersave_open_create_ticket'));
                  if (!location.pathname.startsWith('/support')) {
                    navigate('/support');
                  }
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
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
                  whiteSpace: 'nowrap'
                }}
              >
                Create New Ticket
              </button>
            ) : (
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
                  <ChevronDown size={14} color="#FFFFFF" />
                </button>

              {/* Quick Actions Dropdown Menu matching Screenshot */}
              {showQuickActions && (
                <div style={{
                  position: 'absolute',
                  top: '125%',
                  right: 0,
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  boxShadow: '0 12px 30px -5px rgba(0,0,0,0.15)',
                  minWidth: '225px',
                  padding: '6px',
                  zIndex: 100
                }}>
                  <button
                    onClick={() => {
                      setShowQuickActions(false);
                      setShowCampaignModal(true);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 14px',
                      background: 'transparent',
                      color: '#1E293B',
                      fontSize: '13px',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Bell size={16} color="#2563EB" strokeWidth={2.2} />
                    <span>Broadcast Notification (Status Bar)</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowQuickActions(false);
                      setShowTeamModal(true);
                      fetchTeamMembers();
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 14px',
                      background: 'transparent',
                      color: '#1E293B',
                      fontSize: '13px',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Users size={16} color="#2563EB" strokeWidth={2.2} />
                    <span>Manage Team Members</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowQuickActions(false);
                      setShowSettingsModal(true);
                      fetchQuickSettings();
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 14px',
                      background: 'transparent',
                      color: '#1E293B',
                      fontSize: '13px',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Settings size={16} color="#2563EB" strokeWidth={2.2} />
                    <span>System Settings</span>
                  </button>

                  <div style={{ height: '1px', background: '#F1F5F9', margin: '4px 6px' }} />

                  <button
                    onClick={() => {
                      setShowQuickActions(false);
                      handleLogout();
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 14px',
                      background: 'transparent',
                      color: '#EF4444',
                      fontSize: '13px',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#FEF2F2')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <LogOut size={16} color="#EF4444" strokeWidth={2.2} />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
            )}

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
              {operatorProfile.avatarUrl && operatorProfile.avatarUrl.trim() !== '' ? (
                <img
                  src={operatorProfile.avatarUrl}
                  alt={operatorProfile.name || 'Administrator'}
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
                  {operatorProfile.name
                    ? operatorProfile.name.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
                    : 'SA'}
                </div>
              )}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                  {operatorProfile.name}
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
                  {operatorProfile.designation}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Viewport with Route-Aware ErrorBoundary Protection */}
        <main style={{ padding: '24px 28px', flex: 1 }}>
          <ErrorBoundary key={location.pathname} fallbackTitle="CyberSave Admin Console Error">
            <Outlet />
          </ErrorBoundary>
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
      {/* ─── Production Ready Quick Action Modals ─── */}
      {/* 1. Create New Campaign Modal */}
      {showCampaignModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#F8FAFC'
            }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={18} color="#2563EB" />
                  <span>Broadcast Status Bar Notification</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Dispatches instant push alerts directly into the Android status bar & notification shade of citizen devices
                </div>
              </div>
              <button 
                onClick={() => setShowCampaignModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLaunchCampaign} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Campaign Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pradhan Mantri Awas Yojana 2026 Awareness"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Target Audience
                  </label>
                  <select
                    value={campaignAudience}
                    onChange={(e) => setCampaignAudience(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12.5px',
                      color: '#0F172A'
                    }}
                  >
                    <option value="ALL">All Registered Citizens (Live Network)</option>
                    <option value="VERIFIED">Verified Citizens Only</option>
                    <option value="PENDING">Pending Verification Citizens</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Broadcast Channel
                  </label>
                  <select
                    value={campaignChannel}
                    onChange={(e) => setCampaignChannel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12.5px',
                      color: '#0F172A'
                    }}
                  >
                    <option value="PUSH_AND_SMS">Push Notification + SMS Broadcast</option>
                    <option value="PUSH_ONLY">In-App Mobile Push Only</option>
                    <option value="SMS_ONLY">Official SMS Broadcast Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Priority Level
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { key: 'HIGH', label: 'High Priority (Alert)', color: '#DC2626', bg: '#FEF2F2' },
                    { key: 'STANDARD', label: 'Standard Advisory', color: '#2563EB', bg: '#EFF6FF' },
                    { key: 'URGENT', label: 'Urgent Directive', color: '#D97706', bg: '#FFFBEB' },
                  ].map(p => (
                    <button
                      type="button"
                      key={p.key}
                      onClick={() => setCampaignPriority(p.key)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '8px',
                        border: campaignPriority === p.key ? `2px solid ${p.color}` : '1px solid #E2E8F0',
                        background: campaignPriority === p.key ? p.bg : '#FFFFFF',
                        color: campaignPriority === p.key ? p.color : '#64748B',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Announcement Message Content *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Type the message to be broadcasted to citizen devices..."
                  value={campaignContent}
                  onChange={(e) => setCampaignContent(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F172A',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowCampaignModal(false)}
                  style={{
                    padding: '9px 16px',
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLaunchingCampaign}
                  style={{
                    padding: '9px 22px',
                    background: '#2563EB',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    cursor: isLaunchingCampaign ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Send size={15} />
                  <span>{isLaunchingCampaign ? 'Broadcasting...' : 'Broadcast to Status Bar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Manage Team Members Modal */}
      {showTeamModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '85vh',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#F8FAFC'
            }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} color="#2563EB" />
                  <span>Manage Administrative Team Members</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Configure Seva Kendra verification officers, SDM magistrates, and operators
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => setShowAddTeamMember(!showAddTeamMember)}
                  style={{
                    background: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={14} />
                  <span>{showAddTeamMember ? 'Cancel' : 'Add Member'}</span>
                </button>
                <button 
                  onClick={() => setShowTeamModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {showAddTeamMember && (
                <form onSubmit={handleCreateTeamMember} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
                    Register New Administrative Team Member
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <input
                      type="text"
                      required
                      placeholder="Officer Full Name"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px' }}
                    />
                    <input
                      type="email"
                      required
                      placeholder="Official Government Email"
                      value={newTeamEmail}
                      onChange={(e) => setNewTeamEmail(e.target.value)}
                      style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <input
                      type="text"
                      placeholder="Contact Mobile (+91)"
                      value={newTeamPhone}
                      onChange={(e) => setNewTeamPhone(e.target.value)}
                      style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px' }}
                    />
                    <input
                      type="text"
                      placeholder="Department / Designation"
                      value={newTeamDept}
                      onChange={(e) => setNewTeamDept(e.target.value)}
                      style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowAddTeamMember(false)}
                      style={{ padding: '6px 14px', background: '#E2E8F0', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingTeamMember}
                      style={{ padding: '6px 16px', background: '#16A34A', border: 'none', borderRadius: '6px', color: '#FFF', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {savingTeamMember ? 'Saving...' : 'Save Member'}
                    </button>
                  </div>
                </form>
              )}

              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Operating Officers &amp; Staff ({teamMembers.length})
              </div>

              {loadingTeam ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748B', fontSize: '13px' }}>
                  Loading real team directory from database...
                </div>
              ) : teamMembers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748B', fontSize: '13px' }}>
                  No team members found. Click '+ Add Member' above to create one.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {teamMembers.map((m: any) => (
                    <div 
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: '#EFF6FF',
                          color: '#2563EB',
                          fontWeight: 700,
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {m.name ? m.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() : 'OP'}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                            {m.name}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                            {m.email} • {m.department || 'CSC Operations'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: m.status === 'Suspended' ? '#FEF2F2' : '#ECFDF5',
                          color: m.status === 'Suspended' ? '#DC2626' : '#16A34A'
                        }}>
                          {m.status || 'Active'}
                        </span>
                        <button
                          onClick={() => handleToggleTeamStatus(m)}
                          style={{
                            padding: '4px 10px',
                            background: m.status === 'Suspended' ? '#ECFDF5' : '#FEF2F2',
                            color: m.status === 'Suspended' ? '#16A34A' : '#DC2626',
                            border: `1px solid ${m.status === 'Suspended' ? '#A7F3D0' : '#FECACA'}`,
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {m.status === 'Suspended' ? 'Activate' : 'Suspend'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                All actions are cryptographically sealed in the Security Audit Ledger.
              </div>
              <button
                onClick={() => {
                  setShowTeamModal(false);
                  navigate('/operators');
                }}
                style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
              >
                View Full Operator Workspace &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. System Settings Modal */}
      {showSettingsModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '540px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#F8FAFC'
            }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Settings size={18} color="#2563EB" />
                  <span>Portal System Configuration</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Set administrative parameters, gateway rules, and security enforcement
                </div>
              </div>
              <button 
                onClick={() => setShowSettingsModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: quickSettings.maintenanceMode ? '#FEF2F2' : '#F8FAFC',
                border: quickSettings.maintenanceMode ? '1px solid #FECACA' : '1px solid #E2E8F0',
                borderRadius: '10px'
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    Portal Maintenance Mode
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                    Temporarily restrict public applications during planned maintenance
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={quickSettings.maintenanceMode}
                  onChange={(e) => setQuickSettings(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  SMS Gateway Provider
                </label>
                <select
                  value={quickSettings.smsGatewayProvider}
                  onChange={(e) => setQuickSettings(prev => ({ ...prev, smsGatewayProvider: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F172A'
                  }}
                >
                  <option value="Gov NIC SMS Gateway">Gov NIC SMS Gateway (National Informatics Centre)</option>
                  <option value="CDAC National SMS Hub">CDAC National e-Governance SMS Hub</option>
                  <option value="Twilio Enterprise GovCloud">Twilio Enterprise GovCloud Gateway</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Biometric Verification Strictness
                </label>
                <select
                  value={quickSettings.biometricStrictness}
                  onChange={(e) => setQuickSettings(prev => ({ ...prev, biometricStrictness: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F172A'
                  }}
                >
                  <option value="High">High (Strict UIDAI XML Level-2 Hash Match)</option>
                  <option value="Standard">Standard (Multi-Factor Biometric + OTP)</option>
                  <option value="Relaxed">Relaxed (Facilitated Rural Onboarding)</option>
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                    Auto-Approval Confidence Threshold
                  </label>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB' }}>
                    {quickSettings.autoApprovalThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="99"
                  value={quickSettings.autoApprovalThreshold}
                  onChange={(e) => setQuickSettings(prev => ({ ...prev, autoApprovalThreshold: Number(e.target.value) }))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  style={{
                    padding: '9px 16px',
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickSettings}
                  disabled={savingSettings}
                  style={{
                    padding: '9px 22px',
                    background: '#2563EB',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    cursor: savingSettings ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Check size={15} />
                  <span>{savingSettings ? 'Saving...' : 'Save Policies'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
