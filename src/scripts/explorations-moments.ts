import { openExplorationJournal } from './exploration-journal';
import { dbGetAllMedia, dbGetSetting, type MediaItem } from './admin-studio';

export interface MomentItem {
  id: string;
  catId: 'photography' | 'trekking' | 'chinese';
  title: string;
  meta: string;
  caption: string;
  image: string;
  imgId?: string;
  categoryName?: string;
}

export const moments: MomentItem[] = [
  {
    id: 'moment-1',
    catId: 'photography',
    title: 'Through My Lens · Qua ống kính của tôi',
    meta: '2026 · NHIẾP ẢNH & THỊ GIÁC',
    caption: 'Một cuốn nhật ký bằng hình ảnh, nơi những chuyến đi, cảnh vật và khoảnh khắc đáng nhớ được lưu giữ theo cách riêng.',
    image: './assets/loc-banner.jpg',
    imgId: 'exp-cover-photography',
    categoryName: 'Nhiếp ảnh',
  },
  {
    id: 'moment-2',
    catId: 'trekking',
    title: 'Một mình đi núi · Cung đường cao nguyên',
    meta: '2026 · SỨC BỀN & TĨNH TÂM',
    caption: 'Tìm kiếm sự tĩnh tâm và bền bỉ qua những cung đường cao nguyên, triền sương mù và rừng thông tĩnh lặng.',
    image: './assets/backdrop-works.jpg',
    imgId: 'exp-cover-trekking',
    categoryName: 'Trekking & Outdoors',
  },
  {
    id: 'moment-3',
    catId: 'chinese',
    title: 'Chiêm nghiệm “Tri hành hợp nhất” · 知行合一',
    meta: 'HSK 4 · NGÔN NGỮ & NHÂN SINH',
    caption: 'Học chữ Hán và những câu nói triết lý nơi ngôn ngữ phản chiếu nhân sinh quan: Biết mà không làm thì chưa phải là biết thật sự.',
    image: './assets/chinese-philosophy-card.svg',
    imgId: 'exp-cover-chinese',
    categoryName: 'Ngôn ngữ & Triết lý Hán tự',
  },
  {
    id: 'moment-4',
    catId: 'photography',
    title: 'Tĩnh vật & Ánh sáng tự nhiên',
    meta: '2026 · KHOẢNG LẶNG THỊ GIÁC',
    caption: 'Quan sát nét tĩnh lặng của hoa lá và sự cân bằng không gian trong những khoảnh khắc đời thường.',
    image: './assets/loc-bg.jpg',
    categoryName: 'Nhiếp ảnh',
  },
];

let activeModalCatId: 'photography' | 'trekking' | 'chinese' = 'photography';

/**
 * Sync moments with latest media items from IndexedDB / Cloud CMS
 */
export async function syncMomentsWithStorage() {
  try {
    // 1. Try from IndexedDB media items
    const mediaList = await dbGetAllMedia();
    if (mediaList && mediaList.length > 0) {
      // Find latest photo
      const latestPhoto = mediaList.find((m) => m.collectionId === 'photography' || !m.collectionId);
      if (latestPhoto) {
        moments[0].image = latestPhoto.thumbUrl || latestPhoto.dataUrl;
        if (latestPhoto.title && latestPhoto.title !== 'll 0') {
          moments[0].title = latestPhoto.title;
        }
        if (latestPhoto.caption) {
          moments[0].caption = latestPhoto.caption;
        }
      }

      // Find latest trekking
      const latestTrek = mediaList.find((m) => m.collectionId === 'trekking');
      if (latestTrek) {
        moments[1].image = latestTrek.thumbUrl || latestTrek.dataUrl;
        if (latestTrek.title) moments[1].title = latestTrek.title;
        if (latestTrek.caption) moments[1].caption = latestTrek.caption;
      }
    } else {
      // Fallback check from journal_categories setting
      const categories = await dbGetSetting<any>('journal_categories', null);
      if (categories?.photography?.coverUrl) {
        moments[0].image = categories.photography.coverUrl;
      }
      if (categories?.trekking?.coverUrl) {
        moments[1].image = categories.trekking.coverUrl;
      }
    }
  } catch (err) {
    console.warn('[Moments] Storage sync notice:', err);
  }

  // Update DOM covers directly
  moments.forEach((m) => {
    if (m.imgId) {
      const imgEl = document.getElementById(m.imgId) as HTMLImageElement;
      if (imgEl && m.image) imgEl.src = m.image;
    }
  });
}

/**
 * Open high-res preview modal for a moment item
 */
export function openPreview(id: string) {
  const item = moments.find((m) => m.id === id);
  if (!item) return;

  activeModalCatId = item.catId;

  const previewImg = document.getElementById('previewImg') as HTMLImageElement;
  const previewCaption = document.getElementById('previewCaption');
  const previewMeta = document.getElementById('previewMeta');
  const viewAlbumBtn = document.getElementById('previewViewAlbumBtn');
  const modal = document.getElementById('previewModal');

  if (previewImg) {
    previewImg.src = item.image;
    previewImg.alt = item.title;
  }
  if (previewCaption) {
    previewCaption.textContent = `${item.title} — ${item.caption}`;
  }
  if (previewMeta) {
    previewMeta.textContent = item.meta;
  }
  if (viewAlbumBtn) {
    viewAlbumBtn.textContent = `Mở album ${item.categoryName || 'Nhật ký'} →`;
  }

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Close high-res preview modal
 */
export function closePreview() {
  const modal = document.getElementById('previewModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }
}

/**
 * Open Clean Code modal displaying clean HTML of the section
 */
export function openCodeModal() {
  const code = `<section id="explorations" class="max-w-3xl mx-auto px-6 py-16 space-y-10">
  <div class="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-white/10 pb-4">
    <h2 class="text-base font-medium text-zinc-100">Ngoài màn hình</h2>
    <p class="text-xs text-zinc-400">Một vài lát cắt về kỷ luật, vận động và khoảng lặng.</p>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-12">
${moments
  .map(
    (m) => `    <article class="group space-y-3">
      <div class="overflow-hidden rounded-lg bg-zinc-900 aspect-[4/3]">
        <img src="${m.image}" alt="${m.title}" loading="lazy"
          class="w-full h-full object-cover grayscale hover:grayscale-0 transition duration-500" />
      </div>
      <div class="space-y-1">
        <div class="flex justify-between items-baseline">
          <h3 class="text-sm font-medium text-zinc-100">${m.title}</h3>
          <span class="font-mono text-[11px] text-zinc-500">${m.meta}</span>
        </div>
        <p class="text-xs text-zinc-400 leading-relaxed">${m.caption}</p>
      </div>
    </article>`
  )
  .join('\n\n')}
  </div>
</section>`;

  const output = document.getElementById('cleanCodeOutput');
  if (output) output.textContent = code;

  const modal = document.getElementById('codeModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Close Clean Code modal
 */
export function closeCodeModal() {
  const modal = document.getElementById('codeModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }
}

/**
 * Copy clean HTML to clipboard with visual confirmation
 */
export function copyCleanCode() {
  const text = document.getElementById('cleanCodeOutput')?.textContent || '';
  const btnText = document.getElementById('copyBtnText');

  const showSuccess = () => {
    if (btnText) {
      const orig = btnText.textContent;
      btnText.textContent = 'Đã sao chép!';
      setTimeout(() => {
        if (btnText) btnText.textContent = orig;
      }, 1800);
    }
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(showSuccess).catch(() => fallbackCopy(text, showSuccess));
  } else {
    fallbackCopy(text, showSuccess);
  }
}

function fallbackCopy(text: string, cb: () => void) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    cb();
  } catch {}
  document.body.removeChild(ta);
}

/**
 * Render Moments Cards into the #moments-grid container
 */
export function renderMoments() {
  const grid = document.getElementById('moments-grid');
  if (!grid) return;

  grid.innerHTML = moments
    .map(
      (m) => `
    <article class="moment-card group" data-moment-id="${m.id}" role="button" tabindex="0" aria-label="${m.title}">
      <div class="moment-media-frame">
        <img 
          src="${m.image}" 
          alt="${m.title}" 
          loading="lazy" 
          class="moment-img" 
          ${m.imgId ? `id="${m.imgId}"` : ''} 
        />
        <div class="moment-zoom-badge">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
          </svg>
          <span>Xem chi tiết</span>
        </div>
      </div>
      <div class="moment-info">
        <div class="moment-header-line">
          <h3 class="moment-title">${m.title}</h3>
          <span class="moment-meta">${m.meta}</span>
        </div>
        <p class="moment-caption">${m.caption}</p>
      </div>
    </article>
  `
    )
    .join('');

  // Attach click and keyboard handlers
  grid.querySelectorAll<HTMLElement>('.moment-card').forEach((card) => {
    const id = card.getAttribute('data-moment-id');
    if (!id) return;

    card.addEventListener('click', () => openPreview(id));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPreview(id);
      }
    });
  });
}

/**
 * Initialize the Moments Outside the Screen Subsystem
 */
export function initExplorationsMoments() {
  renderMoments();
  syncMomentsWithStorage().then(() => {
    renderMoments();
  });

  // Code Modal Trigger
  const openCodeBtn = document.getElementById('openCodeModalBtn');
  if (openCodeBtn) {
    openCodeBtn.addEventListener('click', () => openCodeModal());
  }

  // Copy Code Button
  const copyBtn = document.getElementById('copyCodeBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => copyCleanCode());
  }

  // Close buttons
  const closePreviewBtn = document.getElementById('closePreviewBtn');
  if (closePreviewBtn) {
    closePreviewBtn.addEventListener('click', () => closePreview());
  }

  const closeCodeBtn = document.getElementById('closeCodeBtn');
  if (closeCodeBtn) {
    closeCodeBtn.addEventListener('click', () => closeCodeModal());
  }

  // Backdrop clicks
  const previewBackdrop = document.getElementById('previewModalBackdrop');
  if (previewBackdrop) {
    previewBackdrop.addEventListener('click', () => closePreview());
  }

  const codeBackdrop = document.getElementById('codeModalBackdrop');
  if (codeBackdrop) {
    codeBackdrop.addEventListener('click', () => closeCodeModal());
  }

  // View full album button inside Preview Modal
  const viewAlbumBtn = document.getElementById('previewViewAlbumBtn');
  if (viewAlbumBtn) {
    viewAlbumBtn.addEventListener('click', () => {
      closePreview();
      openExplorationJournal(activeModalCatId);
    });
  }

  // Global ESC key listener
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePreview();
      closeCodeModal();
    }
  });

  // Re-sync whenever Cloud CMS or Admin Studio publishes new data
  window.addEventListener('loc-cms-published', () => {
    syncMomentsWithStorage().then(() => {
      renderMoments();
    });
  });

  // Expose globally for inline compatibility
  if (typeof window !== 'undefined') {
    (window as any).openPreview = openPreview;
    (window as any).closePreview = closePreview;
    (window as any).openCodeModal = openCodeModal;
    (window as any).closeCodeModal = closeCodeModal;
    (window as any).copyCleanCode = copyCleanCode;
    (window as any).renderMoments = renderMoments;
  }
}
