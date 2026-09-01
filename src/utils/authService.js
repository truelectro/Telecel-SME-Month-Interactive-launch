// ========================================================
// SECURE AUTHENTICATION SERVICE FOR TELECEL SME LAUNCH
// ========================================================

const AUTH_STORAGE_KEY = 'telecel_stage_auth_token';

/**
 * Check if the current browser session has a valid auth token
 */
export function isAuthorized() {
  if (typeof window === 'undefined') return false;
  try {
    const token = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!token) return false;

    const data = JSON.parse(token);
    if (data && data.authenticated === true) {
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Attempt to authenticate using configured environment variable or backend API
 */
export async function authenticate(inputPassword = '') {
  if (!inputPassword) return false;
  const trimmed = inputPassword.trim();

  // 1. Check frontend environment variable (injected at build/runtime from .env or deployment dashboard)
  const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
  const configuredPassword = env.VITE_LAUNCH_PASSWORD || env.VITE_APP_PASSWORD || env.VITE_AUTH_PASSWORD;

  if (configuredPassword && configuredPassword.trim()) {
    if (trimmed === configuredPassword.trim()) {
      saveAuthSession();
      return true;
    }
  }

  // 2. Fallback to secure server endpoint verification if available
  try {
    const response = await fetch('/api/verify-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: trimmed }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.success) {
        saveAuthSession(data.token);
        return true;
      }
    }
  } catch (e) {
    // Network or offline
  }

  return false;
}

/**
 * Save authentication token in browser storage
 */
function saveAuthSession(token = 'valid') {
  const authData = {
    authenticated: true,
    token,
    timestamp: Date.now(),
  };
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
    window.dispatchEvent(new CustomEvent('telecel_auth_changed', { detail: { authorized: true } }));
  } catch (e) {
    console.error('Failed to save auth token:', e);
  }
}

/**
 * Log out and lock the platform
 */
export function logout() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('telecel_auth_changed', { detail: { authorized: false } }));
  } catch (e) {
    console.error('Failed to clear auth token:', e);
  }
}
