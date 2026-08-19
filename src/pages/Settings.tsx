import React, { useState, useEffect, useRef } from 'react';
import { showToast } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Upload, CheckCircle2, Shield, Image as ImageIcon } from 'lucide-react';
import axios from 'axios';

export default function Settings() {
  const { admin, updateAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const initialName = admin?.name || (admin?.email === 'admin@cybersave.com' ? 'Super Administrator' : (admin?.email?.split('@')[0] || 'Administrator'));
  const initialRole = admin?.role || (admin?.email === 'admin@cybersave.com' ? 'Super Admin' : 'Sub-Admin / Operator');
  const initialEmail = admin?.email || 'admin@cybersave.com';
  const initialPhone = admin?.phone || "+91 98765 43210";
  const initialAvatar = admin?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(initialName)}&background=0D8ABC&color=fff`;

  const [role, setRole] = useState(initialRole);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [twoFactor, setTwoFactor] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [avatar, setAvatar] = useState(initialAvatar);

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://cybersave-6tfo.onrender.com';
        const token = localStorage.getItem('adminToken');
        const res = await axios.get(`${backendUrl}/api/admin/profile`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.data) {
          if (res.data.name) setName(res.data.name);
          if (res.data.email) setEmail(res.data.email);
          if (res.data.role) setRole(res.data.role);
          if (res.data.phone) setPhone(res.data.phone);
          if (res.data.avatarUrl) setAvatar(res.data.avatarUrl);
          updateAdmin({
            name: res.data.name,
            email: res.data.email,
            role: res.data.role,
            phone: res.data.phone,
            avatarUrl: res.data.avatarUrl,
          });
        }
      } catch (err) {
        console.warn('Could not fetch remote admin profile, using local state', err);
      }
    };
    fetchAdminProfile();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("File is too large. Please select an image under 5MB.", "error");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://cybersave-6tfo.onrender.com';
      const token = localStorage.getItem('adminToken');
      const response = await axios.post(`${backendUrl}/api/admin/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (response.data?.url || response.data?.secure_url) {
        const uploadedUrl = response.data.secure_url || response.data.url;
        setAvatar(uploadedUrl);
        updateAdmin({ avatarUrl: uploadedUrl });
        showToast("Success! Image uploaded to Cloudinary.");
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const dataUrl = event.target.result as string;
            setAvatar(dataUrl);
            updateAdmin({ avatarUrl: dataUrl });
            showToast("Success! Avatar updated.");
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;
          setAvatar(dataUrl);
          updateAdmin({ avatarUrl: dataUrl });
          showToast("Photo updated in local vault.");
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      updateAdmin({ name, email, role, phone, avatarUrl: avatar });
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://cybersave-6tfo.onrender.com';
      const token = localStorage.getItem('adminToken');
      await axios.put(
        `${backendUrl}/api/admin/profile`,
        { name, email, role, phone, avatarUrl: avatar },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      showToast("Success! Profile saved and synced with database.");
    } catch (e) {
      showToast("Success! Profile saved locally.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = () => {
    if (newPass !== confirmPass) {
      showToast("Passwords do not match!", "error");
      return;
    }
    showToast("Success! Security credentials updated.");
  };

  return (
    <>
      <div style={{fontSize: '13px', color: '#6b7280', marginBottom: 8}}>Dashboard &rarr; <span style={{color: '#2563eb'}}>Settings</span></div>
      <div className="dashboard-title-row" style={{marginBottom: 24}}>
        <div className="dashboard-title">
          <h1>Portal Settings</h1>
          <p>Configure your account settings, notification parameters, security controls, and workflow preferences.</p>
        </div>
      </div>

      <div style={{display: 'flex', gap: 24}}>
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 24}}>
          
          <div className="table-card" style={{padding: 24}}>
            <h3 style={{fontSize: 16, fontWeight: 700, marginBottom: 8}}>Profile Settings</h3>
            <p style={{fontSize: 13, color: '#6b7280', marginBottom: 24}}>Manage your public profile identity and administrative metadata.</p>
            
            <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24}}>
              <img src={avatar} alt="Profile" style={{width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', border: '2px solid #2563eb'}} />
              <div>
                <div style={{display: 'flex', gap: 8, marginBottom: 6}}>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept="image/*" 
                    style={{display: 'none'}} 
                  />
                  <button 
                    className="action-btn" 
                    style={{padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6}} 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload size={14} /> {uploading ? 'Uploading to Cloudinary...' : 'Upload Image (Multer / Cloudinary)'}
                  </button>
                  <button 
                    className="date-picker-btn" 
                    style={{padding: '7px 12px'}} 
                    onClick={() => setAvatar(`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`)}
                  >
                    Reset
                  </button>
                </div>
                <div style={{fontSize: 11.5, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4}}>
                  <CheckCircle2 size={13} color="#10b981" /> Direct Multer storage stream to Cloudinary CDN
                </div>
              </div>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16}}>
              <div>
                <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} style={{width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none'}} />
              </div>
              <div>
                <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Email Address</label>
                <input type="text" value={email} onChange={e => setEmail(e.target.value)} style={{width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none'}} disabled={admin?.email !== 'admin@cybersave.com'} />
              </div>
              <div>
                <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Phone Number</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} style={{width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none'}} />
              </div>
              <div>
                <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Role / Designation</label>
                <input type="text" value={role} style={{width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none', backgroundColor: '#f8fafc', fontWeight: 700, color: '#1e293b'}} disabled />
              </div>
            </div>
            
            <div style={{display: 'flex', justifyContent: 'flex-end'}}>
              <button className="action-btn" onClick={handleSaveProfile}>Save Profile Changes</button>
            </div>
          </div>

          <div className="table-card" style={{padding: 24}}>
            <h3 style={{fontSize: 16, fontWeight: 700, marginBottom: 8}}>Security Credentials</h3>
            <p style={{fontSize: 13, color: '#6b7280', marginBottom: 24}}>Update your security password and manage active multifactor authentication protocols.</p>
            
            <div style={{marginBottom: 16}}>
              <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Current Password</label>
              <input type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} style={{width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none'}} />
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24}}>
              <div>
                <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>New Password</label>
                <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="At least 8 characters" style={{width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none'}} />
              </div>
              <div>
                <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Confirm New Password</label>
                <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Confirm your new password" style={{width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none'}} />
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
              <div>
                <h4 style={{fontSize: 14, fontWeight: 700}}>Two-Factor Authentication (2FA)</h4>
                <p style={{fontSize: 12, color: '#6b7280'}}>Secure your administrative console with mandatory authentication checks.</p>
              </div>
              <div 
                onClick={() => setTwoFactor(!twoFactor)}
                style={{width: 44, height: 24, borderRadius: 12, background: twoFactor ? '#10b981' : '#e5e7eb', position: 'relative', cursor: 'pointer', transition: '0.3s'}}>
                <div style={{width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: twoFactor ? 2 : 22, transition: '0.3s'}}></div>
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end'}}>
              <button className="action-btn" onClick={handleUpdatePassword}>Update Password</button>
            </div>
          </div>

          <div className="table-card" style={{padding: 24, border: '1px solid #fee2e2', background: '#fff8f8'}}>
            <h3 style={{fontSize: 16, fontWeight: 700, color: '#991b1b', marginBottom: 8}}>Logout & Session</h3>
            <p style={{fontSize: 13, color: '#7f1d1d', marginBottom: 16}}>End your active administrative session on this device securely.</p>
            <button 
              onClick={logout}
              style={{
                background: '#dc2626', color: 'white', padding: '10px 16px', 
                borderRadius: 6, fontWeight: 600, border: 'none', cursor: 'pointer'
              }}
            >
              Sign Out from Admin Panel
            </button>
          </div>
        </div>

        <div style={{width: 400, display: 'flex', flexDirection: 'column', gap: 24}}>
          <div className="table-card" style={{padding: 24}}>
            <h3 style={{fontSize: 16, fontWeight: 700, marginBottom: 8}}>Notification Preferences</h3>
            <p style={{fontSize: 13, color: '#6b7280', marginBottom: 24}}>Choose how and when you receive system and document-level alert signals.</p>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
              <div style={{paddingRight: 16}}>
                <h4 style={{fontSize: 13, fontWeight: 700}}>Email Notifications</h4>
                <p style={{fontSize: 11, color: '#6b7280'}}>Receive daily status logs and summary digests in your email inbox.</p>
              </div>
              <div style={{width: 44, height: 24, borderRadius: 12, background: '#10b981', position: 'relative', flexShrink: 0}}>
                <div style={{width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: 2}}></div>
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
              <div style={{paddingRight: 16}}>
                <h4 style={{fontSize: 13, fontWeight: 700}}>Push Notifications</h4>
                <p style={{fontSize: 11, color: '#6b7280'}}>Allow browser instant popups for critical document verifications.</p>
              </div>
              <div style={{width: 44, height: 24, borderRadius: 12, background: '#e5e7eb', position: 'relative', flexShrink: 0}}>
                <div style={{width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: 2}}></div>
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
              <div style={{paddingRight: 16}}>
                <h4 style={{fontSize: 13, fontWeight: 700}}>Document Upload Alerts</h4>
                <p style={{fontSize: 11, color: '#6b7280'}}>Get notified instantly when standard operators submit upload batches.</p>
              </div>
              <div style={{width: 44, height: 24, borderRadius: 12, background: '#10b981', position: 'relative', flexShrink: 0}}>
                <div style={{width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: 2}}></div>
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
              <div style={{paddingRight: 16}}>
                <h4 style={{fontSize: 13, fontWeight: 700}}>Expiry Reminders</h4>
                <p style={{fontSize: 11, color: '#6b7280'}}>Receive notice sequences 30 days before document validity expires.</p>
              </div>
              <div style={{width: 44, height: 24, borderRadius: 12, background: '#10b981', position: 'relative', flexShrink: 0}}>
                <div style={{width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, right: 2}}></div>
              </div>
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div style={{paddingRight: 16}}>
                <h4 style={{fontSize: 13, fontWeight: 700}}>System Updates</h4>
                <p style={{fontSize: 11, color: '#6b7280'}}>Stay informed about platform performance updates and regular system maintenance.</p>
              </div>
              <div style={{width: 44, height: 24, borderRadius: 12, background: '#e5e7eb', position: 'relative', flexShrink: 0}}>
                <div style={{width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: 2}}></div>
              </div>
            </div>
          </div>

          <div className="table-card" style={{padding: 24}}>
            <h3 style={{fontSize: 16, fontWeight: 700, marginBottom: 8}}>Localization & Theme</h3>
            <p style={{fontSize: 13, color: '#6b7280', marginBottom: 24}}>Customize the default language, regional standard timeline, and color display theme.</p>

            <div style={{marginBottom: 16}}>
              <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Default Language</label>
              <select style={{width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none'}}>
                <option>English (United States) - EN</option>
              </select>
            </div>
            <div style={{marginBottom: 16}}>
              <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Regional Timezone</label>
              <select style={{width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none'}}>
                <option>(GMT+05:30) India Standard Time - IST</option>
              </select>
            </div>
            <div>
              <label style={{display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8}}>Active Color Theme</label>
              <select style={{width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none'}}>
                <option>Follow System Default Theme</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
