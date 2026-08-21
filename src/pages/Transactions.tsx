import React, { useEffect, useState, useMemo } from 'react';
import { useSocket } from '../context/SocketContext';
import { ArrowLeftRight, CreditCard, DollarSign, Search, Download, CheckCircle, ShieldCheck } from 'lucide-react';
import { StatCard } from '../components/Dashboard';

import { formatIndianDate, normalizeAppId, normalizeCitizenName } from '../utils/normalize';

export default function Transactions() {
  const { socket, connected } = useSocket();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState('ALL');

  useEffect(() => {
    if (socket && connected) {
      socket.emit('request_transactions_data');
      
      const handleData = (resData: any) => {
        setData(resData);
        setLoading(false);
      };

      const handleRefresh = () => {
        socket.emit('request_transactions_data');
      };

      socket.on('response_transactions_data', handleData);
      socket.on('transactions_updated', handleRefresh);
      socket.on('new_application_submitted', handleRefresh);
      socket.on('applications_updated', handleRefresh);

      return () => {
        socket.off('response_transactions_data', handleData);
        socket.off('transactions_updated', handleRefresh);
        socket.off('new_application_submitted', handleRefresh);
        socket.off('applications_updated', handleRefresh);
      };
    }
  }, [socket, connected]);

  const { transactions, stats } = data || {};

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.map((txn: any) => {
      const dateObj = formatIndianDate(txn.date || txn.createdAt || txn.submittedAt);
      const cleanId = normalizeAppId(txn.id, txn.id);
      const cleanCustomer = txn.customer || txn.citizen || txn.fullName || 'Citizen Applicant';
      const cleanService = txn.service || txn.serviceTitle || 'Government Service';
      const cleanAmount = typeof txn.amount === 'number' && !isNaN(txn.amount) ? txn.amount : 50.0;

      return {
        ...txn,
        id: cleanId,
        refNumber: txn.refNumber || cleanId,
        dateFormatted: dateObj.formatted,
        customer: cleanCustomer,
        service: cleanService,
        amount: cleanAmount,
      };
    }).filter((txn: any) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (txn.id && txn.id.toLowerCase().includes(q)) ||
        (txn.refNumber && txn.refNumber.toLowerCase().includes(q)) ||
        (txn.customer && txn.customer.toLowerCase().includes(q)) ||
        (txn.service && txn.service.toLowerCase().includes(q)) ||
        (txn.paymentMethod && txn.paymentMethod.toLowerCase().includes(q));

      const matchesFilter =
        filterMethod === 'ALL' ||
        (filterMethod === 'RAZORPAY' && txn.paymentMethod?.toLowerCase().includes('razorpay')) ||
        (filterMethod === 'PORTAL' && !txn.paymentMethod?.toLowerCase().includes('razorpay'));

      return matchesSearch && matchesFilter;
    });
  }, [transactions, searchQuery, filterMethod]);

  const handleExportCSV = () => {
    if (!filteredTransactions || filteredTransactions.length === 0) return;
    const headers = ['Transaction ID', 'Reference Number', 'Date & Time (IST)', 'Customer', 'Service', 'Payment Method', 'Amount (INR)', 'Status'];
    const rows = filteredTransactions.map((t: any) => [
      `"${t.id || ''}"`,
      `"${t.refNumber || ''}"`,
      `"${t.dateFormatted}"`,
      `"${t.customer || ''}"`,
      `"${t.service || ''}"`,
      `"${t.paymentMethod || 'Govt Portal'}"`,
      t.amount || 50,
      `"${t.status || 'SUCCESS'}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cybersave_transactions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Loading Real-time Transactions...</div>
        <p style={{ fontSize: 13 }}>Syncing with Razorpay gateway and live applications ledger...</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: 8 }}>
        Dashboard &rarr; <span style={{ color: '#2563eb' }}>Transactions</span>
      </div>
      <div className="dashboard-title-row" style={{ marginBottom: 24 }}>
        <div className="dashboard-title">
          <h1>Financial Transactions</h1>
          <p>Monitor real-time service payments, Razorpay test settlements and application fees</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="date-picker-btn" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={15} /> Export CSV ({filteredTransactions.length})
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard 
          icon={<DollarSign color="#10b981" />} iconBg="#d1fae5"
          title="Total Processed" value={`₹${(stats?.totalAmount || 0).toLocaleString()}`} 
          trend="Platform lifetime" trendType="neutral" 
        />
        <StatCard 
          icon={<ArrowLeftRight color="#2563eb" />} iconBg="#eff6ff"
          title="Total Transactions" value={(stats?.totalCount || 0).toLocaleString()} 
          trend="Real-time synced" trendType="neutral" 
        />
        <StatCard 
          icon={<CreditCard color="#f59e0b" />} iconBg="#fef3c7"
          title="Avg. Fee" value={`₹${stats?.totalCount ? Math.round(stats.totalAmount / stats.totalCount) : 55}`} 
          trend="Per application" trendType="neutral" 
        />
      </div>

      <div className="table-card" style={{ marginTop: 24, padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              className="date-picker-btn" 
              style={{
                borderColor: filterMethod === 'ALL' ? 'var(--primary-blue)' : '#e5e7eb',
                color: filterMethod === 'ALL' ? 'var(--primary-blue)' : '#4b5563',
                background: filterMethod === 'ALL' ? '#eff6ff' : 'transparent',
                fontWeight: 600
              }}
              onClick={() => setFilterMethod('ALL')}
            >
              All Transactions ({transactions?.length || 0})
            </button>
            <button 
              className="date-picker-btn" 
              style={{
                borderColor: filterMethod === 'RAZORPAY' ? '#0877FF' : '#e5e7eb',
                color: filterMethod === 'RAZORPAY' ? '#0877FF' : '#4b5563',
                background: filterMethod === 'RAZORPAY' ? '#EDF4FF' : 'transparent',
                fontWeight: 600
              }}
              onClick={() => setFilterMethod('RAZORPAY')}
            >
              Razorpay UPI (Test)
            </button>
            <button 
              className="date-picker-btn" 
              style={{
                borderColor: filterMethod === 'PORTAL' ? '#10b981' : '#e5e7eb',
                color: filterMethod === 'PORTAL' ? '#10b981' : '#4b5563',
                background: filterMethod === 'PORTAL' ? '#ecfdf5' : 'transparent',
                fontWeight: 600
              }}
              onClick={() => setFilterMethod('PORTAL')}
            >
              Portal Payments
            </button>
          </div>

          {/* Search Box */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px', minWidth: 260 }}>
            <Search size={16} color="#9ca3af" style={{ marginRight: 8 }} />
            <input 
              type="text"
              placeholder="Search TXN ID, customer, service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: '100%', color: '#111827' }}
            />
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>TXN ID</th>
              <th>DATE & TIME</th>
              <th>CUSTOMER</th>
              <th>SERVICE</th>
              <th>PAYMENT METHOD</th>
              <th>AMOUNT</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#6b7280' }}>
                  No transactions match your search or filter criteria.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((txn: any, i: number) => (
                <tr key={txn.id || i}>
                  <td style={{ fontWeight: 600, color: '#2563eb' }}>
                    <div>{txn.id}</div>
                    {txn.refNumber && txn.refNumber !== txn.id ? (
                      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>Ref: {txn.refNumber}</div>
                    ) : null}
                  </td>
                  <td style={{ color: '#6b7280', fontSize: 12.5 }}>{txn.dateFormatted}</td>
                  <td style={{ fontWeight: 600, color: '#111827' }}>{txn.customer}</td>
                  <td style={{ color: '#4b5563', fontSize: 13 }}>{txn.service}</td>
                  <td>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: txn.paymentMethod?.toLowerCase().includes('razorpay') ? '#0877FF' : '#059669',
                      background: txn.paymentMethod?.toLowerCase().includes('razorpay') ? '#EDF4FF' : '#ECFDF5',
                      padding: '3px 8px',
                      borderRadius: 6,
                    }}>
                      <ShieldCheck size={13} />
                      {txn.paymentMethod || 'Portal Payment'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: '#111827' }}>₹{txn.amount}</td>
                  <td>
                    <span className="badge completed" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={12} />
                      {txn.status || 'SUCCESS'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            Showing {filteredTransactions.length} of {transactions?.length || 0} transactions
          </div>
          <div style={{ fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            Real-time WebSocket Live
          </div>
        </div>
      </div>
    </>
  );
}
