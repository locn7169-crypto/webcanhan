import gsap from 'gsap';
import { getLenis } from './lenis-scroll';

export function initLocMoneyModal() {
  const modalEl = document.getElementById('loc-money-modal');
  if (!modalEl) return;
  const modal: HTMLElement = modalEl;

  const backdrop = modal.querySelector<HTMLElement>('.loc-modal-backdrop');
  const closeBtns = modal.querySelectorAll<HTMLElement>('.loc-modal-close');
  const triggers = document.querySelectorAll<HTMLElement>('.loc-money-trigger, [data-open-modal="loc-money-modal"]');
  const tabBtns = modal.querySelectorAll<HTMLButtonElement>('.loc-modal-tab-btn');
  const tabPanes = modal.querySelectorAll<HTMLElement>('.loc-modal-tab-pane');

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
    } else {
      switchTab('tong-quan');
    }

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const container = modal.querySelector<HTMLElement>('.loc-modal-container');
    if (container) {
      container.style.willChange = 'transform, opacity';
      if (prefersReduced) {
        gsap.fromTo(
          container,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.18,
            ease: 'linear',
            onComplete: () => {
              container.style.willChange = 'auto';
            },
          }
        );
      } else {
        gsap.fromTo(
          container,
          { opacity: 0, y: 32, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.42,
            ease: 'power3.out',
            onComplete: () => {
              container.style.willChange = 'auto';
            },
          }
        );
      }
    }

    if (backdrop) {
      gsap.fromTo(
        backdrop,
        { opacity: 0 },
        { opacity: 1, duration: prefersReduced ? 0.15 : 0.28, ease: 'power2.out' }
      );
    }

    const firstCloseBtn = modal.querySelector<HTMLElement>('.loc-modal-close');
    firstCloseBtn?.focus();

    document.addEventListener('keydown', handleKeyDown);
  }

  function closeModal() {
    if (!isOpen) return;
    isOpen = false;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const container = modal.querySelector<HTMLElement>('.loc-modal-container');
    if (container && backdrop) {
      container.style.willChange = 'transform, opacity';
      if (prefersReduced) {
        gsap.to(container, {
          opacity: 0,
          duration: 0.15,
          ease: 'linear',
          onComplete: () => {
            container.style.willChange = 'auto';
          },
        });
      } else {
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
      }

      gsap.to(backdrop, {
        opacity: 0,
        duration: prefersReduced ? 0.15 : 0.25,
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

  // Bind Tab navigation (5 tabs)
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-loc-tab');
      if (tabId) switchTab(tabId);
    });
  });

  // Bind Interactive Engine Playground Switcher
  const engineBtns = modal.querySelectorAll<HTMLButtonElement>('.loc-engine-btn');
  const enginePreviewImg = modal.querySelector<HTMLImageElement>('#loc-money-engine-preview-img');
  const enginePreviewTitle = modal.querySelector<HTMLElement>('#loc-money-engine-preview-title');
  const enginePreviewDesc = modal.querySelector<HTMLElement>('#loc-money-engine-preview-desc');

  const engineData: Record<string, { img: string; alt: string; title: string; desc: string }> = {
    calc: {
      img: './assets/locmoney/02_showcase_interactive_calculator.png',
      alt: 'Máy Tính Tự Động Phân Bổ 4 Giỏ Tài Sản',
      title: '01. Máy Tính Tự Động Phân Bổ 4 Giỏ Tài Sản (Smart Jar Allocation)',
      desc: 'Nhập thu nhập hàng tháng để hệ thống tự động phân chia theo tỷ lệ vàng: 55% Nhu Cầu Thiết Yếu, 10% Tự Do Tài Chính, 10% Tiết Kiệm Dài Hạn, và 5% Cho Đi.',
    },
    sim: {
      img: './assets/locmoney/03_showcase_interactive_simulator.png',
      alt: 'Giả Lập Giao Dịch Tức Thì',
      title: '02. Giả Lập Giao Dịch Tức Thì (Live Transaction Simulator)',
      desc: 'Mô phỏng ghi chép nhanh khoản chi cà phê, ăn uống hoặc lương thưởng. Số dư tài sản và tiến độ ngân sách được cập nhật tức thời không có độ trễ.',
    },
    theme: {
      img: './assets/locmoney/04_showcase_interactive_theme_switcher.png',
      alt: 'Bộ Chuyển Đổi Chủ Đề Tức Thì',
      title: '03. Bộ Chuyển Đổi Chủ Đề Tức Thì (Instant Theme Switcher)',
      desc: 'Chuyển đổi tức thì giữa 5 phong cách độc bản: Cổ Phong Thủy Mặc, Hiện Đại 3D Pop, Liquid Quartz Kính Lỏng, Cyberpunk HUD và Neo-Brutalism Funky.',
    },
    composer: {
      img: './assets/locmoney/17_app_action_hub_composer.png',
      alt: 'Action Hub & Ghi Chép Nhanh',
      title: '04. Action Hub & Soạn Thảo Giao Dịch (Speed Composer Sheet)',
      desc: 'Bottom sheet tiện dụng mở từ nút FAB: chọn giỏ tiền, gắn nhãn danh mục, ghi chú cảm xúc và đính kèm ảnh chỉ trong 3 giây.',
    },
  };

  // Preload all engine images for instantaneous switching
  Object.values(engineData).forEach((item) => {
    const img = new Image();
    img.src = item.img;
  });

  engineBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-engine-mode');
      if (!mode || !engineData[mode]) return;
      engineBtns.forEach((b) => b.classList.toggle('active', b === btn));
      const info = engineData[mode];
      if (enginePreviewImg) {
        enginePreviewImg.style.opacity = '0.35';
        setTimeout(() => {
          enginePreviewImg.src = info.img;
          enginePreviewImg.alt = info.alt;
          enginePreviewImg.style.opacity = '1';
        }, 120);
      }
      if (enginePreviewTitle) enginePreviewTitle.textContent = info.title;
      if (enginePreviewDesc) enginePreviewDesc.textContent = info.desc;
    });
  });

  // Allow clicking anywhere inside container without closing
  const container = modal.querySelector<HTMLElement>('.loc-modal-container');
  container?.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  console.info('[LocMoneyModal] Redesigned 5-tab inspector modal ready.');
}
