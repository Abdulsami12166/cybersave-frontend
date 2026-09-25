import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { 
  FileText, 
  Clock, 
  Folder,
  AlertCircle,
  RotateCw,
  CheckCircle2,
  XCircle,
  Eye, 
  Search,
  Users,
  RefreshCw,
  Check,
  X,
  Download,
  MoreHorizontal,
  ChevronDown,
  ArrowUpRight,
  TrendingUp,
  UserCheck,
  AlertTriangle
} from 'lucide-react';

import { 
  normalizeAppId, 
  normalizeCitizenName, 
  normalizeServiceTitle, 
  normalizeFee, 
  formatIndianDate, 
  normalizeStatus,
  extractSupportingDocuments
} from '../utils/normalize';
import { apiFetch } from '../utils/apiConfig';

// Clear stale sessionStorage cache on module load
try { sessionStorage.removeItem('cybersave_apps_cache'); } catch (_) {}

export default function Applications() {
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>('All Applications');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterDateRange, setFilterDateRange] = useState<string>('All');
  const [filterAssigned, setFilterAssigned] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(8);

  // Selection States for Batch Actions
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);

  // Action Menu State (for the 3-dots action button)
  const [activeMenuAppId, setActiveMenuAppId] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAppTitle, setNewAppTitle] = useState('');
  const [newAppDesc, setNewAppDesc] = useState('');

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingApp, setRejectingApp] = useState<any>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('Documents could not be verified by the administrative officer.');

  const [showBatchAssignModal, setShowBatchAssignModal] = useState(false);
  const [batchTargetOfficer, setBatchTargetOfficer] = useState('Vikram Tiwari (VLE-0234)');

  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const formatApplication = (a: any, idx: number) => {
    const raw = a.rawApp || a;
    const userProfile = raw.user?.profile || a.user?.profile;
    const formData = (raw.formData as any) || (a.formData as any) || {};
    const cleanedDocs = extractSupportingDocuments(raw, a);

    const mongoId = raw.id || a.rawId || a.dbId || (raw._id ? String(raw._id) : null) || a.id;
    const refNumber = normalizeAppId(raw.refNumber || a.refNumber, mongoId);
    const citizen = normalizeCitizenName(raw) || normalizeCitizenName(a);
    const serviceType = normalizeServiceTitle(raw) || normalizeServiceTitle(a);
    const feeAmount = normalizeFee(raw) || normalizeFee(a);
    const statusObj = normalizeStatus(raw.status || a.status);
    const dateObj = formatIndianDate(raw.submittedAt || a.submittedAt || raw.createdAt);

    // Realistic Priority determination (High / Medium / Low)
    const storedPriority = formData.priority || a.priority;
    const priority = storedPriority || (idx % 3 === 0 ? 'High' : (idx % 3 === 1 ? 'Medium' : 'Low'));

    // Realistic Assigned Officer determination
    const storedOfficer = raw.officialOfficer || a.assigned;
    const assigned = storedOfficer && storedOfficer !== 'Auto Assigned' && storedOfficer !== 'Officer Sharma (SDM)'
      ? storedOfficer 
      : (idx % 5 === 0 ? 'Vikram T.' : (idx % 5 === 1 ? 'Sunita M.' : (idx % 5 === 2 ? 'Deepak V.' : (idx % 5 === 3 ? 'Rakesh S.' : 'Auto'))));

    // Dynamic SLA Remaining Calculation
    const subDate = new Date(raw.submittedAt || a.submittedAt || raw.createdAt || Date.now());
    const now = new Date();
    const diffHours = (now.getTime() - subDate.getTime()) / (1000 * 60 * 60);

    let sla = '4h 32m';
    let slaType: 'green' | 'orange' | 'red' | 'gray' = 'green';

    if (statusObj.label === 'Completed' || statusObj.label === 'Approved') {
      sla = '—';
      slaType = 'gray';
    } else if (diffHours > 24) {
      sla = 'Expired';
      slaType = 'red';
    } else if (diffHours > 20) {
      const minsLeft = Math.max(12, Math.round((24 - diffHours) * 60));
      sla = `${minsLeft}m`;
      slaType = 'orange';
    } else {
      const hrsLeft = Math.max(1, Math.round(24 - diffHours));
      const minsLeft = (idx * 17) % 60;
      sla = `${hrsLeft}h ${minsLeft}m`;
      slaType = 'green';
    }

    // Refund Request detection
    const refundRequests = Array.isArray(raw.refundRequests) ? raw.refundRequests : (Array.isArray(a.refundRequests) ? a.refundRequests : []);
    const activeRefund = refundRequests.find((r: any) => {
      const s = String(r.status || '').toUpperCase();
      return s === 'PENDING' || s === 'REQUESTED';
    }) || refundRequests[0] || null;
    const isRefundPending = !!activeRefund && ['PENDING', 'REQUESTED'].includes(String(activeRefund.status || '').toUpperCase());
    const isRefundApproved = (String(activeRefund?.status || raw.refundStatus || a.refundStatus || '').toUpperCase() === 'APPROVED');
    const isRefundRejected = (String(activeRefund?.status || raw.refundStatus || a.refundStatus || '').toUpperCase() === 'REJECTED');
    const hasRefundRequest = isRefundPending || isRefundApproved || isRefundRejected ||
      String(raw.refundStatus || a.refundStatus || '').toUpperCase() === 'REQUESTED' ||
      String(raw.status || a.status || '').toUpperCase() === 'REFUND_REQUESTED';
    const refundAmount = activeRefund?.amount ?? raw.refundAmount ?? a.refundAmount ?? feeAmount;
    const refundReason = activeRefund?.reason || raw.refundReason || a.refundReason || 'Citizen requested cancellation & refund';
    const refundId = activeRefund?.id || null;

    return {
      id: refNumber,
      rawId: mongoId,
      refNumber,
      citizen,
      citizenEmail: raw.user?.email || a.user?.email || formData.email || a.citizenEmail || '—',
      citizenPhone: raw.user?.phone || userProfile?.phone || formData.phone || a.citizenPhone || '—',
      serviceType,
      serviceCategory: raw.service?.category || a.serviceCategory || 'Government',
      priority,
      rawStatus: raw.status || a.status,
      status: statusObj.label,
      assigned,
      submitted: dateObj.formatted,
      submittedDate: subDate,
      sla,
      slaType,
      amount: feeAmount,
      paymentStatus: raw.paymentStatus || a.paymentStatus || 'Verified & Settled',
      razorpayPaymentId: raw.razorpayPaymentId || a.razorpayPaymentId || '',
      razorpayOrderId: raw.razorpayOrderId || a.razorpayOrderId || '',
      rejectionReason: raw.rejectionReason || a.rejectionReason || '',
      hasRefundRequest,
      isRefundPending,
      isRefundApproved,
      isRefundRejected,
      refundAmount,
      refundReason,
      refundId,
      refundRequests,
      formData,
      documents: cleanedDocs,
      rawApp: raw,
    };
  };

  const fetchApplicationsRest = async () => {
    try {
      const res = await apiFetch('/api/v1/applications').catch(() => null);
      if (res && res.ok) {
        const list = await res.json().catch(() => []);
        if (Array.isArray(list)) {
          const formatted = list.map((item, idx) => formatApplication(item, idx));
          const totalApps = formatted.length;
          const todayApps = formatted.filter(a => {
            const sub = new Date(a.rawApp?.submittedAt || a.rawApp?.createdAt || Date.now());
            const today = new Date();
            return sub.toDateString() === today.toDateString();
          }).length;
          const submittedCount = formatted.filter(a => a.rawStatus === 'SUBMITTED').length;
          const underReviewCount = formatted.filter(a => a.rawStatus === 'VERIFYING' || a.rawStatus === 'PENDING').length;
          const processingCount = formatted.filter(a => a.rawStatus === 'IN_PROGRESS' || a.rawStatus === 'PROCESSING').length;
          const approvedCount = formatted.filter(a => a.rawStatus === 'APPROVED').length;
          const completedCount = formatted.filter(a => a.rawStatus === 'COMPLETED').length;
          const completedTodayCount = formatted.filter(a => {
            const isDone = a.rawStatus === 'APPROVED' || a.rawStatus === 'COMPLETED';
            if (!isDone) return false;
            const upd = new Date(a.rawApp?.updatedAt || a.rawApp?.submittedAt || Date.now());
            return upd.toDateString() === new Date().toDateString();
          }).length;

          const freshData = {
            stats: { 
              totalApps, 
              todayApps, 
              pending: submittedCount + underReviewCount, 
              processing: processingCount, 
              completed: completedTodayCount 
            },
            pipeline: {
              submitted: submittedCount,
              underReview: underReviewCount,
              processing: processingCount,
              approved: approvedCount,
              completed: completedCount
            },
            applications: formatted,
          };
          setData(freshData);
          setLoading(false);
          return formatted;
        }
      }
    } catch (e) {
      console.warn('[Applications] REST fetch error:', e);
    } finally {
      setLoading(false);
    }
    return null;
  };

  useEffect(() => {
    let debounceTimer: any = null;
    fetchApplicationsRest();

    const pollInterval = setInterval(() => {
      fetchApplicationsRest();
    }, 8000);

    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    if (socket && connected) {
      socket.emit('request_applications_data');

      const handleSocketData = (resData: any) => {
        if (!resData) {
          setLoading(false);
          return;
        }
        const rawList = Array.isArray(resData.applications) ? resData.applications : [];
        const formatted = rawList.map((item: any, idx: number) => formatApplication(item, idx));
        const totalApps = formatted.length;
        const todayApps = formatted.filter(a => {
          const sub = new Date(a.rawApp?.submittedAt || a.rawApp?.createdAt || Date.now());
          return sub.toDateString() === new Date().toDateString();
        }).length;
        const submittedCount = formatted.filter(a => a.rawStatus === 'SUBMITTED').length;
        const underReviewCount = formatted.filter(a => a.rawStatus === 'VERIFYING' || a.rawStatus === 'PENDING').length;
        const processingCount = formatted.filter(a => a.rawStatus === 'IN_PROGRESS' || a.rawStatus === 'PROCESSING').length;
        const approvedCount = formatted.filter(a => a.rawStatus === 'APPROVED').length;
        const completedCount = formatted.filter(a => a.rawStatus === 'COMPLETED').length;
        const completedTodayCount = formatted.filter(a => {
          const isDone = a.rawStatus === 'APPROVED' || a.rawStatus === 'COMPLETED';
          if (!isDone) return false;
          const upd = new Date(a.rawApp?.updatedAt || a.rawApp?.submittedAt || Date.now());
          return upd.toDateString() === new Date().toDateString();
        }).length;

        const stats = {
          totalApps: resData.stats?.totalApps ?? totalApps,
          todayApps: resData.stats?.todayApps ?? todayApps,
          pending: resData.stats?.pending ?? (submittedCount + underReviewCount),
          processing: resData.stats?.processing ?? processingCount,
          completed: resData.stats?.completed ?? completedTodayCount,
        };
        const pipeline = resData.pipeline || {
          submitted: submittedCount,
          underReview: underReviewCount,
          processing: processingCount,
          approved: approvedCount,
          completed: completedCount,
        };
        setData({ stats, pipeline, applications: formatted });
        setLoading(false);
      };

      const handleRefresh = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          socket.emit('request_applications_data');
          fetchApplicationsRest();
        }, 800);
      };

      socket.on('response_applications_data', handleSocketData);
      socket.on('applications_updated', handleRefresh);
      socket.on('new_application_submitted', handleRefresh);
      socket.on('application_status_changed', handleRefresh);

      return () => {
        clearInterval(pollInterval);
        clearTimeout(safetyTimer);
        if (debounceTimer) clearTimeout(debounceTimer);
        socket.off('response_applications_data', handleSocketData);
        socket.off('applications_updated', handleRefresh);
        socket.off('new_application_submitted', handleRefresh);
        socket.off('application_status_changed', handleRefresh);
      };
    } else {
      return () => {
        clearInterval(pollInterval);
        clearTimeout(safetyTimer);
      };
    }
  }, [socket, connected]);

  // Handle single action approve
  const handleQuickApprove = async (app: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetId = app.rawId || app.id;
    const refNum = app.refNumber || app.id;
    setActionInProgressId(targetId);
    setActiveMenuAppId(null);

    // Optimistic local update
    setData((prev: any) => {
      if (!prev || !prev.applications) return prev;
      const updated = prev.applications.map((a: any) => {
        if (a.rawId === targetId || a.id === targetId || a.refNumber === refNum) {
          return { ...a, status: 'Approved', rawStatus: 'APPROVED' };
        }
        return a;
      });
      return { ...prev, applications: updated };
    });

    window.dispatchEvent(new CustomEvent('cybersave_toast', {
      detail: { message: `Application #${refNum} approved successfully! ✓` }
    }));

    if (socket) {
      socket.emit('update_application_status', {
        id: targetId,
        refNumber: refNum,
        status: 'APPROVED',
      });
    }

    try {
      await apiFetch(`/api/v1/applications/${targetId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' })
      });
    } catch (err) {
      console.warn('Approve REST error:', err);
    } finally {
      setActionInProgressId(null);
    }
  };

  // Handle single action reject
  const handleConfirmReject = async () => {
    if (!rejectingApp) return;
    const app = rejectingApp;
    const targetId = app.rawId || app.id;
    const refNum = app.refNumber || app.id;
    const reason = rejectionReasonText.trim() || 'Documents could not be verified by the administrative officer.';
    setActionInProgressId(targetId);
    setShowRejectModal(false);
    setActiveMenuAppId(null);

    setData((prev: any) => {
      if (!prev || !prev.applications) return prev;
      const updated = prev.applications.map((a: any) => {
        if (a.rawId === targetId || a.id === targetId || a.refNumber === refNum) {
          return { ...a, status: 'Rejected', rawStatus: 'REJECTED', rejectionReason: reason };
        }
        return a;
      });
      return { ...prev, applications: updated };
    });

    window.dispatchEvent(new CustomEvent('cybersave_toast', {
      detail: { message: `Application #${refNum} marked as Rejected. ✕` }
    }));

    if (socket) {
      socket.emit('update_application_status', {
        id: targetId,
        refNumber: refNum,
        status: 'REJECTED',
        rejectionReason: reason,
      });
    }

    try {
      await apiFetch(`/api/v1/applications/${targetId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', rejectionReason: reason })
      });
    } catch (err) {
      console.warn('Reject REST error:', err);
    } finally {
      setActionInProgressId(null);
      setRejectingApp(null);
    }
  };

  // Handle direct Refund Approval from Application Queue
  const handleApproveRefundFromQueue = async (app: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetId = app.refundId || app.rawId || app.id;
    const refNum = app.refNumber || app.id;
    const refundAmt = Number(app.refundAmount || app.amount || 50);

    if (!window.confirm(`Approve refund for Application #${refNum} and credit ₹${refundAmt.toFixed(2)} to citizen wallet?`)) {
      return;
    }

    setActionInProgressId(app.rawId || app.id);
    setActiveMenuAppId(null);

    // Optimistically update applications state
    setData((prev: any) => {
      if (!prev || !prev.applications) return prev;
      const updated = prev.applications.map((a: any) => {
        if (a.rawId === app.rawId || a.id === app.id || a.refNumber === refNum) {
          return {
            ...a,
            hasRefundRequest: true,
            isRefundPending: false,
            isRefundApproved: true,
            refundStatus: 'APPROVED',
            status: 'Refund Approved',
            rawStatus: 'REFUND_APPROVED',
            paymentStatus: 'Refunded to Wallet'
          };
        }
        return a;
      });
      return { ...prev, applications: updated };
    });

    window.dispatchEvent(new CustomEvent('cybersave_toast', {
      detail: { message: `Refund Approved! ₹${refundAmt} credited to citizen wallet. ✓`, type: 'success' }
    }));

    if (socket) {
      socket.emit('approve_refund', {
        id: targetId,
        applicationId: app.rawId || app.id,
        refNumber: refNum,
        amount: refundAmt
      });
    }

    try {
      const token = localStorage.getItem('adminToken');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await apiFetch(`/api/v1/refunds/${targetId}/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ applicationId: app.rawId || app.id, adminNotes: 'Approved from Application Queue' })
      });
    } catch (err) {
      console.warn('Queue refund approve error:', err);
    } finally {
      setActionInProgressId(null);
      fetchApplicationsRest();
    }
  };

  // Handle direct Refund Rejection from Application Queue
  const handleRejectRefundFromQueue = async (app: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetId = app.refundId || app.rawId || app.id;
    const refNum = app.refNumber || app.id;
    const reason = window.prompt(`Enter reason for declining refund on #${refNum}:`, 'Refund request declined after administrative review');
    if (reason === null) return;

    setActionInProgressId(app.rawId || app.id);
    setActiveMenuAppId(null);

    // Optimistically update
    setData((prev: any) => {
      if (!prev || !prev.applications) return prev;
      const updated = prev.applications.map((a: any) => {
        if (a.rawId === app.rawId || a.id === app.id || a.refNumber === refNum) {
          return {
            ...a,
            hasRefundRequest: true,
            isRefundPending: false,
            isRefundApproved: false,
            isRefundRejected: true,
            refundStatus: 'REJECTED'
          };
        }
        return a;
      });
      return { ...prev, applications: updated };
    });

    window.dispatchEvent(new CustomEvent('cybersave_toast', {
      detail: { message: `Refund for #${refNum} declined. ✕`, type: 'error' }
    }));

    if (socket) {
      socket.emit('reject_refund', {
        id: targetId,
        applicationId: app.rawId || app.id,
        refNumber: refNum,
        reason
      });
    }

    try {
      const token = localStorage.getItem('adminToken');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await apiFetch(`/api/v1/refunds/${targetId}/reject`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ applicationId: app.rawId || app.id, rejectionReason: reason })
      });
    } catch (err) {
      console.warn('Queue refund reject error:', err);
    } finally {
      setActionInProgressId(null);
      fetchApplicationsRest();
    }
  };

  // Handle Batch Actions: Bulk Approve
  const handleBulkApprove = async () => {
    if (selectedAppIds.length === 0) return;
    const count = selectedAppIds.length;

    setData((prev: any) => {
      if (!prev || !prev.applications) return prev;
      const updated = prev.applications.map((a: any) => {
        if (selectedAppIds.includes(a.rawId) || selectedAppIds.includes(a.id) || selectedAppIds.includes(a.refNumber)) {
          return { ...a, status: 'Approved', rawStatus: 'APPROVED' };
        }
        return a;
      });
      return { ...prev, applications: updated };
    });

    window.dispatchEvent(new CustomEvent('cybersave_toast', {
      detail: { message: `Bulk approved ${count} application(s) successfully! ✓` }
    }));

    if (socket) {
      socket.emit('bulk_approve_applications', { applicationIds: selectedAppIds });
    }

    try {
      await apiFetch('/api/v1/applications/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationIds: selectedAppIds })
      });
    } catch (e) {
      console.warn('Bulk approve error:', e);
    } finally {
      setSelectedAppIds([]);
    }
  };

  // Handle Batch Actions: Batch Assign
  const handleBatchAssign = async () => {
    if (selectedAppIds.length === 0) return;
    const count = selectedAppIds.length;
    const officer = batchTargetOfficer;
    setShowBatchAssignModal(false);

    setData((prev: any) => {
      if (!prev || !prev.applications) return prev;
      const updated = prev.applications.map((a: any) => {
        if (selectedAppIds.includes(a.rawId) || selectedAppIds.includes(a.id) || selectedAppIds.includes(a.refNumber)) {
          return { ...a, assigned: officer };
        }
        return a;
      });
      return { ...prev, applications: updated };
    });

    window.dispatchEvent(new CustomEvent('cybersave_toast', {
      detail: { message: `Assigned ${count} application(s) to ${officer}! ✓` }
    }));

    if (socket) {
      socket.emit('bulk_assign_applications', { applicationIds: selectedAppIds, operatorName: officer });
    }

    try {
      await apiFetch('/api/v1/applications/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationIds: selectedAppIds, operatorName: officer })
      });
    } catch (e) {
      console.warn('Bulk assign error:', e);
    } finally {
      setSelectedAppIds([]);
    }
  };

  // Handle Batch Actions: Escalate Selected
  const handleBulkEscalate = async () => {
    if (selectedAppIds.length === 0) return;
    const count = selectedAppIds.length;

    setData((prev: any) => {
      if (!prev || !prev.applications) return prev;
      const updated = prev.applications.map((a: any) => {
        if (selectedAppIds.includes(a.rawId) || selectedAppIds.includes(a.id) || selectedAppIds.includes(a.refNumber)) {
          return { ...a, priority: 'High' };
        }
        return a;
      });
      return { ...prev, applications: updated };
    });

    window.dispatchEvent(new CustomEvent('cybersave_toast', {
      detail: { message: `Escalated ${count} application(s) to High Priority! ⚡` }
    }));

    if (socket) {
      socket.emit('bulk_escalate_applications', { applicationIds: selectedAppIds });
    }

    try {
      await apiFetch('/api/v1/applications/bulk-escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationIds: selectedAppIds })
      });
    } catch (e) {
      console.warn('Bulk escalate error:', e);
    } finally {
      setSelectedAppIds([]);
    }
  };

  // Handle Create Application
  const handleCreate = async () => {
    if (!newAppTitle.trim()) return;
    setShowCreateModal(false);

    try {
      await apiFetch('/api/v1/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceTitle: newAppTitle,
          formData: {
            fullName: 'Applicant Citizen',
            description: newAppDesc
          },
          feePaid: 50
        })
      });
      window.dispatchEvent(new CustomEvent('cybersave_toast', {
        detail: { message: `Created new application for "${newAppTitle}"!` }
      }));
      setNewAppTitle('');
      setNewAppDesc('');
      fetchApplicationsRest();
    } catch (err) {
      console.warn('Create application error:', err);
    }
  };

  const { stats, applications = [] } = data || {};

  // Filtering Logic
  const filteredApplications = useMemo(() => {
    return (applications as any[]).filter(app => {
      // Category Filter Pills
      if (selectedCategory.includes('Refund Requests')) {
        if (!app.hasRefundRequest) return false;
      } else if (selectedCategory !== 'All Applications') {
        const cat = selectedCategory.toLowerCase().replace(' services', '');
        const matchCat = (app.serviceCategory || '').toLowerCase().includes(cat) ||
                         (app.serviceType || '').toLowerCase().includes(cat);
        if (!matchCat) return false;
      }

      // Status Dropdown Filter
      if (filterStatus !== 'All') {
        const s = filterStatus.toLowerCase();
        if (s === 'refund requested') {
          if (!app.hasRefundRequest || app.isRefundApproved) return false;
        } else if (s === 'refund approved') {
          if (!app.isRefundApproved) return false;
        } else {
          if (s === 'pending' && !['pending', 'submitting'].includes(app.status.toLowerCase())) return false;
          if (s === 'in review' && app.status.toLowerCase() !== 'in review') return false;
          if (s === 'processing' && app.status.toLowerCase() !== 'processing') return false;
          if (s === 'approved' && app.status.toLowerCase() !== 'approved') return false;
          if (s === 'completed' && app.status.toLowerCase() !== 'completed') return false;
          if (s === 'rejected' && app.status.toLowerCase() !== 'rejected') return false;
        }
      }

      // Priority Dropdown Filter
      if (filterPriority !== 'All') {
        if (app.priority.toLowerCase() !== filterPriority.toLowerCase()) return false;
      }

      // Assigned Dropdown Filter
      if (filterAssigned !== 'All') {
        if (filterAssigned === 'Unassigned' && app.assigned !== 'Unassigned' && app.assigned !== 'Auto') return false;
        if (filterAssigned !== 'Unassigned' && !app.assigned.toLowerCase().includes(filterAssigned.toLowerCase())) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = app.id?.toLowerCase().includes(q) || app.refNumber?.toLowerCase().includes(q);
        const matchCitizen = app.citizen?.toLowerCase().includes(q);
        const matchService = app.serviceType?.toLowerCase().includes(q);
        const matchPhone = app.citizenPhone?.includes(q);
        const matchAssigned = app.assigned?.toLowerCase().includes(q);
        if (!matchId && !matchCitizen && !matchService && !matchPhone && !matchAssigned) return false;
      }

      return true;
    });
  }, [applications, selectedCategory, filterStatus, filterPriority, filterAssigned, searchQuery]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredApplications.length / rowsPerPage) || 1;
  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredApplications.slice(start, start + rowsPerPage);
  }, [filteredApplications, currentPage, rowsPerPage]);

  // Selection Checkbox Helpers
  const isAllSelected = paginatedApplications.length > 0 && paginatedApplications.every(a => selectedAppIds.includes(a.rawId || a.id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedAppIds(prev => prev.filter(id => !paginatedApplications.some(a => (a.rawId || a.id) === id)));
    } else {
      const pageIds = paginatedApplications.map(a => a.rawId || a.id);
      setSelectedAppIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAppIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Export CSV Report
  const handleExportCSV = () => {
    const listToExport = filteredApplications.length > 0 ? filteredApplications : applications;
    if (!listToExport.length) {
      window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: 'No applications found to export.' } }));
      return;
    }
    const headers = ['APP ID', 'CITIZEN', 'SERVICE TYPE', 'PRIORITY', 'STATUS', 'ASSIGNED', 'SUBMITTED', 'SLA', 'AMOUNT (INR)'];
    const rows = listToExport.map((a: any) => [
      `"${(a.id || a.refNumber || '').replace(/"/g, '""')}"`,
      `"${(a.citizen || 'Citizen User').replace(/"/g, '""')}"`,
      `"${(a.serviceType || 'Government Service').replace(/"/g, '""')}"`,
      `"${a.priority || 'Medium'}"`,
      `"${a.status || 'In Review'}"`,
      `"${a.assigned || 'Vikram T.'}"`,
      `"${a.submitted || ''}"`,
      `"${a.sla || '24h'}"`,
      String(a.amount || 50),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cybersave_applications_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    window.dispatchEvent(new CustomEvent('cybersave_toast', {
      detail: { message: `Exported ${rows.length} records to CSV report!` }
    }));
  };

  const pendingRefundsCount = useMemo(() => {
    return (applications as any[]).filter(a => a.hasRefundRequest && !a.isRefundApproved).length;
  }, [applications]);

  const categoryPills = [
    'All Applications',
    pendingRefundsCount > 0 ? `⚠️ Refund Requests (${pendingRefundsCount})` : 'Refund Requests',
    'Aadhaar Services',
    'PAN Card',
    'Certificates',
    'Banking',
    'Insurance',
    'Utility',
    'Other'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: selectedAppIds.length > 0 ? '80px' : '20px' }}>
      
      {/* ─── Breadcrumb ─── */}
      <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
        Dashboard &rarr; <span style={{ color: '#2563EB', fontWeight: 600 }}>Applications</span>
      </div>

      {/* ─── Header: Applications Title & Action Buttons (Matching Image 3) ─── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            Applications
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            Process and track all citizen service applications
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleExportCSV}
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
          >
            <Download size={14} color="#64748B" />
            Export Report
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              background: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
              transition: 'all 0.15s ease'
            }}
          >
            + New Application
          </button>
        </div>
      </div>

      {/* ─── 5 Stat Cards (Matching Image 3) ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px'
      }}>
        {/* Card 1: TOTAL APPLICATIONS */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #F1F5F9',
          padding: '18px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '128px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              TOTAL APPLICATIONS
            </span>
            <Folder size={16} color="#64748B" />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginTop: '6px' }}>
              {(stats?.totalApps ?? 0).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
              All-time received
            </div>
          </div>
        </div>

        {/* Card 2: TODAY'S RECEIVED */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #F1F5F9',
          padding: '18px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '128px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              TODAY'S RECEIVED
            </span>
            <span style={{
              background: '#DCFCE7',
              color: '#16A34A',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '6px'
            }}>
              Live
            </span>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginTop: '6px' }}>
              {(stats?.todayApps ?? 0).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
              Received today
            </div>
          </div>
        </div>

        {/* Card 3: PENDING REVIEW */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #F1F5F9',
          padding: '18px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '128px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              PENDING REVIEW
            </span>
            <AlertCircle size={16} color="#D97706" />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginTop: '6px' }}>
              {(stats?.pending ?? 0).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
              Awaiting review
            </div>
          </div>
        </div>

        {/* Card 4: IN PROCESSING */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #F1F5F9',
          padding: '18px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '128px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              IN PROCESSING
            </span>
            <RotateCw size={16} color="#0891B2" />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginTop: '6px' }}>
              {(stats?.processing ?? 0).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
              Sent to department
            </div>
          </div>
        </div>

        {/* Card 5: COMPLETED TODAY */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #F1F5F9',
          padding: '18px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '128px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              COMPLETED TODAY
            </span>
            <CheckCircle2 size={16} color="#16A34A" />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginTop: '6px' }}>
              {(stats?.completed ?? 0).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '11.5px', color: '#16A34A', fontWeight: 600, marginTop: '4px' }}>
              Approved / Completed today
            </div>
          </div>
        </div>
      </div>

      {/* ─── Live Application Pipeline (5 Stages Matching Image 3) ─── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '14px',
        border: '1px solid #F1F5F9',
        padding: '22px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 18px 0' }}>
          Live Application Pipeline
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '12px',
          position: 'relative'
        }}>
          {/* Step 1: Submitted */}
          <div>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
              Submitted
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                {(data?.pipeline?.submitted ?? 0).toLocaleString()}
              </span>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Active</span>
            </div>
            <div style={{ height: '4px', background: '#94A3B8', marginTop: '10px', borderRadius: '2px' }} />
          </div>

          {/* Step 2: Under Review */}
          <div>
            <div style={{ fontSize: '12px', color: '#D97706', fontWeight: 600 }}>
              Under Review
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                {(data?.pipeline?.underReview ?? 0).toLocaleString()}
              </span>
              <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 500 }}>Needs VLE</span>
            </div>
            <div style={{ height: '4px', background: '#F59E0B', marginTop: '10px', borderRadius: '2px' }} />
          </div>

          {/* Step 3: Processing */}
          <div>
            <div style={{ fontSize: '12px', color: '#2563EB', fontWeight: 600 }}>
              Processing
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                {(data?.pipeline?.processing ?? 0).toLocaleString()}
              </span>
              <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 500 }}>At Dept</span>
            </div>
            <div style={{ height: '4px', background: '#2563EB', marginTop: '10px', borderRadius: '2px' }} />
          </div>

          {/* Step 4: Approved */}
          <div>
            <div style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
              Approved
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                {(data?.pipeline?.approved ?? 0).toLocaleString()}
              </span>
              <span style={{ fontSize: '11px', color: '#059669', fontWeight: 500 }}>Ready</span>
            </div>
            <div style={{ height: '4px', background: '#10B981', marginTop: '10px', borderRadius: '2px' }} />
          </div>

          {/* Step 5: Completed */}
          <div>
            <div style={{ fontSize: '12px', color: '#047857', fontWeight: 600 }}>
              Completed
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                {(data?.pipeline?.completed ?? 0).toLocaleString()}
              </span>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Archived</span>
            </div>
            <div style={{ height: '4px', background: '#059669', marginTop: '10px', borderRadius: '2px' }} />
          </div>
        </div>
      </div>

      {/* ─── Service Category Filter Tabs (Matching Image 3) ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        {categoryPills.map(cat => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
              style={{
                border: isActive ? 'none' : '1px solid #E2E8F0',
                background: isActive ? '#2563EB' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#475569',
                fontWeight: isActive ? 700 : 500,
                fontSize: '12.5px',
                padding: '7px 16px',
                borderRadius: '20px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: isActive ? '0 2px 4px rgba(37,99,235,0.2)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* ─── Table Card Container ─── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '14px',
        border: '1px solid #F1F5F9',
        padding: '20px 22px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        {/* Filter Controls Row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '18px'
        }}>
          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '7px 12px',
            width: '280px',
            gap: '8px'
          }}>
            <Search size={15} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search table..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '13px',
                color: '#0F172A',
                width: '100%',
                background: 'transparent'
              }}
            />
          </div>

          {/* Dropdown Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Status Dropdown */}
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '7px 12px',
                fontSize: '12.5px',
                color: '#334155',
                background: '#FFFFFF',
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All">Status: All</option>
              <option value="In Review">Status: In Review</option>
              <option value="Processing">Status: Processing</option>
              <option value="Pending">Status: Pending</option>
              <option value="Approved">Status: Approved</option>
              <option value="Completed">Status: Completed</option>
              <option value="Rejected">Status: Rejected</option>
              <option value="Refund Requested">Status: ⚠️ Refund Requested</option>
              <option value="Refund Approved">Status: ✓ Refund Approved</option>
            </select>

            {/* Priority Dropdown */}
            <select
              value={filterPriority}
              onChange={(e) => { setFilterPriority(e.target.value); setCurrentPage(1); }}
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '7px 12px',
                fontSize: '12.5px',
                color: '#334155',
                background: '#FFFFFF',
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All">Priority: All</option>
              <option value="High">Priority: High</option>
              <option value="Medium">Priority: Medium</option>
              <option value="Low">Priority: Low</option>
            </select>

            {/* Custom Date Dropdown */}
            <select
              value={filterDateRange}
              onChange={(e) => { setFilterDateRange(e.target.value); setCurrentPage(1); }}
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '7px 12px',
                fontSize: '12.5px',
                color: '#334155',
                background: '#FFFFFF',
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All">Custom Date</option>
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
            </select>

            {/* Assigned Dropdown */}
            <select
              value={filterAssigned}
              onChange={(e) => { setFilterAssigned(e.target.value); setCurrentPage(1); }}
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '7px 12px',
                fontSize: '12.5px',
                color: '#334155',
                background: '#FFFFFF',
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All">Assigned: All</option>
              <option value="Vikram">Vikram T.</option>
              <option value="Sunita">Sunita M.</option>
              <option value="Deepak">Deepak V.</option>
              <option value="Rakesh">Rakesh S.</option>
              <option value="Auto">Auto</option>
              <option value="Unassigned">Unassigned</option>
            </select>
          </div>
        </div>

        {/* Applications Table */}
        <div style={{ overflowX: 'auto', borderRadius: '8px' }}>
          <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ width: '40px', padding: '12px 14px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ width: '150px', padding: '12px 14px' }}>APP ID</th>
                <th style={{ width: '160px', padding: '12px 14px' }}>CITIZEN</th>
                <th style={{ width: '150px', padding: '12px 14px' }}>SERVICE TYPE</th>
                <th style={{ width: '110px', padding: '12px 14px' }}>PRIORITY</th>
                <th style={{ width: '120px', padding: '12px 14px' }}>STATUS</th>
                <th style={{ width: '130px', padding: '12px 14px' }}>ASSIGNED</th>
                <th style={{ width: '150px', padding: '12px 14px' }}>SUBMITTED</th>
                <th style={{ width: '90px', padding: '12px 14px' }}>SLA</th>
                <th style={{ width: '90px', padding: '12px 14px' }}>AMOUNT</th>
                <th style={{ width: '60px', padding: '12px 14px', textAlign: 'center' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '40px 16px', color: '#64748B' }}>
                    <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                    <div>Loading applications from live database...</div>
                  </td>
                </tr>
              ) : paginatedApplications.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '40px 16px', color: '#94A3B8' }}>
                    No applications matching the selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedApplications.map((app, idx) => {
                  const isChecked = selectedAppIds.includes(app.rawId || app.id);
                  const isMenuOpen = activeMenuAppId === (app.rawId || app.id);

                  // Priority Styling
                  const priColor = app.priority === 'High' ? '#EF4444' : app.priority === 'Medium' ? '#F59E0B' : '#64748B';

                  // Status Pill Styling
                  let statusBg = '#EFF6FF';
                  let statusColor = '#2563EB';

                  if (app.status === 'Completed' || app.status === 'Approved') {
                    statusBg = '#DCFCE7';
                    statusColor = '#16A34A';
                  } else if (app.status === 'Pending') {
                    statusBg = '#FEF3C7';
                    statusColor = '#D97706';
                  } else if (app.status === 'In Review') {
                    statusBg = '#FEF3C7';
                    statusColor = '#B45309';
                  } else if (app.status === 'Processing') {
                    statusBg = '#EFF6FF';
                    statusColor = '#2563EB';
                  } else if (app.status === 'Rejected') {
                    statusBg = '#FEE2E2';
                    statusColor = '#DC2626';
                  }

                  // SLA Color
                  const slaColor = app.slaType === 'green' ? '#16A34A' : app.slaType === 'orange' ? '#D97706' : app.slaType === 'red' ? '#DC2626' : '#94A3B8';

                  return (
                    <tr
                      key={app.id || idx}
                      onClick={() => navigate(`/applications/${app.rawId || app.id}`)}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        background: isChecked ? '#F0F7FF' : (idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'),
                        cursor: 'pointer',
                        transition: 'background 0.1s ease'
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '14px', textAlign: 'center' }} onClick={(e) => toggleSelectOne(app.rawId || app.id, e)}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* APP ID */}
                      <td style={{ padding: '14px', fontWeight: 700, color: '#2563EB', fontFamily: 'monospace', fontSize: '12.5px' }}>
                        {app.id}
                      </td>

                      {/* CITIZEN */}
                      <td style={{ padding: '14px', fontWeight: 600, color: '#0F172A' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                          {app.citizen}
                        </div>
                        {app.citizenPhone !== '—' && (
                          <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 400 }}>{app.citizenPhone}</div>
                        )}
                      </td>

                      {/* SERVICE TYPE */}
                      <td style={{ padding: '14px', color: '#334155', fontWeight: 500 }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                          {app.serviceType}
                        </div>
                      </td>

                      {/* PRIORITY */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: priColor, display: 'inline-block' }} />
                          {app.priority}
                        </div>
                      </td>

                      {/* STATUS */}
                      <td style={{ padding: '14px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: statusBg,
                          color: statusColor,
                          whiteSpace: 'nowrap'
                        }}>
                          {app.status}
                        </span>

                        {/* Prominent Refund Status Badges */}
                        {app.isRefundPending && (
                          <div style={{
                            marginTop: '5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#FEF2F2',
                            color: '#B91C1C',
                            border: '1px solid #FECACA',
                            borderRadius: '5px',
                            padding: '2px 7px',
                            fontSize: '10.5px',
                            fontWeight: 800,
                            whiteSpace: 'nowrap'
                          }}>
                            ⚠️ Refund Requested: ₹{Number(app.refundAmount || 0).toLocaleString('en-IN')}
                          </div>
                        )}
                        {app.isRefundApproved && (
                          <div style={{
                            marginTop: '5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#ECFDF5',
                            color: '#047857',
                            border: '1px solid #A7F3D0',
                            borderRadius: '5px',
                            padding: '2px 7px',
                            fontSize: '10.5px',
                            fontWeight: 800,
                            whiteSpace: 'nowrap'
                          }}>
                            ✓ Refund Approved (₹{Number(app.refundAmount || 0).toLocaleString('en-IN')})
                          </div>
                        )}
                        {app.isRefundRejected && (
                          <div style={{
                            marginTop: '5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#F8FAFC',
                            color: '#64748B',
                            border: '1px solid #E2E8F0',
                            borderRadius: '5px',
                            padding: '2px 7px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap'
                          }}>
                            ✕ Refund Declined
                          </div>
                        )}
                      </td>

                      {/* ASSIGNED */}
                      <td style={{ padding: '14px', color: '#475569', fontSize: '12.5px', fontWeight: 500 }}>
                        {app.assigned}
                      </td>

                      {/* SUBMITTED */}
                      <td style={{ padding: '14px', color: '#64748B', fontSize: '12px' }}>
                        {app.submitted}
                      </td>

                      {/* SLA */}
                      <td style={{ padding: '14px', fontWeight: 700, color: slaColor, fontSize: '12px' }}>
                        {app.sla}
                      </td>

                      {/* AMOUNT */}
                      <td style={{ padding: '14px', fontWeight: 700, color: '#0F172A' }}>
                        ₹{Number(app.amount || 0).toLocaleString('en-IN')}
                      </td>

                      {/* ACTION (...) */}
                      <td style={{ padding: '14px', textAlign: 'center', position: 'relative' }}>
                        {app.hasRefundRequest && !app.isRefundApproved ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={(e) => handleApproveRefundFromQueue(app, e)}
                              disabled={actionInProgressId === (app.rawId || app.id)}
                              title="Approve refund and immediately credit citizen wallet"
                              style={{
                                background: '#059669',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '5px 10px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 1px 3px rgba(5,150,105,0.3)'
                              }}
                            >
                              <Check size={13} /> Approve Refund
                            </button>

                            <button
                              onClick={(e) => handleRejectRefundFromQueue(app, e)}
                              disabled={actionInProgressId === (app.rawId || app.id)}
                              title="Decline this refund request"
                              style={{
                                background: '#FFFFFF',
                                color: '#DC2626',
                                border: '1px solid #FCA5A5',
                                borderRadius: '6px',
                                padding: '5px 8px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <X size={12} /> Reject
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuAppId(isMenuOpen ? null : (app.rawId || app.id));
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#64748B',
                                padding: '4px'
                              }}
                            >
                              <MoreHorizontal size={17} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuAppId(isMenuOpen ? null : (app.rawId || app.id));
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#64748B',
                              padding: '4px'
                            }}
                          >
                            <MoreHorizontal size={18} />
                          </button>
                        )}

                        {/* Floating Action Menu Popover */}
                        {isMenuOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '40px',
                              background: '#FFFFFF',
                              borderRadius: '8px',
                              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                              border: '1px solid #E2E8F0',
                              zIndex: 100,
                              minWidth: '170px',
                              display: 'flex',
                              flexDirection: 'column',
                              padding: '4px 0',
                              textAlign: 'left'
                            }}
                          >
                            <button
                              onClick={() => { setActiveMenuAppId(null); navigate(`/applications/${app.rawId || app.id}`); }}
                              style={{
                                padding: '8px 14px',
                                border: 'none',
                                background: 'none',
                                fontSize: '12.5px',
                                color: '#0F172A',
                                fontWeight: 500,
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              <Eye size={13} color="#2563EB" /> View Details
                            </button>

                            {app.hasRefundRequest && !app.isRefundApproved && (
                              <>
                                <button
                                  onClick={(e) => handleApproveRefundFromQueue(app, e)}
                                  style={{
                                    padding: '8px 14px',
                                    border: 'none',
                                    background: '#F0FDF4',
                                    fontSize: '12.5px',
                                    color: '#059669',
                                    fontWeight: 700,
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}
                                >
                                  <Check size={13} color="#059669" /> Approve Refund (₹{app.refundAmount})
                                </button>
                                <button
                                  onClick={(e) => handleRejectRefundFromQueue(app, e)}
                                  style={{
                                    padding: '8px 14px',
                                    border: 'none',
                                    background: 'none',
                                    fontSize: '12.5px',
                                    color: '#DC2626',
                                    fontWeight: 600,
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}
                                >
                                  <X size={13} color="#DC2626" /> Decline Refund
                                </button>
                              </>
                            )}

                            {app.status !== 'Approved' && (
                              <button
                                onClick={(e) => handleQuickApprove(app, e)}
                                style={{
                                  padding: '8px 14px',
                                  border: 'none',
                                  background: 'none',
                                  fontSize: '12.5px',
                                  color: '#059669',
                                  fontWeight: 600,
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}
                              >
                                <Check size={13} color="#059669" /> Approve Application
                              </button>
                            )}

                            {app.status !== 'Rejected' && (
                              <button
                                onClick={() => {
                                  setActiveMenuAppId(null);
                                  setRejectingApp(app);
                                  setShowRejectModal(true);
                                }}
                                style={{
                                  padding: '8px 14px',
                                  border: 'none',
                                  background: 'none',
                                  fontSize: '12.5px',
                                  color: '#DC2626',
                                  fontWeight: 600,
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}
                              >
                                <X size={13} color="#DC2626" /> Reject Application
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination Footer ─── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '18px',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '12.5px',
          color: '#64748B'
        }}>
          <div>
            Showing {filteredApplications.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} - {Math.min(currentPage * rowsPerPage, filteredApplications.length)} of {filteredApplications.length > 0 ? filteredApplications.length : (stats?.todayApps || 1247)} today's applications
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Page Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: currentPage === 1 ? '#CBD5E1' : '#334155',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                &lt;
              </button>

              {Array.from({ length: Math.min(3, totalPages) }).map((_, idx) => (
                <button
                  key={idx + 1}
                  onClick={() => setCurrentPage(idx + 1)}
                  style={{
                    background: currentPage === idx + 1 ? '#2563EB' : '#FFFFFF',
                    border: '1px solid',
                    borderColor: currentPage === idx + 1 ? '#2563EB' : '#E2E8F0',
                    borderRadius: '6px',
                    padding: '5px 10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: currentPage === idx + 1 ? '#FFFFFF' : '#334155',
                    cursor: 'pointer'
                  }}
                >
                  {idx + 1}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: currentPage === totalPages ? '#CBD5E1' : '#334155',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                &gt;
              </button>
            </div>

            {/* Rows Per Page Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  color: '#334155',
                  background: '#FFFFFF',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value={8}>8</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Sticky Bottom Batch Action Bar (Matching Image 3) ─── */}
      {selectedAppIds.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#0F172A',
          color: '#FFFFFF',
          borderRadius: '12px',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
          zIndex: 1000,
          minWidth: '520px',
          maxWidth: '90vw'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '4px',
              border: '2px solid #38BDF8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#0284C7'
            }}>
              <Check size={12} color="#FFFFFF" strokeWidth={3} />
            </div>
            <span style={{ fontSize: '13.5px', fontWeight: 600 }}>
              {selectedAppIds.length} application{selectedAppIds.length > 1 ? 's' : ''} selected
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setShowBatchAssignModal(true)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <Users size={14} /> Batch Assign
            </button>

            <button
              onClick={handleBulkEscalate}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#FCA5A5',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <TrendingUp size={14} /> Escalate Selected
            </button>

            <button
              onClick={handleBulkApprove}
              style={{
                background: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 18px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(37,99,235,0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <Check size={14} /> Bulk Approve
            </button>
          </div>
        </div>
      )}

      {/* ─── Batch Assign Modal ─── */}
      {showBatchAssignModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Batch Assign Applications
              </h3>
              <button
                onClick={() => setShowBatchAssignModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '18px' }}>
              Assign {selectedAppIds.length} selected application(s) to a designated verification officer:
            </p>

            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Select Verification Officer
            </label>
            <select
              value={batchTargetOfficer}
              onChange={(e) => setBatchTargetOfficer(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
                marginBottom: '20px'
              }}
            >
              <option value="Vikram Tiwari (VLE-0234)">Vikram Tiwari (VLE-0234)</option>
              <option value="Sunita Mishra (SDM-Office)">Sunita Mishra (SDM-Office)</option>
              <option value="Deepak Verma (CSC-1024)">Deepak Verma (CSC-1024)</option>
              <option value="Rakesh Singh (Kendra-4892)">Rakesh Singh (Kendra-4892)</option>
              <option value="Principal Verification Officer (SDM)">Principal Verification Officer (SDM)</option>
            </select>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowBatchAssignModal(false)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleBatchAssign}
                style={{
                  background: '#2563EB',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 18px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  cursor: 'pointer'
                }}
              >
                Confirm Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Workflow Creation Modal ─── */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '14px',
            width: '420px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '14px' }}>
              Create New Application Workflow
            </h3>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Application Service Title
              </label>
              <input 
                type="text" 
                value={newAppTitle} 
                onChange={e => setNewAppTitle(e.target.value)} 
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px' }} 
                placeholder="e.g. PM Kisan Yojna" 
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Description
              </label>
              <textarea 
                value={newAppDesc} 
                onChange={e => setNewAppDesc(e.target.value)} 
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', height: '80px' }} 
                placeholder="Describe application steps and verification criteria..."
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowCreateModal(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '12.5px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate}
                style={{ background: '#2563EB', border: 'none', borderRadius: '6px', padding: '8px 18px', fontSize: '12.5px', fontWeight: 700, color: '#FFFFFF', cursor: 'pointer' }}
              >
                Create Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Quick Rejection Reason Modal ─── */}
      {showRejectModal && rejectingApp && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '14px',
            width: '460px',
            maxWidth: '90%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
                <X size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Reject Application
                </h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  #{rejectingApp.refNumber || rejectingApp.id} ({rejectingApp.citizen})
                </span>
              </div>
            </div>

            <p style={{ fontSize: '12.5px', color: '#475569', marginBottom: '14px' }}>
              Specify the official administrative reason for rejecting this service request:
            </p>

            <textarea
              value={rejectionReasonText}
              onChange={(e) => setRejectionReasonText(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
                marginBottom: '18px'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => { setShowRejectModal(false); setRejectingApp(null); }}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '12.5px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                style={{ background: '#DC2626', border: 'none', borderRadius: '6px', padding: '8px 18px', fontSize: '12.5px', fontWeight: 700, color: '#FFFFFF', cursor: 'pointer' }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
