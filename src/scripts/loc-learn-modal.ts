import gsap from 'gsap';
import { getLenis } from './lenis-scroll';

export function initLocLearnModal() {
  const modalEl = document.getElementById('loc-learn-modal');
  if (!modalEl) return;
  const modal: HTMLElement = modalEl;

  const backdrop = modal.querySelector<HTMLElement>('.loc-modal-backdrop');
  const closeBtns = modal.querySelectorAll<HTMLElement>('.loc-modal-close');
  const triggers = document.querySelectorAll<HTMLElement>('.loc-learn-trigger, [data-open-modal="loc-learn-modal"]');
  const tabBtns = modal.querySelectorAll<HTMLButtonElement>('.loc-modal-tab-btn');
  const tabPanes = modal.querySelectorAll<HTMLElement>('.loc-modal-tab-pane');

  let activeTrigger: HTMLElement | null = null;
  let isOpen = false;

  function switchTab(tabId: string) {
    tabBtns.forEach((btn) => {
      const match = btn.getAttribute('data-learn-tab') === tabId;
      btn.classList.toggle('active', match);
      btn.setAttribute('aria-selected', match ? 'true' : 'false');
    });

    tabPanes.forEach((pane) => {
      const match = pane.getAttribute('data-learn-pane') === tabId;
      pane.classList.toggle('active', match);
      if (match) {
        pane.scrollTop = 0;
      }
    });
  }

  function openModal(initialTab?: string) {
    if (isOpen) return;
    isOpen = true;

    // Pause smooth scrolling
    getLenis()?.stop();
    document.body.classList.add('loc-modal-locked');

    modal.removeAttribute('hidden');
    modal.classList.add('is-open');

    if (initialTab) {
      switchTab(initialTab);
    } else {
      switchTab('tong-quan');
    }

    const container = modal.querySelector<HTMLElement>('.loc-modal-container');
    if (container) {
      gsap.fromTo(
        container,
        { opacity: 0, y: 36, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'power3.out' }
      );
    }

    if (backdrop) {
      gsap.fromTo(
        backdrop,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    }

    const firstCloseBtn = modal.querySelector<HTMLElement>('.loc-modal-close');
    firstCloseBtn?.focus();

    document.addEventListener('keydown', handleKeyDown);
  }

  function closeModal() {
    if (!isOpen) return;
    isOpen = false;

    const container = modal.querySelector<HTMLElement>('.loc-modal-container');
    if (container && backdrop) {
      gsap.to(container, {
        opacity: 0,
        y: 20,
        scale: 0.98,
        duration: 0.25,
        ease: 'power2.in',
      });

      gsap.to(backdrop, {
        opacity: 0,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => {
          modal.classList.remove('is-open');
          modal.setAttribute('hidden', '');
          document.body.classList.remove('loc-modal-locked');
          getLenis()?.start();
          activeTrigger?.focus();
        },
      });
    } else {
      modal.classList.remove('is-open');
      modal.setAttribute('hidden', '');
      document.body.classList.remove('loc-modal-locked');
      getLenis()?.start();
      activeTrigger?.focus();
    }

    document.removeEventListener('keydown', handleKeyDown);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      closeModal();
    }
  }

  // Bind Triggers
  triggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      activeTrigger = trigger;
      const targetTab = trigger.getAttribute('data-target-tab') || 'tong-quan';
      openModal(targetTab);
    });

    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activeTrigger = trigger;
        const targetTab = trigger.getAttribute('data-target-tab') || 'tong-quan';
        openModal(targetTab);
      }
    });
  });

  // Bind Close Buttons
  closeBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal();
    });
  });

  // Backdrop click to close
  backdrop?.addEventListener('click', () => {
    closeModal();
  });

  // Bind Tab navigation
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-learn-tab');
      if (tabId) switchTab(tabId);
    });
  });

  // Allow clicking anywhere in the container without closing
  const container = modal.querySelector<HTMLElement>('.loc-modal-container');
  container?.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}
