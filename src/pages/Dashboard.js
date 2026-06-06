import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE } from '../api';
import TideMerchantTimeline from '../components/TideMerchantTimeline';
import MeetingsModal from '../components/MeetingsModal';

const normalizeProduct = (product) => {
  const p = (product || '').toLowerCase().trim();
  if (p === 'tide insurance' || p === 'insurance') return 'Tide Insurance';
  if (p === 'tide' || p === 'tide onboarding') return 'Tide';
  if (p === 'msme' || p === 'tide msme') return 'Tide MSME';
  if (p === 'tide credit card' || p === 'credit card') return 'Tide Credit Card';
  if (p === 'tide bt' || p === 'bt') return 'Tide BT';
  return product;
};

const getVerifyKey = (f) => {
  const phone = f.customerNumber || f.phone || '';
  const rawProduct = f.formFillingFor || f.tideProduct || f.brand || f.product || '';
  const product = rawProduct.toLowerCase().trim();
  const month = f.createdAt ? new Date(f.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' }) : '';
  return product ? `${phone}__${product}__${month}` : `${phone}__${month}`;
};

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
  const [fseStats, setFseStats] = useState({});
  const [fseForms, setFseForms] = useState([]);
  const [fseVerifyMap, setFseVerifyMap] = useState({});
  const [selectedFSE, setSelectedFSE] = useState(null);
  const [verifyDetail, setVerifyDetail] = useState(null);
  const [myForms, setMyForms] = useState([]);
  const [myFormsLoading, setMyFormsLoading] = useState(false);
  const [showMyForms, setShowMyForms] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [myFormsVerifyMap, setMyFormsVerifyMap] = useState({});
  const [tlFormsModal, setTlFormsModal] = useState(null);
  const [productFilter, setProductFilter] = useState('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [kpis, setKpis] = useState(null);
  const [kpiModal, setKpiModal]       = useState(null);
  const [kpiSearch, setKpiSearch]     = useState('');
  const [dateFilter, setDateFilter]   = useState('all');
  const [fromDate,   setFromDate]     = useState('');
  const [toDate,     setToDate]       = useState('');
  const [selYear,    setSelYear]      = useState(new Date().getFullYear().toString());
  const [selMonth,   setSelMonth]     = useState(new Date().getMonth().toString());
  
  const [meetingsOpen, setMeetingsOpen] = useState(false);
  const [meetingCount, setMeetingCount] = useState(0);
  
  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  // PWA Install prompt handler
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false);
    }

    window.addEventListener('appinstalled', () => {
      setShowInstallButton(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

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
      .then(r => {
        if (r.status === 401) { handleUnauthorized(); return null; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        if (data._id) {
          setManager(data);
          localStorage.setItem('manager', JSON.stringify(data));
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

    // Fetch KPIs (show cached instantly, refresh in background)
    const cachedKpis = localStorage.getItem('manager_kpis');
    if (cachedKpis) { try { setKpis(JSON.parse(cachedKpis)); } catch {} }
    fetch(`${API_BASE}/api/manager/kpis`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (r.status === 401) { handleUnauthorized(); return null; }
        return r.json();
      })
      .then(data => {
        if (data) {
          setKpis(data);
          try { localStorage.setItem('manager_kpis', JSON.stringify(data)); } catch {}
          // Background: update verification counts after page renders
          setTimeout(async () => {
            try {
              const formsRes = await fetch(`${API_BASE}/api/manager/kpi-detail?type=totalForms`, { headers: { Authorization: `Bearer ${token}` } });
              const allForms = await formsRes.json();
              if (Array.isArray(allForms) && allForms.length > 0) {
                const vRes = await fetch(`${API_BASE}/api/verify/bulk-cached`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({
                    phones: allForms.map(f => f.phone || ''),
                    names: allForms.map(f => f.customer || ''),
                    products: allForms.map(f => (f.product || '').toLowerCase().trim()),
                    months: allForms.map(f => f.createdAt ? new Date(f.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' }) : ''),
                  }),
                });
                const vm = await vRes.json();
                let fv = 0, pd = 0;
                allForms.forEach(f => {
                  const vKey = getVerifyKey(f);
                  const status = vm[vKey]?.status;
                  if (status === 'Fully Verified') fv++;
                  else if (status === 'Partially Done') pd++;
                });
                setKpis(prev => prev ? { ...prev, fullyVerified: fv, partiallyDone: pd } : prev);
              }
            } catch {}
          }, 500);
        }
      })
      .catch(err => console.error('Failed to load KPIs:', err));

    // Fetch manager's own forms
    setMyFormsLoading(true);
    const cachedMyForms = localStorage.getItem('manager_my_forms');
    if (cachedMyForms) {
      try { setMyForms(JSON.parse(cachedMyForms)); setMyFormsLoading(false); } catch {}
    }
    fetch(`${API_BASE}/api/manager/my-forms`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(async (data) => {
        if (Array.isArray(data)) {
          setMyForms(data);
          try { localStorage.setItem('manager_my_forms', JSON.stringify(data)); } catch {}
          // Fetch verification for my forms
          if (data.length > 0) {
            try {
              const vRes = await fetch(`${API_BASE}/api/verify/bulk-cached`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  phones: data.map(f => f.customerNumber || ''),
                  names: data.map(f => f.customerName || ''),
                  products: data.map(f => (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim()),
                  months: data.map(f => f.createdAt ? new Date(f.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' }) : ''),
                }),
              });
              const vm = await vRes.json();
              setMyFormsVerifyMap(vm || {});
            } catch {}
          }
        }
      })
      .catch(err => console.error('Failed to load my forms:', err))
      .finally(() => setMyFormsLoading(false));

    // Initial meetings count fetch
    const refreshMeetings = () => {
      const email = manager?.email;
      if (!token || !email) return;
      fetch(`${API_BASE}/api/meetings/my-meetings?email=${encodeURIComponent(email)}`, {
        headers: { Authorization: 'Bearer ' + token }
      })
        .then(r => r.json())
        .then(data => {
          if (data.success && data.unreadCount !== undefined) {
            setMeetingCount(data.unreadCount);
          }
        })
        .catch(() => {});
    };
    
    refreshMeetings();
    const mInterval = setInterval(refreshMeetings, 15000);
    return () => clearInterval(mInterval);
  }, [navigate, manager?.email]);

  const handleLogout = () => {
    // Clear all manager caches
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('fse_stats_') || k === 'manager_my_forms' || k === 'manager_kpis') localStorage.removeItem(k);
    });
    localStorage.removeItem('token');
    localStorage.removeItem('manager');
    navigate('/');
  };

  const handleUnauthorized = () => {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('fse_stats_') || k === 'manager_my_forms') localStorage.removeItem(k);
    });
    localStorage.removeItem('token');
    localStorage.removeItem('manager');
    navigate('/');
  };

  const initials = (name) =>
    name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'M';

  const handleFSEClick = async (tl) => {
    setSelectedTL(tl);
    setShowFSEModal(true);
    setFseStats({});

    const token = localStorage.getItem('token');
    const cacheKey = `fse_stats_${tl._id}`;

    // Load from cache instantly (max 30 min old)
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { fses: cachedFses, stats: cachedStats, forms: cachedForms, ts } = JSON.parse(cached);
        const age = Date.now() - (ts || 0);
        if (age < 30 * 60 * 1000) {
          setFses(cachedFses);
          setFseStats(cachedStats);
          setFseForms(cachedForms || []);
          setFsesLoading(false);
        } else {
          localStorage.removeItem(cacheKey);
          setFsesLoading(true);
          setFses([]);
          setFseForms([]);
        }
      } catch {
        setFsesLoading(true);
        setFses([]);
        setFseForms([]);
      }
    } else {
      setFsesLoading(true);
      setFses([]);
      setFseForms([]);
    }

    // Fetch fresh
    try {
      const [fseRes, formsRes] = await Promise.all([
        fetch(`${API_BASE}/api/manager/tl/${tl._id}/fses`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/manager/tl/${tl._id}/fse-forms?year=${selYear}&month=${selMonth}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const fseData = await fseRes.json();
      const formsData = await formsRes.json();

      if (Array.isArray(fseData)) setFses(fseData);
      if (Array.isArray(formsData)) setFseForms(formsData);
      setFsesLoading(false);

      // Fetch verification
      if (Array.isArray(formsData) && formsData.length > 0) {
        let verifyMap = {};
        try {
          const vRes = await fetch(`${API_BASE}/api/verify/bulk-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              phones:   formsData.map(f => f.customerNumber || ''),
              names:    formsData.map(f => f.customerName || ''),
              products: formsData.map(f => (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim()),
              months:   formsData.map(f => f.createdAt ? new Date(f.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' }) : ''),
            }),
          });
          verifyMap = await vRes.json();
        } catch {}

        // Build stats per FSE
        const statsMap = {};
        formsData.forEach(f => {
          const name = (f.employeeName || '').trim().toLowerCase();
          if (!statsMap[name]) statsMap[name] = { total: 0, fullyVerified: 0, partiallyDone: 0, notInterested: 0, notVerified: 0 };
          statsMap[name].total++;
          const vKey = getVerifyKey(f);
          const verification = verifyMap[vKey];
          const st = (f.status || '').trim();
          if (verification) {
            if (verification.status === 'Fully Verified') statsMap[name].fullyVerified++;
            else if (verification.status === 'Partially Done') statsMap[name].partiallyDone++;
            else if (st === 'Not Interested') statsMap[name].notInterested++;
            else statsMap[name].notVerified++;
          } else {
            if (st === 'Not Interested') statsMap[name].notInterested++;
            else statsMap[name].notVerified++;
          }
        });
        setFseStats(statsMap);
        setFseVerifyMap(verifyMap);

        // Cache
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ fses: fseData, stats: statsMap, forms: formsData, ts: Date.now() }));
        } catch {}
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
    setFseStats({});
    setFseForms([]);
    setFseVerifyMap({});
    setSelectedFSE(null);
  };

  const handleTLFormsClick = async (tl) => {
    setTlFormsModal({ tl, forms: [], verifyMap: {}, loading: true });
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/manager/tl/${tl._id}/tl-forms?year=${selYear}&month=${selMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const forms = await res.json();
      if (!Array.isArray(forms)) { setTlFormsModal(prev => ({ ...prev, loading: false })); return; }

      // Fetch verification
      let verifyMap = {};
      if (forms.length > 0) {
        try {
          const vRes = await fetch(`${API_BASE}/api/verify/bulk-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              phones:   forms.map(f => f.customerNumber || ''),
              names:    forms.map(f => f.customerName || ''),
              products: forms.map(f => (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim()),
              months:   forms.map(f => f.createdAt ? new Date(f.createdAt).toLocaleString('en-US', { month: 'long', year: 'numeric' }) : ''),
            }),
          });
          verifyMap = await vRes.json();
        } catch {}
      }
      setTlFormsModal({ tl, forms, verifyMap, loading: false });
    } catch {
      setTlFormsModal(prev => ({ ...prev, loading: false }));
    }
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
          {/* Install App Button (PWA) */}
          {showInstallButton && (
            <div
              onClick={handleInstallClick}
              style={{
                marginRight: 12,
                cursor: 'pointer',
                padding: '8px 16px',
                borderRadius: 20,
                background: 'linear-gradient(135deg, #1a4731 0%, #40916c 100%)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
                border: '2px solid #40916c',
                boxShadow: '0 2px 8px rgba(26, 71, 49, 0.3)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(26, 71, 49, 0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(26, 71, 49, 0.3)';
              }}
            >
              <span style={{ fontSize: 16 }}>📱</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                Install App
              </span>
            </div>
          )}
          
          {/* 🎥 Meetings Bell */}
          <div
            onClick={() => setMeetingsOpen(true)}
            style={{
              position: 'relative', marginRight: 12, cursor: 'pointer',
              width: 40, height: 40, borderRadius: '50%',
              background: meetingCount > 0 ? '#2e7d32' : 'rgba(46,125,50,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: meetingCount > 0 ? '2px solid #66bb6a' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#2e7d32'}
            onMouseLeave={e => e.currentTarget.style.background = meetingCount > 0 ? '#2e7d32' : 'rgba(46,125,50,0.08)'}
          >
            <span style={{ fontSize: 18 }}>🎥</span>
            {meetingCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: '#ff9800', color: '#fff', borderRadius: '50%',
                width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, border: '2px solid #fff',
              }}>
                {meetingCount > 9 ? '9+' : meetingCount}
              </span>
            )}
          </div>

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
          <div className="welcome-card" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="welcome-avatar" style={{ flexShrink: 0 }}>
              {manager.image
                ? <img src={manager.image} alt={manager.name} />
                : initials(manager.name)
              }
            </div>
            <div className="welcome-text" style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>Welcome, {manager.name} 👋</h2>
              <p style={{ fontSize: 11, margin: '2px 0 0', opacity: 0.85 }}>Manager Portal — Vegavruddhi Pvt. Ltd.</p>
            </div>
            {/* Total Points badge */}
            {(() => {
              let totalPoints = 0;
              myForms.forEach(f => {
                if (f.status === 'Ready for Onboarding') {
                  // Filter by selected month/year
                  if (selYear && new Date(f.createdAt).getFullYear() !== parseInt(selYear)) return;
                  if (selMonth !== '' && new Date(f.createdAt).getMonth() !== parseInt(selMonth)) return;
                  const vKey = getVerifyKey(f);
                  const vStatus = myFormsVerifyMap[vKey]?.status;
                  if (vStatus === 'Fully Verified') {
                    totalPoints += myFormsVerifyMap[vKey]?.points || 0;
                  }
                }
              });
              totalPoints = Math.round(totalPoints * 10) / 10;
              return (
                <div style={{
                  background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)',
                  borderRadius: 12, padding: '8px 16px', textAlign: 'center',
                  backdropFilter: 'blur(4px)', flexShrink: 0,
                }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '1px' }}>TOTAL POINTS</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginTop: 2 }}>{totalPoints}</div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Fill Merchant Visit Form card */}
        <div style={{ marginBottom: 20 }}>
          <p className="section-title">Actions</p>
          <Link to="/merchant-form" style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#fff', borderRadius: 14, padding: '16px 20px',
              border: '1.5px solid #e8f0e8', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'all 0.2s',
            }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--green-dark)'; e.currentTarget.style.background = '#f0faf2'; }}
              onMouseOut={e  => { e.currentTarget.style.borderColor = '#e8f0e8';           e.currentTarget.style.background = '#fff'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, background: '#e6f4ea',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>📋</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--green-dark)' }}>Fill Merchant Visit Form</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Submit details after a merchant meeting</div>
                </div>
              </div>
              <span style={{ color: '#aaa', fontSize: 18 }}>›</span>
            </div>
          </Link>
        </div>

        {/* My Forms section */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p className="section-title" style={{ margin: 0 }}>My Merchant Forms ({myForms.length})</p>
            <button
              onClick={() => setShowMyForms(p => !p)}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid var(--green-dark)', background: '#fff', color: 'var(--green-dark)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
            >
              {showMyForms ? 'Hide' : 'Show'}
            </button>
          </div>
          {showMyForms && (
            myFormsLoading ? (
              <div className="merchants-loading">Loading forms…</div>
            ) : myForms.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, padding: '28px 20px', textAlign: 'center', border: '1.5px dashed #dde8dd', color: '#aaa' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>No forms submitted yet</p>
              </div>
            ) : (() => {
              // Product counts - only Fully Verified forms
              const productCounts = {};
              myForms.forEach(f => {
                if (f.status === 'Ready for Onboarding') {
                  const prod = normalizeProduct(f.formFillingFor || f.tideProduct || f.brand || '');
                  const vKey = getVerifyKey(f);
                  if (myFormsVerifyMap[vKey]?.status === 'Fully Verified') {
                    productCounts[prod] = (productCounts[prod] || 0) + 1;
                  }
                }
              });
              const products = ['Tide', 'Tide Insurance', 'Tide MSME', 'Tide Credit Card'];
              const filteredForms = productFilter === 'all' ? myForms : myForms.filter(f => {
                const prod = normalizeProduct(f.formFillingFor || f.tideProduct || f.brand || '');
                if (prod !== productFilter) return false;
                // Only show Fully Verified forms when product is selected
                const vKey = getVerifyKey(f);
                return myFormsVerifyMap[vKey]?.status === 'Fully Verified';
              });
              return (
              <>
              {/* Product filter pills */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <button onClick={() => setProductFilter('all')} style={{
                  padding: '6px 14px', borderRadius: 20, border: `1.5px solid var(--green-dark)`,
                  background: productFilter === 'all' ? 'var(--green-dark)' : '#fff',
                  color: productFilter === 'all' ? '#fff' : 'var(--green-dark)',
                  fontWeight: 700, fontSize: 12, cursor: 'pointer',
                }}>All Products</button>
                {products.map(p => (
                  <button key={p} onClick={() => setProductFilter(p)} style={{
                    padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${productFilter === p ? 'var(--green-dark)' : '#dde8dd'}`,
                    background: productFilter === p ? 'var(--green-dark)' : '#fff',
                    color: productFilter === p ? '#fff' : '#555',
                    fontWeight: 600, fontSize: 11, cursor: 'pointer',
                  }}>{p}: {productCounts[p] || 0} ✓</button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredForms.map((f, i) => {
                  const vKey = getVerifyKey(f);
                  const vData = myFormsVerifyMap[vKey];
                  const vStatus = vData ? vData.status : (f.verificationStatus || 'Not Found');
                  const vColor = vStatus === 'Fully Verified' ? '#2e7d32' : vStatus === 'Partially Done' ? '#e65100' : vStatus === 'Not Verified' ? '#c62828' : '#757575';
                  const vBg = vStatus === 'Fully Verified' ? '#e6f4ea' : vStatus === 'Partially Done' ? '#fff3e0' : vStatus === 'Not Verified' ? '#fdecea' : '#f5f5f5';
                  return (
                    <div key={f._id || i} onClick={() => { setSelectedForm(f); }} style={{
                      background: '#fff', borderRadius: 12, padding: '14px 16px',
                      border: '1.5px solid #e8f0e8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                      onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--green-dark)'; e.currentTarget.style.background = '#f8fcf9'; }}
                      onMouseOut={e  => { e.currentTarget.style.borderColor = '#e8f0e8'; e.currentTarget.style.background = '#fff'; }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-dark)', marginBottom: 4 }}>{f.customerName}</div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, color: '#888' }}>
                          {f.customerNumber && <span>📱 {f.customerNumber}</span>}
                          {f.location && <span>📍 {f.location}</span>}
                          {(f.formFillingFor || f.brand) && <span>📦 {f.formFillingFor || f.brand}</span>}
                          {f.createdAt && <span>📅 {new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: vBg, color: vColor, whiteSpace: 'nowrap' }}>
                          {vStatus}
                        </span>
                        {f.customerNumber && (() => {
                          const prod = (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim();
                          return prod === 'tide';
                        })() && (
                          <div onClick={e => e.stopPropagation()} style={{ marginTop: 4 }}>
                            <TideMerchantTimeline phone={f.customerNumber} customerName={f.customerName} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
              );
            })()
          )}
        </div>

        {/* Form Detail Modal - moved outside main-content */}
        {/* KPI Cards */}
        {kpis && (
          <>
            <p className="section-title" style={{ marginTop: 28 }}>Team Overview</p>            <div style={{ marginBottom: 12 }}>
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
                <button
                  onClick={() => {
                    const currentYear = new Date().getFullYear().toString();
                    const currentMonth = new Date().getMonth().toString();
                    setDateFilter('all');
                    setFromDate('');
                    setToDate('');
                    setSelYear(currentYear);
                    setSelMonth(currentMonth);
                    fetchKpis(localStorage.getItem('token'), 'all', '', '', currentYear, currentMonth);
                  }}
                  style={{
                    padding: '10px 16px', borderRadius: 10, border: '1.5px solid #e53935',
                    background: '#fff', color: '#e53935', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', whiteSpace: 'nowrap'
                  }}>
                  ↺ Reset
                </button>
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
                      <span 
                        className="verify-badge" 
                        onClick={() => handleTLFormsClick(tl)}
                        style={{ 
                          background: '#f3e8ff', 
                          color: '#7c3aed', 
                          border: '1px solid #d4b5ff',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.background = '#e8d5ff';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.background = '#f3e8ff';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        📋 TL Forms
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
                  {fses.map((fse, idx) => {
                    const fseName = (fse.name || '').trim().toLowerCase();
                    const stats = fseStats[fseName];
                    const formCount = stats?.total || 0;
                    const isSelected = selectedFSE && selectedFSE.name === fse.name;
                    const fseFormsList = fseForms.filter(f => (f.employeeName || '').trim().toLowerCase() === fseName);

                    return (
                    <div key={fse._id}>
                    <div
                      style={{
                        background: isSelected ? '#f0faf2' : '#fafcfa', borderRadius: 12, padding: '12px 14px',
                        border: `1.5px solid ${isSelected ? 'var(--green-dark)' : '#e8f0e8'}`,
                        cursor: 'pointer', transition: 'all 0.2s',
                        animation: `fadeInUp 0.3s ease ${idx * 0.05}s both`,
                      }}
                      onClick={() => setSelectedFSE(isSelected ? null : fse)}
                    >
                      {/* Top row: avatar + name + status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                          background: 'linear-gradient(135deg, var(--green-dark), var(--green-mid))',
                          color: '#fff', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 13, fontWeight: 800,
                        }}>
                          {initials(fse.name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dark)' }}>{fse.name}</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>
                            {fse.phone && <span>📱 {fse.phone}</span>}
                            {fse.location && <span>📍 {fse.location}</span>}
                            {fse.position && <span>💼 {fse.position}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          {fse.status && (
                            <span style={{
                              padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                              background: fse.status === 'active' ? '#e6f4ea' : '#f5f5f5',
                              color: fse.status === 'active' ? '#2e7d32' : '#666',
                            }}>
                              {fse.status}
                            </span>
                          )}
                          <span style={{ color: '#aaa', fontSize: 12 }}>{isSelected ? '▲' : '▼'}</span>
                        </div>
                      </div>
                      {/* Stats row */}
                      {stats && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {[
                            { label: 'Total',    value: stats.total,          color: '#1565c0', bg: '#e3f2fd' },
                            { label: '✅ Verified', value: stats.fullyVerified, color: '#2e7d32', bg: '#e6f4ea' },
                            { label: '◑ Partial', value: stats.partiallyDone, color: '#e65100', bg: '#fff3e0' },
                            { label: '❌ Not Int', value: stats.notInterested, color: '#c62828', bg: '#fdecea' },
                            { label: '⬜ Unverified', value: stats.notVerified, color: '#555',   bg: '#f5f5f5' },
                          ].map(stat => (
                            <span key={stat.label} style={{
                              padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                              background: stat.bg, color: stat.color, border: `1px solid ${stat.color}30`,
                            }}>
                              {stat.label}: {stat.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Expanded forms list */}
                    {isSelected && fseFormsList.length > 0 && (
                      <div style={{ marginTop: 8, background: '#fff', borderRadius: 10, border: '1px solid #e8f0e8', overflow: 'hidden', maxHeight: 400, overflowY: 'auto' }}>
                        {fseFormsList.map((f, fi) => {
                          const vKey = getVerifyKey(f);
                          const v = fseVerifyMap[vKey];
                          const vStatus = v ? v.status : 'Not Found';
                          const vColor = vStatus === 'Fully Verified' ? '#2e7d32' : vStatus === 'Partially Done' ? '#e65100' : vStatus === 'Critical Failure' ? '#c62828' : '#757575';
                          const vBg = vStatus === 'Fully Verified' ? '#e6f4ea' : vStatus === 'Partially Done' ? '#fff3e0' : vStatus === 'Critical Failure' ? '#fdecea' : '#f5f5f5';
                          const sBg = f.status === 'Ready for Onboarding' ? '#e6f4ea' : f.status === 'Not Interested' ? '#fdecea' : '#fff3e0';
                          const sColor = f.status === 'Ready for Onboarding' ? '#2e7d32' : f.status === 'Not Interested' ? '#c62828' : '#e65100';
                          return (
                            <div key={f._id || fi} style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0', background: fi % 2 === 0 ? '#fff' : '#fafafa' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                <div>
                                  <span style={{ fontSize: 10, color: '#aaa', marginRight: 6 }}>#{fi + 1}</span>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>{f.customerName || '–'}</span>
                                </div>
                                <span onClick={(e) => {
                                  e.stopPropagation();
                                  const vKey2 = getVerifyKey(f);
                                  const vData = fseVerifyMap[vKey2];
                                  if (vData && vData.checks) {
                                    setVerifyDetail({ customerName: f.customerName, status: vData.status, checks: vData.checks, passed: vData.passed, total: vData.total });
                                  }
                                }} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 9, fontWeight: 700, background: vBg, color: vColor, flexShrink: 0, cursor: vStatus !== 'Not Found' ? 'pointer' : 'default' }}>
                                  {vStatus}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, color: '#888' }}>
                                <span>📱 {f.customerNumber || '–'}</span>
                                <span>📦 {f.formFillingFor || f.tideProduct || f.brand || '–'}</span>
                                <span style={{ padding: '1px 6px', borderRadius: 10, fontSize: 9, fontWeight: 700, background: sBg, color: sColor }}>
                                  {f.status === 'Ready for Onboarding' ? 'Onboarding' : f.status || '–'}
                                </span>
                                {f.createdAt && <span>📅 {new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                                {f.customerNumber && (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim() === 'tide' && (
                                  <div onClick={e => e.stopPropagation()} style={{ display: 'inline-flex' }}>
                                    <TideMerchantTimeline phone={f.customerNumber} customerName={f.customerName} />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {isSelected && fseFormsList.length === 0 && (
                      <div style={{ marginTop: 8, padding: '16px', textAlign: 'center', color: '#aaa', fontSize: 13, background: '#fafafa', borderRadius: 8 }}>No forms submitted by this FSE</div>
                    )}
                    </div>
                  );})}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Verification Detail Modal */}
      {verifyDetail && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setVerifyDetail(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, maxHeight: '80vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: verifyDetail.status === 'Fully Verified' ? 'linear-gradient(135deg, #2e7d32, #1b5e20)' :
                verifyDetail.status === 'Partially Done' ? 'linear-gradient(135deg, #f57f17, #e65100)' :
                'linear-gradient(135deg, #757575, #424242)',
              color: '#fff',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{verifyDetail.customerName}</div>
                <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
                  {verifyDetail.status} ({verifyDetail.passed}/{verifyDetail.total} checks passed)
                </div>
              </div>
              <button onClick={() => setVerifyDetail(null)} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 16, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ padding: 16, maxHeight: 'calc(80vh - 70px)', overflowY: 'auto' }}>
              {verifyDetail.checks.map((check, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 6,
                  background: check.pass ? '#e6f4ea' : '#fdecea', borderRadius: 8,
                  border: `1px solid ${check.pass ? '#2e7d32' : '#c62828'}20`,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: check.pass ? '#2e7d32' : '#c62828', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800,
                  }}>
                    {check.pass ? '✓' : '✗'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: check.pass ? '#2e7d32' : '#c62828' }}>{check.label}</div>
                    {check.actual && <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Value: {check.actual}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TL Forms Modal */}
      {tlFormsModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setTlFormsModal(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '85vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #f0f5f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#7c3aed', color: '#fff' }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>📋 {tlFormsModal.tl.name}'s Forms</h3>
                <p style={{ fontSize: 12, margin: '3px 0 0', opacity: 0.8 }}>{tlFormsModal.forms.length} merchant form{tlFormsModal.forms.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setTlFormsModal(null)} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 18, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ padding: 16, maxHeight: 'calc(85vh - 80px)', overflowY: 'auto' }}>
              {tlFormsModal.loading ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>Loading forms…</div>
              ) : tlFormsModal.forms.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#aaa' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>No forms submitted by this TL</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tlFormsModal.forms.map((f, fi) => {
                    const vKey = getVerifyKey(f);
                    const v = tlFormsModal.verifyMap[vKey];
                    const vStatus = v ? v.status : 'Not Found';
                    const vColor = vStatus === 'Fully Verified' ? '#2e7d32' : vStatus === 'Partially Done' ? '#e65100' : vStatus === 'Critical Failure' ? '#c62828' : '#757575';
                    const vBg = vStatus === 'Fully Verified' ? '#e6f4ea' : vStatus === 'Partially Done' ? '#fff3e0' : vStatus === 'Critical Failure' ? '#fdecea' : '#f5f5f5';
                    return (
                      <div key={f._id || fi}
                        onClick={() => setSelectedForm(f)}
                        style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0', background: fi % 2 === 0 ? '#fff' : '#fafafa', borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseOver={e => { e.currentTarget.style.background = '#f0f5ff'; e.currentTarget.style.borderColor = '#7c3aed'; }}
                        onMouseOut={e => { e.currentTarget.style.background = fi % 2 === 0 ? '#fff' : '#fafafa'; e.currentTarget.style.borderColor = '#f0f0f0'; }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <div>
                            <span style={{ fontSize: 10, color: '#aaa', marginRight: 6 }}>#{fi + 1}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>{f.customerName || '–'}</span>
                          </div>
                          <span
                            onClick={(e) => {
                               e.stopPropagation();
                               if (v && v.checks) {
                                 setVerifyDetail({ customerName: f.customerName, status: v.status, checks: v.checks, passed: v.passed, total: v.total });
                               }
                             }}
                            style={{ padding: '2px 8px', borderRadius: 12, fontSize: 9, fontWeight: 700, background: vBg, color: vColor, flexShrink: 0, cursor: (v && v.checks) ? 'pointer' : 'default', transition: 'transform 0.15s' }}
                            onMouseOver={e => { if (v && v.checks) e.currentTarget.style.transform = 'scale(1.1)'; }}
                            onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                          >
                            {vStatus}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, color: '#888' }}>
                          <span>📱 {f.customerNumber || '–'}</span>
                          <span>📦 {f.formFillingFor || f.tideProduct || f.brand || '–'}</span>
                          {f.createdAt && <span>📅 {new Date(f.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                          {f.customerNumber && (f.formFillingFor || f.tideProduct || f.brand || '').toLowerCase().trim() === 'tide' && (
                            <div onClick={e => e.stopPropagation()} style={{ display: 'inline-flex' }}>
                              <TideMerchantTimeline phone={f.customerNumber} customerName={f.customerName} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form Detail Modal — at root level to avoid overflow:hidden clipping */}
      {selectedForm && (() => {
        const sfVKey = getVerifyKey(selectedForm);
        // Check both myFormsVerifyMap and tlFormsModal verifyMap for verification data
        const sfVerify = myFormsVerifyMap[sfVKey] || (tlFormsModal && tlFormsModal.verifyMap ? tlFormsModal.verifyMap[sfVKey] : null) || (fseVerifyMap ? fseVerifyMap[sfVKey] : null);
        const sfVStatus = sfVerify ? sfVerify.status : (selectedForm.verificationStatus || 'Not Found');
        const sfVColor = sfVStatus === 'Fully Verified' ? '#2e7d32' : sfVStatus === 'Partially Done' ? '#e65100' : sfVStatus === 'Critical Failure' ? '#c62828' : '#757575';
        const sfVBg = sfVStatus === 'Fully Verified' ? '#e6f4ea' : sfVStatus === 'Partially Done' ? '#fff3e0' : sfVStatus === 'Critical Failure' ? '#fdecea' : '#f5f5f5';
        return (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setSelectedForm(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '85vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #f0f5f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--green-dark)', color: '#fff' }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{selectedForm.customerName}</h3>
                <p style={{ fontSize: 12, margin: '3px 0 0', opacity: 0.8 }}>📱 {selectedForm.customerNumber} · 📍 {selectedForm.location || '–'}</p>
              </div>
              <button onClick={() => setSelectedForm(null)} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 18, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ padding: 20, overflowY: 'auto', maxHeight: 'calc(85vh - 80px)' }}>
              {/* Verification Status Banner */}
              <div
                onClick={() => {
                  if (sfVerify && sfVerify.checks) {
                    setVerifyDetail({ customerName: selectedForm.customerName, status: sfVerify.status, checks: sfVerify.checks, passed: sfVerify.passed, total: sfVerify.total });
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: 10, marginBottom: 16,
                  background: sfVBg, border: `1.5px solid ${sfVColor}30`,
                  cursor: (sfVerify && sfVerify.checks) ? 'pointer' : 'default',
                  transition: 'transform 0.15s',
                }}
                onMouseOver={e => { if (sfVerify && sfVerify.checks) e.currentTarget.style.transform = 'scale(1.02)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Verification Status</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: sfVColor, marginTop: 2 }}>{sfVStatus}</div>
                  {sfVerify && sfVerify.passed !== undefined && (
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{sfVerify.passed}/{sfVerify.total} checks passed</div>
                  )}
                </div>
                {(sfVerify && sfVerify.checks) && (
                  <div style={{ fontSize: 11, color: sfVColor, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    View Details <span style={{ fontSize: 14 }}>›</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  ['Status', selectedForm.status],
                  ['Brand', selectedForm.brand || '–'],
                  ['Product', selectedForm.formFillingFor || selectedForm.tideProduct || '–'],
                  ['Date', selectedForm.createdAt ? new Date(selectedForm.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '–'],
                  ...(selectedForm.employeeName ? [['Submitted By', selectedForm.employeeName]] : []),
                  ...(selectedForm.tide_qrPosted ? [['QR Posted', selectedForm.tide_qrPosted]] : []),
                  ...(selectedForm.tide_upiTxnDone ? [['UPI Txn Done', selectedForm.tide_upiTxnDone]] : []),
                  ...(selectedForm.tideBt_txnDone ? [['Rs 10 Txn Done', selectedForm.tideBt_txnDone]] : []),
                  ...(selectedForm.ins_vehicleNumber ? [['Vehicle No', selectedForm.ins_vehicleNumber]] : []),
                  ...(selectedForm.ins_vehicleType ? [['Vehicle Type', selectedForm.ins_vehicleType]] : []),
                  ...(selectedForm.ins_insuranceType ? [['Insurance Type', selectedForm.ins_insuranceType]] : []),
                  ...(selectedForm.pine_cardTxn ? [['Card Txn Rs 100', selectedForm.pine_cardTxn]] : []),
                  ...(selectedForm.pine_wifiConnected ? [['Wi-Fi Connected', selectedForm.pine_wifiConnected]] : []),
                  ...(selectedForm.cc_cardName ? [['Credit Card Name', selectedForm.cc_cardName]] : []),
                  ...(selectedForm.tideIns_type ? [['Insurance Type', selectedForm.tideIns_type]] : []),
                  ...(selectedForm.reason ? [['Reason', selectedForm.reason]] : []),
                ].map(([label, value], idx) => (
                  <div key={idx} style={{ gridColumn: label === 'Reason' ? '1 / -1' : undefined }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dark)', wordBreak: 'break-word' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Meetings Modal */}
      {meetingsOpen && (
        <MeetingsModal
          isOpen={meetingsOpen}
          onClose={() => setMeetingsOpen(false)}
          userEmail={manager?.email}
          token={localStorage.getItem('token')}
        />
      )}
    </div>
  );
}
