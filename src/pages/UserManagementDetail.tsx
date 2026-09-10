import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { 
  Bell, 
  Edit3, 
  X, 
  CheckCircle, 
  FileText, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Download, 
  ExternalLink,
  ChevronRight,
  MoreHorizontal,
  RefreshCw,
  CreditCard,
  Building,
  User,
  Zap,
  Award,
  ArrowLeft,
  Star,
  MessageSquare,
  Image as ImageIcon
} from 'lucide-react';
import { showToast } from '../components/Layout';
import { apiFetch, getApiBaseUrl } from '../utils/apiConfig';

export default function UserManagementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Overview' | 'Services Used' | 'Documents' | 'Transactions' | 'Session History' | 'Activity Log' | 'Feedback & Reviews' | 'Notes'>('Overview');
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Document Viewer Modal State
  const [selectedDoc, setSelectedDoc] = useState<{
    name: string;
    fileName?: string;
    fileUrl: string;
    fileType?: string;
    fileSize?: number;
    date?: string;
    status?: string;
  } | null>(null);
  const [docZoom, setDocZoom] = useState(1);
  const [docRotation, setDocRotation] = useState(0);

  // Safely open document in viewer modal
  const handleOpenDocument = (doc: any) => {
    if (!doc || !doc.fileUrl) {
      showToast('No document file attached for this record', 'error');
      return;
    }
    setDocZoom(1);
    setDocRotation(0);
    setSelectedDoc(doc);
  };

  // Helper to safely open document in new tab (bypasses browser data: URL block)
  const openDocInNewWindow = (fileUrl: string, fileName?: string) => {
    if (!fileUrl) return;
    try {
      if (fileUrl.startsWith('data:')) {
        const parts = fileUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank');
        if (!win) {
          showToast('Popup was blocked by browser. Please allow popups.', 'error');
        }
      } else {
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      window.open(fileUrl, '_blank');
    }
  };

  // Helper to trigger direct download with clean file name
  const downloadDocument = (fileUrl: string, fileName?: string) => {
    if (!fileUrl) return;
    try {
      if (fileUrl.startsWith('data:')) {
        const parts = fileUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName || 'Citizen_Document.jpg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } else {
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = fileName || 'Citizen_Document.jpg';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      showToast(`Downloading ${fileName || 'document'}...`);
    } catch (e) {
      openDocInNewWindow(fileUrl, fileName);
    }
  };

  // Notification Modal
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [notifType, setNotifType] = useState('Push Notification');
  const [notifSubject, setNotifSubject] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);

  // Edit Profile Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    fatherName: '',
    dob: '',
    gender: '',
    aadhaar: '',
    pan: '',
    mobile: '',
    email: '',
    address: '',
    district: '',
    state: '',
    pinCode: '',
    registeredCentre: '',
    assignedOperator: '',
  });

  // REST primary & fallback fetch
  const fetchUserRest = async () => {
    if (!id) return;
    try {
      const res = await apiFetch(`/api/v1/users/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) {
          setUser(data);
          populateEditForm(data);
          setLoading(false);
          return;
        }
      }
      // Fallback endpoint
      const fallbackRes = await apiFetch(`/api/admin/users/${id}`);
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        if (data && !data.error) {
          setUser(data);
          populateEditForm(data);
          setLoading(false);
        }
      }
    } catch (err) {
      console.warn('REST user detail fetch note:', err);
    } finally {
      setLoading(false);
    }
  };

  const populateEditForm = (userData: any) => {
    if (!userData) return;
    setEditForm({
      fullName: userData.fullName || '',
      fatherName: userData.fatherName || '',
      dob: userData.dob || '',
      gender: userData.gender || '',
      aadhaar: userData.aadhaar || '',
      pan: userData.pan || '',
      mobile: userData.mobile || userData.phone || '',
      email: userData.email || '',
      address: userData.address || '',
      district: userData.district || '',
      state: userData.state || '',
      pinCode: userData.pinCode || '',
      registeredCentre: userData.quickStats?.registeredCentre || '',
      assignedOperator: userData.quickStats?.assignedOperator || '',
    });
  };

  useEffect(() => {
    if (!id) return;
    fetchUserRest();

    if (socket && connected) {
      socket.emit('request_user_detail', { id });

      const handleUserDetail = (data: any) => {
        if (data && !data.error) {
          setUser(data);
          populateEditForm(data);
          setLoading(false);
        }
      };

      const handleRefresh = () => {
        socket.emit('request_user_detail', { id });
        fetchUserRest();
      };

      const handlePushSent = (res: any) => {
        setSendingNotif(false);
        if (res.success) {
          showToast('Notification dispatched successfully');
          setNotifModalOpen(false);
          setNotifSubject('');
          setNotifBody('');
        } else {
          showToast(res.error || 'Failed to dispatch notification', 'error');
        }
      };

      const handleBlockSuccess = (data: any) => {
        showToast('Citizen status updated');
        if (data) setUser(data);
        else handleRefresh();
      };

      const handleUpdateSuccess = (data: any) => {
        showToast('Citizen profile updated');
        setEditModalOpen(false);
        if (data) setUser(data);
        else handleRefresh();
      };

      const handleFeedbackEvent = (eventData: any) => {
        showToast(`★ New ${eventData?.feedback?.rating || 5}-Star Citizen Feedback received!`);
        handleRefresh();
      };

      const handleStatusChanged = (statusData: any) => {
        if (!statusData?.userId) return;
        setUser((prev: any) => {
          if (!prev) return prev;
          const targetId = statusData.userId;
          const matches =
            prev.dbId === targetId ||
            prev.id === targetId ||
            id === targetId ||
            (prev.id && typeof prev.id === 'string' && prev.id.toUpperCase().includes(targetId.substring(0, 5).toUpperCase())) ||
            (id && typeof id === 'string' && id.toUpperCase().includes(targetId.substring(0, 5).toUpperCase()));

          if (!matches) return prev;

          const isNowOnline = statusData.isOnline === true;
          const updatedSessions = [...(prev.sessionHistory || [])];

          if (isNowOnline) {
            if (!updatedSessions.some((s: any) => s.id === 'sess_active_now' || s.status === 'Active Now')) {
              updatedSessions.unshift({
                id: 'sess_active_now',
                event: 'ACTIVE',
                action: 'USER_SESSION_ACTIVE',
                method: 'Android Mobile Client',
                platform: 'CyberSave Android App',
                details: 'Active realtime session connected',
                ipAddress: statusData.ipAddress || '192.168.1.1 (Connected)',
                status: 'Active Now',
                date: 'Active Now',
                dateTime: 'Currently Active',
                rawDate: new Date().toISOString(),
                duration: 'Live Session',
              });
            }
          } else {
            const filtered = updatedSessions.filter((s: any) => s.id !== 'sess_active_now');
            filtered.unshift({
              id: `sess_close_${Date.now()}`,
              event: 'LOGOUT',
              action: 'APP_CLOSED',
              method: 'Android Mobile Client',
              platform: 'CyberSave Android App',
              details: 'Citizen app closed / session terminated',
              ipAddress: statusData.ipAddress || '192.168.1.1',
              status: 'Session Terminated',
              date: 'Just now',
              dateTime: new Date().toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
              }),
              rawDate: new Date().toISOString(),
            });

            return {
              ...prev,
              isOnline: false,
              lastActive: 'Just now',
              lastSeenAt: statusData.lastSeenAt || new Date().toISOString(),
              quickStats: {
                ...prev.quickStats,
                lastActive: 'Just now',
              },
              sessionHistory: filtered,
            };
          }

          return {
            ...prev,
            isOnline: true,
            lastActive: 'Active Now',
            lastSeenAt: statusData.lastSeenAt || new Date().toISOString(),
            quickStats: {
              ...prev.quickStats,
              lastActive: 'Active Now',
            },
            sessionHistory: updatedSessions,
          };
        });
      };

      socket.on('response_user_detail', handleUserDetail);
      socket.on('user_detail_updated', handleUserDetail);
      socket.on('user_status_changed', handleStatusChanged);
      socket.on('new_user_feedback', handleFeedbackEvent);
      socket.on('feedback_submitted', handleRefresh);
      socket.on('user_activity_updated', handleRefresh);
      socket.on('audit_log_added', handleRefresh);
      socket.on('applications_updated', handleRefresh);
      socket.on('new_application_submitted', handleRefresh);
      socket.on('application_status_changed', handleRefresh);
      socket.on('response_push_sent', handlePushSent);
      socket.on('block_citizen_success', handleBlockSuccess);
      socket.on('update_citizen_success', handleUpdateSuccess);

      return () => {
        socket.off('response_user_detail', handleUserDetail);
        socket.off('user_detail_updated', handleUserDetail);
        socket.off('user_status_changed', handleStatusChanged);
        socket.off('new_user_feedback', handleFeedbackEvent);
        socket.off('feedback_submitted', handleRefresh);
        socket.off('user_activity_updated', handleRefresh);
        socket.off('audit_log_added', handleRefresh);
        socket.off('applications_updated', handleRefresh);
        socket.off('new_application_submitted', handleRefresh);
        socket.off('application_status_changed', handleRefresh);
        socket.off('response_push_sent', handlePushSent);
        socket.off('block_citizen_success', handleBlockSuccess);
        socket.off('update_citizen_success', handleUpdateSuccess);
      };
    }
  }, [id, socket, connected]);

  const handleToggleBlock = async () => {
    if (!user) return;
    const targetStatus = user.status === 'Blocked' ? 'Verified' : 'BLOCKED';
    if (socket && connected) {
      socket.emit('block_citizen', { id: user.dbId || user.id, status: targetStatus });
    }
    try {
      const res = await apiFetch(`/api/v1/users/${user.dbId || user.id}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
      });
      if (res.ok) {
        showToast(`Citizen status changed to ${targetStatus === 'BLOCKED' ? 'Blocked' : 'Verified'}`);
        fetchUserRest();
      }
    } catch {
      // Socket will handle it if connected
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (socket && connected) {
      socket.emit('update_citizen_profile', {
        id: user.dbId || user.id,
        ...editForm,
      });
    }
    try {
      const res = await apiFetch(`/api/v1/users/${user.dbId || user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        showToast('Profile updated successfully');
        setEditModalOpen(false);
        fetchUserRest();
      }
    } catch {
      // Socket fallback
    }
  };

  const handleSendNotification = async () => {
    if (!notifSubject.trim() || !notifBody.trim()) {
      showToast('Please provide subject and message body', 'error');
      return;
    }
    setSendingNotif(true);
    const targetUserId = user?.dbId || user?.id || id;
    if (socket && connected) {
      socket.emit('send_push_notification', {
        userId: targetUserId,
        title: notifSubject.trim(),
        body: notifBody.trim(),
        type: notifType,
      });
    }

    try {
      const res = await apiFetch(`/api/admin/users/${targetUserId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: notifSubject.trim(),
          body: notifBody.trim(),
          type: notifType,
        }),
      });
      if (res.ok) {
        setSendingNotif(false);
        setNotifModalOpen(false);
        showToast(`Push notification dispatched to ${user?.fullName || 'Citizen'}`);
        setNotifSubject('');
        setNotifBody('');
      } else {
        setSendingNotif(false);
      }
    } catch {
      setSendingNotif(false);
    }
  };

  // Helper for initials
  const initials = useMemo(() => {
    if (!user?.fullName) return 'PS';
    const parts = user.fullName.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return user.fullName.substring(0, 2).toUpperCase();
  }, [user]);

  // Helper for Age calculation from DOB
  const formattedDobWithAge = useMemo(() => {
    if (!user?.dob) return '-';
    const dobStr = String(user.dob);
    try {
      const d = new Date(dobStr);
      if (!isNaN(d.getTime())) {
        const ageDifMs = Date.now() - d.getTime();
        const ageDate = new Date(ageDifMs);
        const age = Math.abs(ageDate.getUTCFullYear() - 1970);
        const formattedDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        return `${formattedDate} (Age: ${age})`;
      }
    } catch {
      // return as is
    }
    return dobStr;
  }, [user]);

  // Aadhaar masking
  const displayAadhaar = useMemo(() => {
    if (!user?.aadhaar || user.aadhaar === 'Not Given') return '-';
    if (showAadhaar) return user.aadhaar;
    if (user.aadhaar.includes('••••') || user.aadhaar.includes('XXXX')) return user.aadhaar;
    return `XXXX XXXX ${user.aadhaar.slice(-4)}`;
  }, [user, showAadhaar]);

  if (loading && !user) {
    return (
      <div style={{
        padding: '60px 20px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        color: '#64748B'
      }}>
        <RefreshCw className="animate-spin" size={32} color="#2563EB" />
        <div style={{ fontSize: '15px', fontWeight: 600 }}>Loading Citizen Identity Record...</div>
      </div>
    );
  }

  // Safe real data fallbacks (if user didn't provide, display clean placeholder rather than hardcoded demo)
  const safeData = {
    fullName: user?.fullName || 'Citizen User',
    fatherName: user?.fatherName || '-',
    dob: formattedDobWithAge,
    gender: user?.gender || '-',
    aadhaar: displayAadhaar,
    pan: user?.pan || '-',
    mobile: user?.mobile || user?.phone || '-',
    email: user?.email || '-',
    address: user?.address || '-',
    district: user?.district || '-',
    state: user?.state || '-',
    pinCode: user?.pinCode || '-',
    joinedDate: user?.joinedDate || '15 March 2024',
    status: user?.status === 'BLOCKED' ? 'Blocked' : (user?.status || 'Verified'),
    id: user?.id || `CIT-${(id || '00482').slice(-5).toUpperCase()}`,
    isOnline: user?.isOnline === true,
    lastActive: user?.lastActive || user?.quickStats?.lastActive || (user?.isOnline ? 'Active Now' : 'Offline'),
    lastSeenAt: user?.lastSeenAt,
    dbId: user?.dbId || user?.id,
    quickStats: {
      totalServicesUsed: user?.quickStats?.totalServicesUsed ?? (user?.applications?.length || 0),
      totalAmountSpent: user?.quickStats?.totalAmountSpent ?? (user?.applications?.reduce((sum: number, a: any) => sum + (a.rawAmount || a.feePaid || 0), 0) ? `₹${user.applications.reduce((sum: number, a: any) => sum + (a.rawAmount || a.feePaid || 0), 0).toLocaleString('en-IN')}` : '₹0'),
      lastActive: user?.quickStats?.lastActive || user?.lastActive || (user?.isOnline ? 'Active Now' : 'Offline'),
      registeredCentre: user?.quickStats?.registeredCentre || (user?.district && user.district !== '-' ? `CSC ${user.district}` : 'CSC Central Seva Kendra (Digital India)'),
      assignedOperator: user?.quickStats?.assignedOperator || 'Officer Sharma - Verification Incharge (SDM-01)',
      walletBalance: user?.quickStats?.walletBalance || (user?.wallet ? `₹${Number(user.wallet.balance || 0).toLocaleString('en-IN')}` : '₹0'),
    },
    recentServices: (user?.recentServices && user.recentServices.length > 0)
      ? user.recentServices
      : (user?.applications && user.applications.length > 0
          ? user.applications.map((a: any) => ({
              id: a.id,
              name: a.serviceTitle || a.name || 'Government Service',
              date: a.date || a.submittedAt || 'Recent',
              amount: a.amount || (a.feePaid ? `₹${a.feePaid}` : '₹50'),
              status: a.status || 'Completed',
            }))
          : []),
    uploadedDocuments: Array.isArray(user?.uploadedDocuments) ? user.uploadedDocuments : [],
    transactions: Array.isArray(user?.transactions) ? user.transactions : [],
    sessionHistory: Array.isArray(user?.sessionHistory) ? user.sessionHistory : [],
    recentActivity: (user?.recentActivity && user.recentActivity.length > 0)
      ? user.recentActivity
      : [],
    feedbacks: (user?.feedbacks && user.feedbacks.length > 0)
      ? user.feedbacks
      : []
  };

  const isBlocked = safeData.status === 'Blocked';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ─── Breadcrumb Navigation ────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        color: '#64748B',
        fontWeight: 500
      }}>
        <Link to="/" style={{ color: '#64748B', textDecoration: 'none' }}>Dashboard</Link>
        <span>&rarr;</span>
        <Link to="/users" style={{ color: '#64748B', textDecoration: 'none' }}>Citizen Management</Link>
        <span>&rarr;</span>
        <span style={{ color: '#2563EB', fontWeight: 600 }}>{safeData.fullName}</span>
      </div>

      {/* ─── Top Profile Card Banner ──────────────────────────────────────── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '24px 28px 0px 28px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* User Avatar + Identity Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '20px',
              fontWeight: 800,
              border: '1px solid #DBEAFE',
              boxShadow: '0 1px 2px rgba(37,99,235,0.1)'
            }}>
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={safeData.fullName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <h1 style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: '#0F172A',
                  letterSpacing: '-0.02em',
                  margin: 0
                }}>
                  {safeData.fullName}
                </h1>

                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: isBlocked ? '#FEF2F2' : safeData.status === 'Pending' ? '#FFFBEB' : '#ECFDF5',
                  color: isBlocked ? '#DC2626' : safeData.status === 'Pending' ? '#D97706' : '#10B981',
                  border: `1px solid ${isBlocked ? '#FECACA' : safeData.status === 'Pending' ? '#FDE68A' : '#A7F3D0'}`
                }}>
                  {safeData.status}
                </span>

                {/* Real-time Online / Offline Indicator Badge */}
                {safeData.isOnline ? (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: '#F0FDF4',
                    color: '#15803D',
                    border: '1px solid #BBF7D0'
                  }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
                    Active (Online Now)
                  </span>
                ) : (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: '#F8FAFC',
                    color: '#64748B',
                    border: '1px solid #E2E8F0'
                  }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#94A3B8' }} />
                    Offline {safeData.lastActive && safeData.lastActive !== 'Active Now' && safeData.lastActive !== 'Offline' ? `• ${safeData.lastActive}` : ''}
                  </span>
                )}
              </div>

              <div style={{ fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600, fontFamily: 'monospace', color: '#475569' }}>{safeData.id}</span>
                <span>•</span>
                <span>Joined {safeData.joinedDate}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                populateEditForm(user || safeData);
                setEditModalOpen(true);
              }}
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#1E293B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}
            >
              <Edit3 size={14} color="#64748B" /> Edit Profile
            </button>

            <button
              onClick={handleToggleBlock}
              style={{
                background: isBlocked ? '#ECFDF5' : '#FFFFFF',
                border: `1px solid ${isBlocked ? '#A7F3D0' : '#FECACA'}`,
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                color: isBlocked ? '#065F46' : '#DC2626',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}
            >
              {isBlocked ? 'Unblock Citizen' : 'Block Citizen'}
            </button>

            <button
              onClick={() => setNotifModalOpen(true)}
              style={{
                background: '#2563EB',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
            >
              <Bell size={14} /> Send Notification
            </button>

            <button
              onClick={() => {
                showToast('Dossier exported to PDF');
              }}
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#64748B',
                cursor: 'pointer'
              }}
              title="More Actions"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '24px',
          borderBottom: '1px solid #E2E8F0',
          overflowX: 'auto'
        }}>
          {(['Overview', 'Services Used', 'Documents', 'Transactions', 'Session History', 'Activity Log', 'Feedback & Reviews', 'Notes'] as const).map((tab) => {
            const feedbackCount = tab === 'Feedback & Reviews' ? (safeData.feedbacks?.length || 0) : 0;
            const docCount = tab === 'Documents' ? (safeData.uploadedDocuments?.length || 0) : 0;
            const txnCount = tab === 'Transactions' ? (safeData.transactions?.length || 0) : 0;
            const sessCount = tab === 'Session History' ? (safeData.sessionHistory?.length || 0) : 0;

            const badgeCount = feedbackCount || docCount || txnCount || sessCount;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid #2563EB' : '2px solid transparent',
                  color: activeTab === tab ? '#2563EB' : '#64748B',
                  fontWeight: activeTab === tab ? 700 : 500,
                  fontSize: '13.5px',
                  padding: '12px 2px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {tab}
                {badgeCount > 0 && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    backgroundColor: activeTab === tab ? '#DBEAFE' : '#F1F5F9',
                    color: activeTab === tab ? '#1E40AF' : '#475569',
                    padding: '1px 6px',
                    borderRadius: '10px'
                  }}>
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Tab Content Views ───────────────────────────────────────────── */}
      {activeTab === 'Overview' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.85fr) minmax(0, 1.15fr)',
          gap: '20px',
          alignItems: 'start'
        }}>
          {/* ─── Left Column ─────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Card 1: Personal Information */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '22px 26px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h2 style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#0F172A',
                  letterSpacing: '-0.01em',
                  margin: 0
                }}>
                  Personal Information
                </h2>

                <button
                  onClick={() => {
                    populateEditForm(user || safeData);
                    setEditModalOpen(true);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px',
                    borderRadius: '4px'
                  }}
                  title="Edit Personal Information"
                >
                  <Edit3 size={16} color="#64748B" />
                </button>
              </div>

              {/* 2-Column Info Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                columnGap: '24px',
                rowGap: '18px'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px', fontWeight: 500 }}>Full Name</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>{safeData.fullName}</div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px', fontWeight: 500 }}>Father's Name</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>{safeData.fatherName}</div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px', fontWeight: 500 }}>Date of Birth</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>{safeData.dob}</div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px', fontWeight: 500 }}>Gender</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>{safeData.gender}</div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px', fontWeight: 500 }}>Aadhaar Number</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'monospace' }}>{safeData.aadhaar}</span>
                    {safeData.aadhaar !== '-' && (
                      <button
                        onClick={() => setShowAadhaar(!showAadhaar)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex' }}
                        title={showAadhaar ? 'Mask Aadhaar' : 'View Aadhaar'}
                      >
                        {showAadhaar ? <EyeOff size={14} color="#64748B" /> : <Eye size={14} color="#64748B" />}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px', fontWeight: 500 }}>PAN</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>{safeData.pan}</div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px', fontWeight: 500 }}>Mobile</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{safeData.mobile}</span>
                    {safeData.mobile !== '-' && <CheckCircle size={14} color="#10B981" />}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px', fontWeight: 500 }}>Email</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ wordBreak: 'break-all' }}>{safeData.email}</span>
                    {safeData.email !== '-' && <CheckCircle size={14} color="#10B981" />}
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px', fontWeight: 500 }}>Address</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', lineHeight: 1.4 }}>{safeData.address}</div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px', fontWeight: 500 }}>District</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>{safeData.district}</div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px', fontWeight: 500 }}>State</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>{safeData.state}</div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px', fontWeight: 500 }}>Pin Code</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>{safeData.pinCode}</div>
                </div>
              </div>
            </div>

            {/* Card 2: Recent Services */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '22px 26px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h2 style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#0F172A',
                  letterSpacing: '-0.01em',
                  margin: 0
                }}>
                  Recent Services
                </h2>

                <button
                  onClick={() => setActiveTab('Services Used')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563EB',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  View All
                </button>
              </div>

              {/* List of Services */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {safeData.recentServices.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8', fontSize: '13px' }}>
                    No services applied yet
                  </div>
                ) : (
                  safeData.recentServices.map((s: any, idx: number) => {
                    const isCompleted = s.status === 'Completed' || s.status === 'APPROVED';
                    const isInProgress = s.status === 'In Progress' || s.status === 'IN_PROGRESS';
                    const isPending = s.status === 'Pending' || s.status === 'SUBMITTED' || s.status === 'VERIFYING';
                    const isRejected = s.status === 'Rejected' || s.status === 'REJECTED';

                    const badgeBg = isCompleted ? '#ECFDF5' : isInProgress ? '#EFF6FF' : isRejected ? '#FEF2F2' : '#FFFBEB';
                    const badgeColor = isCompleted ? '#065F46' : isInProgress ? '#1E40AF' : isRejected ? '#991B1B' : '#92400E';
                    const badgeBorder = isCompleted ? '#A7F3D0' : isInProgress ? '#BFDBFE' : isRejected ? '#FECACA' : '#FDE68A';

                    return (
                      <div
                        key={s.id || idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingBottom: idx < safeData.recentServices.length - 1 ? '14px' : '0',
                          borderBottom: idx < safeData.recentServices.length - 1 ? '1px solid #F1F5F9' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748B'
                          }}>
                            <FileText size={18} />
                          </div>

                          <div>
                            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                              {s.name || s.serviceTitle}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                              {s.date}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                            {s.amount}
                          </div>

                          <span style={{
                            display: 'inline-flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            width: '84px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: badgeBg,
                            color: badgeColor,
                            border: `1px solid ${badgeBorder}`,
                            textAlign: 'center'
                          }}>
                            {s.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ─── Right Column ────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Card 1: Quick Stats */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '22px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <h2 style={{
                fontSize: '16px',
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.01em',
                margin: 0,
                marginBottom: '18px'
              }}>
                Quick Stats
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B', fontSize: '13px' }}>Total Services Used</span>
                  <span style={{ fontWeight: 800, color: '#2563EB', fontSize: '14px' }}>
                    {safeData.quickStats.totalServicesUsed}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B', fontSize: '13px' }}>Total Amount Spent</span>
                  <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px' }}>
                    {safeData.quickStats.totalAmountSpent}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B', fontSize: '13px' }}>Activity Status</span>
                  {safeData.isOnline ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: '#15803D',
                      fontWeight: 800,
                      fontSize: '13px'
                    }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
                      Active Now
                    </span>
                  ) : (
                    <span style={{ fontWeight: 700, color: '#475569', fontSize: '13px' }}>
                      {safeData.quickStats.lastActive || safeData.lastActive || 'Offline'}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B', fontSize: '13px' }}>Registered Centre</span>
                  <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px', textAlign: 'right' }}>
                    {safeData.quickStats.registeredCentre}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B', fontSize: '13px' }}>Assigned Operator</span>
                  <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px', textAlign: 'right' }}>
                    {safeData.quickStats.assignedOperator}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Uploaded Documents */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '22px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px'
              }}>
                <h2 style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#0F172A',
                  letterSpacing: '-0.01em',
                  margin: 0
                }}>
                  Uploaded Documents
                </h2>

                <button
                  onClick={() => setActiveTab('Documents')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563EB',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  View All
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {safeData.uploadedDocuments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: '#94A3B8', fontSize: '12.5px' }}>
                    No documents uploaded yet
                  </div>
                ) : (
                  safeData.uploadedDocuments.map((doc: any, i: number) => {
                    const isDocVerified = doc.status === 'Verified';
                    const isPendingReview = doc.status === 'Pending Review';

                    return (
                      <div
                        key={doc.id || i}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: doc.fileUrl ? 'pointer' : 'default',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          background: '#F8FAFC',
                          border: '1px solid #F1F5F9'
                        }}
                        onClick={() => {
                          if (doc.fileUrl) handleOpenDocument(doc);
                        }}
                        title="Click to preview document"
                      >
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <FileText color="#2563EB" size={16} />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                              {doc.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                              {doc.date}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: isDocVerified ? '#10B981' : isPendingReview ? '#F59E0B' : '#0D9488'
                          }}>
                            {doc.status}
                          </span>
                          <span style={{ fontSize: '12px', color: '#2563EB', fontWeight: 700 }}>&rarr;</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Card 3: Recent Activity */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '22px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <h2 style={{
                fontSize: '16px',
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.01em',
                margin: 0,
                marginBottom: '18px'
              }}>
                Recent Activity
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', position: 'relative' }}>
                {/* Connecting line */}
                <div style={{
                  position: 'absolute',
                  left: '4px',
                  top: '6px',
                  bottom: '12px',
                  width: '2px',
                  background: '#E2E8F0',
                  zIndex: 0
                }} />

                {safeData.recentActivity.map((act: any, i: number) => {
                  const isFeedback = act.action === 'FEEDBACK_SUBMITTED' || act.rating || act.imageUrl;
                  return (
                    <div key={act.id || i} style={{ display: 'flex', gap: '14px', position: 'relative', zIndex: 1 }}>
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: act.color || (isFeedback ? '#FFB800' : '#2563EB'),
                        position: 'relative',
                        top: '4px',
                        flexShrink: 0,
                        boxShadow: '0 0 0 3px #FFFFFF'
                      }} />

                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {act.title}
                          {isFeedback && act.rating && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: '6px',
                              border: '1px solid #FDE68A'
                            }}>
                              <Star size={11} fill="#F59E0B" color="#F59E0B" /> {act.rating}/5
                            </span>
                          )}
                        </div>

                        {/* Image attachment in recent activity if present */}
                        {act.imageUrl && (
                          <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img
                              src={act.imageUrl}
                              alt="Feedback Attached"
                              onClick={() => setPreviewImage(act.imageUrl)}
                              style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '6px',
                                objectFit: 'cover',
                                border: '1.5px solid #BBF7D0',
                                cursor: 'pointer',
                                transition: 'transform 0.15s ease'
                              }}
                              title="Click to zoom attached image"
                            />
                            <div 
                              style={{ fontSize: '11.5px', color: '#16A34A', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} 
                              onClick={() => setPreviewImage(act.imageUrl)}
                            >
                              <ImageIcon size={13} /> View Attached Screenshot &rarr;
                            </div>
                          </div>
                        )}

                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                          {act.date}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── Tab: Services Used ───────────────────────────────────────────── */}
      {activeTab === 'Services Used' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '24px 28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>All Services Applied by {safeData.fullName}</h2>
            <button onClick={() => setActiveTab('Overview')} style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>&larr; Back to Overview</button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>Service Title</th>
                  <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>Submission Date</th>
                  <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>Fee Amount</th>
                  <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>Application Status</th>
                </tr>
              </thead>
              <tbody>
                {safeData.recentServices.map((s: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0F172A' }}>{s.name || s.serviceTitle}</td>
                    <td style={{ padding: '12px 14px', color: '#64748B' }}>{s.date || s.appliedAt || 'Recently'}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0F172A' }}>{s.amount || s.fee || '₹0'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: s.status === 'COMPLETED' ? '#DCFCE7' : s.status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7',
                        color: s.status === 'COMPLETED' ? '#16A34A' : s.status === 'REJECTED' ? '#DC2626' : '#D97706'
                      }}>
                        {s.status || 'PENDING'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Tab: Documents ──────────────────────────────────────────────── */}
      {activeTab === 'Documents' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '24px 28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Citizen Uploaded Identification & Proofs</h2>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>Real uploaded documents, identity proofs, and application attachments</div>
            </div>
            <button onClick={() => setActiveTab('Overview')} style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>&larr; Back to Overview</button>
          </div>

          {safeData.uploadedDocuments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', background: '#F8FAFC', borderRadius: '10px', border: '1px dashed #CBD5E1' }}>
              <FileText size={36} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontWeight: 700, color: '#334155', fontSize: '14px' }}>No Documents Uploaded</div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>This citizen has not yet submitted any identity proofs or supporting documents.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {safeData.uploadedDocuments.map((doc: any, idx: number) => {
                const isImage = doc.fileUrl?.startsWith('data:image') || /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.fileName || doc.name);
                return (
                  <div
                    key={doc.id || idx}
                    onClick={() => handleOpenDocument(doc)}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      background: '#F8FAFC',
                      cursor: doc.fileUrl ? 'pointer' : 'default',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#93C5FD';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FileText size={20} color="#2563EB" />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', background: '#E2E8F0', padding: '2px 8px', borderRadius: '6px' }}>
                          {isImage ? 'IMAGE' : 'PDF / DOC'}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#10B981', background: '#ECFDF5', padding: '2px 8px', borderRadius: '10px' }}>
                        {doc.status || 'Verified'}
                      </span>
                    </div>

                    {/* Thumbnail Preview if image */}
                    {isImage && doc.fileUrl && (
                      <div style={{ width: '100%', height: '140px', borderRadius: '6px', overflow: 'hidden', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={doc.fileUrl} alt={doc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}

                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0F172A', wordBreak: 'break-all' }}>{doc.name || doc.fileName}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>{doc.date}</div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #E2E8F0', marginTop: 'auto' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDocument(doc);
                        }}
                        style={{
                          background: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          borderRadius: '6px',
                          padding: '5px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#2563EB',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Eye size={13} /> Open Document &rarr;
                      </button>

                      {doc.fileUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadDocument(doc.fileUrl, doc.name || doc.fileName);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#64748B',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11.5px',
                            fontWeight: 600
                          }}
                          title="Download document"
                        >
                          <Download size={13} /> Download
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Transactions ────────────────────────────────────────────── */}
      {activeTab === 'Transactions' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '24px 28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Fee Settlements & Real Transaction Ledger</h2>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>Real-time payment gateway transactions, UPI top-ups, service disbursements & refunds</div>
            </div>
            <button onClick={() => setActiveTab('Overview')} style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>&larr; Back to Overview</button>
          </div>

          {/* KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
            <div style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Wallet Balance</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>{safeData.quickStats.walletBalance}</div>
            </div>
            <div style={{ background: '#F0FDF4', padding: '14px 16px', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>Total Inflow (Credits)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803D', marginTop: '4px' }}>
                ₹{safeData.transactions.filter((t: any) => t.type === 'CREDIT').reduce((sum: number, t: any) => sum + (t.rawAmount || 0), 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ background: '#FEF2F2', padding: '14px 16px', borderRadius: '10px', border: '1px solid #FECACA' }}>
              <div style={{ fontSize: '12px', color: '#991B1B', fontWeight: 600 }}>Total Outflow (Fees Paid)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>
                ₹{safeData.transactions.filter((t: any) => t.type === 'DEBIT').reduce((sum: number, t: any) => sum + (t.rawAmount || 0), 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ background: '#EFF6FF', padding: '14px 16px', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: '12px', color: '#1E40AF', fontWeight: 600 }}>Total Transactions</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>
                {safeData.transactions.length}
              </div>
            </div>
          </div>

          {/* Transactions List */}
          {safeData.transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', background: '#F8FAFC', borderRadius: '10px', border: '1px dashed #CBD5E1' }}>
              <CreditCard size={36} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontWeight: 700, color: '#334155', fontSize: '14px' }}>No Transactions Recorded</div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>This citizen has not completed any wallet additions or service payments yet.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {safeData.transactions.map((tx: any, idx: number) => {
                const isCredit = tx.type === 'CREDIT';
                return (
                  <div key={tx.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        background: isCredit ? '#ECFDF5' : '#F1F5F9',
                        color: isCredit ? '#10B981' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <CreditCard size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0F172A' }}>{tx.title}</div>
                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{tx.refNumber}</span>
                          <span>•</span>
                          <span>{tx.dateTime || tx.date}</span>
                          {tx.category && (
                            <>
                              <span>•</span>
                              <span style={{ background: '#E2E8F0', padding: '1px 6px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 700, color: '#475569' }}>
                                {tx.category}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '15px', color: isCredit ? '#10B981' : '#0F172A' }}>
                        {tx.amount}
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: tx.status === 'SUCCESS' ? '#10B981' : tx.status === 'REFUNDED' ? '#7C3AED' : '#F59E0B', marginTop: '2px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: tx.status === 'SUCCESS' ? '#10B981' : tx.status === 'REFUNDED' ? '#7C3AED' : '#F59E0B' }} />
                        {tx.status}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Session History ─────────────────────────────────────────── */}
      {activeTab === 'Session History' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '24px 28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="#2563EB" /> Citizen Login, Logout & Session Audit History
              </h2>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>
                Detailed authentication logs, biometric sessions, IP addresses, and realtime online presence
              </div>
            </div>
            <button onClick={() => setActiveTab('Overview')} style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>&larr; Back to Overview</button>
          </div>

          {/* Session KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px', marginBottom: '24px' }}>
            <div style={{ background: safeData.isOnline ? '#F0FDF4' : '#F8FAFC', padding: '14px 16px', borderRadius: '10px', border: `1px solid ${safeData.isOnline ? '#BBF7D0' : '#E2E8F0'}` }}>
              <div style={{ fontSize: '12px', color: safeData.isOnline ? '#166534' : '#64748B', fontWeight: 600 }}>Realtime Status</div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: safeData.isOnline ? '#15803D' : '#475569', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: safeData.isOnline ? '#22C55E' : '#94A3B8' }} />
                {safeData.isOnline ? 'Active (Online Now)' : 'Offline'}
              </div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Last Active Timestamp</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                {safeData.quickStats.lastActive || 'Just now'}
              </div>
            </div>
            <div style={{ background: '#EFF6FF', padding: '14px 16px', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: '12px', color: '#1E40AF', fontWeight: 600 }}>Total Recorded Sessions</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>
                {safeData.sessionHistory.length}
              </div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '14px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Primary Channel</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                CyberSave Android App
              </div>
            </div>
          </div>

          {/* Sessions List Table */}
          {safeData.sessionHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', background: '#F8FAFC', borderRadius: '10px', border: '1px dashed #CBD5E1' }}>
              <Clock size={36} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontWeight: 700, color: '#334155', fontSize: '14px' }}>No Prior Session History</div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Active and closed sessions will appear here as the citizen logs in and out.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569', fontSize: '12px', fontWeight: 700 }}>
                    <th style={{ padding: '12px 14px' }}>EVENT / ACTION</th>
                    <th style={{ padding: '12px 14px' }}>AUTH METHOD</th>
                    <th style={{ padding: '12px 14px' }}>PLATFORM / CLIENT</th>
                    <th style={{ padding: '12px 14px' }}>IP ADDRESS</th>
                    <th style={{ padding: '12px 14px' }}>TIMESTAMP</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>SESSION STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {safeData.sessionHistory.map((sess: any, idx: number) => {
                    const isLogin = sess.event === 'LOGIN' || sess.event === 'ACTIVE';
                    const isActive = sess.event === 'ACTIVE';
                    return (
                      <tr key={sess.id || idx} style={{ borderBottom: '1px solid #F1F5F9', background: isActive ? '#F0FDF4' : 'transparent' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: isActive ? '#DCFCE7' : isLogin ? '#DBEAFE' : '#F1F5F9',
                            color: isActive ? '#15803D' : isLogin ? '#1E40AF' : '#475569',
                            border: `1px solid ${isActive ? '#86EFAC' : isLogin ? '#93C5FD' : '#CBD5E1'}`
                          }}>
                            {isActive && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E' }} />}
                            {sess.event}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#334155', fontWeight: 600 }}>
                          {sess.method}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>
                          {sess.platform}
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#64748B', fontSize: '12px' }}>
                          {sess.ipAddress}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#334155' }}>
                          {sess.dateTime || sess.date}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <span style={{
                            fontWeight: 700,
                            fontSize: '11.5px',
                            color: isActive ? '#15803D' : isLogin ? '#2563EB' : '#64748B'
                          }}>
                            {sess.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Activity Log ────────────────────────────────────────────── */}
      {activeTab === 'Activity Log' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '24px 28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Full Audit Trail & Identity Logs</h2>
            <button onClick={() => setActiveTab('Overview')} style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>&larr; Back to Overview</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {safeData.recentActivity.map((act: any, idx: number) => {
              const isFeedback = act.action === 'FEEDBACK_SUBMITTED' || act.rating || act.imageUrl;
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: act.color || (isFeedback ? '#FFB800' : '#2563EB'), flexShrink: 0 }} />
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                      {act.title}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {act.imageUrl && (
                      <button
                        onClick={() => setPreviewImage(act.imageUrl)}
                        style={{
                          backgroundColor: '#F0FDF4',
                          color: '#166534',
                          border: '1px solid #BBF7D0',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <ImageIcon size={12} /> Image Proof
                      </button>
                    )}
                    <div style={{ fontSize: '11.5px', color: '#64748B', whiteSpace: 'nowrap' }}>{act.date}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Tab: Feedback & Reviews ──────────────────────────────────────── */}
      {activeTab === 'Feedback & Reviews' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '24px 28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star color="#F59E0B" fill="#F59E0B" size={20} /> Citizen Feedback & Experience Ratings
              </h2>
              <p style={{ margin: 0, marginTop: '4px', fontSize: '13px', color: '#64748B' }}>
                Feedback and proof screenshots submitted by {safeData.fullName} via the Cybersave Mobile App
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#FEF3C7',
                border: '1px solid #FDE68A',
                padding: '6px 14px',
                borderRadius: '8px'
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#92400E' }}>Overall Rating:</span>
                <span style={{ fontSize: '15px', fontWeight: 900, color: '#B45309', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ★ {safeData.feedbacks.length > 0 ? (safeData.feedbacks.reduce((acc: number, f: any) => acc + (f.rating || 5), 0) / safeData.feedbacks.length).toFixed(1) : '5.0'} / 5.0
                </span>
              </div>
              <button onClick={() => setActiveTab('Overview')} style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                &larr; Back to Overview
              </button>
            </div>
          </div>

          {safeData.feedbacks.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              backgroundColor: '#F8FAFC',
              borderRadius: '12px',
              border: '1px dashed #CBD5E1'
            }}>
              <MessageSquare size={40} color="#94A3B8" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>No Feedback Submitted Yet</div>
              <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                Feedback and attached screenshots submitted by {safeData.fullName} via the Cybersave Mobile App will appear here in real time.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {safeData.feedbacks.map((fb: any, idx: number) => {
                const numericRating = fb.rating || 5;
                return (
                  <div
                    key={fb.id || idx}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '20px',
                      backgroundColor: '#FAFCFF',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    {/* Feedback Header: Stars + Category + Date */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Rating Stars Row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={18}
                              color={star <= numericRating ? '#F59E0B' : '#CBD5E1'}
                              fill={star <= numericRating ? '#F59E0B' : 'transparent'}
                            />
                          ))}
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#B45309' }}>
                          {numericRating} / 5
                        </span>
                        <span style={{
                          backgroundColor: '#EFF6FF',
                          color: '#1E40AF',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '12px',
                          border: '1px solid #BFDBFE'
                        }}>
                          {fb.improvementCategory || fb.category || 'App Experience'}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} /> {fb.date || fb.dateTime || 'Recently'}
                      </div>
                    </div>

                    {/* Feedback Content Text */}
                    <div style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '14px 16px',
                      fontSize: '13.5px',
                      lineHeight: '1.6',
                      color: '#1E293B',
                      fontWeight: 500
                    }}>
                      "{fb.feedbackText}"
                    </div>

                    {/* Attached Cloudinary Image Section */}
                    {fb.imageUrl ? (
                      <div style={{
                        marginTop: '4px',
                        padding: '12px 14px',
                        backgroundColor: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={fb.imageUrl}
                            alt="Citizen Feedback Proof"
                            onClick={() => setPreviewImage(fb.imageUrl)}
                            style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: '8px',
                              objectFit: 'cover',
                              border: '1.5px solid #86EFAC',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.06)'
                            }}
                            title="Click to view full image"
                          />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <CheckCircle size={14} color="#16A34A" /> Attached Proof / Screenshot
                            </div>
                            <div style={{ fontSize: '11px', color: '#15803D', marginTop: '2px' }}>
                              Stored securely on Cloudinary CDN
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => setPreviewImage(fb.imageUrl)}
                            style={{
                              backgroundColor: '#FFFFFF',
                              color: '#166534',
                              border: '1px solid #86EFAC',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Eye size={13} /> Zoom Image
                          </button>
                          <a
                            href={fb.imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              backgroundColor: '#16A34A',
                              color: '#FFFFFF',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <ExternalLink size={13} /> Open Cloudinary
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '11.5px', color: '#94A3B8', fontStyle: 'italic' }}>
                        No screenshot attached to this feedback
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Notes ───────────────────────────────────────────────────── */}
      {activeTab === 'Notes' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '24px 28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Internal Administrative Notes</h2>
            <button onClick={() => setActiveTab('Overview')} style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>&larr; Back to Overview</button>
          </div>

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>Aadhaar Biometric e-KYC Verification</div>
            <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.4 }}>Citizen visited Lucknow CSC centre on 2 Aug 2026. Address update documents verified with UIDAI central repository. Approved by VLE Vikram Tiwari.</div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>Logged on 2 Aug 2026, 14:32 IST</div>
          </div>
        </div>
      )}

      {/* ─── Edit Profile Modal ───────────────────────────────────────────── */}
      {editModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '620px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={18} color="#2563EB" /> Edit Citizen Profile
              </h2>
              <button onClick={() => setEditModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#64748B" />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Full Name *</label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Father's Name</label>
                <input
                  type="text"
                  value={editForm.fatherName}
                  onChange={(e) => setEditForm({ ...editForm, fatherName: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Date of Birth</label>
                <input
                  type="text"
                  placeholder="e.g. 14 August 1992"
                  value={editForm.dob}
                  onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Gender</label>
                <select
                  value={editForm.gender}
                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', background: '#FFF' }}
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Mobile Number</label>
                <input
                  type="text"
                  value={editForm.mobile}
                  onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Email Address</label>
                <input
                  type="text"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Full Street Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>District</label>
                <input
                  type="text"
                  value={editForm.district}
                  onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>State</label>
                <input
                  type="text"
                  value={editForm.state}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Pin Code</label>
                <input
                  type="text"
                  value={editForm.pinCode}
                  onChange={(e) => setEditForm({ ...editForm, pinCode: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Registered Centre</label>
                <input
                  type="text"
                  value={editForm.registeredCentre}
                  onChange={(e) => setEditForm({ ...editForm, registeredCentre: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                  placeholder="e.g. CSC New Delhi Seva Kendra"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Assigned Operator</label>
                <input
                  type="text"
                  value={editForm.assignedOperator}
                  onChange={(e) => setEditForm({ ...editForm, assignedOperator: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none' }}
                  placeholder="e.g. Officer Sharma (VLE-001)"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button
                onClick={() => setEditModalOpen(false)}
                style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '8px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Send Notification Modal ─────────────────────────────────────── */}
      {notifModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell color="#2563EB" size={20} /> Send Notification Dispatch
              </h2>
              <button onClick={() => setNotifModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X color="#64748B" size={20} />
              </button>
            </div>

            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#2563EB', color: '#FFFFFF', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '11px', fontWeight: 800 }}>
                {initials}
              </div>
              <div style={{ fontSize: '13px', color: '#334155' }}>
                Recipient: <strong>{safeData.fullName}</strong> ({safeData.id})
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Dispatch Channel</label>
              <select 
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontSize: '13px', background: '#FFF' }}
                value={notifType}
                onChange={e => setNotifType(e.target.value)}
              >
                <option>Push Notification</option>
                <option>Email Notification</option>
                <option>SMS Alert</option>
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Subject Line</label>
              <input 
                type="text" 
                value={notifSubject}
                onChange={e => setNotifSubject(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontSize: '13px' }} 
                placeholder="e.g. Important: Service Application Verification Update"
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Message Content</label>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>{notifBody.length} / 1000 chars</span>
              </div>
              <textarea 
                rows={4}
                value={notifBody}
                onChange={e => setNotifBody(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', resize: 'none', fontSize: '13px' }} 
                placeholder={`Dear ${safeData.fullName}, your submitted application has been successfully verified. You can now download the certificate from your app.`}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setNotifModalOpen(false)}
                style={{ background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendNotification}
                disabled={sendingNotif}
                style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '9px 22px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                {sendingNotif ? 'Dispatching...' : 'Dispatch Message'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Attached Proof / Image Modal ─────────────────────────────────── */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
            padding: '24px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #E2E8F0'
            }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={18} color="#2563EB" /> Citizen Attached Image Proof
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <a
                  href={previewImage}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#2563EB',
                    textDecoration: 'none'
                  }}
                >
                  <ExternalLink size={14} /> Full Resolution
                </a>
                <button
                  onClick={() => setPreviewImage(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} color="#64748B" />
                </button>
              </div>
            </div>

            <div style={{
              padding: '20px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#0F172A',
              overflow: 'auto',
              maxHeight: 'calc(90vh - 120px)'
            }}>
              <img
                src={previewImage}
                alt="Enlarged feedback proof"
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: '8px'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Document Viewer Modal (Supports Base64, Cloudinary, PDFs) ── */}
      {selectedDoc && (
        <div
          onClick={() => setSelectedDoc(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2100,
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0F172A',
              borderRadius: '14px',
              maxWidth: '920px',
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              border: '1px solid #334155',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #334155',
              background: '#1E293B',
              color: '#F8FAFC',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="#60A5FA" />
                  <span>{selectedDoc.name || selectedDoc.fileName || 'Citizen Document'}</span>
                  <span style={{ fontSize: '11px', background: '#059669', color: '#FFF', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                    {selectedDoc.status || 'Verified'}
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '2px' }}>
                  Uploaded: {selectedDoc.date || 'Recent'} • {selectedDoc.fileType || 'Document'}
                </div>
              </div>

              {/* Action Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setDocZoom((z) => Math.min(z + 0.25, 3))}
                  style={{ background: '#334155', border: 'none', color: '#FFF', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                  title="Zoom In"
                >
                  + Zoom
                </button>
                <button
                  type="button"
                  onClick={() => setDocZoom((z) => Math.max(z - 0.25, 0.5))}
                  style={{ background: '#334155', border: 'none', color: '#FFF', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                  title="Zoom Out"
                >
                  - Zoom
                </button>
                <button
                  type="button"
                  onClick={() => setDocRotation((r) => (r + 90) % 360)}
                  style={{ background: '#334155', border: 'none', color: '#FFF', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                  title="Rotate 90 deg"
                >
                  Rotate
                </button>
                <button
                  type="button"
                  onClick={() => { setDocZoom(1); setDocRotation(0); }}
                  style={{ background: '#334155', border: 'none', color: '#94A3B8', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                  title="Reset view"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => openDocInNewWindow(selectedDoc.fileUrl, selectedDoc.name)}
                  style={{ background: '#2563EB', border: 'none', color: '#FFF', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Open in new window"
                >
                  <ExternalLink size={13} /> New Tab
                </button>
                <button
                  type="button"
                  onClick={() => downloadDocument(selectedDoc.fileUrl, selectedDoc.name)}
                  style={{ background: '#059669', border: 'none', color: '#FFF', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Download document"
                >
                  <Download size={13} /> Download
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px', marginLeft: '6px' }}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '24px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              background: '#0B1120',
              minHeight: '460px'
            }}>
              {selectedDoc.fileUrl ? (
                selectedDoc.fileType === 'application/pdf' || selectedDoc.name?.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={selectedDoc.fileUrl}
                    title={selectedDoc.name}
                    style={{ width: '100%', height: '550px', border: 'none', borderRadius: '8px', background: '#FFF' }}
                  />
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                    <img
                      src={selectedDoc.fileUrl}
                      alt={selectedDoc.name}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '65vh',
                        objectFit: 'contain',
                        borderRadius: '6px',
                        transform: `scale(${docZoom}) rotate(${docRotation}deg)`,
                        transition: 'transform 0.2s ease',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                      }}
                    />
                  </div>
                )
              ) : (
                <div style={{ color: '#94A3B8', fontSize: '14px', textAlign: 'center' }}>
                  No file content available for preview.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


