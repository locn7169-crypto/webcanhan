import gsap from 'gsap';
import { getLenis } from './lenis-scroll';

export function initLocMoneyModal() {
  const modalEl = document.getElementById('loc-money-modal');
  if (!modalEl) return;
  const modal = modalEl;

  const backdrop = modal.querySelector<HTMLElement>('.loc-modal-backdrop');
  const closeBtns = modal.querySelectorAll<HTMLElement>('.loc-modal-close');
  const triggers = document.querySelectorAll<HTMLElement>('.loc-money-trigger, [data-open-modal="loc-money-modal"]');
  const tabBtns = modal.querySelectorAll<HTMLButtonElement>('.loc-modal-tab-btn');
  const tabPanes = modal.querySelectorAll<HTMLElement>('.loc-modal-tab-pane');
  const bugCards = modal.querySelectorAll<HTMLElement>('.loc-bug-card');

  let activeTrigger: HTMLElement | null = null;
  let isOpen = false;

  function switchTab(tabId: string) {
    tabBtns.forEach((btn) => {
      const match = btn.getAttribute('data-loc-tab') === tabId;
      btn.classList.toggle('active', match);
      btn.setAttribute('aria-selected', match ? 'true' : 'false');
    });

    tabPanes.forEach((pane) => {
      const match = pane.getAttribute('data-loc-pane') === tabId;
      pane.classList.toggle('active', match);
      if (match) {
        requestAnimationFrame(() => {
          pane.scrollTop = 0;
        });
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
    }

    const container = modal.querySelector<HTMLElement>('.loc-modal-container');
    if (container) {
      container.style.willChange = 'transform, opacity';
      gsap.fromTo(
        container,
        { opacity: 0, y: 36, scale: 0.94 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.45,
          ease: 'power3.out',
          onComplete: () => {
            container.style.willChange = 'auto';
          },
        }
      );
    }

    if (backdrop) {
      gsap.fromTo(
        backdrop,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    }

    // Focus close button for accessibility
    const firstCloseBtn = modal.querySelector<HTMLElement>('.loc-modal-close');
    firstCloseBtn?.focus();

    document.addEventListener('keydown', handleKeyDown);
  }

  function closeModal() {
    if (!isOpen) return;
    isOpen = false;

    const container = modal.querySelector<HTMLElement>('.loc-modal-container');
    if (container && backdrop) {
      container.style.willChange = 'transform, opacity';
      gsap.to(container, {
        opacity: 0,
        y: 20,
        scale: 0.98,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => {
          container.style.willChange = 'auto';
        },
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
    if (e.key === 'Escape') {
      closeModal();
    }
  }

  // Bind trigger clicks: instant modal opening without artificial latency or layout thrashing
  triggers.forEach((trigger) => {
    trigger.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault();
      activeTrigger = trigger;
      const initialTab = trigger.getAttribute('data-target-tab') || 'tong-quan';
      openModal(initialTab);
    });

    trigger.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activeTrigger = trigger;
        const initialTab = trigger.getAttribute('data-target-tab') || 'tong-quan';
        openModal(initialTab);
      }
    });
  });

  // Bind close buttons
  closeBtns.forEach((btn) => {
    btn.addEventListener('click', () => closeModal());
  });

  // Bind backdrop click
  backdrop?.addEventListener('click', () => closeModal());

  // Bind tab buttons
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-loc-tab');
      if (tabId) {
        switchTab(tabId);
      }
    });
  });

  // Bind bug card accordion toggle
  bugCards.forEach((card) => {
    const header = card.querySelector('.loc-bug-header');
    header?.addEventListener('click', () => {
      const isExpanded = card.classList.contains('expanded');
      card.classList.toggle('expanded', !isExpanded);
    });
  });

  console.info('[LocMoneyModal] Inspector modal ready.');
}
