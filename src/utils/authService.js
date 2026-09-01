// ========================================================
// AUTHENTICATION & SECURITY SERVICE FOR TELECEL SME LAUNCH
// ========================================================

const AUTH_STORAGE_KEY = 'telecel_stage_auth_token';

// Accepted passwords (env var overrides or defaults)
const DEFAULT_PASSWORDS = ['telecel2024', 'telecellaunch', 'telecel'];

/**
 * Get configured master passwords
 */
export function getConfiguredPasswords() {
  const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
  const customPass = env.VITE_LAUNCH_PASSWORD || env.VITE_APP_PASSWORD || env.VITE_AUTH_PASSWORD;

  const validPasswords = [...DEFAULT_PASSWORDS];
  if (customPass && customPass.trim()) {
    validPasswords.unshift(customPass.trim());
  }

  return validPasswords;
}

/**
 * Check if the current browser session is authorized
 */
export function isAuthorized() {
  if (typeof window === 'undefined') return false;
  try {
    const token = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!token) return false;

    // Verify token validity
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
 * Attempt to authenticate with a password
 */
export function authenticate(inputPassword = '') {
  if (!inputPassword) return false;
  const trimmed = inputPassword.trim();
  const validPasswords = getConfiguredPasswords();

  const isMatch = validPasswords.some(
    (p) => p.toLowerCase() === trimmed.toLowerCase()
  );

  if (isMatch) {
    const authData = {
      authenticated: true,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      window.dispatchEvent(new CustomEvent('telecel_auth_changed', { detail: { authorized: true } }));
    } catch (e) {
      console.error('Failed to save auth token:', e);
    }
    return true;
  }

  return false;
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
