/**
 * Loc Studio — Bilingual Engine (Tiếng Việt / English)
 * 
 * Provides instant language switching between Vietnamese (VI) and English (EN)
 * to keep the website clean, compact, and uncluttered (no bilingual middle-dot clutter).
 * Persists user preference to localStorage with default 'vi'.
 */

export type SupportedLang = 'vi' | 'en';

const STORAGE_KEY = 'loc_portfolio_lang';
const DEFAULT_LANG: SupportedLang = 'vi';

let currentLang: SupportedLang = DEFAULT_LANG;

/**
 * Get the currently active language
 */
export function getCurrentLang(): SupportedLang {
  return currentLang;
}

/**
 * Update UI chips and document attributes for the given language
 */
function updateDOM(lang: SupportedLang) {
  // 1. Root attribute for CSS-driven zero-cost instant switching
  document.documentElement.setAttribute('data-lang', lang);
  document.documentElement.setAttribute('lang', lang);

  // 2. Sync all language toggle pills (Header, Mobile Menu, etc.)
  const toggleButtons = document.querySelectorAll<HTMLButtonElement>('.lang-toggle-pill');
  toggleButtons.forEach((btn) => {
    const viChip = btn.querySelector<HTMLElement>('.lang-chip-vi');
    const enChip = btn.querySelector<HTMLElement>('.lang-chip-en');

    if (lang === 'vi') {
      viChip?.classList.add('active');
      enChip?.classList.remove('active');
      btn.setAttribute('aria-label', 'Đang chọn Tiếng Việt. Nhấn để chuyển sang English');
      btn.setAttribute('title', 'Đang ở Tiếng Việt · Click to switch to English');
    } else {
      enChip?.classList.add('active');
      viChip?.classList.remove('active');
      btn.setAttribute('aria-label', 'English selected. Click to switch to Tiếng Việt');
      btn.setAttribute('title', 'Currently in English · Bấm để đổi sang Tiếng Việt');
    }
  });

  // 3. Dynamic text attributes
  document.querySelectorAll<HTMLElement>('[data-i18n-vi]').forEach((el) => {
    const viText = el.getAttribute('data-i18n-vi');
    const enText = el.getAttribute('data-i18n-en');
    if (lang === 'vi' && viText !== null) {
      el.textContent = viText;
    } else if (lang === 'en' && enText !== null) {
      el.textContent = enText;
    }
  });

  // 4. Dynamic titles / tooltips
  document.querySelectorAll<HTMLElement>('[data-i18n-title-vi]').forEach((el) => {
    const viTitle = el.getAttribute('data-i18n-title-vi');
    const enTitle = el.getAttribute('data-i18n-title-en');
    if (lang === 'vi' && viTitle !== null) {
      el.setAttribute('title', viTitle);
    } else if (lang === 'en' && enTitle !== null) {
      el.setAttribute('title', enTitle);
    }
  });

  // 5. Dynamic aria-labels
  document.querySelectorAll<HTMLElement>('[data-i18n-aria-vi]').forEach((el) => {
    const viAria = el.getAttribute('data-i18n-aria-vi');
    const enAria = el.getAttribute('data-i18n-aria-en');
    if (lang === 'vi' && viAria !== null) {
      el.setAttribute('aria-label', viAria);
    } else if (lang === 'en' && enAria !== null) {
      el.setAttribute('aria-label', enAria);
    }
  });

  // 6. Dispatch event for interactive components (modals, charts, etc.)
  window.dispatchEvent(new CustomEvent('loc:langchange', { detail: { lang } }));
}

/**
 * Set and persist language
 */
export function setLanguage(lang: SupportedLang, persist = true) {
  currentLang = lang;
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage errors in private/sandboxed mode
    }
  }
  updateDOM(lang);
}

/**
 * Toggle between 'vi' and 'en'
 */
export function toggleLanguage(): SupportedLang {
  const nextLang: SupportedLang = currentLang === 'vi' ? 'en' : 'vi';
  setLanguage(nextLang, true);
  return nextLang;
}

/**
 * Initialize language switcher listeners and initial state
 */
export function initI18n() {
  // Read saved preference or default to 'vi'
  let savedLang: SupportedLang = DEFAULT_LANG;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'vi' || stored === 'en') {
      savedLang = stored;
    }
  } catch {
    savedLang = DEFAULT_LANG;
  }

  // Apply initially
  setLanguage(savedLang, false);

  // Attach click listener to all language toggle pills
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const toggleBtn = target.closest<HTMLButtonElement>('.lang-toggle-pill');
    if (!toggleBtn) return;

    e.preventDefault();
    e.stopPropagation();

    // If user clicked specifically on one chip
    const clickedChip = target.closest<HTMLElement>('[data-lang-opt]');
    if (clickedChip) {
      const targetOpt = clickedChip.getAttribute('data-lang-opt');
      if (targetOpt === 'vi' || targetOpt === 'en') {
        setLanguage(targetOpt as SupportedLang, true);
        return;
      }
    }

    // Otherwise toggle to the other language
    toggleLanguage();
  });
}
