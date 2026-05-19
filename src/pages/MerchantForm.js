import React, { useState, useEffect } from 'react';
import { API_BASE } from '../api';
import { useNavigate, Link } from 'react-router-dom';

const BRANDS       = ['Tide', 'Tide BT', 'Insurance 2W/4W', 'PineLab'];
const TIDE_PRODUCTS = ['Tide', 'Tide Insurance', 'Tide MSME', 'Tide Credit Card'];

function RadioGroup({ name, options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
      {options.map(opt => (
        <label key={opt} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
          border: `1.5px solid ${value === opt ? 'var(--green-dark)' : '#dde8dd'}`,
          background: value === opt ? '#e6f4ea' : '#fff',
          color: value === opt ? 'var(--green-dark)' : '#555',
          fontWeight: value === opt ? 700 : 500, fontSize: 13,
        }}>
          <input type="radio" name={name} value={opt} checked={value === opt}
            onChange={() => onChange(opt)} style={{ accentColor: 'var(--green-dark)' }} />
          {opt}
        </label>
      ))}
    </div>
  );
}

function FormCard({ icon, title, sub, children }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '20px 22px',
      border: '1.5px solid #e8f0e8', marginBottom: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--green-dark)' }}>{title}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{sub}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function FormGroup({ label, required, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label} {required && <span style={{ color: '#e53935' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '11px 14px', border: '1.5px solid #dde8dd',
  borderRadius: 8, fontSize: 14, background: '#fafcfa', outline: 'none',
  boxSizing: 'border-box',
};

export default function MerchantForm() {
  const navigate  = useNavigate();
  const token     = localStorage.getItem('token');

  const [customerName,   setCustomerName]   = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [location,       setLocation]       = useState('');
  const [status,         setStatus]         = useState('');
  const [brand,          setBrand]          = useState('');
  const [tideProduct,    setTideProduct]    = useState('');
  const [reason,         setReason]         = useState('');

  // Sub-fields
  const [tideQR,       setTideQR]       = useState('');
  const [tideUPI,      setTideUPI]      = useState('');
  const [tideBtTxn,    setTideBtTxn]    = useState('');
  const [insVehicleNo, setInsVehicleNo] = useState('');
  const [insVehicle,   setInsVehicle]   = useState('');
  const [insType,      setInsType]      = useState('');
  const [pineCard,     setPineCard]     = useState('');
  const [pineWifi,     setPineWifi]     = useState('');
  const [ccName,       setCcName]       = useState('');
  const [tideInsType,  setTideInsType]  = useState('');

  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [dupModal, setDupModal] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [manager, setManager] = useState(null);

  useEffect(() => {
    if (!token) { navigate('/'); return; }
    const cached = localStorage.getItem('manager');
    if (cached) { try { setManager(JSON.parse(cached)); } catch {} }
    fetch(`${API_BASE}/api/manager/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { if (data._id) setManager(data); }).catch(() => {});
  }, [token, navigate]);

  const isOnboarding = status === 'Ready for Onboarding';

  const initials = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'M';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('manager');
    navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!status) { setError('Please select a visit status.'); return; }
    if (customerNumber.length !== 10) { setError('Customer number must be exactly 10 digits.'); return; }
    if (!isOnboarding && !reason.trim()) { setError('Please provide a reason.'); return; }

    const payload = {
      customerName, customerNumber, location, status,
      ...(isOnboarding && brand ? { brand } : {}),
      ...(isOnboarding && brand ? { formFillingFor: brand === 'Tide' && tideProduct ? tideProduct : brand } : {}),
      ...(isOnboarding && tideProduct ? { tideProduct } : {}),
      ...(isOnboarding && tideBtTxn ? { tideBt_txnDone: tideBtTxn } : {}),
      ...(isOnboarding && tideQR ? { tide_qrPosted: tideQR } : {}),
      ...(isOnboarding && tideUPI ? { tide_upiTxnDone: tideUPI } : {}),
      ...(isOnboarding && insVehicleNo ? { ins_vehicleNumber: insVehicleNo } : {}),
      ...(isOnboarding && insVehicle ? { ins_vehicleType: insVehicle } : {}),
      ...(isOnboarding && insType ? { ins_insuranceType: insType } : {}),
      ...(isOnboarding && pineCard ? { pine_cardTxn: pineCard } : {}),
      ...(isOnboarding && pineWifi ? { pine_wifiConnected: pineWifi } : {}),
      ...(isOnboarding && ccName ? { cc_cardName: ccName } : {}),
      ...(isOnboarding && tideInsType ? { tideIns_type: tideInsType } : {}),
      ...(!isOnboarding && reason ? { reason } : {}),
    };

    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/forms/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 409 && data.duplicate) {
        setDupModal({ name: customerName, existingId: data.existingId });
        return;
      }
      if (!res.ok) { setError(data.message || 'Submission failed'); return; }
      setSuccess('✓ Form submitted successfully! Redirecting...');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch { setError('Server error. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-logo">
          <Link to="/dashboard"><img src="/logo-full.png" alt="Vegavruddhi" /></Link>
        </div>
        <div className="nav-right">
          {manager && (
            <div className="nav-profile" onClick={() => setDropdownOpen(!dropdownOpen)} style={{ position: 'relative' }}>
              <div className="nav-avatar">
                {manager.image ? <img src={manager.image} alt={manager.name} /> : initials(manager.name)}
              </div>
              <div className="nav-info">
                <span className="name">{manager.name}</span>
                <span className="status-badge">Manager</span>
              </div>
              <span className="nav-chevron">▼</span>
              {dropdownOpen && (
                <div className="dropdown-menu open">
                  <div className="dropdown-header">
                    <div className="dh-name">{manager.name}</div>
                    <div className="dh-email">{manager.email}</div>
                  </div>
                  <Link to="/dashboard" onClick={() => setDropdownOpen(false)}>🏠 Dashboard</Link>
                  <Link to="/profile" onClick={() => setDropdownOpen(false)}>👤 My Profile</Link>
                  <a href="#logout" className="logout" onClick={(e) => { e.preventDefault(); handleLogout(); }}>🚪 Logout</a>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <div className="main-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Link to="/dashboard" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', background: '#fff', border: '1.5px solid #dde8dd',
            borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--green-dark)', textDecoration: 'none',
          }}>← Dashboard</Link>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--green-dark)', margin: 0 }}>📋 Merchant Visit Form</h2>
        </div>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Fill in the details after your merchant meeting</p>

        {error   && <div className="error-msg"   style={{ display: 'block', marginBottom: 16 }}>{error}</div>}
        {success && <div className="success-msg" style={{ display: 'block', marginBottom: 16 }}>{success}</div>}

        <form onSubmit={handleSubmit}>
          <FormCard icon="👥" title="Customer Details" sub="Basic merchant information">
            <FormGroup label="Customer Name" required>
              <input style={inputStyle} type="text" value={customerName}
                onChange={e => setCustomerName(e.target.value)} placeholder="Enter customer name" required />
            </FormGroup>
            <FormGroup label="Customer Number" required>
              <input style={inputStyle} type="tel" value={customerNumber}
                onChange={e => setCustomerNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit phone number" required />
            </FormGroup>
            <FormGroup label="Location" required>
              <input style={inputStyle} type="text" value={location}
                onChange={e => setLocation(e.target.value)} placeholder="Enter location" required />
            </FormGroup>
          </FormCard>

          <FormCard icon="📌" title="Visit Status" sub="Outcome of the merchant visit">
            <FormGroup label="Status" required>
              <RadioGroup name="status"
                options={['Ready for Onboarding', 'Not Interested', 'Try but not done due to error', 'Need to visit again']}
                value={status} onChange={setStatus} />
            </FormGroup>
          </FormCard>

          {status && !isOnboarding && (
            <FormCard icon="📝" title="Reason" sub="Why was the merchant not onboarded?">
              <FormGroup label="Reason" required>
                <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3}
                  value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="Enter reason..." required />
              </FormGroup>
            </FormCard>
          )}

          {isOnboarding && (
            <FormCard icon="🏷️" title="Brand Name" sub="Select the brand">
              <FormGroup label="Brand" required>
                <RadioGroup name="brand" options={BRANDS} value={brand} onChange={v => { setBrand(v); setTideProduct(''); }} />
              </FormGroup>

              {brand === 'Tide' && (
                <FormGroup label="Tide Product" required>
                  <RadioGroup name="tideProduct" options={TIDE_PRODUCTS} value={tideProduct} onChange={setTideProduct} />
                </FormGroup>
              )}
              {brand === 'Tide' && tideProduct === 'Tide' && <>
                <FormGroup label="QR Posted">
                  <RadioGroup name="tide_qr" options={['Yes', 'No']} value={tideQR} onChange={setTideQR} />
                </FormGroup>
                <FormGroup label="Rs 10/30 UPI Txn Done">
                  <RadioGroup name="tide_upi" options={['Yes', 'No']} value={tideUPI} onChange={setTideUPI} />
                </FormGroup>
              </>}
              {brand === 'Tide' && tideProduct === 'Tide Insurance' && (
                <FormGroup label="Type of Insurance">
                  <RadioGroup name="tideins" options={['Cyber Security', 'Accidental']} value={tideInsType} onChange={setTideInsType} />
                </FormGroup>
              )}
              {brand === 'Tide' && tideProduct === 'Tide Credit Card' && (
                <FormGroup label="Name of the Credit Card">
                  <input style={inputStyle} type="text" value={ccName}
                    onChange={e => setCcName(e.target.value)} placeholder="e.g. HDFC Regalia" />
                </FormGroup>
              )}
              {brand === 'Tide BT' && (
                <FormGroup label="Rs 10 Txn Done">
                  <RadioGroup name="tideBtTxn" options={['Yes', 'No']} value={tideBtTxn} onChange={setTideBtTxn} />
                </FormGroup>
              )}
              {brand === 'Insurance 2W/4W' && <>
                <FormGroup label="Vehicle Number">
                  <input style={inputStyle} type="text" value={insVehicleNo}
                    onChange={e => setInsVehicleNo(e.target.value)} placeholder="e.g. MH12AB1234" />
                </FormGroup>
                <FormGroup label="Vehicle Type">
                  <RadioGroup name="ins_vehicle" options={['2 Wheeler', '4 Wheeler', 'Commercial']} value={insVehicle} onChange={setInsVehicle} />
                </FormGroup>
                <FormGroup label="Insurance Type">
                  <RadioGroup name="ins_type" options={['3rd Party', 'Only OD', 'OD + 3rd Party']} value={insType} onChange={setInsType} />
                </FormGroup>
              </>}
              {brand === 'PineLab' && <>
                <FormGroup label="Card Txn done of Rs 100">
                  <RadioGroup name="pine_card" options={['Yes', 'No']} value={pineCard} onChange={setPineCard} />
                </FormGroup>
                <FormGroup label="Machine connected with Wi-Fi">
                  <RadioGroup name="pine_wifi" options={['Yes', 'No']} value={pineWifi} onChange={setPineWifi} />
                </FormGroup>
              </>}
            </FormCard>
          )}

          <button type="submit" className="btn" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? 'Submitting…' : '✓ Submit Form Response'}
          </button>
        </form>
      </div>

      {/* Duplicate modal */}
      {dupModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '32px 28px', maxWidth: 440, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ color: 'var(--green-dark)', fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Duplicate Entry Detected</h3>
            <p style={{ color: '#555', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              You have already submitted a form for <strong>{dupModal.name}</strong> with this product.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setDupModal(null)} style={{ padding: '10px 22px', border: '1.5px solid #dde8dd', borderRadius: 8, background: '#fff', color: 'var(--green-dark)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
