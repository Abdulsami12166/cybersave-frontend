import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { showToast } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Shield, 
  Bell, 
  CreditCard, 
  Key, 
  Save, 
  CheckCircle2, 
  Upload, 
  RefreshCw,
  Building,
  Lock,
  Phone,
  Mail,
  Sliders,
  Check,
  AlertCircle
} from 'lucide-react';

const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export default function Settings() {
  const { admin, updateAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'profile' | 'sla' | 'settlement' | 'security'>('profile');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Profile State
  const [name, setName] = useState(admin?.name || 'Suresh Kumar Sharma');
  const [email, setEmail] = useState(admin?.email || 'officer.admin@cybersave.gov.in');
  const [phone, setPhone] = useState(admin?.phone || '+91 98450 19823');
  const [kendraId, setKendraId] = useState('CSC-DEL-8841');
  const [designation, setDesignation] = useState('Principal Verification Officer (SDM)');
  const [district, setDistrict] = useState('Central Delhi, NCT of Delhi');
  const [avatar, setAvatar] = useState(admin?.avatarUrl || `https://ui-avatars.com/api/?name=Suresh+Sharma&background=1E40AF&color=fff`);

  // SLA & Workflow Policy State
  const [slaHours, setSlaHours] = useState('24');
  const [autoAssign, setAutoAssign] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(true);
  const [whatsappNotifs, setWhatsappNotifs] = useState(true);
  const [strictOcr, setStrictOcr] = useState(true);

  // Settlement State
  const [bankAccount, setBankAccount] = useState('•••• •••• •••• 9842');
  const [ifscCode, setIfscCode] = useState('SBIN0001248');
  const [settlementCycle, setSettlementCycle] = useState('T+1 (Next Business Day)');
  const [autoRefund, setAutoRefund] = useState(true);

  // Security State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [twoFactor, setTwoFactor] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('30');

  // Load permanent saved settings from DB on mount
  useEffect(() => {
    // 1. Fetch Profile
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${BACKEND_BASE}/api/admin/profile`);
        if (res.data) {
          const d = res.data;
          if (d.name) setName(d.name);
          if (d.email) setEmail(d.email);
          if (d.phone) setPhone(d.phone);
          if (d.avatarUrl) setAvatar(d.avatarUrl);
          if (d.kendraId) setKendraId(d.kendraId);
          if (d.designation) setDesignation(d.designation);
          if (d.district) setDistrict(d.district);
        }
      } catch {
        // Local storage fallback
        const savedSettings = localStorage.getItem('adminSettings');
        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings);
            if (parsed.kendraId) setKendraId(parsed.kendraId);
            if (parsed.designation) setDesignation(parsed.designation);
            if (parsed.district) setDistrict(parsed.district);
          } catch {}
        }
      }
    };

    // 2. Fetch Operational Settings
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${BACKEND_BASE}/api/admin/settings`);
        if (res.data?.settings) {
          const s = res.data.settings;
          if (s.slaHours) setSlaHours(s.slaHours);
          if (typeof s.autoAssign === 'boolean') setAutoAssign(s.autoAssign);
          if (typeof s.smsNotifs === 'boolean') setSmsNotifs(s.smsNotifs);
          if (typeof s.whatsappNotifs === 'boolean') setWhatsappNotifs(s.whatsappNotifs);
          if (typeof s.strictOcr === 'boolean') setStrictOcr(s.strictOcr);
          if (s.bankAccount) setBankAccount(s.bankAccount);
          if (s.ifscCode) setIfscCode(s.ifscCode);
          if (s.settlementCycle) setSettlementCycle(s.settlementCycle);
          if (typeof s.autoRefund === 'boolean') setAutoRefund(s.autoRefund);
          if (typeof s.twoFactor === 'boolean') setTwoFactor(s.twoFactor);
          if (s.sessionTimeout) {
            setSessionTimeout(s.sessionTimeout);
            localStorage.setItem('adminSessionTimeout', s.sessionTimeout);
          }
        }
      } catch {
        const savedSettings = localStorage.getItem('adminSettings');
        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings);
            if (parsed.slaHours) setSlaHours(parsed.slaHours);
            if (typeof parsed.autoAssign === 'boolean') setAutoAssign(parsed.autoAssign);
            if (typeof parsed.smsNotifs === 'boolean') setSmsNotifs(parsed.smsNotifs);
            if (typeof parsed.whatsappNotifs === 'boolean') setWhatsappNotifs(parsed.whatsappNotifs);
            if (typeof parsed.strictOcr === 'boolean') setStrictOcr(parsed.strictOcr);
            if (parsed.bankAccount) setBankAccount(parsed.bankAccount);
            if (parsed.ifscCode) setIfscCode(parsed.ifscCode);
            if (parsed.settlementCycle) setSettlementCycle(parsed.settlementCycle);
            if (typeof parsed.autoRefund === 'boolean') setAutoRefund(parsed.autoRefund);
            if (typeof parsed.twoFactor === 'boolean') setTwoFactor(parsed.twoFactor);
            if (parsed.sessionTimeout) {
              setSessionTimeout(parsed.sessionTimeout);
              localStorage.setItem('adminSessionTimeout', parsed.sessionTimeout);
            }
          } catch {}
        }
      }
    };

    fetchProfile();
    fetchSettings();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5MB limit', 'error');
      return;
    }

    setUploading(true);
    // Instant local preview
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatar(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'cybersave/avatars');
      const uploadRes = await axios.post(`${BACKEND_BASE}/api/admin/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedUrl = uploadRes.data?.url || uploadRes.data?.secure_url;
      if (uploadedUrl) {
        setAvatar(uploadedUrl);
        if (updateAdmin) {
          updateAdmin({ avatarUrl: uploadedUrl });
        }
        await axios.put(`${BACKEND_BASE}/api/admin/profile`, { avatarUrl: uploadedUrl });
      }
      showToast('Officer photograph uploaded & secured successfully');
    } catch {
      showToast('Photo uploaded locally');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);

    const profilePayload = {
      name,
      email,
      phone,
      avatarUrl: avatar,
      kendraId,
      designation,
      district,
    };

    const settingsPayload = {
      slaHours,
      autoAssign,
      smsNotifs,
      whatsappNotifs,
      strictOcr,
      bankAccount,
      ifscCode,
      settlementCycle,
      autoRefund,
      twoFactor,
      sessionTimeout,
    };

    try {
      // 1. Save Profile to DB
      await axios.put(`${BACKEND_BASE}/api/admin/profile`, profilePayload);
      // 2. Save Operational Settings to DB
      await axios.put(`${BACKEND_BASE}/api/admin/settings`, settingsPayload);

      // 3. Update Auth state and Local Storage for instant reload retention
      if (updateAdmin) {
        updateAdmin({ name, email, phone, avatarUrl: avatar });
      }
      localStorage.setItem('adminSettings', JSON.stringify({ ...profilePayload, ...settingsPayload }));
      localStorage.setItem('adminSessionTimeout', sessionTimeout);

      showToast('Operational configuration & profile saved permanently to database');
    } catch (e: any) {
      if (updateAdmin) {
        updateAdmin({ name, email, phone, avatarUrl: avatar });
      }
      localStorage.setItem('adminSettings', JSON.stringify({ ...profilePayload, ...settingsPayload }));
      localStorage.setItem('adminSessionTimeout', sessionTimeout);
      showToast('Settings saved locally');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!newPass || !confirmPass) {
      showToast('Please provide both new password and confirmation', 'error');
      return;
    }
    if (newPass !== confirmPass) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (newPass.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await axios.post(`${BACKEND_BASE}/api/admin/change-password`, {
        currentPassword: currentPass,
        newPassword: newPass,
        confirmPassword: confirmPass,
      });

      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      showToast(res.data?.message || 'Officer security credentials updated & secured successfully');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update password. Please check your current password.';
      showToast(errorMsg, 'error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '18px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Operational Console Settings & Governance Policy
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            Kendra center parameters, officer authorization, verification SLA thresholds, and security controls
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            padding: '9px 18px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
          }}
        >
          {saving ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
          <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
        </button>
      </div>

      {/* ─── Settings Navigation Tabs ──────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid #E2E8F0',
        paddingBottom: '2px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'profile', label: 'Officer & Kendra Profile', icon: <User size={16} /> },
          { id: 'sla', label: 'Verification & SLA Workflow', icon: <Sliders size={16} /> },
          { id: 'settlement', label: 'Treasury & Settlements', icon: <CreditCard size={16} /> },
          { id: 'security', label: 'Security & Access Control', icon: <Shield size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeTab === tab.id ? '#FFFFFF' : 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid #2563EB' : '2px solid transparent',
              color: activeTab === tab.id ? '#1D4ED8' : '#64748B',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── TAB 1: Profile & Kendra Center ─────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Officer Credentials & Seva Kendra Details
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
              Official administrative identity used for digital certificate signing and audit ledgers
            </p>
          </div>

          {/* Photograph Upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', paddingBottom: '18px', borderBottom: '1px solid #F1F5F9' }}>
            <img
              src={avatar}
              alt="Officer"
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #EFF6FF',
                boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
              }}
            />
            <div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    padding: '7px 14px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#334155',
                    cursor: 'pointer'
                  }}
                >
                  <Upload size={14} /> {uploading ? 'Processing...' : 'Upload Official Photograph'}
                </button>
                <button
                  onClick={() => setAvatar(`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1E40AF&color=fff`)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    padding: '7px 12px',
                    fontSize: '12px',
                    color: '#64748B',
                    cursor: 'pointer'
                  }}
                >
                  Reset
                </button>
              </div>
              <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                Official passport photo format (JPG, PNG, max 5MB)
              </span>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Officer Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '7px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  color: '#0F172A',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Official Government Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '7px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  color: '#0F172A',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Official Contact Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '7px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  color: '#0F172A',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Kendra Center ID
              </label>
              <input
                type="text"
                value={kendraId}
                disabled
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '7px',
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#475569'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Designation & Authority
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '7px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  color: '#0F172A',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Assigned Administrative District
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '7px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  color: '#0F172A',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: Verification & SLA Workflow ────────────────────────────── */}
      {activeTab === 'sla' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Citizen Application SLA & Dispatch Rules
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
              Define verification turn-around thresholds and automated citizen communication channels
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* SLA Threshold Select */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px',
              background: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0'
            }}>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                  Target Resolution SLA Threshold
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Applications exceeding this window will trigger automated escalation to the District Magistrate
                </div>
              </div>
              <select
                value={slaHours}
                onChange={(e) => setSlaHours(e.target.value)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#0F172A',
                  background: '#FFFFFF'
                }}
              >
                <option value="12">12 Hours (Express Priority)</option>
                <option value="24">24 Hours (Standard National SLA)</option>
                <option value="48">48 Hours (Extended Verification)</option>
                <option value="72">72 Hours (Tribunal / Revenue Scheme)</option>
              </select>
            </div>

            {/* Strict OCR Validation */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px',
              background: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0'
            }}>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                  Mandatory Aadhaar OCR Cross-Verification
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Perform automatic optical character recognition matching between uploaded ID proofs and applicant form data
                </div>
              </div>
              <input
                type="checkbox"
                checked={strictOcr}
                onChange={(e) => setStrictOcr(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563EB' }}
              />
            </div>

            {/* Auto Assignment */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px',
              background: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0'
            }}>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                  Load-Balanced Application Ingestion
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Automatically distribute incoming citizen requests equally among active duty verification officers
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoAssign}
                onChange={(e) => setAutoAssign(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563EB' }}
              />
            </div>

            {/* SMS Notifications */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px',
              background: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0'
            }}>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                  Citizen SMS Gateway Dispatches
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Dispatch real-time SMS alerts to citizens on submission, status progression, and certificate issuance
                </div>
              </div>
              <input
                type="checkbox"
                checked={smsNotifs}
                onChange={(e) => setSmsNotifs(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563EB' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: Treasury & Settlements ─────────────────────────────────── */}
      {activeTab === 'settlement' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Treasury Settlement & Direct Benefit Accounting
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
              Configure nodal bank accounts for fee receipts, UPI settlement schedules, and auto-refund policies
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Nodal Bank Account Number
              </label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '7px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  color: '#0F172A',
                  outline: 'none',
                  fontFamily: 'monospace'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Bank IFSC Code
              </label>
              <input
                type="text"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '7px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  color: '#0F172A',
                  outline: 'none',
                  fontFamily: 'monospace'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Settlement Window
              </label>
              <input
                type="text"
                value={settlementCycle}
                disabled
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '7px',
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#475569'
                }}
              />
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px',
            background: '#F8FAFC',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            marginTop: '8px'
          }}>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                Automated Citizen Refund on Ineligible Rejection
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Initiate instant Razorpay UPI fee refund directly to applicant if rejected by verification officer
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoRefund}
              onChange={(e) => setAutoRefund(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563EB' }}
            />
          </div>
        </div>
      )}

      {/* ─── TAB 4: Security & Access Control ──────────────────────────────── */}
      {activeTab === 'security' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Officer Security & Two-Factor Authentication
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', margin: 0 }}>
              Manage password credentials and multi-factor session authentication protocols
            </p>
          </div>

          {/* Password Update Card */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '18px'
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 14px 0' }}>
              Change Authentication Password
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  New Secure Password
                </label>
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Min 8 characters"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              onClick={handlePasswordUpdate}
              disabled={updatingPassword}
              style={{
                background: updatingPassword ? '#64748B' : '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: updatingPassword ? 'not-allowed' : 'pointer'
              }}
            >
              {updatingPassword ? 'Verifying & Updating...' : 'Update Password'}
            </button>
          </div>

          {/* 2FA Toggle */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px',
            background: '#F8FAFC',
            borderRadius: '8px',
            border: '1px solid #E2E8F0'
          }}>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                Two-Factor OTP Verification (2FA)
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Require dynamic 6-digit SMS OTP verification during officer login
              </div>
            </div>
            <input
              type="checkbox"
              checked={twoFactor}
              onChange={(e) => setTwoFactor(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563EB' }}
            />
          </div>

          {/* Session Timeout */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px',
            background: '#F8FAFC',
            borderRadius: '8px',
            border: '1px solid #E2E8F0'
          }}>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                Inactivity Auto-Lock Interval
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Automatically lock the officer console when inactive to prevent unauthorized physical terminal access
              </div>
            </div>
            <select
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                fontWeight: 700,
                color: '#0F172A',
                background: '#FFFFFF'
              }}
            >
              <option value="15">15 Minutes</option>
              <option value="30">30 Minutes (Recommended)</option>
              <option value="60">60 Minutes</option>
            </select>
          </div>
        </div>
      )}

    </div>
  );
}
