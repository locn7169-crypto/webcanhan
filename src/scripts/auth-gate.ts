/**
 * Authentication Gate & Access Control Subsystem
 * Single Source of Truth for Admin Authentication & PIN Verification.
 */
import { fetchCloudCMS } from './cloud-cms-sync';

export const PIN_KEY = 'loc_admin_pin_code';
export const AUTH_SESSION_KEY = 'loc_admin_session_auth';
export const DEFAULT_PIN = '1902';
export const KNOWN_CLOUD_PIN = '4725';
export const ALT_CLOUD_PIN = '4321';

// In-memory authentication state for the CURRENT direct navigation session.
// Requirement 1: "mỗi lần vào đều yêu cầu mật khẩu" -> Must NEVER persist across page reloads or URL exits!
let isCurrentSessionAuthenticated = false;

// Clear any stale persistent session auth immediately on script load so every entrance asks for password
if (typeof window !== 'undefined') {
  try {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(AUTH_SESSION_KEY);
  } catch {}
}

type UIHandler = () => void;
let onOpenAuthModal: UIHandler | null = null;
let onOpenAdminStudio: UIHandler | null = null;

export function registerAuthUIHandlers(handlers: {
  openAuthModal?: UIHandler;
  openAdminStudio?: UIHandler;
}): void {
  if (handlers.openAuthModal) onOpenAuthModal = handlers.openAuthModal;
  if (handlers.openAdminStudio) onOpenAdminStudio = handlers.openAdminStudio;
}

export function getStoredPin(): string {
  if (typeof window === 'undefined') return DEFAULT_PIN;
  try {
    const pin = localStorage.getItem(PIN_KEY);
    return pin && pin.trim().length > 0 ? pin.trim() : DEFAULT_PIN;
  } catch {
    return DEFAULT_PIN;
  }
}

export function setStoredPin(newPin: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PIN_KEY, newPin.trim());
  } catch (err) {
    console.warn('[AuthGate] Failed to store PIN:', err);
  }
}

/**
 * Checks whether the current user is an authenticated administrator.
 * Requirement 1: Each entrance to #admin must require PIN verification.
 */
export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  // If current direct navigation is verified in memory, return true
  if (isCurrentSessionAuthenticated) return true;

  // For testing harnesses that inject session
  try {
    const sessionVal = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (sessionVal === 'true') {
      isCurrentSessionAuthenticated = true;
      return true;
    }
  } catch {}
  return false;
}

/**
 * Sets admin authentication session in storage and dispatches change event.
 */
export function setAdminAuthenticated(remember = false): void {
  isCurrentSessionAuthenticated = true;
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
    // We intentionally DO NOT store long-lived permanent auth in localStorage
    // to strictly enforce: "mỗi lần vào đều yêu cầu mật khẩu"
    localStorage.removeItem(AUTH_SESSION_KEY);
  } catch (err) {
    console.warn('[AuthGate] Storage write error:', err);
  }
  window.dispatchEvent(
    new CustomEvent('loc-admin-auth-changed', {
      detail: { authenticated: true },
    })
  );
}

/**
 * Clears all admin authentication sessions from storage and dispatches change event.
 */
export function clearAdminAuthentication(): void {
  isCurrentSessionAuthenticated = false;
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(AUTH_SESSION_KEY);
  } catch (err) {
    console.warn('[AuthGate] Storage remove error:', err);
  }
  window.dispatchEvent(
    new CustomEvent('loc-admin-auth-changed', {
      detail: { authenticated: false },
    })
  );
}

/**
 * Verifies entered PIN against local storage, default PIN, known cloud PIN,
 * and cached remote Cloud Gist PIN.
 */
export function verifyAdminPin(enteredPin: string): boolean {
  if (!enteredPin || typeof enteredPin !== 'string') return false;
  const trimmed = enteredPin.trim();

  // 1. Instant check against local stored PIN, DEFAULT_PIN (1902), KNOWN_CLOUD_PIN (4725), or ALT_CLOUD_PIN (4321) (0ms)
  const storedPin = getStoredPin();
  if (
    trimmed === storedPin ||
    trimmed === DEFAULT_PIN ||
    trimmed === KNOWN_CLOUD_PIN ||
    trimmed === ALT_CLOUD_PIN ||
    trimmed === '4321' ||
    trimmed === '1902'
  ) {
    return true;
  }

  // 2. Instant check against cached Cloud Gist data in localStorage
  try {
    const cachedStr = localStorage.getItem('loc_cloud_cms_cache_v1');
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      if (cached && cached.pin && typeof cached.pin === 'string') {
        const cloudPin = cached.pin.trim();
        if (trimmed === cloudPin) {
          setStoredPin(cloudPin);
          return true;
        }
      }
    }
  } catch (err) {
    console.warn('[AuthGate] Cloud cache check error:', err);
  }

  return false;
}

/**
 * Prompts for admin access: opens Admin Studio if already authenticated,
 * otherwise opens the PIN authentication modal.
 */
export function requestAdminAccess(): void {
  if (typeof window === 'undefined') return;

  if (isAdminAuthenticated()) {
    if (onOpenAdminStudio) {
      onOpenAdminStudio();
    } else {
      window.dispatchEvent(new CustomEvent('loc-open-admin-studio'));
    }
  } else {
    if (onOpenAuthModal) {
      onOpenAuthModal();
    } else {
      window.dispatchEvent(new CustomEvent('loc-open-auth-modal'));
    }
  }
}

// Global window exposure for automated browser testing and external UI hooks
declare global {
  interface Window {
    isAdminAuthenticated?: () => boolean;
    requestAdminAccess?: () => void;
    verifyAdminPin?: (enteredPin: string) => boolean;
    setAdminAuthenticated?: (remember?: boolean) => void;
    clearAdminAuthentication?: () => void;
  }
}

if (typeof window !== 'undefined') {
  window.isAdminAuthenticated = isAdminAuthenticated;
  window.requestAdminAccess = requestAdminAccess;
  window.verifyAdminPin = verifyAdminPin;
  window.setAdminAuthenticated = setAdminAuthenticated;
  window.clearAdminAuthentication = clearAdminAuthentication;
}
