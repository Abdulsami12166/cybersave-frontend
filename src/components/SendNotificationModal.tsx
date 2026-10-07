import React, { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { apiFetch } from '../utils/apiConfig';
import { useSocket } from '../context/SocketContext';

export interface NotificationRecipient {
  id: string;
  name: string;
  citId?: string;
  email?: string;
  phone?: string;
}

interface SendNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRecipient?: NotificationRecipient | null;
  onSuccess?: (msg: string) => void;
}

export default function SendNotificationModal({
  isOpen,
  onClose,
  defaultRecipient,
  onSuccess
}: SendNotificationModalProps) {
  const { socket } = useSocket();

  // Recipient state
  const [recipient, setRecipient] = useState<NotificationRecipient>({
    id: defaultRecipient?.id || 'all',
    name: defaultRecipient?.name || 'Priya Sharma',
    citId: defaultRecipient?.citId || 'CIT-00482',
    email: defaultRecipient?.email || 'priya.sharma@example.com',
    phone: defaultRecipient?.phone || '+91 98765 43210',
  });

  // Notification fields
  const [notificationType, setNotificationType] = useState<'Email Notification' | 'Mobile Push Notification'>('Mobile Push Notification');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Available citizens list for recipient dropdown if needed
  const [citizens, setCitizens] = useState<NotificationRecipient[]>([]);

  useEffect(() => {
    if (defaultRecipient) {
      setRecipient({
        id: defaultRecipient.id,
        name: defaultRecipient.name || 'Citizen User',
        citId: defaultRecipient.citId || `CIT-${defaultRecipient.id.slice(-5).toUpperCase()}`,
        email: defaultRecipient.email || '',
        phone: defaultRecipient.phone || '',
      });
    }
  }, [defaultRecipient]);

  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsSubmitting(false);
      return;
    }

    // Fetch citizens for recipient selection if opened without fixed recipient
    apiFetch('/api/admin/users?limit=50')
      .then(res => res.json())
      .then(data => {
        const userList = Array.isArray(data) ? data : (data.users || []);
        if (Array.isArray(userList) && userList.length > 0) {
          const mapped: NotificationRecipient[] = userList.map((u: any) => {
            const rawId = u.dbId || u.id || u._id || '';
            const fullName = u.fullName || u.profile?.fullName || u.name || (u.email ? u.email.split('@')[0] : 'Citizen User');
            const citId = u.citNumber || (typeof u.id === 'string' && u.id.startsWith('CIT-') ? u.id : (rawId ? `CIT-${rawId.slice(-6).toUpperCase()}` : 'CIT-PORTAL'));
            const email = u.email || u.profile?.email || '';
            const phone = u.phone || u.profile?.phone || '';
            return {
              id: rawId,
              name: fullName,
              citId,
              email,
              phone
            };
          });
          setCitizens(mapped);
          if (!defaultRecipient && mapped.length > 0) {
            // Find Priya Sharma or first user
            const priya = mapped.find(m => m.name.toLowerCase().includes('priya') || m.email?.toLowerCase().includes('priya')) || mapped[0];
            setRecipient(priya);
          }
        }
      })
      .catch(() => null);
  }, [isOpen, defaultRecipient]);

  if (!isOpen) return null;

  const initials = recipient.name
    ? recipient.name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'PS';

  const hasValidEmail = Boolean(recipient.email && recipient.email.includes('@'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanSubject = subject.trim();
    const cleanBody = body.trim();

    if (!cleanSubject) {
      setErrorMessage('Please enter a subject line.');
      return;
    }
    if (!cleanBody) {
      setErrorMessage('Please enter a message body.');
      return;
    }

    if (notificationType === 'Email Notification' && !hasValidEmail) {
      setErrorMessage(
        `Recipient "${recipient.name}" does not have a valid registered email address. Email cannot be dispatched.`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        recipientId: recipient.id,
        userId: recipient.id,
        dbId: recipient.id,
        citId: recipient.citId,
        citNumber: recipient.citId,
        userEmail: recipient.email,
        email: recipient.email,
        userName: recipient.name,
        name: recipient.name,
        userPhone: recipient.phone,
        phone: recipient.phone,
        notificationType,
        channel: notificationType === 'Email Notification' ? 'EMAIL' : 'PUSH',
        type: notificationType,
        subject: cleanSubject,
        title: cleanSubject,
        body: cleanBody,
        message: cleanBody,
        content: cleanBody,
        text: cleanBody,
        fromAdmin: true,
        forceNotify: true
      };

      if (socket && socket.connected) {
        socket.emit('send_push_notification', payload);
        socket.emit('user_push_notification', payload);
      }

      const res = await apiFetch('/api/v1/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(resData?.error || resData?.message || 'Failed to dispatch notification');
      }

      const successTxt = notificationType === 'Email Notification'
        ? `Email notification successfully dispatched to ${recipient.email}`
        : `Mobile push notification dispatched successfully to ${recipient.name}'s device`;

      setSuccessMessage(successTxt);
      if (onSuccess) onSuccess(successTxt);

      setTimeout(() => {
        onClose();
        setSubject('');
        setBody('');
      }, 1500);
    } catch (err: any) {
      console.error('[SendNotificationModal] dispatch error:', err);
      setErrorMessage(err.message || 'Notification dispatch failed. Please check network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      animation: 'fadeIn 0.15s ease-out'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '520px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bell size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                Send Notification
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                Dispatch targeted communication to citizen profile or device
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Error & Success Alerts */}
          {errorMessage && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#15803d',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <CheckCircle size={18} />
              <div>{successMessage}</div>
            </div>
          )}

          {/* Target Citizen Selector (when no default recipient is specified) */}
          {!defaultRecipient && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Select Target Citizen {citizens.length > 0 ? `(${citizens.length} registered)` : ''}
              </label>
              <select
                aria-label="Select Target Citizen"
                style={{
                  width: '100%',
                  fontSize: '13px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  cursor: 'pointer',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                value={recipient.id}
                onChange={e => {
                  const selected = citizens.find(c => c.id === e.target.value);
                  if (selected) setRecipient(selected);
                }}
              >
                {citizens.length === 0 ? (
                  <option value={recipient.id}>
                    {recipient.name} {recipient.citId ? `(${recipient.citId})` : ''} - {recipient.email || recipient.phone || 'Citizen'}
                  </option>
                ) : (
                  citizens.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.citId ? `(${c.citId})` : ''} - {c.email || c.phone || 'Citizen'}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Recipient Card */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: '#dbeafe',
              color: '#1d4ed8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              fontWeight: 700,
              flexShrink: 0
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                Recipient: <strong>{recipient.name}</strong> {recipient.citId ? `(${recipient.citId})` : ''}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {recipient.email ? (
                  <span>✉ {recipient.email}</span>
                ) : (
                  <span style={{ color: '#dc2626' }}>⚠️ No email registered</span>
                )}
                {recipient.phone && <span>• 📱 {recipient.phone}</span>}
              </div>
            </div>
          </div>

          {/* Notification Type Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Notification Type
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={notificationType}
                onChange={e => setNotificationType(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  color: '#0f172a',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  boxSizing: 'border-box'
                }}
              >
                <option value="Mobile Push Notification">📱 Mobile Push Notification</option>
                <option value="Email Notification">✉ Email Notification</option>
              </select>
              <div style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: '#64748b',
                fontSize: '12px'
              }}>
                ▼
              </div>
            </div>

            {/* Notification Type helper / warning */}
            {notificationType === 'Email Notification' ? (
              hasValidEmail ? (
                <div style={{ marginTop: '6px', fontSize: '12px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={13} /> Will deliver to verified email: <strong>{recipient.email}</strong>
                </div>
              ) : (
                <div style={{ marginTop: '6px', fontSize: '12px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={13} /> Recipient has no email on file. Switch to Mobile Push Notification.
                </div>
              )
            ) : (
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Smartphone size={13} /> Delivers instant status bar notification to user's registered mobile device
              </div>
            )}
          </div>

          {/* Subject Line */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Important Update: Your document has been verified"
              maxLength={120}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = '#2563eb')}
              onBlur={e => (e.target.style.borderColor = '#cbd5e1')}
            />
          </div>

          {/* Message Body */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                Message Body
              </label>
              <span style={{ fontSize: '12px', color: body.length > 900 ? '#dc2626' : '#94a3b8' }}>
                {body.length} / 1000 chars
              </span>
            </div>
            <textarea
              rows={4}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Enter official communication message details..."
              maxLength={1000}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
                lineHeight: 1.5,
                fontFamily: 'inherit',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = '#2563eb')}
              onBlur={e => (e.target.style.borderColor = '#cbd5e1')}
            />
          </div>

          {/* Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '8px'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f8fafc')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ffffff')}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (notificationType === 'Email Notification' && !hasValidEmail)}
              style={{
                padding: '10px 22px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: (notificationType === 'Email Notification' && !hasValidEmail) ? '#94a3b8' : '#2563eb',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: (isSubmitting || (notificationType === 'Email Notification' && !hasValidEmail)) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={e => {
                if (!isSubmitting && (notificationType !== 'Email Notification' || hasValidEmail)) {
                  e.currentTarget.style.backgroundColor = '#1d4ed8';
                }
              }}
              onMouseLeave={e => {
                if (!isSubmitting && (notificationType !== 'Email Notification' || hasValidEmail)) {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Notification'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
