import React, { useEffect, useState } from 'react';
import { HelpCircle, Clock, CheckCircle } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { StatCard } from '../components/Dashboard';

export default function SupportTickets() {
  const { socket, connected } = useSocket();
  const [data, setData] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState('Technical');
  const [newPri, setNewPri] = useState('Medium');
  const [newDesc, setNewDesc] = useState('');

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

  if (!data) return <div>Connecting to live support tickets...</div>;

  const { stats, tickets } = data;

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
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24, padding: '12px 16px', background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', alignItems: 'center'}}>
          <div style={{display: 'flex', gap: 16, alignItems: 'center'}}>
            <div className="search-bar" style={{width: 250, padding: '4px 8px', background: '#f9fafb'}}>
              <input type="text" placeholder="Filter tickets..." style={{background: 'transparent'}}/>
            </div>
            <div style={{fontSize: 13, fontWeight: 500}}>Category: <select style={{border: 'none', fontWeight: 600, outline: 'none', background: 'transparent'}}><option>All Categories</option></select></div>
            <div style={{fontSize: 13, fontWeight: 500}}>Status: <select style={{border: 'none', fontWeight: 600, outline: 'none', background: 'transparent'}}><option>All Status</option></select></div>
            <div style={{fontSize: 13, fontWeight: 500}}>Priority: <select style={{border: 'none', fontWeight: 600, outline: 'none', background: 'transparent'}}><option>All Priority</option></select></div>
          </div>
          <div style={{display: 'flex', gap: 16, alignItems: 'center'}}>
            <span style={{fontSize: 13, color: '#6b7280'}}>Showing 1-9 of {stats?.totalTickets}</span>
            <button className="date-picker-btn" style={{border: 'none', fontWeight: 600}}>Export Report</button>
          </div>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24}}>
          {(tickets || []).map((t: any, i: number) => {
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
                <h3 style={{fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 24, minHeight: 48}}>{t.title}</h3>
                
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 12}}>
                  <span style={{color: '#6b7280'}}>Category</span>
                  <span style={{fontWeight: 600}}>{t.category}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 12}}>
                  <span style={{color: '#6b7280'}}>Priority</span>
                  <span style={{fontWeight: 700, color: t.priority === 'High' || t.priority === 'Critical' ? '#ef4444' : t.priority === 'Medium' ? '#f59e0b' : '#6b7280'}}>{t.priority}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 12}}>
                  <span style={{color: '#6b7280'}}>Created On</span>
                  <span style={{fontWeight: 600}}>{t.createdOn}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 12}}>
                  <span style={{color: '#6b7280'}}>Last Updated</span>
                  <span style={{fontWeight: 600}}>{t.lastUpdated}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 24}}>
                  <span style={{color: '#6b7280'}}>Assigned To</span>
                  <span style={{fontWeight: 700}}>{t.assignedTo}</span>
                </div>

                <div style={{display: 'flex', gap: 12}}>
                  <button className="date-picker-btn" style={{flex: 1, justifyContent: 'center'}}>View</button>
                  <button className="action-btn" style={{flex: 1, justifyContent: 'center'}}>Respond</button>
                </div>
              </div>
            );
          })}
        </div>
        
        <div style={{padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', marginTop: 24}}>
          <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
            <div style={{width: 32, height: 32, borderRadius: 8, background: '#f3f4f6'}}></div>
            <div style={{width: 32, height: 32, borderRadius: 8, background: '#f3f4f6'}}></div>
          </div>
          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
            <button className="date-picker-btn">Previous</button>
            <button className="action-btn" style={{padding: '4px 12px'}}>1</button>
            <button className="date-picker-btn">Next</button>
          </div>
        </div>
      </div>

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
