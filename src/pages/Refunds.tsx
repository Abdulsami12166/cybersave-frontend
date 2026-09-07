import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Layout';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  ExternalLink,
  Eye,
  Wallet,
  ShieldCheck,
  FileText,
  User,
  ArrowUpRight,
  Filter,
  Check,
  X
} from 'lucide-react';

export default function Refunds() {
  const { socket } = useSocket();
  const { admin } = useAuth();
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Rejection modal state
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/v1/refunds');
      if (Array.isArray(res.data)) {
        setRefunds(res.data);
      } else {
        setRefunds([]);
      }
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
      showToast(`New Refund Request #${newRefund.refNumber} submitted for ${newRefund.serviceTitle}!`, 'success');
      setRefunds((prev) => {
        const exists = prev.some((r) => r.id === newRefund.id || r.refNumber === newRefund.refNumber);
        if (exists) {
          return prev.map((r) => (r.id === newRefund.id ? newRefund : r));
        }
        return [newRefund, ...prev];
      });
    };

    const handleRefundsUpdated = (updatedRefund: any) => {
      setRefunds((prev) => {
        if (!updatedRefund?.id) {
          fetchRefunds();
          return prev;
        }
        return prev.map((r) => (r.id === updatedRefund.id ? { ...r, ...updatedRefund } : r));
      });
    };

    socket.on('new_refund_requested', handleNewRefund);
    socket.on('refunds_updated', handleRefundsUpdated);

    return () => {
      socket.off('new_refund_requested', handleNewRefund);
      socket.off('refunds_updated', handleRefundsUpdated);
    };
  }, [socket]);

  const handleApprove = async (id: string, refNumber: string, amount: number) => {
    if (!window.confirm(`Are you sure you want to approve refund #${refNumber} and re-credit ₹${amount.toFixed(2)} to the citizen's wallet?`)) {
      return;
    }

    try {
      setActionLoading(id);
      const adminName = admin?.fullName || admin?.email || 'Admin Authority';
      const res = await axios.post(`/api/v1/refunds/${id}/approve`, { adminName });

      if (res.data?.success) {
        showToast(`Refund #${refNumber} approved! ₹${amount.toFixed(2)} credited to citizen wallet.`, 'success');
        setRefunds((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, status: 'APPROVED', processedBy: adminName, processedAt: new Date() } : r
          )
        );
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to approve refund', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectTargetId) return;

    try {
      setActionLoading(rejectTargetId);
      const adminName = admin?.fullName || admin?.email || 'Admin Authority';
      const res = await axios.post(`/api/v1/refunds/${rejectTargetId}/reject`, {
        rejectionReason: rejectionReason || 'Refund request declined by administration.',
        adminName,
      });

      if (res.data?.success) {
        showToast('Refund request rejected.', 'success');
        setRefunds((prev) =>
          prev.map((r) =>
            r.id === rejectTargetId ? { ...r, status: 'REJECTED', adminNotes: rejectionReason } : r
          )
        );
        setRejectTargetId(null);
        setRejectionReason('');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to reject refund', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // KPIs
  const totalCount = refunds.length;
  const pendingCount = refunds.filter((r) => r.status === 'PENDING').length;
  const approvedCount = refunds.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = refunds.filter((r) => r.status === 'REJECTED').length;
  const totalRefundedAmount = refunds
    .filter((r) => r.status === 'APPROVED')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  // Filtered List
  const filteredRefunds = refunds.filter((r) => {
    const matchesFilter = filter === 'ALL' || r.status === filter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      r.refNumber?.toLowerCase().includes(q) ||
      r.serviceTitle?.toLowerCase().includes(q) ||
      r.application?.refNumber?.toLowerCase().includes(q) ||
      r.user?.profile?.fullName?.toLowerCase().includes(q) ||
      r.user?.email?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/10 text-blue-600 rounded-xl">
              <RotateCcw size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Refund Dispatches & Wallet Re-Credit</h1>
              <p className="text-sm text-slate-500">
                Manage citizen service refund claims, review attached Cloudinary proofs, and approve automatic wallet credits.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchRefunds}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RotateCcw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Claims</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <FileText size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending Action</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{pendingCount}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Wallet Re-Credited</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">₹{totalRefundedAmount.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Wallet size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Rejected Claims</p>
            <p className="text-2xl font-bold text-rose-700 mt-1">{rejectedCount}</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <XCircle size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full md:w-auto">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'ALL' ? 'All Claims' : tab.charAt(0) + tab.slice(1).toLowerCase()}
              {tab === 'PENDING' && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-amber-500 text-white rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, citizen, service..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Refunds Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RotateCcw className="animate-spin inline-block mb-3" size={28} />
            <p className="text-sm">Loading refund requests...</p>
          </div>
        ) : filteredRefunds.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <RotateCcw size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-base font-semibold text-slate-700">No refund requests found</p>
            <p className="text-xs text-slate-400 mt-1">
              {filter !== 'ALL'
                ? `There are no ${filter.toLowerCase()} refund requests matching your criteria.`
                : 'When citizens submit refund requests in CyberSave Mobile, they appear here in real time.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Claim Reference</th>
                  <th className="py-3.5 px-4">Application & Service</th>
                  <th className="py-3.5 px-4">Citizen Details</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Reason & Cloudinary Proof</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRefunds.map((r) => {
                  const citizenName = r.user?.profile?.fullName || r.user?.email?.split('@')[0] || 'Citizen';
                  const citizenEmail = r.user?.email || 'N/A';
                  const citizenPhone = r.user?.phone || r.user?.profile?.phone || 'N/A';
                  const appRef = r.application?.refNumber || 'N/A';
                  const isPending = r.status === 'PENDING';
                  const isApproved = r.status === 'APPROVED';
                  const isRejected = r.status === 'REJECTED';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Claim Ref */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900">{r.refNumber}</span>
                        <div className="text-[10.5px] text-slate-400 mt-0.5">
                          {new Date(r.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>

                      {/* Application & Service */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{r.serviceTitle}</div>
                        <Link
                          to={`/applications/${r.applicationId}`}
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-mono mt-0.5"
                        >
                          App: #{appRef}
                          <ExternalLink size={11} />
                        </Link>
                      </td>

                      {/* Citizen Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{citizenName}</div>
                        <div className="text-[11px] text-slate-400">{citizenPhone}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{citizenEmail}</div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4">
                        <span className="text-sm font-black text-emerald-700">₹{Number(r.amount).toFixed(2)}</span>
                        <div className="text-[10px] text-slate-400">Direct Wallet Credit</div>
                      </td>

                      {/* Reason & Cloudinary Proof */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-medium text-slate-800 truncate" title={r.reason}>
                          {r.reason}
                        </p>
                        {r.details && (
                          <p className="text-[10.5px] text-slate-400 line-clamp-2 mt-0.5" title={r.details}>
                            {r.details}
                          </p>
                        )}

                        {/* Cloudinary Proof File */}
                        {r.proofUrl ? (
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => setPreviewImage(r.proofUrl)}
                              className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                            >
                              <Eye size={12} />
                              View Cloudinary Proof
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10.5px] text-slate-400 italic mt-1 block">No file attached</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock size={11} />
                            Pending Review
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={11} />
                            Credited to Wallet
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle size={11} />
                            Declined
                          </span>
                        )}

                        {r.processedBy && (
                          <div className="text-[10px] text-slate-400 mt-1">
                            By {r.processedBy}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(r.id, r.refNumber, r.amount)}
                              disabled={actionLoading === r.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            >
                              <Check size={13} />
                              Approve & Credit
                            </button>
                            <button
                              onClick={() => setRejectTargetId(r.id)}
                              disabled={actionLoading === r.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                            >
                              <X size={13} />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">Completed</span>
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

      {/* Full Cloudinary Image Proof Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <ShieldCheck size={18} className="text-emerald-600" />
                Cloudinary Document Proof Preview
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 bg-slate-900 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={previewImage}
                alt="Cloudinary proof"
                className="max-h-[65vh] w-auto rounded-lg object-contain shadow-md"
              />
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
              <a
                href={previewImage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold"
              >
                Open in new tab <ArrowUpRight size={13} />
              </a>
              <button
                onClick={() => setPreviewImage(null)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Dialog Modal */}
      {rejectTargetId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertCircle size={22} />
              <h3 className="text-base font-bold text-slate-900">Decline Refund Claim</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Please provide the official reason for rejecting this refund. The citizen will receive a real-time notification on their device.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Application already processed by authority / Service SLA met."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
            />
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                onClick={() => {
                  setRejectTargetId(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={actionLoading === rejectTargetId}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-sm"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
