import { openExplorationJournal } from './exploration-journal';
import { dbGetAllMedia, dbGetSetting, dbSetSetting, type MediaItem } from './admin-studio';

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

const MOMENTS_CACHE_KEY = 'loc_moments_cache_v2';

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
 * Load cached moments from localStorage for immediate 0ms hydration (prevents flicker on reload)
 */
export function loadCachedMoments() {
  try {
    const raw = localStorage.getItem(MOMENTS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach((cachedItem: MomentItem, idx: number) => {
          if (moments[idx]) {
            if (cachedItem.image) moments[idx].image = cachedItem.image;
            if (cachedItem.title) moments[idx].title = cachedItem.title;
            if (cachedItem.caption) moments[idx].caption = cachedItem.caption;
            if (cachedItem.meta) moments[idx].meta = cachedItem.meta;
          }
        });
      }
    }
  } catch (e) {
    console.warn('[Moments] Cache load notice:', e);
  }
}

/**
 * Update moments array directly from media items (called by admin studio on upload, replace, reorder)
 */
export function updateMomentsFromMediaList(mediaList: MediaItem[]) {
  if (!mediaList || mediaList.length === 0) return;

  const photos = mediaList.filter((m) => m.collectionId === 'photography' || !m.collectionId);
  const treks = mediaList.filter((m) => m.collectionId === 'trekking');
  const chinese = mediaList.filter((m) => m.collectionId === 'chinese');

  // Moment 1: Latest photography
  if (photos[0]) {
    moments[0].image = photos[0].thumbUrl || photos[0].dataUrl;
    if (photos[0].title && photos[0].title !== 'll 0') moments[0].title = photos[0].title;
    if (photos[0].caption) moments[0].caption = photos[0].caption;
  }

  // Moment 2: Latest trekking
  if (treks[0]) {
    moments[1].image = treks[0].thumbUrl || treks[0].dataUrl;
    if (treks[0].title) moments[1].title = treks[0].title;
    if (treks[0].caption) moments[1].caption = treks[0].caption;
  }

  // Moment 3: Latest Chinese
  if (chinese[0]) {
    moments[2].image = chinese[0].thumbUrl || chinese[0].dataUrl;
    if (chinese[0].title) moments[2].title = chinese[0].title;
    if (chinese[0].caption) moments[2].caption = chinese[0].caption;
  }

  // Moment 4: Second photography (or next photo)
  if (photos[1]) {
    moments[3].image = photos[1].thumbUrl || photos[1].dataUrl;
    if (photos[1].title) moments[3].title = photos[1].title;
    if (photos[1].caption) moments[3].caption = photos[1].caption;
  } else if (mediaList[3]) {
    moments[3].image = mediaList[3].thumbUrl || mediaList[3].dataUrl;
    if (mediaList[3].title) moments[3].title = mediaList[3].title;
    if (mediaList[3].caption) moments[3].caption = mediaList[3].caption;
  }

  // Persist cache immediately
  try {
    localStorage.setItem(MOMENTS_CACHE_KEY, JSON.stringify(moments));
  } catch {}
  dbSetSetting('moments_cache', moments).catch(() => {});
}

/**
 * Sync moments with latest media items from IndexedDB / Cloud CMS
 */
export async function syncMomentsWithStorage() {
  try {
    // 1. Check IndexedDB media items
    const mediaList = await dbGetAllMedia();
    if (mediaList && mediaList.length > 0) {
      updateMomentsFromMediaList(mediaList);
    } else {
      // Fallback check from journal_categories setting
      const categories = await dbGetSetting<any>('journal_categories', null);
      if (categories?.photography?.coverUrl) moments[0].image = categories.photography.coverUrl;
      if (categories?.trekking?.coverUrl) moments[1].image = categories.trekking.coverUrl;
      if (categories?.chinese?.coverUrl) moments[2].image = categories.chinese.coverUrl;
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
  // 1. Instant 0ms hydration from local cache
  loadCachedMoments();
  renderMoments();

  // 2. Async sync with IndexedDB
  syncMomentsWithStorage().then(() => {
    renderMoments();
  });

  // Close buttons
  const closePreviewBtn = document.getElementById('closePreviewBtn');
  if (closePreviewBtn) {
    closePreviewBtn.addEventListener('click', () => closePreview());
  }

  // Backdrop clicks
  const previewBackdrop = document.getElementById('previewModalBackdrop');
  if (previewBackdrop) {
    previewBackdrop.addEventListener('click', () => closePreview());
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
    (window as any).renderMoments = renderMoments;
  }
}
