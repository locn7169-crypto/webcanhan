import gsap from 'gsap';

export function initSynthesisMatrix() {
  const buttons = document.querySelectorAll<HTMLButtonElement>('.synthesis-btn');
  const views = document.querySelectorAll<HTMLElement>('.synthesis-view');

  if (!buttons.length || !views.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetMode = btn.dataset.mode;
      if (!targetMode) return;

      // Update button active state
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      // Morph / switch view
      views.forEach((view) => {
        if (view.dataset.mode === targetMode) {
          view.classList.add('active');
          gsap.fromTo(
            view,
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
          );
        } else {
          view.classList.remove('active');
        }
      });
    });
  });

  // Interactive Interests Cloud
  const tags = document.querySelectorAll<HTMLElement>('.interest-tag');
  tags.forEach((tag) => {
    tag.addEventListener('click', () => {
      tag.classList.toggle('active');
      gsap.fromTo(
        tag,
        { scale: 0.94 },
        { scale: 1, duration: 0.25, ease: 'back.out(2)' }
      );
    });
  });

  // Interactive HSK Card Flip
  const hskCard = document.querySelector<HTMLElement>('.learn-mockup-card');
  if (hskCard) {
    let flipped = false;
    const hanziEl = hskCard.querySelector<HTMLElement>('.learn-hanzi');
    const pinyinEl = hskCard.querySelector<HTMLElement>('.learn-pinyin');
    const meaningEl = hskCard.querySelector<HTMLElement>('.learn-meaning');

    const vocabularyItems = [
      { hanzi: '知行合一', pinyin: 'zhī xíng hé yī', meaning: 'Unity of Knowledge and Action' },
      { hanzi: '匠心独运', pinyin: 'jiàng xīn dú yùn', meaning: 'Ingenuity & Master Craftsmanship' },
      { hanzi: '循序渐进', pinyin: 'xún xù jiàn jìn', meaning: 'Step-by-step Steady Progress' },
      { hanzi: '日积月累', pinyin: 'rì jī yuè lěi', meaning: 'Accumulation Day by Day' }
    ];
    let currentIndex = 0;

    hskCard.addEventListener('click', () => {
      currentIndex = (currentIndex + 1) % vocabularyItems.length;
      const nextItem = vocabularyItems[currentIndex];

      gsap.to(hskCard, {
        scale: 0.96,
        duration: 0.15,
        yoyo: true,
        repeat: 1,
        onRepeat: () => {
          if (hanziEl) hanziEl.textContent = nextItem.hanzi;
          if (pinyinEl) pinyinEl.textContent = nextItem.pinyin;
          if (meaningEl) meaningEl.textContent = nextItem.meaning;
        }
      });
    });
  }
}
