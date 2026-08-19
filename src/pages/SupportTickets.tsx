import React, { useEffect, useState } from 'react';
import { HelpCircle, Clock, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { StatCard } from '../components/Dashboard';

export default function SupportTickets() {
  const { socket, connected } = useSocket();
  const [data, setData] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState('Technical Support');
  const [newPri, setNewPri] = useState('Medium');
  const [newDesc, setNewDesc] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [priorityFilter, setPriorityFilter] = useState('All Priority');
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    if (socket && connected) {
      socket.emit('request_support_tickets');
      socket.on('response_support_tickets', (resData) => setData(resData));
      socket.on('new_support_ticket', () => {
        socket.emit('request_support_tickets');
      });
      socket.on('create_support_ticket_success', () => {
        window.dispatchEvent(new CustomEvent('cybersave_toast', { detail: { message: 'Ticket created successfully!' } }));
        setShowCreateModal(false);
        setNewTitle('');
        setNewDesc('');
        socket.emit('request_support_tickets');
      });
    }
    return () => {
      if (socket) {
        socket.off('response_support_tickets');
        socket.off('new_support_ticket');
        socket.off('create_support_ticket_success');
      }
    };
  }, [socket, connected]);

  const handleCreateTicket = () => {
    if (socket && newTitle && newDesc) {
      socket.emit('create_support_ticket', { title: newTitle, category: newCat, priority: newPri, description: newDesc });
    }
  };

  if (!data) return <div style={{ padding: 24, color: '#6b7280' }}>Connecting to live support tickets...</div>;

  const { stats, tickets } = data;

  const filteredTickets = (tickets || []).filter((t: any) => {
    if (categoryFilter !== 'All Categories' && t.category !== categoryFilter) return false;
    if (statusFilter !== 'All Status' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'All Priority' && t.priority !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = t.id?.toLowerCase().includes(q);
      const matchTitle = t.title?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchReporter = t.reporter?.name?.toLowerCase().includes(q);
      if (!matchId && !matchTitle && !matchDesc && !matchReporter) return false;
    }
    return true;
  });

  return (
    <>
      <div style={{fontSize: '13px', color: '#6b7280', marginBottom: 8}}>Dashboard &rarr; <span style={{color: '#2563eb'}}>Support Tickets</span></div>
      <div className="dashboard-title-row" style={{marginBottom: 24}}>
        <div className="dashboard-title">
          <h1>Support Ticket Management</h1>
          <p>Track, manage, and resolve all customer support tickets efficiently.</p>
        </div>
        <div style={{display: 'flex'}}>
          <button className="action-btn" onClick={() => setShowCreateModal(true)}>Create New Ticket</button>
        </div>
      </div>

      <div className="stats-grid" style={{gridTemplateColumns: 'repeat(4, 1fr)'}}>
        <StatCard 
          icon={<HelpCircle color="#2563eb" />} iconBg="#eff6ff"
          title="TOTAL TICKETS" value={(stats?.totalTickets || 0).toLocaleString()} 
          trend="Active & resolved" trendType="neutral" 
        />
        <StatCard 
          icon={<Clock color="#ef4444" />} iconBg="#fee2e2"
          title="OPEN TICKETS" value={(stats?.openTickets || 0).toLocaleString()} 
          trend="Awaiting response" trendType="neutral" 
        />
        <StatCard 
          icon={<Clock color="#f59e0b" />} iconBg="#fef3c7"
          title="IN PROGRESS" value={(stats?.inProgress || 0).toLocaleString()} 
          trend="Being handled" trendType="neutral" 
        />
        <StatCard 
          icon={<CheckCircle color="#10b981" />} iconBg="#d1fae5"
          title="RESOLVED" value={(stats?.resolved || 0).toLocaleString()} 
          trend="Successfully closed" trendType="neutral" 
        />
      </div>

      <div className="table-card" style={{marginTop: 24, padding: 0, background: 'transparent', boxShadow: 'none'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24, padding: '12px 16px', background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', alignItems: 'center', flexWrap: 'wrap', gap: 12}}>
          <div style={{display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap'}}>
            <div className="search-bar" style={{width: 250, padding: '4px 8px', background: '#f9fafb'}}>
              <input 
                type="text" 
                placeholder="Filter tickets..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{background: 'transparent', border: 'none', outline: 'none', width: '100%'}}
              />
            </div>
            <div style={{fontSize: 13, fontWeight: 500}}>
              Category: 
              <select 
                value={categoryFilter} 
                onChange={e => setCategoryFilter(e.target.value)}
                style={{border: 'none', fontWeight: 600, outline: 'none', background: 'transparent', marginLeft: 4, cursor: 'pointer'}}
              >
                <option>All Categories</option>
                <option>Technical Support</option>
                <option>Document Rejection</option>
                <option>Payment Issue</option>
                <option>Application Delay</option>
                <option>General Inquiry</option>
              </select>
            </div>
            <div style={{fontSize: 13, fontWeight: 500}}>
              Status: 
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
                style={{border: 'none', fontWeight: 600, outline: 'none', background: 'transparent', marginLeft: 4, cursor: 'pointer'}}
              >
                <option>All Status</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="ESCALATED">Escalated</option>
              </select>
            </div>
            <div style={{fontSize: 13, fontWeight: 500}}>
              Priority: 
              <select 
                value={priorityFilter} 
                onChange={e => setPriorityFilter(e.target.value)}
                style={{border: 'none', fontWeight: 600, outline: 'none', background: 'transparent', marginLeft: 4, cursor: 'pointer'}}
              >
                <option>All Priority</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
          </div>
          <div style={{display: 'flex', gap: 16, alignItems: 'center'}}>
            <span style={{fontSize: 13, color: '#6b7280'}}>Showing {filteredTickets.length} of {stats?.totalTickets || 0}</span>
            <button className="date-picker-btn" style={{border: 'none', fontWeight: 600}}>Export Report</button>
          </div>
        </div>

        {filteredTickets.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <HelpCircle size={44} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>No Support Tickets Found</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>No tickets match the selected filters or search query.</p>
          </div>
        ) : (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24}}>
            {filteredTickets.map((t: any, i: number) => {
              let statusColor = '#2563eb';
              let statusBg = '#eff6ff';
              if (t.status === 'IN_PROGRESS') { statusColor = '#f59e0b'; statusBg = '#fef3c7'; }
              if (t.status === 'RESOLVED') { statusColor = '#10b981'; statusBg = '#d1fae5'; }
              if (t.status === 'ESCALATED') { statusColor = '#ef4444'; statusBg = '#fee2e2'; }

              return (
                <div key={i} style={{background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e5e7eb'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 12}}>
                    <span style={{fontSize: 11, color: '#6b7280', fontWeight: 600}}>{t.id}</span>
                    <span style={{background: statusBg, color: statusColor, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600}}>
                      {t.status === 'IN_PROGRESS' ? 'In Progress' : t.status === 'OPEN' ? 'Open' : t.status === 'RESOLVED' ? 'Resolved' : 'Escalated'}
                    </span>
                  </div>
                  <h3 style={{fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 14, minHeight: 48}}>{t.title}</h3>
                  
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10}}>
                    <span style={{color: '#6b7280'}}>Reporter</span>
                    <span style={{fontWeight: 600, color: '#1e293b'}}>{t.reporter?.name || 'Citizen User'}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10}}>
                    <span style={{color: '#6b7280'}}>Category</span>
                    <span style={{fontWeight: 600}}>{t.category}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10}}>
                    <span style={{color: '#6b7280'}}>Priority</span>
                    <span style={{fontWeight: 700, color: t.priority === 'High' || t.priority === 'Critical' ? '#ef4444' : t.priority === 'Medium' ? '#f59e0b' : '#6b7280'}}>{t.priority}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10}}>
                    <span style={{color: '#6b7280'}}>Created On</span>
                    <span style={{fontWeight: 600}}>{t.createdOn}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 16}}>
                    <span style={{color: '#6b7280'}}>Assigned To</span>
                    <span style={{fontWeight: 700}}>{t.assignedTo}</span>
                  </div>

                  {t.attachmentUrl ? (
                    <div style={{
                      marginBottom: 16,
                      padding: '8px 12px',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8
                    }}>
                      <div 
                        onClick={() => setPreviewImage({ url: t.attachmentUrl, title: t.title })}
                        style={{display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', cursor: 'pointer'}}
                      >
                        <img 
                          src={t.attachmentUrl} 
                          alt="Proof" 
                          style={{width: 32, height: 32, borderRadius: 6, objectFit: 'cover', border: '1px solid #86efac'}}
                        />
                        <span style={{fontSize: 12, fontWeight: 600, color: '#166534', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden'}}>
                          📎 Verified Proof Image
                        </span>
                      </div>
                      <button 
                        onClick={() => setPreviewImage({ url: t.attachmentUrl, title: t.title })}
                        style={{background: 'none', border: 'none', fontSize: 11, color: '#2563eb', fontWeight: 700, cursor: 'pointer'}}
                      >
                        Inspect &rarr;
                      </button>
                    </div>
                  ) : null}

                  <div style={{display: 'flex', gap: 12}}>
                    <Link to={`/support/${t.id}`} className="date-picker-btn" style={{flex: 1, justifyContent: 'center', textDecoration: 'none'}}>View</Link>
                    <Link to={`/support/${t.id}`} className="action-btn" style={{flex: 1, justifyContent: 'center', textDecoration: 'none'}}>Respond</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <div style={{padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', marginTop: 24}}>
          <div style={{fontSize: 13, color: '#64748b'}}>
            Total Tickets: <strong style={{color: '#0f172a'}}>{filteredTickets.length}</strong>
          </div>
          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
            <button className="date-picker-btn">Previous</button>
            <button className="action-btn" style={{padding: '4px 12px'}}>1</button>
            <button className="date-picker-btn">Next</button>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 24
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderRadius: 16,
              maxWidth: 720,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {previewImage.title || 'Support Proof Document'}
                </h3>
                <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>✓ Verified Cloudinary CDN Image</span>
              </div>
              <button 
                onClick={() => setPreviewImage(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: 20, textAlign: 'center', backgroundColor: '#0f172a' }}>
              <img 
                src={previewImage.url} 
                alt="Support Proof" 
                style={{ maxHeight: 480, maxWidth: '100%', objectFit: 'contain', borderRadius: 8 }}
              />
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <a 
                href={previewImage.url} 
                target="_blank" 
                rel="noreferrer"
                download="support_proof.jpg"
                className="action-btn"
                style={{ textDecoration: 'none', padding: '8px 16px', fontSize: 13 }}
              >
                Download Original 📥
              </a>
              <button 
                onClick={() => setPreviewImage(null)}
                className="date-picker-btn"
                style={{ padding: '8px 16px', fontSize: 13 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div style={{background: 'white', padding: 24, borderRadius: 12, width: 400}}>
            <h3 style={{marginBottom: 16}}>Raise Support Ticket</h3>
            <div style={{marginBottom: 12}}>
              <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Title</label>
              <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: 6}} placeholder="e.g. Server down" />
            </div>
            <div style={{marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
              <div>
                <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Category</label>
                <select value={newCat} onChange={e => setNewCat(e.target.value)} style={{width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: 6}}>
                  <option>Technical</option>
                  <option>Billing</option>
                  <option>Account</option>
                </select>
              </div>
              <div>
                <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Priority</label>
                <select value={newPri} onChange={e => setNewPri(e.target.value)} style={{width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: 6}}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </div>
            </div>
            <div style={{marginBottom: 24}}>
              <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Description</label>
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} style={{width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: 6, height: 80}} placeholder="Describe the issue..."></textarea>
            </div>
            <div style={{display: 'flex', gap: 12, justifyContent: 'flex-end'}}>
              <button className="date-picker-btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="action-btn" onClick={handleCreateTicket}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
