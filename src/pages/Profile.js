import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE } from '../api';

export default function Profile() {
  const navigate = useNavigate();
  const [manager, setManager] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [reqModal, setReqModal] = useState(false);
  const [myRequest, setMyRequest] = useState(null);

  // Profile request state
  const [pf, setPf] = useState({ name: '', phone: '', location: '' });
  const [reason, setReason] = useState('');
  const [pfErr, setPfErr] = useState('');
  const [pfOk, setPfOk] = useState('');
  const [pfSaving, setPfSaving] = useState(false);

  const loadProfile = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    // Fetch manager profile
    fetch(`${API_BASE}/api/manager/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data._id) {
          setManager(data);
        } else if (data.message) {
          setError(data.message);
        }
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false));
  };

  const loadMyRequest = () => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/api/manager/my-request`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setMyRequest).catch(console.error);
  };

  useEffect(() => { 
    loadProfile(); 
    loadMyRequest(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('manager');
    navigate('/');
  };

  const openReqModal = () => {
    setPf({ 
      name: manager?.name || '', 
      phone: manager?.phone || '', 
      location: manager?.location || ''
    });
    setPfErr(''); 
    setPfOk(''); 
    setReason(''); 
    setReqModal(true);
  };

  const sendRequest = async () => {
    if (!reason.trim()) { 
      setPfErr('Please provide a reason for the change.'); 
      return; 
    }
    setPfSaving(true); 
    setPfErr('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/manager/request-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ changes: pf, reason: reason.trim() })
      });
      const data = await res.json();
      if (!res.ok) { 
        setPfErr(data.message || 'Failed'); 
        return; 
      }
      setPfOk('✓ Request sent to admin for approval!');
      loadMyRequest();
      setTimeout(() => setReqModal(false), 1800);
    } catch { 
      setPfErr('Server error.'); 
    } finally { 
      setPfSaving(false); 
    }
  };

  const initials = (name) =>
    name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'M';

  const statusColor = {
    pending:  { bg: '#fff8e1', color: '#f57f17', border: '#f9a825', label: '⏳ Pending' },
    approved: { bg: '#e6f4ea', color: '#2e7d32', border: '#a8d5b5', label: '✓ Approved' },
    rejected: { bg: '#fdecea', color: '#c62828', border: '#f5a5a5', label: '✗ Rejected' },
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="merchants-loading" style={{ width: 200 }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-logo">
          <Link to="/dashboard">
            <img src="/logo-full.png" alt="Vegavruddhi" />
          </Link>
        </div>
        <div className="nav-right">
          {manager && (
            <div 
              className="nav-profile"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{ position: 'relative' }}
            >
              <div className="nav-avatar">
                {manager.image
                  ? <img src={manager.image} alt={manager.name} />
                  : initials(manager.name)
                }
              </div>
              <div className="nav-info">
                <span className="name">{manager.name}</span>
                <span className="status-badge">Manager</span>
              </div>
              <span className="nav-chevron">▼</span>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="dropdown-menu open">
                  <div className="dropdown-header">
                    <div className="dh-name">{manager.name}</div>
                    <div className="dh-email">{manager.email}</div>
                  </div>
                  <Link to="/dashboard" onClick={() => setDropdownOpen(false)}>
                    🏠 Dashboard
                  </Link>
                  <a href="#my-team" onClick={(e) => { e.preventDefault(); setDropdownOpen(false); navigate('/dashboard'); }}>
                    👥 My Team
                  </a>
                  <Link to="/profile" onClick={() => setDropdownOpen(false)}>
                    👤 My Profile
                  </Link>
                  <a href="#logout" className="logout" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
                    🚪 Logout
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Main content */}
      <div className="profile-page">
        {error && (
          <div className="error-msg" style={{ display: 'block', marginBottom: 20 }}>{error}</div>
        )}

        {/* Request status banner */}
        {myRequest && (
          <div style={{ 
            marginBottom: 20, 
            padding: '14px 20px', 
            borderRadius: 10, 
            background: statusColor[myRequest.status]?.bg, 
            border: `1.5px solid ${statusColor[myRequest.status]?.border}`, 
            color: statusColor[myRequest.status]?.color, 
            fontSize: 13, 
            fontWeight: 600 
          }}>
            {statusColor[myRequest.status]?.label} — Your profile edit request is <strong>{myRequest.status}</strong>.
            {myRequest.status === 'pending' && ' Admin will review it soon.'}
            {myRequest.status === 'approved' && ' Your profile has been updated.'}
            {myRequest.status === 'rejected' && ' Please contact admin for more info.'}
          </div>
        )}

        {/* Profile Hero */}
        {manager && (
          <div className="profile-hero">
            <div className="avatar-edit-wrap">
              <div className="hero-avatar">
                {manager.image
                  ? <img src={manager.image} alt={manager.name} />
                  : initials(manager.name)
                }
              </div>
            </div>
            <div className="hero-info">
              <h1>{manager.name}</h1>
              <div className="hero-role">Manager</div>
              <div className="hero-badges">
                <span className="hero-badge active">
                  {manager.status || 'Active'}
                </span>
                <span className="hero-badge">
                  {manager.approvalStatus || 'Approved'}
                </span>
              </div>
            </div>
            <Link to="/dashboard" className="hero-back">
              ← Back to Dashboard
            </Link>
          </div>
        )}

        {/* Personal Information */}
        {manager && (
          <div className="profile-section">
            <div className="section-header" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="sec-icon">👤</div>
                <h3>Personal Information</h3>
              </div>
              <button
                className="prof-edit-btn"
                onClick={openReqModal}
                disabled={myRequest?.status === 'pending'}
                title={myRequest?.status === 'pending' ? 'You have a pending request' : ''}
                style={{ 
                  padding: '10px 20px',
                  background: '#2e7d32',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: myRequest?.status === 'pending' ? 'not-allowed' : 'pointer',
                  opacity: myRequest?.status === 'pending' ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                🔔 Request Change
              </button>
            </div>
            <div className="field-grid">
              <div className="field-item">
                <div className="f-label">Full Name</div>
                <div className="f-value">{manager.name}</div>
              </div>
              <div className="field-item">
                <div className="f-label">Email Address</div>
                <div className="f-value">
                  <a href={`mailto:${manager.email}`}>{manager.email}</a>
                </div>
              </div>
              <div className="field-item">
                <div className="f-label">Phone Number</div>
                <div className="f-value">{manager.phone || 'Not provided'}</div>
              </div>
              <div className="field-item">
                <div className="f-label">Location</div>
                <div className="f-value">{manager.location || 'Not provided'}</div>
              </div>
              {manager.dob && (
                <div className="field-item">
                  <div className="f-label">Date of Birth</div>
                  <div className="f-value">
                    {new Date(manager.dob).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              )}
              <div className="field-item">
                <div className="f-label">Role</div>
                <div className="f-value">Manager</div>
              </div>
            </div>
          </div>
        )}

        {/* Account Information */}
        {manager && (
          <div className="profile-section">
            <div className="section-header">
              <div className="sec-icon">🔐</div>
              <h3>Account Information</h3>
            </div>
            <div className="field-grid">
              <div className="field-item">
                <div className="f-label">Account Status</div>
                <div className="f-value">
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    background: manager.status === 'Active' ? '#e6f4ea' : '#f5f5f5',
                    color: manager.status === 'Active' ? '#2e7d32' : '#666',
                    border: `1px solid ${manager.status === 'Active' ? '#a8d5b5' : '#ddd'}`,
                  }}>
                    {manager.status || 'Active'}
                  </span>
                </div>
              </div>
              <div className="field-item">
                <div className="f-label">Approval Status</div>
                <div className="f-value">
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    background: manager.approvalStatus === 'approved' ? '#e6f4ea' : '#fff3e0',
                    color: manager.approvalStatus === 'approved' ? '#2e7d32' : '#e65100',
                    border: `1px solid ${manager.approvalStatus === 'approved' ? '#a8d5b5' : '#ffcc80'}`,
                  }}>
                    {manager.approvalStatus || 'Pending'}
                  </span>
                </div>
              </div>
              {manager.createdAt && (
                <div className="field-item">
                  <div className="f-label">Member Since</div>
                  <div className="f-value">
                    {new Date(manager.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Request Edit Modal */}
      {reqModal && (
        <div 
          style={{ 
            display: 'flex', 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.5)', 
            zIndex: 500, 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: 20 
          }}
          onClick={e => { if (e.target === e.currentTarget) setReqModal(false); }}
        >
          <div style={{ 
            background: '#fff', 
            borderRadius: 16, 
            width: '100%', 
            maxWidth: 500, 
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)', 
            maxHeight: '90vh', 
            overflowY: 'auto' 
          }}>
            <div style={{ 
              padding: '20px 24px 16px', 
              borderBottom: '1px solid #f0f5f0', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              position: 'sticky', 
              top: 0, 
              background: '#fff', 
              zIndex: 10 
            }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--green-dark)', margin: 0 }}>
                🔔 Request Profile Edit
              </h3>
              <button 
                onClick={() => setReqModal(false)} 
                style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: '50%', 
                  border: 'none', 
                  background: '#f5f5f5', 
                  cursor: 'pointer', 
                  fontSize: 18 
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ 
              padding: '16px 24px', 
              background: '#e3f2fd', 
              borderBottom: '1px solid #90caf9' 
            }}>
              <p style={{ fontSize: 12, color: '#1565c0', margin: 0, lineHeight: 1.6 }}>
                ℹ Your request will be sent to admin for review. Changes will only be applied after admin approval.
              </p>
            </div>

            <div style={{ 
              padding: '20px 24px', 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: 14 
            }}>
              {[
                ['Full Name',    'name',     'text', true],
                ['Phone Number', 'phone',    'tel',  false],
                ['Location',     'location', 'text', false],
              ].map(([lbl, key, type, full]) => (
                <div key={key} style={full ? { gridColumn: '1/-1' } : {}}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: 11, 
                    fontWeight: 700, 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.6px', 
                    color: 'var(--text-mid)', 
                    marginBottom: 6 
                  }}>
                    {lbl}
                  </label>
                  <input 
                    type={type} 
                    value={pf[key]} 
                    onChange={e => setPf(f => ({ ...f, [key]: e.target.value }))}
                    style={{ 
                      width: '100%', 
                      padding: '10px 14px', 
                      border: '1.5px solid #dde8dd', 
                      borderRadius: 8, 
                      fontSize: 14, 
                      outline: 'none', 
                      fontFamily: 'var(--font)' 
                    }} 
                  />
                </div>
              ))}

              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 11, 
                  fontWeight: 700, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.6px', 
                  color: 'var(--text-mid)', 
                  marginBottom: 6 
                }}>
                  Reason for change <span style={{ color: '#e53935' }}>*</span>
                </label>
                <textarea 
                  rows={3} 
                  value={reason} 
                  onChange={e => setReason(e.target.value)}
                  placeholder="Why do you want to update your profile?"
                  style={{ 
                    width: '100%', 
                    padding: '10px 14px', 
                    border: '1.5px solid #dde8dd', 
                    borderRadius: 8, 
                    fontSize: 14, 
                    outline: 'none', 
                    resize: 'vertical', 
                    fontFamily: 'var(--font)' 
                  }} 
                />
              </div>

              {pfErr && <div className="error-msg" style={{ display: 'block', gridColumn: '1/-1' }}>{pfErr}</div>}
              {pfOk  && <div className="success-msg" style={{ display: 'block', gridColumn: '1/-1' }}>{pfOk}</div>}
            </div>

            <div style={{ 
              padding: '16px 24px', 
              borderTop: '1px solid #f0f5f0', 
              display: 'flex', 
              gap: 10, 
              justifyContent: 'flex-end' 
            }}>
              <button 
                onClick={() => setReqModal(false)} 
                style={{ 
                  padding: '10px 20px', 
                  background: '#f5f5f5', 
                  color: 'var(--text-dark)', 
                  border: 'none', 
                  borderRadius: 8, 
                  fontSize: 14, 
                  fontWeight: 600, 
                  cursor: 'pointer' 
                }}
              >
                Cancel
              </button>
              <button 
                onClick={sendRequest} 
                disabled={pfSaving} 
                style={{ 
                  padding: '10px 24px', 
                  background: 'var(--green-dark)', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 8, 
                  fontSize: 14, 
                  fontWeight: 700, 
                  cursor: 'pointer' 
                }}
              >
                {pfSaving ? 'Sending...' : '🔔 Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
