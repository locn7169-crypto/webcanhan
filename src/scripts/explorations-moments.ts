import { openExplorationJournal } from './exploration-journal';
import { dbGetAllMedia, dbGetSetting, dbSetSetting, type MediaItem } from './admin-studio';
import { fetchCloudCMS } from './cloud-cms-sync';

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
    title: 'Bình hoa hồng trắng — Kỷ niệm cuối cấp 3',
    meta: '2026 · NHIẾP ẢNH & THỊ GIÁC',
    caption: 'Đây là bức ảnh mà tôi đã được chị Trâm Anh tặng vào cuối năm cấp 3. Hiện tại đang là tất cả các ảnh đại diện mạng xã hội của tôi',
    image: './assets/loc-banner.jpg',
    imgId: 'exp-cover-photography',
    categoryName: 'Nhiếp ảnh',
  },
  {
    id: 'moment-2',
    catId: 'trekking',
    title: 'Khung cảnh trên núi nhìn xuống Thành Phố Tây Ninh',
    meta: '2026 · SỨC BỀN & TĨNH TÂM',
    caption: 'Hình ảnh từ trên núi nhìn xuống . rất đẹp',
    image: './assets/backdrop-works.jpg',
    imgId: 'exp-cover-trekking',
    categoryName: 'Trekking & Outdoors',
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
        parsed.slice(0, 2).forEach((cachedItem: MomentItem, idx: number) => {
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
  moments.length = 2;
}

function cleanMediaTitle(rawTitle?: string): string {
  if (!rawTitle) return '';
  const trimmed = rawTitle.trim();
  if (/^[\d\s_-]{6,}$/.test(trimmed) || trimmed.includes('679579249')) {
    return 'Bình hoa hồng trắng — Kỷ niệm cuối cấp 3';
  }
  return trimmed;
}

function cleanMediaCaption(rawCaption?: string): string {
  if (!rawCaption) return '';
  const trimmed = rawCaption.trim();
  if (/^[\d\s_-]{6,}$/.test(trimmed) || trimmed.includes('679579249')) {
    return 'Đây là bức ảnh mà tôi đã được chị Trâm Anh tặng vào cuối năm cấp 3. Hiện tại đang là tất cả các ảnh đại diện mạng xã hội của tôi';
  }
  return trimmed;
}

/**
 * Update moments array directly from media items (called by admin studio on upload, replace, reorder)
 */
export function updateMomentsFromMediaList(mediaList: MediaItem[]) {
  if (!mediaList || mediaList.length === 0) return;

  const photos = mediaList.filter((m) => m.collectionId === 'photography' || !m.collectionId);
  const treks = mediaList.filter((m) => m.collectionId === 'trekking');

  // Moment 1: Latest photography (Prioritize high-res dataUrl for razor-sharp Retina display)
  if (photos[0]) {
    moments[0].image = photos[0].dataUrl || photos[0].thumbUrl;
    if (photos[0].title) moments[0].title = cleanMediaTitle(photos[0].title);
    if (photos[0].caption) moments[0].caption = cleanMediaCaption(photos[0].caption);
  }

  // Moment 2: Latest trekking (Prioritize high-res dataUrl for crisp mountain panorama)
  if (treks[0]) {
    moments[1].image = treks[0].dataUrl || treks[0].thumbUrl;
    if (treks[0].title) moments[1].title = cleanMediaTitle(treks[0].title);
    if (treks[0].caption) moments[1].caption = cleanMediaCaption(treks[0].caption);
  }

  // Strictly enforce 2 items in Thư Viện
  moments.length = 2;

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
    let mediaList = await dbGetAllMedia();

    // If local IndexedDB is empty (first visit or different browser), fetch directly from Cloud CMS!
    if (!mediaList || mediaList.length === 0) {
      try {
        const cloud = await fetchCloudCMS();
        if (cloud && Array.isArray(cloud.mediaItems) && cloud.mediaItems.length > 0) {
          mediaList = cloud.mediaItems;
        }
      } catch (cloudErr) {
        console.warn('[Moments] Cloud sync notice:', cloudErr);
      }
    }

    if (mediaList && mediaList.length > 0) {
      updateMomentsFromMediaList(mediaList);
    } else {
      // Fallback check from journal_categories setting
      const categories = await dbGetSetting<any>('journal_categories', null);
      if (categories?.photography?.coverUrl) moments[0].image = categories.photography.coverUrl;
      if (categories?.trekking?.coverUrl) moments[1].image = categories.trekking.coverUrl;
    }
  } catch (err) {
    console.warn('[Moments] Storage sync notice:', err);
  }

  // Strictly enforce 2 items in Thư Viện
  moments.length = 2;

  // Re-render moment cards to ensure updated titles, captions, and images are live
  renderMoments();
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
          data-edit-key="moment-img-${m.id}"
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
          <h3 class="moment-title" data-edit-key="moment-title-${m.id}">${m.title}</h3>
          <span class="moment-meta" data-edit-key="moment-meta-${m.id}">${m.meta}</span>
        </div>
        <p class="moment-caption" data-edit-key="moment-caption-${m.id}">${m.caption}</p>
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
