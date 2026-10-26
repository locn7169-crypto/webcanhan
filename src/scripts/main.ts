import {
  createIcons,
  ArrowUpRight,
  Code,
  Cpu,
  Palette,
  Sparkles,
  MapPin,
  Clock,
  Compass,
  Terminal,
  Layers,
  Phone,
  PhoneCall,
  MessageSquare,
  Copy,
  Check,
  Instagram,
  Facebook,
  Twitter,
  ExternalLink,
  X,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Bug,
  ShieldCheck,
  TrendingUp,
  Wallet,
  BookOpen,
  UserCheck,
  Smartphone,
  ArrowUp,
} from 'lucide';
import { initSmoothScroll } from './lenis-scroll';
import { initMagneticAndCursor } from './magnetic-cursor';
import { init3DTiltCards } from './tilt-cards';
import { initHeroStage } from './hero-stage';
import { initPinnedProjects } from './pinned-projects';
import { initSynthesisMatrix } from './synthesis-matrix';
import { initLocMoneyModal } from './loc-money-modal';
import { initScrollCinematics } from './scroll-cinematics';
import { initHeroAmbientConstellation } from '../threeui/hero-constellation';
import { initVisualEditor } from './visual-editor';

// Initialize Lucide icons
function setupIcons() {
  createIcons({
    icons: {
      ArrowUpRight,
      ArrowUp,
      Code,
      Cpu,
      Palette,
      Sparkles,
      MapPin,
      Clock,
      Compass,
      Terminal,
      Layers,
      Phone,
      PhoneCall,
      MessageSquare,
      Copy,
      Check,
      Instagram,
      Facebook,
      Twitter,
      ExternalLink,
      X,
      ChevronDown,
      ChevronRight,
      AlertTriangle,
      Bug,
      ShieldCheck,
      TrendingUp,
      Wallet,
      BookOpen,
      UserCheck,
      Smartphone,
    },
  });
}

// Live Local Clock (Ho Chi Minh City, GMT+7)
function setupLiveClock() {
  const clockEl = document.getElementById('live-time');
  if (!clockEl) return;

  function update() {
    if (!clockEl) return;
    const now = new Date();
    // Options for Ho Chi Minh City / Asia/Ho_Chi_Minh
    const timeString = now.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    clockEl.textContent = `${timeString} ICT (HCMC)`;
  }

  update();
  setInterval(update, 1000);
}

// Header scrolled styling & Active nav spy
function setupNavigationSpy() {
  const header = document.querySelector<HTMLElement>('.site-header');
  const sections = document.querySelectorAll<HTMLElement>('section[id]');
  const navLinks = document.querySelectorAll<HTMLAnchorElement>('.nav-link');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header?.classList.add('scrolled');
    } else {
      header?.classList.remove('scrolled');
    }

    // Active link highlighting
    let currentId = '';
    const scrollPos = window.scrollY + 180;

    sections.forEach((sec) => {
      if (sec.offsetTop <= scrollPos) {
        currentId = sec.getAttribute('id') || '';
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentId}`) {
        link.classList.add('active');
      }
    });
  });
}

// Fullscreen Mobile Menu (Le-Lab Style)
function setupMobileMenu() {
  const toggleBtn = document.querySelector<HTMLButtonElement>('.hamburger-toggle-btn');
  const overlay = document.querySelector<HTMLElement>('.fullscreen-menu-overlay');
  const menuLinks = document.querySelectorAll<HTMLAnchorElement>('.fullscreen-menu-link');

  if (!toggleBtn || !overlay) return;

  function toggle() {
    const isOpen = overlay?.classList.contains('active');
    if (isOpen) {
      overlay?.classList.remove('active');
      document.body.classList.remove('menu-active');
    } else {
      overlay?.classList.add('active');
      document.body.classList.add('menu-active');
    }
  }

  toggleBtn.addEventListener('click', toggle);

  menuLinks.forEach((link) => {
    link.addEventListener('click', () => {
      overlay.classList.remove('active');
      document.body.classList.remove('menu-active');
    });
  });
}

// Copy phone number to clipboard & show tactile toast
function setupCopyPhone() {
  const triggers = document.querySelectorAll<HTMLButtonElement>('.copy-phone-trigger');
  const toast = document.querySelector<HTMLElement>('.toast-notice');
  const toastText = toast?.querySelector<HTMLElement>('.toast-msg');

  triggers.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const phone = btn.getAttribute('data-phone') || '0866192413';
      try {
        await navigator.clipboard.writeText(phone);
        const label = btn.querySelector<HTMLElement>('.copy-label');
        const origText = label ? label.textContent : '';
        if (label) label.textContent = 'Đã chép!';

        if (toast) {
          if (toastText) toastText.textContent = `Đã sao chép SĐT: ${phone}`;
          toast.classList.add('show');
          setTimeout(() => {
            toast.classList.remove('show');
            if (label && origText) label.textContent = origText;
          }, 2400);
        }
      } catch (err) {
        console.warn('Clipboard write failed:', err);
      }
    });
  });
}

// App bootstrap
document.addEventListener('DOMContentLoaded', () => {
  setupIcons();
  setupLiveClock();
  setupNavigationSpy();
  setupMobileMenu();
  setupCopyPhone();

  // Initialize Motion Subsystems
  initSmoothScroll();
  initMagneticAndCursor();
  init3DTiltCards();
  initHeroStage();
  initPinnedProjects();
  initSynthesisMatrix();
  initLocMoneyModal();
  initScrollCinematics();
  initHeroAmbientConstellation();
  initVisualEditor();

  console.info('[Loc Portfolio] Experience initialized with craft & precision.');
});
