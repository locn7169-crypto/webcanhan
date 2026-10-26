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
    if (e.key === 'Escape') {
      closeModal();
    }
  }

  // Bind trigger clicks with tactile shockwave & spring haptics
  triggers.forEach((trigger) => {
    trigger.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault();
      activeTrigger = trigger;
      const initialTab = trigger.getAttribute('data-target-tab') || 'tong-quan';

      // Dynamic gold ripple / shockwave burst at click coordinates
      const rect = trigger.getBoundingClientRect();
      const x = e.clientX ? e.clientX - rect.left : rect.width / 2;
      const y = e.clientY ? e.clientY - rect.top : rect.height / 2;

      const ripple = document.createElement('div');
      ripple.className = 'loc-click-shockwave';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.width = '36px';
      ripple.style.height = '36px';
      trigger.appendChild(ripple);

      // Tactile spring recoil + shockwave expansion timeline
      const tl = gsap.timeline({
        onComplete: () => {
          ripple.remove();
        },
      });

      tl.to(trigger, { scale: 0.96, duration: 0.1, ease: 'power2.in' })
        .to(ripple, { scale: 14, opacity: 0, duration: 0.55, ease: 'power2.out' }, 0)
        .to(trigger, { scale: 1.02, duration: 0.18, ease: 'power2.out' }, 0.1)
        .to(trigger, { scale: 1, duration: 0.22, ease: 'elastic.out(1.2, 0.45)' }, 0.28)
        .call(() => {
          openModal(initialTab);
        }, undefined, 0.15);
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
