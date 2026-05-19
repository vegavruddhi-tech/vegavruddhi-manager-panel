import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE } from '../api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [manager, setManager] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [tls,     setTls]     = useState([]);
  const [tlsLoading, setTlsLoading] = useState(true);
  const [selectedTL, setSelectedTL] = useState(null);
  const [fses, setFses] = useState([]);
  const [fsesLoading, setFsesLoading] = useState(false);
  const [showFSEModal, setShowFSEModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [kpis, setKpis] = useState(null);
  const [kpiModal, setKpiModal]       = useState(null);  // { title, type, data, loading }
  const [kpiSearch, setKpiSearch]     = useState('');
  const [dateFilter, setDateFilter]   = useState('all');
  const [fromDate,   setFromDate]     = useState('');
  const [toDate,     setToDate]       = useState('');
  const [selYear,    setSelYear]      = useState('');
  const [selMonth,   setSelMonth]     = useState(new Date().getMonth().toString());

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/'); return; }

    // Try cached data first for instant render
    const cached = localStorage.getItem('manager');
    if (cached) {
      try { setManager(JSON.parse(cached)); } catch {}
    }

    // Fetch fresh profile
    fetch(`${API_BASE}/api/manager/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.manager) {
          setManager(data.manager);
          localStorage.setItem('manager', JSON.stringify(data.manager));
        } else if (data.message) {
          setError(data.message);
        }
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false));

    // Fetch Team Leaders under this manager
    fetch(`${API_BASE}/api/manager/my-tls`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTls(data);
        }
      })
      .catch(err => console.error('Failed to load TLs:', err))
      .finally(() => setTlsLoading(false));

    // Fetch KPIs
    fetch(`${API_BASE}/api/manager/kpis`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setKpis(data))
      .catch(err => console.error('Failed to load KPIs:', err));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('manager');
    navigate('/');
  };

  const initials = (name) =>
    name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'M';

  const handleFSEClick = async (tl) => {
    setSelectedTL(tl);
    setShowFSEModal(true);
    setFsesLoading(true);
    setFses([]);

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/manager/tl/${tl._id}/fses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setFses(data);
      }
    } catch (err) {
      console.error('Failed to load FSEs:', err);
    } finally {
      setFsesLoading(false);
    }
  };

  const closeFSEModal = () => {
    setShowFSEModal(false);
    setSelectedTL(null);
    setFses([]);
  };

  const fetchKpis = (token, df, fd, td, sy, sm) => {
    const params = new URLSearchParams();
    if (df && df !== 'all') params.set('dateFilter', df);
    if (fd) params.set('fromDate', fd);
    if (td) params.set('toDate', td);
    if (sy) params.set('year', sy);
    if (sm !== '') params.set('month', sm);
    fetch(`${API_BASE}/api/manager/kpis?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setKpis(data))
      .catch(err => console.error('Failed to load KPIs:', err));
  };

  const handleKpiClick = async (type, title) => {
    setKpiModal({ title, type, data: null, loading: true });
    setKpiSearch('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/manager/kpi-detail?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setKpiModal({ title, type, data: Array.isArray(data) ? data : [], loading: false });
    } catch (err) {
      console.error('KPI detail error:', err);
      setKpiModal({ title, type, data: [], loading: false });
    }
  };

  if (loading && !manager) {
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
          <img src="/logo-full.png" alt="Vegavruddhi" />
        </div>
        <div className="nav-right">
          {manager && (
            <div 
              className="nav-profile"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{ position: 'relative' }}
            >
              <div className="nav-avatar">
                {manager.photoUrl
                  ? <img src={manager.photoUrl} alt={manager.name} />
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
                  <a href="#dashboard" onClick={(e) => { e.preventDefault(); setDropdownOpen(false); }}>
                    🏠 Dashboard
                  </a>
                  <a href="#my-team" onClick={(e) => { e.preventDefault(); setDropdownOpen(false); document.querySelector('.section-title').scrollIntoView({ behavior: 'smooth' }); }}>
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
      <div className="main-content">
        {error && (
          <div className="error-msg" style={{ display: 'block', marginBottom: 20 }}>{error}</div>
        )}

        {/* Welcome card */}
        {manager && (
          <div className="welcome-card">
            <div className="welcome-avatar">
              {manager.photoUrl
                ? <img src={manager.photoUrl} alt={manager.name} />
                : initials(manager.name)
              }
            </div>
            <div className="welcome-text">
              <h2>Welcome, {manager.name} 👋</h2>
              <p>Manager Portal — Vegavruddhi Pvt. Ltd.</p>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        {kpis && (
          <>
            <p className="section-title" style={{ marginTop: 28 }}>Team Overview</p>
            <div style={{ marginBottom: 12 }}>
              <div className="date-filter-bar">
                {['all','today','week'].map(f => (
                  <button key={f} className={`date-filter-btn${dateFilter === f ? ' active' : ''}`}
                    onClick={() => {
                      setDateFilter(f); setFromDate(''); setToDate('');
                      fetchKpis(localStorage.getItem('token'), f, '', toDate, selYear, selMonth);
                    }}>
                    {f === 'all' ? 'All' : f === 'today' ? 'Today' : 'This Week'}
                  </button>
                ))}
                <div className="date-filter-custom">
                  <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                  <span style={{ color: '#888', fontSize: 12 }}>to</span>
                  <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
                  <button className="date-filter-btn" onClick={() => {
                    setDateFilter('custom');
                    fetchKpis(localStorage.getItem('token'), 'custom', fromDate, toDate, selYear, selMonth);
                  }}>Apply</button>
                </div>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <span style={{ position: 'absolute', top: -9, left: 10, fontSize: 11, color: '#40916c', background: '#fff', padding: '0 4px', fontWeight: 600, zIndex: 1, pointerEvents: 'none' }}>Year</span>
                  <select value={selYear} onChange={e => { setSelYear(e.target.value); fetchKpis(localStorage.getItem('token'), dateFilter, fromDate, toDate, e.target.value, selMonth); }}
                    style={{ padding: '10px 32px 10px 12px', borderRadius: 10, border: '1.5px solid #40916c', fontSize: 14, color: selYear ? '#1a4731' : '#888', background: '#fff', cursor: 'pointer', appearance: 'none', minWidth: 100, outline: 'none' }}>
                    <option value=""></option>
                    {[2026,2025,2024,2023,2022,2021].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#40916c', fontSize: 12 }}>▼</span>
                </div>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <span style={{ position: 'absolute', top: -9, left: 10, fontSize: 11, color: '#40916c', background: '#fff', padding: '0 4px', fontWeight: 600, zIndex: 1, pointerEvents: 'none' }}>Month</span>
                  <select value={selMonth} onChange={e => { setSelMonth(e.target.value); fetchKpis(localStorage.getItem('token'), dateFilter, fromDate, toDate, selYear, e.target.value); }}
                    style={{ padding: '10px 32px 10px 12px', borderRadius: 10, border: '1.5px solid #40916c', fontSize: 14, color: selMonth !== '' ? '#1a4731' : '#888', background: '#fff', cursor: 'pointer', appearance: 'none', minWidth: 130, outline: 'none' }}>
                    <option value="">All Months</option>
                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m,i) => (
                      <option key={i} value={i.toString()}>{m}</option>
                    ))}
                  </select>
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#40916c', fontSize: 12 }}>▼</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
              {[
                { label: 'Total TLs',  value: kpis.totalTLs,  color: '#7c3aed', bg: '#f3e8ff', icon: '👥', type: 'totalTLs'  },
                { label: 'Active TLs', value: kpis.activeTLs, color: '#2e7d32', bg: '#e6f4ea', icon: '✅', type: 'activeTLs' },
                { label: 'Total FSEs', value: kpis.totalFSEs, color: '#1565c0', bg: '#e3f2fd', icon: '👤', type: 'totalFSEs' },
                { label: 'Active FSEs',value: kpis.activeFSEs,color: '#00796b', bg: '#e0f2f1', icon: '🟢', type: 'activeFSEs'},
              ].map(k => (
                <div key={k.label} onClick={() => handleKpiClick(k.type, k.label)} style={{
                  background: k.bg, borderRadius: 10, padding: '8px 8px',
                  border: `1.5px solid ${k.color}22`,
                  cursor: 'pointer', transition: 'transform 0.15s',
                }}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseOut={e  => { e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ fontSize: 14, marginBottom: 2 }}>{k.icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
                  <div style={{ fontSize: 9, color: '#555', fontWeight: 600, marginTop: 3, lineHeight: 1.3 }}>{k.label}</div>
                </div>
              ))}
            </div>

            <p className="section-title" style={{ marginTop: 20 }}>Forms This Month</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 24 }}>
              {[
                { label: 'Total Forms',     value: kpis.totalForms,    color: '#1565c0', bg: '#e3f2fd', icon: '📋', type: 'totalForms'   },
                { label: 'Fully Verified',  value: kpis.fullyVerified, color: '#2e7d32', bg: '#e6f4ea', icon: '✅', type: 'fullyVerified' },
                { label: 'Partially Done',  value: kpis.partiallyDone, color: '#e65100', bg: '#fff3e0', icon: '◑',  type: 'partiallyDone' },
                { label: 'Not Interested',  value: kpis.notInterested, color: '#c62828', bg: '#fdecea', icon: '❌', type: 'notInterested' },
                { label: "Today's Forms",   value: kpis.todayForms,    color: '#7c3aed', bg: '#f3e8ff', icon: '📅', type: 'today'         },
              ].map(k => (
                <div key={k.label} onClick={() => handleKpiClick(k.type, k.label)} style={{
                  background: k.bg, borderRadius: 10, padding: '8px 8px',
                  border: `1.5px solid ${k.color}22`,
                  cursor: 'pointer', transition: 'transform 0.15s',
                }}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseOut={e  => { e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ fontSize: 14, marginBottom: 2 }}>{k.icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
                  <div style={{ fontSize: 9, color: '#555', fontWeight: 600, marginTop: 3, lineHeight: 1.3 }}>{k.label}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Info cards */}
        {manager && (
          <>
            <p className="section-title">Your Details</p>
            <div className="info-grid">
              {manager.email && (
                <div className="info-card">
                  <div className="label">Email</div>
                  <div className="value">{manager.email}</div>
                </div>
              )}
              {manager.phone && (
                <div className="info-card">
                  <div className="label">Phone</div>
                  <div className="value">{manager.phone}</div>
                </div>
              )}
              {manager.location && (
                <div className="info-card">
                  <div className="label">Location</div>
                  <div className="value">{manager.location}</div>
                </div>
              )}
              {manager.dob && (
                <div className="info-card">
                  <div className="label">Date of Birth</div>
                  <div className="value">{new Date(manager.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
              )}
              {manager.status && (
                <div className="info-card">
                  <div className="label">Status</div>
                  <div className="value">{manager.status}</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Placeholder section */}
        <div style={{ marginTop: 32 }}>
          <p className="section-title">My Team Leaders</p>
          
          {tlsLoading ? (
            <div className="merchants-loading">Loading Team Leaders...</div>
          ) : tls.length === 0 ? (
            <div style={{
              background: 'var(--white)', borderRadius: 'var(--radius-lg)',
              padding: '40px 32px', textAlign: 'center',
              border: '1.5px dashed #dde8dd', color: 'var(--text-light)',
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-mid)', marginBottom: 6 }}>
                No Team Leaders assigned yet
              </p>
              <p style={{ fontSize: 13 }}>
                Team Leaders reporting to you will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tls.map((tl, idx) => (
                <div
                  key={tl._id}
                  className="merchant-row"
                  style={{ animation: `fadeInUp 0.4s ease ${idx * 0.05}s both` }}
                >
                  <div className="mr-avatar">
                    {tl.image ? (
                      <img src={tl.image} alt={tl.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    ) : (
                      initials(tl.name)
                    )}
                  </div>
                  <div className="mr-info" style={{ flex: 1 }}>
                    <div className="mr-name">{tl.name}</div>
                    <div className="mr-meta">
                      {tl.email && <span>📧 {tl.email}</span>}
                      {tl.phone && <span>📱 {tl.phone}</span>}
                      {tl.location && <span>📍 {tl.location}</span>}
                    </div>
                    <div className="mr-badges" style={{ marginTop: 6 }}>
                      <span 
                        className="verify-badge" 
                        onClick={() => handleFSEClick(tl)}
                        style={{ 
                          background: '#e3f2fd', 
                          color: '#1565c0', 
                          border: '1px solid #90caf9',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.background = '#bbdefb';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.background = '#e3f2fd';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        👥 {tl.fseCount || 0} FSEs
                      </span>
                      {tl.status && (
                        <span className={`mr-status ${tl.status === 'active' ? 'verify-badge' : ''}`} style={{
                          background: tl.status === 'active' ? '#e6f4ea' : '#f5f5f5',
                          color: tl.status === 'active' ? '#2e7d32' : '#666',
                          border: `1px solid ${tl.status === 'active' ? '#a8d5b5' : '#ddd'}`,
                        }}>
                          {tl.status}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mr-right">
                    {tl.createdAt && (
                      <div className="mr-date">
                        Joined: {new Date(tl.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KPI Detail Modal */}
      {kpiModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setKpiModal(null)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720,
              maxHeight: '85vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid #f0f5f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--green-dark)', color: '#fff',
            }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{kpiModal.title}</h3>
                {!kpiModal.loading && (
                  <p style={{ fontSize: 12, margin: '3px 0 0', opacity: 0.8 }}>
                    {kpiModal.data?.length || 0} records
                  </p>
                )}
              </div>
              <button
                onClick={() => setKpiModal(null)}
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: 'none',
                  background: 'rgba(255,255,255,0.2)', cursor: 'pointer',
                  fontSize: 18, color: '#fff', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>
            </div>

            {/* Search */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #f0f0f0' }}>
              <input
                type="text"
                placeholder="Search…"
                value={kpiSearch}
                onChange={e => setKpiSearch(e.target.value)}
                style={{
                  width: '100%', padding: '8px 14px', borderRadius: 8,
                  border: '1.5px solid #dde8dd', fontSize: 13, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Body */}
            <div style={{ padding: 16, maxHeight: 'calc(85vh - 140px)', overflowY: 'auto' }}>
              {kpiModal.loading ? (
                <div className="merchants-loading">Loading…</div>
              ) : kpiModal.data?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                  No records found.
                </div>
              ) : (() => {
                const isPersonList = ['totalTLs','activeTLs','totalFSEs','activeFSEs'].includes(kpiModal.type);
                const rows = (kpiModal.data || []).filter(r =>
                  !kpiSearch || Object.values(r).some(v => String(v||'').toLowerCase().includes(kpiSearch.toLowerCase()))
                );

                if (isPersonList) {
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {rows.map((r, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          background: '#fafcfa', borderRadius: 10, padding: '12px 16px',
                          border: '1.5px solid #e8f0e8',
                        }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                            background: 'linear-gradient(135deg, var(--green-dark), var(--green-mid))',
                            color: '#fff', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: 13, fontWeight: 800,
                          }}>
                            {initials(r.name)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dark)' }}>{r.name}</div>
                            <div style={{ fontSize: 12, color: '#888', marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                              {r.email    && <span>📧 {r.email}</span>}
                              {r.phone    && r.phone !== '—' && <span>📱 {r.phone}</span>}
                              {r.location && r.location !== '—' && <span>📍 {r.location}</span>}
                              {r.position && <span>💼 {r.position}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }

                // Forms cards (mobile-friendly)
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {rows.map((r, i) => (
                      <div key={i} style={{
                        background: i % 2 === 0 ? '#fff' : '#fafafa',
                        border: '1.5px solid #e8f0e8', borderRadius: 10,
                        padding: '12px 14px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <div>
                            <span style={{ fontSize: 11, color: '#999', fontWeight: 600 }}>#{i + 1} · {r.fse}</span>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a2e22', marginTop: 2 }}>{r.customer}</div>
                          </div>
                          <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, flexShrink: 0, marginLeft: 8,
                            background:
                              r.verificationStatus === 'Fully Verified'   ? '#e6f4ea' :
                              r.verificationStatus === 'Partially Done'   ? '#fff3e0' :
                              r.status === 'Ready for Onboarding'         ? '#e6f4ea' :
                              r.status === 'Not Interested'               ? '#fdecea' : '#fff3e0',
                            color:
                              r.verificationStatus === 'Fully Verified'   ? '#2e7d32' :
                              r.verificationStatus === 'Partially Done'   ? '#e65100' :
                              r.status === 'Ready for Onboarding'         ? '#2e7d32' :
                              r.status === 'Not Interested'               ? '#c62828' : '#e65100',
                          }}>
                            {(r.verificationStatus === 'Fully Verified' || r.verificationStatus === 'Partially Done')
                              ? r.verificationStatus
                              : r.status === 'Ready for Onboarding'
                                ? 'Fully Verified'
                                : r.status}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: '#666' }}>
                          {r.phone   && <span>📱 {r.phone}</span>}
                          {r.product && <span>📦 {r.product}</span>}
                          {r.date    && <span>📅 {r.date}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* FSE Modal */}
      {showFSEModal && (
        <div 
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, animation: 'fadeIn 0.2s ease',
          }}
          onClick={closeFSEModal}
        >
          <div 
            style={{
              background: '#fff', borderRadius: 16, width: '100%', maxWidth: 700,
              maxHeight: '80vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              animation: 'fadeInUp 0.3s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid #f0f5f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--green-dark)', color: '#fff',
            }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>
                  FSEs under {selectedTL?.name}
                </h3>
                <p style={{ fontSize: 12, margin: '4px 0 0', opacity: 0.8 }}>
                  {fses.length} Field Sales Executives
                </p>
              </div>
              <button
                onClick={closeFSEModal}
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: 'none',
                  background: 'rgba(255,255,255,0.2)', cursor: 'pointer',
                  fontSize: 18, color: '#fff', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 20, maxHeight: 'calc(80vh - 100px)', overflowY: 'auto' }}>
              {fsesLoading ? (
                <div className="merchants-loading">Loading FSEs...</div>
              ) : fses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-light)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-mid)' }}>
                    No FSEs found
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {fses.map((fse, idx) => (
                    <div
                      key={fse._id}
                      style={{
                        background: '#fafcfa', borderRadius: 12, padding: '16px 18px',
                        border: '1.5px solid #e8f0e8',
                        display: 'flex', alignItems: 'center', gap: 14,
                        transition: 'all 0.2s',
                        animation: `fadeInUp 0.3s ease ${idx * 0.05}s both`,
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.background = '#f0faf2';
                        e.currentTarget.style.borderColor = 'var(--green-light)';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.background = '#fafcfa';
                        e.currentTarget.style.borderColor = '#e8f0e8';
                      }}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--green-dark), var(--green-mid))',
                        color: '#fff', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 16, fontWeight: 800,
                        flexShrink: 0,
                      }}>
                        {initials(fse.name)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 4 }}>
                          {fse.name}
                        </div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-light)' }}>
                          {fse.phone && <span>📱 {fse.phone}</span>}
                          {fse.location && <span>📍 {fse.location}</span>}
                          {fse.position && <span>💼 {fse.position}</span>}
                        </div>
                      </div>
                      {fse.status && (
                        <span style={{
                          padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: fse.status === 'active' ? '#e6f4ea' : '#f5f5f5',
                          color: fse.status === 'active' ? '#2e7d32' : '#666',
                          border: `1px solid ${fse.status === 'active' ? '#a8d5b5' : '#ddd'}`,
                        }}>
                          {fse.status}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
