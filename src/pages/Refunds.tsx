import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Layout';
import { StatCard } from '../components/Dashboard';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ExternalLink,
  Eye,
  Wallet,
  Check,
  X,
  Copy,
  Calendar,
} from 'lucide-react';

interface TabItem {
  id: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
  label: string;
  count: number;
  highlight?: boolean;
}

export default function Refunds() {
  const { socket, connected } = useSocket();
  const { admin } = useAuth();
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [reasonFilter, setReasonFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'AMOUNT_HIGH' | 'OLDEST'>('NEWEST');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<any | null>(null);
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedQuickDecline, setSelectedQuickDecline] = useState('');

  const getApiBase = () => {
    return import.meta.env.VITE_BACKEND_URL || 'https://cybersave-6tfo.onrender.com';
  };

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const base = getApiBase();
      const token = localStorage.getItem('adminToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Primary target
      let res = await axios.get(`${base}/api/v1/refunds`, { headers }).catch(() => null);

      // 2. Fallback to production Render backend if primary was localhost or failed
      if ((!res || !res.data) && base !== 'https://cybersave-6tfo.onrender.com') {
        res = await axios.get(`https://cybersave-6tfo.onrender.com/api/v1/refunds`, { headers }).catch(() => null);
      }

      // 3. Fallback to localhost 3000 if running locally
      if ((!res || !res.data) && base !== 'http://localhost:3000') {
        res = await axios.get(`http://localhost:3000/api/v1/refunds`, { headers }).catch(() => null);
      }

      // 4. Fallback to relative proxy
      if (!res || !res.data) {
        res = await axios.get('/api/v1/refunds', { headers }).catch(() => null);
      }

      const raw = res?.data;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.refunds)
        ? raw.refunds
        : [];

      setRefunds(list);
    } catch (err: any) {
      console.error('Error fetching refunds:', err);
      showToast('Failed to load refund requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  // Real-time WebSocket Listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewRefund = (newRefund: any) => {
      if (!newRefund) return;
      showToast(`New Refund #${newRefund.refNumber || ''} received for ${newRefund.serviceTitle || 'Scheme'}!`, 'success');
      setRefunds((prev) => {
        const exists = prev.some((r) => r.id === newRefund.id || r.refNumber === newRefund.refNumber);
        if (exists) {
          return prev.map((r) => (r.id === newRefund.id ? { ...r, ...newRefund } : r));
        }
        return [newRefund, ...prev];
      });
    };

    const handleRefundsUpdated = (updatedRefund: any) => {
      if (!updatedRefund?.id) {
        fetchRefunds();
        return;
      }
      setRefunds((prev) => {
        const exists = prev.some((r) => r.id === updatedRefund.id || r.refNumber === updatedRefund.refNumber);
        if (exists) {
          return prev.map((r) => (r.id === updatedRefund.id ? { ...r, ...updatedRefund } : r));
        }
        return [updatedRefund, ...prev];
      });
    };

    socket.on('new_refund_requested', handleNewRefund);
    socket.on('refunds_updated', handleRefundsUpdated);

    return () => {
      socket.off('new_refund_requested', handleNewRefund);
      socket.off('refunds_updated', handleRefundsUpdated);
    };
  }, [socket]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const executeApprove = async () => {
    if (!approveTarget) return;

    try {
      setActionLoading(approveTarget.id);
      const base = getApiBase();
      const token = localStorage.getItem('adminToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const adminName = admin?.name || admin?.email || 'Admin Authority';
      const payload = {
        adminNotes: approveNotes.trim() || 'Refund approved. Amount credited to citizen wallet.',
        adminName,
      };

      let res = await axios.post(`${base}/api/v1/refunds/${approveTarget.id}/approve`, payload, { headers }).catch(() => null);
      if ((!res || !res.data) && base !== 'https://cybersave-6tfo.onrender.com') {
        res = await axios.post(`https://cybersave-6tfo.onrender.com/api/v1/refunds/${approveTarget.id}/approve`, payload, { headers }).catch(() => null);
      }
      if (!res || !res.data) {
        res = await axios.post(`/api/v1/refunds/${approveTarget.id}/approve`, payload, { headers }).catch(() => null);
      }

      if (res?.data?.success) {
        showToast(`Refund #${approveTarget.refNumber} approved! ₹${Number(approveTarget.amount).toFixed(2)} credited to citizen wallet.`, 'success');
        setRefunds((prev) =>
          prev.map((r) =>
            r.id === approveTarget.id
              ? {
                  ...r,
                  status: 'APPROVED',
                  processedBy: adminName,
                  processedAt: new Date().toISOString(),
                  adminNotes: approveNotes.trim() || r.adminNotes,
                }
              : r
          )
        );
        setApproveTarget(null);
        setApproveNotes('');
      } else {
        showToast(res?.data?.message || 'Failed to approve refund', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to approve refund', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const executeReject = async () => {
    if (!rejectTarget) return;

    const finalReason = selectedQuickDecline || rejectionReason.trim() || 'Declined per departmental administrative review.';

    try {
      setActionLoading(rejectTarget.id);
      const base = getApiBase();
      const token = localStorage.getItem('adminToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const adminName = admin?.name || admin?.email || 'Admin Authority';
      const payload = {
        rejectionReason: finalReason,
        adminName,
      };

      let res = await axios.post(`${base}/api/v1/refunds/${rejectTarget.id}/reject`, payload, { headers }).catch(() => null);
      if ((!res || !res.data) && base !== 'https://cybersave-6tfo.onrender.com') {
        res = await axios.post(`https://cybersave-6tfo.onrender.com/api/v1/refunds/${rejectTarget.id}/reject`, payload, { headers }).catch(() => null);
      }
      if (!res || !res.data) {
        res = await axios.post(`/api/v1/refunds/${rejectTarget.id}/reject`, payload, { headers }).catch(() => null);
      }

      if (res?.data?.success) {
        showToast(`Refund #${rejectTarget.refNumber} declined.`, 'success');
        setRefunds((prev) =>
          prev.map((r) =>
            r.id === rejectTarget.id
              ? {
                  ...r,
                  status: 'REJECTED',
                  processedBy: adminName,
                  processedAt: new Date().toISOString(),
                  adminNotes: finalReason,
                }
              : r
          )
        );
        setRejectTarget(null);
        setRejectionReason('');
        setSelectedQuickDecline('');
      } else {
        showToast(res?.data?.message || 'Failed to decline refund', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to decline refund', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // KPIs
  const totalCount = refunds.length;
  const pendingCount = refunds.filter((r) => (r.status || '').toUpperCase() === 'PENDING').length;
  const approvedCount = refunds.filter((r) => (r.status || '').toUpperCase() === 'APPROVED').length;
  const rejectedCount = refunds.filter((r) => (r.status || '').toUpperCase() === 'REJECTED').length;
  const totalRefundedAmount = refunds
    .filter((r) => (r.status || '').toUpperCase() === 'APPROVED')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  // Reason list for filter
  const distinctReasons = useMemo(() => {
    const set = new Set<string>();
    refunds.forEach((r) => {
      if (r.reason) set.add(r.reason);
    });
    return Array.from(set);
  }, [refunds]);

  // Filter & Sort
  const filteredRefunds = useMemo(() => {
    return refunds
      .filter((r) => {
        const s = (r.status || '').toUpperCase();
        if (filter !== 'ALL' && s !== filter) return false;
        if (reasonFilter !== 'ALL' && r.reason !== reasonFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            r.refNumber?.toLowerCase().includes(q) ||
            r.serviceTitle?.toLowerCase().includes(q) ||
            r.application?.refNumber?.toLowerCase().includes(q) ||
            r.user?.profile?.fullName?.toLowerCase().includes(q) ||
            r.user?.email?.toLowerCase().includes(q) ||
            r.user?.phone?.toLowerCase().includes(q) ||
            r.reason?.toLowerCase().includes(q) ||
            r.details?.toLowerCase().includes(q);
          if (!matches) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'AMOUNT_HIGH') {
          return (Number(b.amount) || 0) - (Number(a.amount) || 0);
        }
        if (sortBy === 'OLDEST') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [refunds, filter, reasonFilter, searchQuery, sortBy]);

  const QUICK_DECLINE_REASONS = [
    'Duplicate payment not found in gateway records',
    'Service processing already initiated or finalized',
    'Application fee is non-refundable per scheme policy',
    'Insufficient or unverifiable supporting proof',
    'Incorrect application reference cited',
  ];

  const statusTabs: TabItem[] = [
    { id: 'ALL', label: 'All Claims', count: totalCount },
    { id: 'PENDING', label: 'Pending Review', count: pendingCount, highlight: pendingCount > 0 },
    { id: 'APPROVED', label: 'Approved & Credited', count: approvedCount },
    { id: 'REJECTED', label: 'Declined', count: rejectedCount },
  ];

  return (
    <>
      {/* ─── 1. Breadcrumbs ─── */}
      <div style={{ fontSize: '13px', color: '#64748B', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>Dashboard</span>
        <span>&rarr;</span>
        <span>Operations</span>
        <span>&rarr;</span>
        <span style={{ color: '#2563EB', fontWeight: 600 }}>Refund Dispatches</span>
      </div>

      {/* ─── 2. Title & Action Row ─── */}
      <div className="dashboard-title-row" style={{ marginBottom: 20 }}>
        <div className="dashboard-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1>Refund Dispatches & Wallet Re-Credit</h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                background: connected ? '#ECFDF5' : '#FEF2F2',
                color: connected ? '#065F46' : '#991B1B',
                border: `1px solid ${connected ? '#A7F3D0' : '#FECACA'}`,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: connected ? '#10B981' : '#EF4444',
                }}
              />
              {connected ? 'Real-Time Sync Active' : 'Offline'}
            </span>
          </div>
          <p>
            Verify citizen refund claims, inspect attached Cloudinary proof assets, and approve direct wallet re-credit transactions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={fetchRefunds}
            className="date-picker-btn"
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              background: '#FFFFFF',
            }}
          >
            <RotateCcw size={14} className={loading ? 'animate-spin' : ''} color="#2563EB" />
            Refresh Queue
          </button>
        </div>
      </div>

      {/* ─── 3. Stat Cards KPI Grid ─── */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <StatCard
          icon={<RotateCcw color="#2563EB" size={18} />}
          iconBg="#EFF6FF"
          title="TOTAL CLAIMS"
          value={totalCount.toLocaleString()}
          trend="All recorded requests"
          trendType="neutral"
        />
        <StatCard
          icon={<Clock color="#D97706" size={18} />}
          iconBg="#FEF3C7"
          title="PENDING ACTION"
          value={pendingCount.toLocaleString()}
          trend={pendingCount > 0 ? `${pendingCount} awaiting approval` : 'Queue cleared'}
          trendType={pendingCount > 0 ? 'down' : 'up'}
        />
        <StatCard
          icon={<Wallet color="#059669" size={18} />}
          iconBg="#D1FAE5"
          title="WALLET RE-CREDITED"
          value={`₹${totalRefundedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          trend={`${approvedCount} claims credited to wallet`}
          trendType="up"
        />
        <StatCard
          icon={<XCircle color="#DC2626" size={18} />}
          iconBg="#FEE2E2"
          title="DECLINED CLAIMS"
          value={rejectedCount.toLocaleString()}
          trend="Documented with reason"
          trendType="neutral"
        />
      </div>

      {/* ─── 4. Interactive Filters & Search Row ─── */}
      <div
        className="table-card"
        style={{
          padding: '14px 18px',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        {/* Status Pill Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: '#F1F5F9',
            padding: 4,
            borderRadius: 8,
          }}
        >
          {statusTabs.map((t) => {
            const isActive = filter === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? '#FFFFFF' : 'transparent',
                  color: isActive ? '#0F172A' : '#64748B',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{t.label}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 999,
                    background: t.highlight
                      ? '#F59E0B'
                      : isActive
                      ? '#E2E8F0'
                      : '#E2E8F0',
                    color: t.highlight ? '#FFFFFF' : '#334155',
                  }}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right side: Search, Reason dropdown, Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
          {/* Reason Filter */}
          {distinctReasons.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#64748B' }}>
              <span>Reason:</span>
              <select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  background: '#FFFFFF',
                  color: '#0F172A',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Claim Reasons</option>
                {distinctReasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort By */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#64748B' }}>
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 600,
                background: '#FFFFFF',
                color: '#0F172A',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="NEWEST">Newest First</option>
              <option value="AMOUNT_HIGH">Highest Fee (₹)</option>
              <option value="OLDEST">Oldest First</option>
            </select>
          </div>

          {/* Search Bar */}
          <div
            className="search-bar"
            style={{
              width: 280,
              padding: '6px 12px',
              height: 34,
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#FFFFFF',
            }}
          >
            <Search size={15} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search ref, app ID, citizen, service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: 12.5,
                color: '#0F172A',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} color="#94A3B8" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── 5. Main Refunds Table Card ─── */}
      <div className="table-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
            <RotateCcw className="animate-spin" size={32} color="#2563EB" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Syncing refund ledger...</p>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Connecting to database and live socket updates.</p>
          </div>
        ) : filteredRefunds.length === 0 ? (
          <div style={{ padding: '70px 20px', textAlign: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#94A3B8',
              }}
            >
              <RotateCcw size={28} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
              No refund requests found
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', maxWidth: 460, margin: '0 auto' }}>
              {filter !== 'ALL' || reasonFilter !== 'ALL' || searchQuery
                ? 'No refund claims match your active filters. Try clearing the search or switching tabs.'
                : 'When citizens submit refund claims from CyberSave Mobile, they will appear here immediately for verification and one-click wallet re-credit.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>CLAIM REFERENCE</th>
                  <th style={{ width: '20%' }}>APPLICATION & SERVICE</th>
                  <th style={{ width: '18%' }}>CITIZEN DETAILS</th>
                  <th style={{ width: '12%' }}>FEE AMOUNT</th>
                  <th style={{ width: '20%' }}>REASON & PROOF</th>
                  <th style={{ width: '15%' }}>STATUS / SETTLEMENT</th>
                </tr>
              </thead>
              <tbody>
                {filteredRefunds.map((r) => {
                  const citizenName = r.user?.profile?.fullName || r.user?.email?.split('@')[0] || 'Citizen';
                  const citizenEmail = r.user?.email || 'N/A';
                  const citizenPhone = r.user?.phone || r.user?.profile?.phone || 'N/A';
                  const appRef = r.application?.refNumber || 'N/A';
                  const statusUpper = (r.status || '').toUpperCase();
                  const isPending = statusUpper === 'PENDING';
                  const isApproved = statusUpper === 'APPROVED';
                  const isCopied = copiedId === r.id;

                  // Initials
                  const initials = citizenName
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={r.id}>
                      {/* 1. Claim Reference & Date */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: '#0F172A' }}>
                            {r.refNumber}
                          </span>
                          <button
                            onClick={() => handleCopy(r.refNumber, r.id)}
                            title="Copy Claim Reference"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              padding: 2,
                              color: isCopied ? '#10B981' : '#94A3B8',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            {isCopied ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={11} color="#94A3B8" />
                          {new Date(r.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          •{' '}
                          {new Date(r.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* 2. Application & Service Scheme */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 13.5 }}>
                          {r.serviceTitle || r.application?.serviceTitle || 'Government Scheme'}
                        </div>
                        <div style={{ marginTop: 4 }}>
                          <Link
                            to={`/applications/${r.applicationId}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontFamily: 'monospace',
                              fontSize: 11.5,
                              color: '#2563EB',
                              textDecoration: 'none',
                              fontWeight: 600,
                              background: '#EFF6FF',
                              padding: '2px 8px',
                              borderRadius: 4,
                              border: '1px solid #BFDBFE',
                            }}
                          >
                            <span>App #{appRef}</span>
                            <ExternalLink size={10} />
                          </Link>
                        </div>
                      </td>

                      {/* 3. Citizen Details */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: '#2563EB',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {citizenName}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {citizenEmail}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 2, paddingLeft: 36 }}>
                          {citizenPhone}
                        </div>
                      </td>

                      {/* 4. Refund Amount */}
                      <td>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#059669', letterSpacing: '-0.02em' }}>
                          ₹{Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Wallet size={11} color="#10B981" />
                          <span>Wallet Credit</span>
                        </div>
                      </td>

                      {/* 5. Reason & Cloudinary Proof */}
                      <td>
                        <div
                          style={{
                            display: 'inline-block',
                            background: '#F1F5F9',
                            color: '#334155',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11.5,
                            fontWeight: 600,
                          }}
                        >
                          {r.reason}
                        </div>
                        {r.details && (
                          <div
                            style={{
                              fontSize: 11.5,
                              color: '#64748B',
                              marginTop: 4,
                              lineHeight: 1.4,
                              maxWidth: 240,
                            }}
                            title={r.details}
                          >
                            "{r.details}"
                          </div>
                        )}

                        {/* Proof Button */}
                        <div style={{ marginTop: 6 }}>
                          {r.proofUrl ? (
                            <button
                              onClick={() => setPreviewImage(r.proofUrl)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '3px 8px',
                                background: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                borderRadius: 5,
                                fontSize: 11,
                                fontWeight: 700,
                                color: '#1D4ED8',
                                cursor: 'pointer',
                              }}
                            >
                              <Eye size={12} />
                              <span>View Cloudinary Proof</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>
                              No proof file attached
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Status & Settlement Action */}
                      <td>
                        {isPending ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: 11.5,
                                fontWeight: 700,
                                background: '#FFFBEB',
                                color: '#B45309',
                                border: '1px solid #FDE68A',
                                width: 'fit-content',
                              }}
                            >
                              <Clock size={12} />
                              <span>PENDING VERIFICATION</span>
                            </span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <button
                                onClick={() => {
                                  setApproveTarget(r);
                                  setApproveNotes(`Approved by ${admin?.name || 'Admin'}. ₹${r.amount} credited to citizen wallet.`);
                                }}
                                disabled={actionLoading === r.id}
                                style={{
                                  border: 'none',
                                  cursor: 'pointer',
                                  background: '#10B981',
                                  color: '#FFFFFF',
                                  padding: '5px 10px',
                                  borderRadius: 6,
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  boxShadow: '0 1px 2px rgba(16,185,129,0.2)',
                                }}
                              >
                                <Check size={13} />
                                <span>Approve</span>
                              </button>

                              <button
                                onClick={() => {
                                  setRejectTarget(r);
                                  setRejectionReason('');
                                  setSelectedQuickDecline('');
                                }}
                                disabled={actionLoading === r.id}
                                style={{
                                  border: '1px solid #FECACA',
                                  cursor: 'pointer',
                                  background: '#FEF2F2',
                                  color: '#DC2626',
                                  padding: '5px 8px',
                                  borderRadius: 6,
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <X size={13} />
                                <span>Decline</span>
                              </button>
                            </div>
                          </div>
                        ) : isApproved ? (
                          <div>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: 11.5,
                                fontWeight: 700,
                                background: '#ECFDF5',
                                color: '#065F46',
                                border: '1px solid #A7F3D0',
                              }}
                            >
                              <CheckCircle2 size={12} />
                              <span>APPROVED & CREDITED</span>
                            </span>
                            <div style={{ fontSize: 11, color: '#047857', fontWeight: 600, marginTop: 4 }}>
                              ✓ Credited to Wallet by {r.processedBy || 'Admin'}
                            </div>
                            {r.processedAt && (
                              <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
                                {new Date(r.processedAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: 11.5,
                                fontWeight: 700,
                                background: '#FEF2F2',
                                color: '#991B1B',
                                border: '1px solid #FECACA',
                              }}
                            >
                              <XCircle size={12} />
                              <span>DECLINED</span>
                            </span>
                            {r.adminNotes && (
                              <div style={{ fontSize: 11, color: '#991B1B', marginTop: 4, maxWidth: 200 }}>
                                Reason: {r.adminNotes}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── 6. Approve Confirmation Modal ─── */}
      {approveTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 14,
              width: '100%',
              maxWidth: 520,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #E2E8F0',
                background: '#F8FAFC',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: '#D1FAE5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Approve Refund & Re-Credit Wallet
                  </h3>
                  <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                    Claim Reference: #{approveTarget.refNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApproveTarget(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#94A3B8',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px' }}>
              <div
                style={{
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: 10,
                  padding: '14px 16px',
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#065F46', fontWeight: 600 }}>Application Fee to Re-Credit:</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#047857' }}>
                    ₹{Number(approveTarget.amount).toFixed(2)}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#065F46', lineHeight: 1.5 }}>
                  This amount will be <strong>immediately credited back</strong> to the citizen's CyberSave digital wallet balance. A verified ledger transaction and in-app notification will be dispatched in real time.
                </div>
              </div>

              {/* Citizen Details Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, fontSize: 12 }}>
                <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: 11 }}>Citizen</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>
                    {approveTarget.user?.profile?.fullName || approveTarget.user?.email}
                  </span>
                </div>
                <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                  <span style={{ color: '#64748B', display: 'block', fontSize: 11 }}>Application ID</span>
                  <span style={{ fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                    #{approveTarget.application?.refNumber || approveTarget.applicationId}
                  </span>
                </div>
              </div>

              {/* Admin Notes */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Administrative Approval Remarks (Logged to Audit Journal)
                </label>
                <textarea
                  rows={3}
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  placeholder="e.g. Duplicate payment verified via gateway. Full fee refunded to wallet."
                  style={{
                    width: '100%',
                    border: '1px solid #CBD5E1',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 13,
                    color: '#0F172A',
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'none',
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #E2E8F0',
                background: '#F8FAFC',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                onClick={() => setApproveTarget(null)}
                style={{
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={executeApprove}
                disabled={actionLoading === approveTarget.id}
                style={{
                  border: 'none',
                  background: '#10B981',
                  color: '#FFFFFF',
                  padding: '8px 20px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 4px rgba(16,185,129,0.3)',
                }}
              >
                {actionLoading === approveTarget.id ? (
                  <>
                    <RotateCcw size={14} className="animate-spin" />
                    <span>Processing Credit...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Confirm & Re-Credit ₹{Number(approveTarget.amount).toFixed(2)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 7. Decline / Reject Modal ─── */}
      {rejectTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 14,
              width: '100%',
              maxWidth: 520,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #E2E8F0',
                background: '#F8FAFC',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: '#FEE2E2',
                    color: '#DC2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <XCircle size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Decline Refund Claim #{rejectTarget.refNumber}
                  </h3>
                  <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                    Fee Amount: ₹{Number(rejectTarget.amount).toFixed(2)} • Citizen: {rejectTarget.user?.profile?.fullName || rejectTarget.user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRejectTarget(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#94A3B8',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                Select Standard Decline Rationale:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {QUICK_DECLINE_REASONS.map((reason) => {
                  const isSelected = selectedQuickDecline === reason;
                  return (
                    <button
                      key={reason}
                      onClick={() => {
                        setSelectedQuickDecline(isSelected ? '' : reason);
                        if (!isSelected) setRejectionReason(reason);
                      }}
                      style={{
                        border: `1px solid ${isSelected ? '#EF4444' : '#E2E8F0'}`,
                        background: isSelected ? '#FEF2F2' : '#F8FAFC',
                        color: isSelected ? '#B91C1C' : '#475569',
                        padding: '5px 10px',
                        borderRadius: 6,
                        fontSize: 11.5,
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {reason}
                    </button>
                  );
                })}
              </div>

              {/* Custom Reason */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Specific Explanation (Dispatched to Citizen in In-App Notification):
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide precise details why this refund was declined..."
                  style={{
                    width: '100%',
                    border: '1px solid #CBD5E1',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 13,
                    color: '#0F172A',
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'none',
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #E2E8F0',
                background: '#F8FAFC',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                onClick={() => setRejectTarget(null)}
                style={{
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={executeReject}
                disabled={actionLoading === rejectTarget.id}
                style={{
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  padding: '8px 20px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 4px rgba(220,38,38,0.3)',
                }}
              >
                {actionLoading === rejectTarget.id ? (
                  <>
                    <RotateCcw size={14} className="animate-spin" />
                    <span>Declining...</span>
                  </>
                ) : (
                  <>
                    <X size={16} />
                    <span>Confirm Decline</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 8. Cloudinary Full-Resolution Proof Viewer ─── */}
      {previewImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '85vh',
              background: '#0F172A',
              padding: 8,
              borderRadius: 12,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                color: '#FFFFFF',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                marginBottom: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                <Eye size={16} color="#38BDF8" />
                <span>Supporting Proof Document (Cloudinary CDN)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <a
                  href={previewImage}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: '#38BDF8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  <ExternalLink size={14} /> Open Original
                </a>
                <button
                  onClick={() => setPreviewImage(null)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Image */}
            <img
              src={previewImage}
              alt="Cloudinary Supporting Proof"
              style={{
                maxWidth: '85vw',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: 8,
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
