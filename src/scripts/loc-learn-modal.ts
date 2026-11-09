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

    const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

    const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  // Bind Tab navigation
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-learn-tab');
      if (tabId) switchTab(tabId);
    });
  });

  // Bind Engine Playground Switcher
  const engineBtns = modal.querySelectorAll<HTMLButtonElement>('.loc-engine-btn');
  const enginePreviewImg = modal.querySelector<HTMLImageElement>('#loc-engine-preview-img');
  const enginePreviewTitle = modal.querySelector<HTMLElement>('#loc-engine-preview-title');
  const enginePreviewDesc = modal.querySelector<HTMLElement>('#loc-engine-preview-desc');

  const engineData: Record<string, { img: string; alt: string; title: string; desc: string }> = {
    write: {
      img: './assets/loclearn/web_showcase_interactive_playground.png',
      alt: 'Bảng Luyện Viết Bút Thuận Ô Mễ Tự',
      title: '01. Luyện Viết Chữ Hán Theo Bút Thuận (Hanzi Canvas)',
      desc: 'Mô phỏng bảng viết chữ Ái (ài) 10 nét bút thuận trên giấy kẻ ô mễ tự. Tự động cảnh báo sai nét, hỗ trợ phím tắt Nét mẫu, Gợi ý, Viết lại và Lưu mộc triện ấn.',
    },
    match: {
      img: './assets/loclearn/web_showcase_tab_match.png',
      alt: 'Động Cơ Ghép Thẻ Phản Xạ 3D',
      title: '02. Ghép Thẻ Từ Vựng Phản Xạ (Instant Match Game)',
      desc: 'Luyện phản xạ đa giác quan qua việc ghép cặp từ vựng song ngữ Việt - Trung: Yêu thương ↔ 爱, Học tập ↔ 学, Trà đạo ↔ 茶, Thần Long ↔ 龙 với âm thanh phản hồi xúc giác.',
    },
    breakdown: {
      img: './assets/loclearn/web_showcase_tab_breakdown.png',
      alt: 'Phân Tích Chiết Tự & Điển Cố',
      title: '03. Chiết Tự Thủy Mặc & Điển Cố Văn Hóa (Radical Breakdown)',
      desc: 'Phân rã cấu trúc thượng hạ của chữ Hán: Bộ Trảo (bàn tay nâng niu), Bộ Mịch (mái che chở), Bộ Hựu (bạn tri kỷ) kèm tích truyện triết lý Á Đông sâu sắc.',
    },
    sound: {
      img: './assets/loclearn/web_showcase_tab_sound.png',
      alt: 'Hệ Thống Âm Thanh Đa Giác Quan',
      title: '04. Âm Sắc Ngũ Cung & Mõ Trúc Trầm Ấm (Web Audio Engine)',
      desc: 'Bộ âm thanh Web Audio nguyên bản: Âm đúng chuông ngọc ngũ cung, âm sai mõ trúc trầm ấm 50Hz không gây ức chế, âm chiến thắng nhã nhạc trạng nguyên và giọng đọc AI chuẩn.',
    },
  };

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

  // Allow clicking anywhere in the container without closing
  const container = modal.querySelector<HTMLElement>('.loc-modal-container');
  container?.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}
