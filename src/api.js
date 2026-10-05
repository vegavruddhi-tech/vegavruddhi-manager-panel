export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export function isValidToken(token) {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 3) return false;
  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload || typeof payload !== 'object') return false;
    if (payload.exp && typeof payload.exp === 'number') {
      if (Date.now() >= payload.exp * 1000) return false;
    }
    if (!payload.email && !payload.id && !payload._id && !payload.sub && !payload.role) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

export const clearSessionAndLogout = (navigate) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) {
    fetch(`${API_BASE}/api/manager/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      }
    }).catch(() => {});
  }

  // Clear all manager and auth caches from localStorage
  Object.keys(localStorage).forEach(k => {
    if (
      k.startsWith('fse_stats_') ||
      k === 'manager_my_forms' ||
      k === 'manager_kpis' ||
      k === 'token' ||
      k === 'manager' ||
      k === 'isImpersonating' ||
      k === 'viewAsEmail'
    ) {
      localStorage.removeItem(k);
    }
  });

  // Explicitly remove all authentication and impersonation keys
  localStorage.removeItem('token');
  localStorage.removeItem('manager');
  localStorage.removeItem('isImpersonating');
  localStorage.removeItem('viewAsEmail');

  // Clear all session and impersonation keys from sessionStorage
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('manager');
  sessionStorage.removeItem('mgr_impersonationToken');
  sessionStorage.removeItem('mgr_viewAsEmail');
  sessionStorage.clear();

  if (typeof navigate === 'function') {
    navigate('/', { replace: true });
  } else {
    window.location.href = '/';
  }
};
