import gsap from 'gsap';
import { getLenis } from './lenis-scroll';

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  story: string;
  photoUrl: string; // Primary image for backwards-compatibility
  photos?: string[]; // Array of multiple photos for Instagram carousel
  caption: string;
  likes?: number;
  isLiked?: boolean;
}

export interface ExplorationCategory {
  id: 'photography' | 'trekking' | 'chinese';
  titleEn: string;
  titleVi: string;
  subtitleEn: string;
  subtitleVi: string;
  coord: string;
  coverUrl: string;
  entries: JournalEntry[];
}

const STORAGE_KEY = 'loc_exploration_journals_v4';

// Helper to reliably get array of photos
export function getEntryPhotos(entry: JournalEntry): string[] {
  if (entry.photos && Array.isArray(entry.photos) && entry.photos.length > 0) {
    return entry.photos;
  }
  return entry.photoUrl ? [entry.photoUrl] : ['/assets/loc-banner.jpg'];
}

// Default initial data matching Loc's real interests with rich multi-photo albums
const DEFAULT_CATEGORIES: Record<string, ExplorationCategory> = {
  trekking: {
    id: 'trekking',
    titleEn: 'Trekking & Outdoors',
    titleVi: 'Đi bộ đường dài & Thiên nhiên',
    subtitleEn: 'Seeking clarity and endurance across highland trails, foggy ridges, and quiet mountain forests.',
    subtitleVi: 'Tìm kiếm sự tĩnh tâm và bền bỉ qua những cung đường cao nguyên, triền sương mù và rừng thông tĩnh lặng.',
    coord: 'Highland Trails · Sức bền & Tĩnh tâm',
    coverUrl: '/assets/backdrop-works.jpg',
    entries: [
      {
        id: 'trek-1',
        date: '06/09/2026',
        title: 'Một mình đi núi — Cung đường cao nguyên sương mù',
        story:
          'Hôm 6/9 tôi đi núi 1 mình. Bắt đầu từ 5h sáng khi sương mù còn giăng kín các sườn thông. Không sóng điện thoại, chỉ có tiếng gió, tiếng suối và nhịp bước chân của chính mình. Cảm giác vượt qua sự mệt mỏi thể xác để đổi lấy sự tĩnh lặng của tâm trí là một trải nghiệm không thể nào quên.',
        photoUrl: '/assets/backdrop-works.jpg',
        photos: ['/assets/backdrop-works.jpg', '/assets/backdrop-contact.jpg', '/assets/loc-bg.jpg'],
        caption: 'Triền dốc buổi sớm khi sương bắt đầu tan, nhìn xuống thung lũng mây mù trải dài vô tận.',
        likes: 28,
        isLiked: false,
      },
      {
        id: 'trek-2',
        date: '18/07/2026',
        title: 'Hành trình rèn luyện sức bền và sự điềm tĩnh',
        story:
          'Mỗi chuyến đi bộ đường dài là một bài học sâu sắc về sự kiên nhẫn. Khi đối diện với những con dốc cao gập ghềnh, bạn học cách không nhìn lên đỉnh núi để thấy nản lòng, mà chỉ tập trung vào từng bước chân vững chắc ngay trước mắt. Về đích không chỉ là chạm tới độ cao, mà là chiến thắng sự lười biếng của chính bản thân.',
        photoUrl: '/assets/backdrop-contact.jpg',
        photos: ['/assets/backdrop-contact.jpg', '/assets/backdrop-works.jpg'],
        caption: 'Cột mốc cao độ và ánh hoàng hôn trải dài trên triền cỏ cao nguyên.',
        likes: 19,
        isLiked: false,
      },
    ],
  },
  photography: {
    id: 'photography',
    titleEn: 'Photography & Visual Storytelling',
    titleVi: 'Nhiếp ảnh & Kể chuyện thị giác',
    subtitleEn: 'Observing geometry, natural daylight, delicate floral stillness, and spatial harmony in everyday moments.',
    subtitleVi: 'Quan sát hình khối, ánh sáng tự nhiên, nét tĩnh lặng của hoa lá và sự cân bằng không gian trong những khoảnh khắc đời thường.',
    coord: 'Still Life & Drapery · Tĩnh vật & Ánh sáng',
    coverUrl: '/assets/loc-banner.jpg',
    entries: [
      {
        id: 'photo-1',
        date: '24/08/2026',
        title: 'Tĩnh vật hoa trắng & Ánh sáng tự nhiên',
        story:
          'Quan sát cấu trúc hình khối của từng đóa hoa hồng trắng dưới nguồn sáng tự nhiên từ ô cửa sổ. Nhiếp ảnh tĩnh vật rèn cho tôi khả năng chậm lại, chú ý đến những chi tiết nhỏ nhất của bóng đổ, kết cấu và sự cân bằng không gian.',
        photoUrl: '/assets/loc-banner.jpg',
        photos: ['/assets/loc-banner.jpg', '/assets/loc-bg.jpg', '/assets/backdrop-works.jpg'],
        caption: 'Bình hoa hồng trắng trên phiến đá cẩm thạch — Nét tĩnh lặng của buổi sớm mai.',
        likes: 42,
        isLiked: true,
      },
      {
        id: 'photo-2',
        date: '12/05/2026',
        title: 'Kể chuyện qua những khoảng lặng thị giác',
        story:
          'Một bức ảnh có chiều sâu không nhất thiết phải chứa nhiều chi tiết. Đôi khi, chính khoảng trắng và sự tối giản trong khung hình lại mở ra nhiều cảm xúc nhất cho người xem. Bức ảnh là một ghi chép thị giác không lời, lưu giữ khoảnh khắc thời gian ngưng đọng.',
        photoUrl: '/assets/loc-bg.jpg',
        photos: ['/assets/loc-bg.jpg', '/assets/loc-banner.jpg'],
        caption: 'Ánh sáng dịu nhẹ và những khối hình học hài hòa trong không gian tĩnh lặng.',
        likes: 31,
        isLiked: false,
      },
    ],
  },
  chinese: {
    id: 'chinese',
    titleEn: 'Chinese Language & Philosophy',
    titleVi: 'Ngôn ngữ & Triết lý Hán tự',
    subtitleEn: 'Studying HSK characters and philosophical expressions where language mirrors worldview.',
    subtitleVi: 'Học chữ Hán HSK và những câu nói triết lý nơi ngôn ngữ phản chiếu nhân sinh quan.',
    coord: 'HSK Studies · Hanzi Calligraphy · Hán tự',
    coverUrl: '/assets/loclearn/screen_lotrinh.jpg',
    entries: [
      {
        id: 'chinese-1',
        date: '15/06/2026',
        title: 'Chiêm nghiệm “Tri hành hợp nhất” (知行合一)',
        story:
          'Chữ “Tri” là hiểu biết, “Hành” là thực hành. Người xưa dạy rằng biết mà không làm thì chưa phải là biết thật sự. Trong việc tự học lập trình hay xây dựng sản phẩm, mỗi ngày tôi đều nhắc nhở bản thân đưa kiến thức vào thực tế thay vì chỉ dừng lại ở lý thuyết suông.',
        photoUrl: '/assets/locmoney/module_nhatky.png',
        photos: ['/assets/locmoney/module_nhatky.png', '/assets/loclearn/screen_thehoc.jpg', '/assets/loclearn/screen_lotrinh.jpg'],
        caption: 'Sổ tay ghi chép những câu danh ngôn và nét chữ Hán tự thực hành mỗi ngày.',
        likes: 37,
        isLiked: false,
      },
      {
        id: 'chinese-2',
        date: '02/04/2026',
        title: 'Học Hán tự — Rèn luyện sự kiên định bền bỉ',
        story:
          'Học chữ Hán từ con số 0 đòi hỏi tính kỷ luật rất cao. Thứ tự từng nét bút, bộ thủ và cấu trúc chữ nhắc nhở tôi về sự chỉn chu. Câu nói tâm đắc: “Tôi nỗ lực chưa chắc thành công, nhưng không nỗ lực chắc chắn thất bại” (我努力不一定会成功 但我不努力一定会失败).',
        photoUrl: '/assets/loclearn/screen_thehoc.jpg',
        photos: ['/assets/loclearn/screen_thehoc.jpg', '/assets/loclearn/screen_lotrinh.jpg'],
        caption: 'Thẻ ghi nhớ và phương pháp lặp lại ngắt quãng củng cố từ vựng bền bỉ.',
        likes: 25,
        isLiked: false,
      },
    ],
  },
};

// Global module state
let categories: Record<string, ExplorationCategory> = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
let currentCatId: 'photography' | 'trekking' | 'chinese' = 'photography';
let activePostId: string | null = null; // null = Gallery Grid; string = Single Post Inspector
let currentPhotoIndex = 0; // Current photo in the active post carousel
let isJournalOpen = false;
let isLightboxOpen = false;

// File input elements
let coverFileInput: HTMLInputElement | null = null;
let appendPhotosFileInput: HTMLInputElement | null = null;
let replacePhotoFileInput: HTMLInputElement | null = null;
let newPostFileInput: HTMLInputElement | null = null;

function isEditModeActive(): boolean {
  return document.body.classList.contains('visual-editor-active');
}

function showToast(msg: string) {
  let toast = document.querySelector<HTMLElement>('.toast-notice');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast-notice';
    toast.innerHTML = '<span class="toast-msg"></span>';
    document.body.appendChild(toast);
  }
  const msgEl = toast.querySelector<HTMLElement>('.toast-msg');
  if (msgEl) msgEl.textContent = msg;

  toast.classList.add('show');
  setTimeout(() => {
    toast?.classList.remove('show');
  }, 3200);
}

// Load data from localStorage with v3 -> v4 migration
function loadJournalData() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem('loc_exploration_journals_v3');
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure photos array exists on each entry
      Object.keys(parsed).forEach((catKey) => {
        if (parsed[catKey]?.entries) {
          parsed[catKey].entries.forEach((it: any) => {
            if (!it.photos || !Array.isArray(it.photos) || it.photos.length === 0) {
              it.photos = it.photoUrl ? [it.photoUrl] : [];
            }
          });
        }
      });
      categories = { ...DEFAULT_CATEGORIES, ...parsed };
    }
  } catch (e) {
    console.warn('[Journal] Load failed, using defaults:', e);
  }

  updateMainPageCardCovers();
}

// Save data to localStorage
export function saveJournalData() {
  try {
    syncActivePostToState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    updateMainPageCardCovers();
    showToast('💾 Đã lưu dữ liệu nhật ký & ảnh thành công!');
  } catch (e) {
    console.error('[Journal] Save failed:', e);
    showToast('⚠️ Không thể lưu nhật ký vào bộ nhớ.');
  }
}

// Sync active post text if in edit mode
function syncActivePostToState() {
  if (!activePostId) return;
  const currentCat = categories[currentCatId];
  if (!currentCat) return;

  const entry = currentCat.entries.find((it) => it.id === activePostId);
  if (!entry) return;

  const modal = document.getElementById('exploration-journal-modal');
  if (!modal) return;

  const dateEl = modal.querySelector<HTMLElement>('.insta-post-date');
  const titleEl = modal.querySelector<HTMLElement>('.insta-post-title');
  const storyEl = modal.querySelector<HTMLElement>('.insta-post-story');
  const captionEl = modal.querySelector<HTMLElement>('.insta-post-caption');

  if (dateEl) entry.date = dateEl.innerText.trim();
  if (titleEl) entry.title = titleEl.innerText.trim();
  if (storyEl) entry.story = storyEl.innerText.trim();
  if (captionEl) entry.caption = captionEl.innerText.trim();
}

// Update card cover visuals in the main page #explorations section
function updateMainPageCardCovers() {
  const photoCard = document.querySelector<HTMLImageElement>('#exp-cover-photography');
  if (photoCard && categories.photography?.coverUrl) {
    photoCard.src = categories.photography.coverUrl;
  }

  const trekCard = document.querySelector<HTMLImageElement>('#exp-cover-trekking');
  if (trekCard && categories.trekking?.coverUrl) {
    trekCard.src = categories.trekking.coverUrl;
  }

  const chineseCard = document.querySelector<HTMLImageElement>('#exp-cover-chinese');
  const chineseBox = document.querySelector<HTMLElement>('#exp-cover-chinese-box');
  if (chineseCard && categories.chinese?.coverUrl) {
    chineseCard.src = categories.chinese.coverUrl;
    if (categories.chinese.coverUrl !== '/assets/loclearn/screen_lotrinh.jpg') {
      chineseCard.style.display = 'block';
      if (chineseBox) chineseBox.style.display = 'none';
    }
  }
}

// Trigger Heart Burst Effect on Photo (Instagram Double Click)
function triggerHeartBurst(container: HTMLElement, x?: number, y?: number) {
  const burst = document.createElement('div');
  burst.className = 'insta-heart-burst';
  if (x !== undefined && y !== undefined) {
    burst.style.left = `${x}px`;
    burst.style.top = `${y}px`;
  }
  burst.innerHTML = `
    <svg viewBox="0 0 24 24" class="insta-burst-heart-svg">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    </svg>
  `;
  container.appendChild(burst);
  setTimeout(() => burst.remove(), 950);
}

// Fullscreen Lightbox Modal
function openFullscreenLightbox(photoSrc: string, title: string) {
  let lightbox = document.getElementById('insta-lightbox-modal');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'insta-lightbox-modal';
    lightbox.className = 'insta-lightbox-overlay';
    lightbox.innerHTML = `
      <div class="insta-lightbox-backdrop"></div>
      <div class="insta-lightbox-content">
        <button type="button" class="insta-lightbox-close" aria-label="Đóng phóng to">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <img src="" alt="" class="insta-lightbox-img">
        <div class="insta-lightbox-caption"></div>
      </div>
    `;
    document.body.appendChild(lightbox);

    lightbox.querySelector('.insta-lightbox-close')?.addEventListener('click', closeFullscreenLightbox);
    lightbox.querySelector('.insta-lightbox-backdrop')?.addEventListener('click', closeFullscreenLightbox);
  }

  const imgEl = lightbox.querySelector<HTMLImageElement>('.insta-lightbox-img');
  const captionEl = lightbox.querySelector<HTMLElement>('.insta-lightbox-caption');
  if (imgEl) imgEl.src = photoSrc;
  if (captionEl) captionEl.textContent = title;

  lightbox.classList.add('is-open');
  isLightboxOpen = true;

  gsap.fromTo(
    lightbox.querySelector('.insta-lightbox-img'),
    { scale: 0.9, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.35, ease: 'power3.out' }
  );
}

function closeFullscreenLightbox() {
  const lightbox = document.getElementById('insta-lightbox-modal');
  if (!lightbox || !isLightboxOpen) return;
  isLightboxOpen = false;

  gsap.to(lightbox.querySelector('.insta-lightbox-img'), {
    scale: 0.92,
    opacity: 0,
    duration: 0.2,
    ease: 'power2.in',
    onComplete: () => {
      lightbox?.classList.remove('is-open');
    },
  });
}

// Render Main Journal Screen: Either Instagram Grid OR Single Post View
function renderJournalModal(catId: 'photography' | 'trekking' | 'chinese') {
  currentCatId = catId;
  const modal = document.getElementById('exploration-journal-modal');
  if (!modal) return;

  const currentCat = categories[catId];
  if (!currentCat) return;

  const isEditing = isEditModeActive();

  // Update tabs
  modal.querySelectorAll<HTMLButtonElement>('.journal-tab-btn').forEach((btn) => {
    const target = btn.getAttribute('data-journal-tab');
    const isActive = target === catId;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  const scrollContainer = modal.querySelector<HTMLElement>('.journal-modal-scroll');
  if (!scrollContainer) return;

  // ==========================================
  // VIEW A: Single Post View (Instagram Style)
  // ==========================================
  if (activePostId) {
    const entryIndex = currentCat.entries.findIndex((it) => it.id === activePostId);
    const entry = currentCat.entries[entryIndex] || currentCat.entries[0];
    if (!entry) {
      activePostId = null;
      renderJournalModal(catId);
      return;
    }

    const photos = getEntryPhotos(entry);
    if (currentPhotoIndex >= photos.length) currentPhotoIndex = 0;
    const currentPhoto = photos[currentPhotoIndex] || photos[0];

    const prevEntry = entryIndex > 0 ? currentCat.entries[entryIndex - 1] : null;
    const nextEntry = entryIndex < currentCat.entries.length - 1 ? currentCat.entries[entryIndex + 1] : null;

    scrollContainer.innerHTML = `
      <div class="insta-post-view">
        <!-- Back Navigation Bar -->
        <div class="insta-post-nav-bar">
          <button type="button" class="btn btn-secondary insta-back-btn" title="Quay lại danh mục ảnh">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
            <span>← Quay lại danh mục</span>
          </button>

          <div class="insta-pagination-group">
            <span class="insta-counter">Khoảnh khắc ${entryIndex + 1} / ${currentCat.entries.length}</span>
            <div class="insta-arrows">
              <button type="button" class="insta-arrow-btn insta-prev-btn" ${!prevEntry ? 'disabled' : ''} title="Bài trước">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <button type="button" class="insta-arrow-btn insta-next-btn" ${!nextEntry ? 'disabled' : ''} title="Bài tiếp theo">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Main Instagram Card Layout: Left Multi-Photo Carousel + Right Story -->
        <article class="insta-card">
          <!-- Left: Photo Stage with Ambient Glow & Carousel Slider -->
          <div class="insta-photo-stage-wrapper">
            <div class="insta-photo-stage" id="insta-photo-stage">
              <!-- Ambient Glow Backlight reflecting photo colors -->
              <div class="insta-ambient-glow" style="background-image: url('${currentPhoto}');"></div>

              <!-- Carousel Slides Viewport -->
              <div class="insta-carousel-viewport">
                <div class="insta-carousel-track" style="transform: translateX(-${currentPhotoIndex * 100}%);">
                  ${photos
                    .map(
                      (src, idx) => `
                    <div class="insta-carousel-slide">
                      <img src="${src}" alt="${entry.title} - Ảnh ${idx + 1}" class="insta-main-photo" loading="eager">
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </div>

              <!-- Multi-photo Counter Badge (e.g. 1 / 4) -->
              ${
                photos.length > 1
                  ? `
                <div class="insta-photo-counter-badge">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                    <rect width="12" height="12" x="8" y="8" rx="2" ry="2"/>
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                  </svg>
                  <span>${currentPhotoIndex + 1} / ${photos.length}</span>
                </div>
              `
                  : ''
              }

              <!-- Fullscreen Lightbox Button -->
              <button type="button" class="insta-enlarge-btn" title="Phóng to ảnh rạp chiếu" aria-label="Phóng to ảnh">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              </button>

              <!-- Left / Right Carousel Navigation Arrows (when > 1 photo) -->
              ${
                photos.length > 1
                  ? `
                <button type="button" class="insta-carousel-arrow insta-carousel-prev" ${currentPhotoIndex === 0 ? 'disabled' : ''} aria-label="Ảnh trước">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <button type="button" class="insta-carousel-arrow insta-carousel-next" ${currentPhotoIndex === photos.length - 1 ? 'disabled' : ''} aria-label="Ảnh sau">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
                </button>

                <!-- Indicator Dots -->
                <div class="insta-carousel-dots">
                  ${photos
                    .map(
                      (_, idx) => `
                    <button type="button" class="insta-dot ${idx === currentPhotoIndex ? 'active' : ''}" data-photo-idx="${idx}" aria-label="Chuyển đến ảnh ${idx + 1}"></button>
                  `
                    )
                    .join('')}
                </div>
              `
                  : ''
              }

              <!-- Edit Mode Controls for Multi-Photo Management -->
              ${
                isEditing
                  ? `
                <div class="insta-photo-edit-toolbar">
                  <button type="button" class="btn btn-secondary insta-btn-sm" data-action="append-photos" title="Thêm nhiều ảnh vào album này">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                    <span>+ Thêm nhiều ảnh</span>
                  </button>
                  <button type="button" class="btn btn-secondary insta-btn-sm" data-action="replace-current-photo" title="Đổi ảnh đang hiển thị này">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    <span>Đổi ảnh này</span>
                  </button>
                  ${
                    photos.length > 1
                      ? `
                    <button type="button" class="btn btn-secondary btn-danger-subtle insta-btn-sm" data-action="delete-current-photo" title="Xóa chỉ bức ảnh này khỏi album">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                      <span>Xóa ảnh</span>
                    </button>
                  `
                      : ''
                  }
                </div>
              `
                  : ''
              }
            </div>

            <!-- Filmstrip Thumbnails (when > 1 photo) -->
            ${
              photos.length > 1
                ? `
              <div class="insta-thumbnails-strip">
                ${photos
                  .map(
                    (src, idx) => `
                  <button type="button" class="insta-thumb-item ${idx === currentPhotoIndex ? 'active' : ''}" data-photo-idx="${idx}" title="Ảnh ${idx + 1}">
                    <img src="${src}" alt="Thumb ${idx + 1}" loading="lazy">
                  </button>
                `
                  )
                  .join('')}
              </div>
            `
                : ''
            }
          </div>

          <!-- Right: Author & Story Panel -->
          <div class="insta-detail-panel">
            <!-- Author Header with Heart Like Button -->
            <div class="insta-author-row">
              <div class="insta-author-left">
                <img src="/assets/loc-avatar.jpg" alt="Nguyễn Thành Lộc" class="insta-avatar">
                <div class="insta-author-meta">
                  <span class="insta-author-name">Nguyễn Thành Lộc</span>
                  <span class="insta-category-tag">${currentCat.titleVi}</span>
                </div>
              </div>
              
              <div class="insta-author-right">
                <button type="button" class="insta-like-btn ${entry.isLiked ? 'liked' : ''}" title="Thả tim khoảnh khắc này" aria-label="Thả tim">
                  <svg class="insta-heart-icon" viewBox="0 0 24 24" fill="${entry.isLiked ? '#ef4444' : 'none'}" stroke="${entry.isLiked ? '#ef4444' : 'currentColor'}" stroke-width="2">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                  </svg>
                  <span class="insta-like-count">${entry.likes || 1}</span>
                </button>
                <span class="insta-post-date" ${isEditing ? 'contenteditable="true" spellcheck="false"' : ''}>${entry.date}</span>
              </div>
            </div>

            <!-- Scrollable Content Body -->
            <div class="insta-detail-body">
              <h3 class="insta-post-title" ${isEditing ? 'contenteditable="true" spellcheck="false"' : ''}>${entry.title}</h3>
              
              <div class="insta-story-box">
                <p class="insta-post-story" ${isEditing ? 'contenteditable="true" spellcheck="false"' : ''}>${entry.story}</p>
              </div>

              <div class="insta-caption-box">
                <span class="insta-caption-label">Chú thích khoảnh khắc:</span>
                <p class="insta-post-caption" ${isEditing ? 'contenteditable="true" spellcheck="false"' : ''}>${entry.caption || 'Nhấp để nhập chú thích ảnh...'}</p>
              </div>
            </div>

            <!-- Footer Action Panel -->
            <div class="insta-detail-footer">
              ${
                isEditing
                  ? `
                <div class="insta-edit-actions-row">
                  <button type="button" class="btn btn-secondary btn-danger-subtle insta-delete-btn" data-action="delete-post" data-entry-id="${entry.id}">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    <span>Xóa toàn bộ bài</span>
                  </button>
                  <button type="button" class="btn btn-primary insta-save-post-btn">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
                    <span>Lưu bài viết</span>
                  </button>
                </div>
              `
                  : `
                <div class="insta-hint-row">
                  <span class="insta-hint-text">✨ Chạm 2 lần vào ảnh để thả tim · Dùng phím ← → để chuyển ảnh</span>
                </div>
              `
              }
            </div>
          </div>
        </article>
      </div>
    `;

    // 1. Double Click Heart Reaction
    const stageEl = scrollContainer.querySelector<HTMLElement>('#insta-photo-stage');
    stageEl?.addEventListener('dblclick', (e) => {
      const rect = stageEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      triggerHeartBurst(stageEl, x, y);

      if (!entry.isLiked) {
        entry.isLiked = true;
        entry.likes = (entry.likes || 0) + 1;
        const likeBtn = scrollContainer.querySelector<HTMLElement>('.insta-like-btn');
        const countEl = scrollContainer.querySelector<HTMLElement>('.insta-like-count');
        likeBtn?.classList.add('liked');
        const iconSvg = likeBtn?.querySelector('svg');
        if (iconSvg) {
          iconSvg.setAttribute('fill', '#ef4444');
          iconSvg.setAttribute('stroke', '#ef4444');
        }
        if (countEl) countEl.textContent = String(entry.likes);
        saveJournalData();
      }
      showToast('❤️ Đã thả tim cho khoảnh khắc này!');
    });

    // 2. Like Button Click
    scrollContainer.querySelector<HTMLElement>('.insta-like-btn')?.addEventListener('click', () => {
      entry.isLiked = !entry.isLiked;
      entry.likes = (entry.likes || 0) + (entry.isLiked ? 1 : -1);
      if (entry.likes < 0) entry.likes = 0;

      const likeBtn = scrollContainer.querySelector<HTMLElement>('.insta-like-btn');
      const countEl = scrollContainer.querySelector<HTMLElement>('.insta-like-count');
      likeBtn?.classList.toggle('liked', entry.isLiked);
      const iconSvg = likeBtn?.querySelector('svg');
      if (iconSvg) {
        iconSvg.setAttribute('fill', entry.isLiked ? '#ef4444' : 'none');
        iconSvg.setAttribute('stroke', entry.isLiked ? '#ef4444' : 'currentColor');
      }
      if (countEl) countEl.textContent = String(entry.likes);

      if (entry.isLiked && stageEl) {
        triggerHeartBurst(stageEl);
      }
      saveJournalData();
    });

    // 3. Carousel Navigation (< and >)
    scrollContainer.querySelector('.insta-carousel-prev')?.addEventListener('click', () => {
      if (currentPhotoIndex > 0) {
        currentPhotoIndex--;
        renderJournalModal(currentCatId);
      }
    });

    scrollContainer.querySelector('.insta-carousel-next')?.addEventListener('click', () => {
      if (currentPhotoIndex < photos.length - 1) {
        currentPhotoIndex++;
        renderJournalModal(currentCatId);
      }
    });

    // 4. Dot indicators and thumbnails jump
    scrollContainer.querySelectorAll<HTMLElement>('.insta-dot, .insta-thumb-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-photo-idx'));
        if (!isNaN(idx) && idx >= 0 && idx < photos.length) {
          currentPhotoIndex = idx;
          renderJournalModal(currentCatId);
        }
      });
    });

    // 5. Lightbox expand
    scrollContainer.querySelector('.insta-enlarge-btn')?.addEventListener('click', () => {
      openFullscreenLightbox(currentPhoto, entry.title);
    });

    // 6. Navigation between posts (Previous / Next post)
    scrollContainer.querySelector('.insta-back-btn')?.addEventListener('click', () => {
      syncActivePostToState();
      activePostId = null;
      renderJournalModal(currentCatId);
    });

    scrollContainer.querySelector('.insta-prev-btn')?.addEventListener('click', () => {
      if (prevEntry) {
        syncActivePostToState();
        activePostId = prevEntry.id;
        currentPhotoIndex = 0;
        renderJournalModal(currentCatId);
      }
    });

    scrollContainer.querySelector('.insta-next-btn')?.addEventListener('click', () => {
      if (nextEntry) {
        syncActivePostToState();
        activePostId = nextEntry.id;
        currentPhotoIndex = 0;
        renderJournalModal(currentCatId);
      }
    });

    // 7. Edit Actions: Append multiple photos, Replace photo, Delete photo
    scrollContainer.querySelector('[data-action="append-photos"]')?.addEventListener('click', () => {
      appendPhotosFileInput?.click();
    });

    scrollContainer.querySelector('[data-action="replace-current-photo"]')?.addEventListener('click', () => {
      replacePhotoFileInput?.click();
    });

    scrollContainer.querySelector('[data-action="delete-current-photo"]')?.addEventListener('click', () => {
      if (photos.length <= 1) {
        showToast('⚠️ Bài viết cần có ít nhất 1 ảnh. Nếu muốn xóa cả bài, hãy dùng nút "Xóa toàn bộ bài".');
        return;
      }
      if (confirm('Anh có chắc muốn xóa ảnh này khỏi album không?')) {
        photos.splice(currentPhotoIndex, 1);
        entry.photos = photos;
        entry.photoUrl = photos[0];
        if (currentPhotoIndex >= photos.length) {
          currentPhotoIndex = photos.length - 1;
        }
        renderJournalModal(currentCatId);
        saveJournalData();
        showToast('🗑️ Đã xóa ảnh khỏi album!');
      }
    });

    // 8. Delete entire post
    scrollContainer.querySelector('[data-action="delete-post"]')?.addEventListener('click', () => {
      if (confirm('Anh có chắc muốn xóa vĩnh viễn toàn bộ bài viết này không?')) {
        currentCat.entries = currentCat.entries.filter((it) => it.id !== entry.id);
        activePostId = null;
        renderJournalModal(currentCatId);
        saveJournalData();
      }
    });

    // 9. Save Post
    scrollContainer.querySelector('.insta-save-post-btn')?.addEventListener('click', () => {
      saveJournalData();
    });

    // GSAP Post Open Transition
    const cardEl = scrollContainer.querySelector('.insta-card');
    if (cardEl) {
      gsap.fromTo(cardEl, { opacity: 0, y: 18, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power3.out' });
    }

    return;
  }

  // ==========================================
  // VIEW B: Instagram Gallery Grid View
  // ==========================================
  let gridItemsHtml = '';

  // 1. If in Edit Mode: First card is "+ Tạo bài viết mới" (accepts multiple images)
  if (isEditing) {
    gridItemsHtml += `
      <div class="insta-create-card" role="button" tabindex="0" title="Chọn một hoặc nhiều ảnh để tạo bài viết mới">
        <div class="insta-create-inner">
          <div class="insta-create-icon-wrap">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
          </div>
          <span class="insta-create-title">+ Thêm khoảnh khắc mới</span>
          <span class="insta-create-sub">Chọn 1 hoặc nhiều ảnh cùng lúc</span>
        </div>
      </div>
    `;
  }

  // 2. Existing Post Tiles
  currentCat.entries.forEach((entry) => {
    const photos = getEntryPhotos(entry);
    const hasMultiple = photos.length > 1;

    gridItemsHtml += `
      <article class="insta-grid-item" data-entry-id="${entry.id}" role="button" tabindex="0" aria-label="${entry.title}">
        <div class="insta-tile-media">
          <img src="${photos[0]}" alt="${entry.title}" class="insta-tile-img" loading="lazy">
          
          <!-- Multiple Photos Badge (Instagram stacked square icon) -->
          ${
            hasMultiple
              ? `
            <div class="insta-tile-multi-badge" title="Bài viết có ${photos.length} ảnh">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2">
                <rect width="12" height="12" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
              <span>${photos.length}</span>
            </div>
          `
              : ''
          }

          <div class="insta-tile-overlay">
            <span class="insta-tile-date">${entry.date}</span>
            <h5 class="insta-tile-title">${entry.title}</h5>
            <div class="insta-tile-meta-row">
              <span class="insta-tile-badge">${hasMultiple ? `Bộ sưu tập ${photos.length} ảnh` : 'Xem chi tiết'} →</span>
              ${
                entry.likes
                  ? `
                <span class="insta-tile-likes">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="#ef4444" stroke="#ef4444"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                  ${entry.likes}
                </span>
              `
                  : ''
              }
            </div>
          </div>
        </div>
      </article>
    `;
  });

  scrollContainer.innerHTML = `
    <!-- Category Profile Header (Instagram style) -->
    <div class="insta-profile-header">
      <div class="insta-profile-cover">
        <img src="${currentCat.coverUrl}" alt="${currentCat.titleVi}" class="insta-cover-image">
        <div class="insta-cover-gradient"></div>
        ${
          isEditing
            ? `<button type="button" class="btn btn-secondary insta-change-cover-btn" title="Thay ảnh bìa đầu mục này">
                 <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                 <span>📷 Thay ảnh bìa mục này</span>
               </button>`
            : ''
        }
      </div>

      <div class="insta-profile-info">
        <div class="insta-profile-headline">
          <span class="insta-profile-coord">${currentCat.coord}</span>
          <h3 class="insta-profile-title">${currentCat.titleVi}</h3>
          <p class="insta-profile-sub">${currentCat.subtitleVi}</p>
        </div>

        <div class="insta-profile-stats">
          <span class="insta-stat-pill"><strong>${currentCat.entries.length}</strong> bài viết</span>
          <span class="insta-stat-pill">Cập nhật: <strong>${currentCat.entries[0]?.date || 'Gần đây'}</strong></span>
          ${
            isEditing
              ? '<span class="insta-edit-indicator">✏️ Đang bật Option + E (Bấm ô nét đứt để chọn nhiều ảnh và tạo bài)</span>'
              : '<span class="insta-stat-pill insta-stat-hint">✨ Nhấp vào ảnh để xem chi tiết</span>'
          }
        </div>
      </div>
    </div>

    <!-- Instagram Photo Grid -->
    <div class="insta-grid-wrap">
      <div class="insta-grid">
        ${gridItemsHtml}
      </div>
    </div>
  `;

  // Bind Grid Events
  scrollContainer.querySelectorAll<HTMLElement>('.insta-grid-item').forEach((item) => {
    const entryId = item.getAttribute('data-entry-id');
    const openPost = () => {
      if (entryId) {
        activePostId = entryId;
        currentPhotoIndex = 0;
        renderJournalModal(currentCatId);
      }
    };

    item.addEventListener('click', openPost);
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPost();
      }
    });
  });

  // Staggered Entrance Animation for Grid Items
  const items = scrollContainer.querySelectorAll('.insta-grid-item, .insta-create-card');
  if (items.length > 0) {
    gsap.fromTo(items, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.04, ease: 'power2.out' });
  }

  // Create new post button
  scrollContainer.querySelector<HTMLElement>('.insta-create-card')?.addEventListener('click', () => {
    newPostFileInput?.click();
  });

  // Change cover button
  scrollContainer.querySelector<HTMLElement>('.insta-change-cover-btn')?.addEventListener('click', () => {
    coverFileInput?.click();
  });
}

// Setup file upload inputs (with multiple file support!)
function setupFileInputs() {
  // 1. Cover File Input
  coverFileInput = document.createElement('input');
  coverFileInput.type = 'file';
  coverFileInput.accept = 'image/*';
  coverFileInput.style.display = 'none';
  document.body.appendChild(coverFileInput);

  coverFileInput.addEventListener('change', () => {
    const file = coverFileInput?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const currentCat = categories[currentCatId];
      if (currentCat) {
        currentCat.coverUrl = dataUrl;
        updateMainPageCardCovers();
        renderJournalModal(currentCatId);
        saveJournalData();
        showToast('📷 Đã cập nhật ảnh bìa mục thành công!');
      }
    };
    reader.readAsDataURL(file);
    if (coverFileInput) coverFileInput.value = '';
  });

  // 2. Append Multiple Photos to Active Post
  appendPhotosFileInput = document.createElement('input');
  appendPhotosFileInput.type = 'file';
  appendPhotosFileInput.multiple = true; // MULTIPLE FILES!
  appendPhotosFileInput.accept = 'image/*';
  appendPhotosFileInput.style.display = 'none';
  document.body.appendChild(appendPhotosFileInput);

  appendPhotosFileInput.addEventListener('change', async () => {
    const files = Array.from(appendPhotosFileInput?.files || []);
    if (files.length === 0 || !activePostId) return;

    showToast(`⏳ Đang tải ${files.length} ảnh...`);
    const dataUrls = await Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          })
      )
    );

    const currentCat = categories[currentCatId];
    if (currentCat) {
      const entry = currentCat.entries.find((it) => it.id === activePostId);
      if (entry) {
        if (!entry.photos || !Array.isArray(entry.photos) || entry.photos.length === 0) {
          entry.photos = entry.photoUrl ? [entry.photoUrl] : [];
        }
        entry.photos.push(...dataUrls);
        entry.photoUrl = entry.photos[0];
        currentPhotoIndex = entry.photos.length - 1; // Jump to the newest photo
        renderJournalModal(currentCatId);
        saveJournalData();
        showToast(`🖼️ Đã thêm ${files.length} ảnh mới vào bài viết!`);
      }
    }
    if (appendPhotosFileInput) appendPhotosFileInput.value = '';
  });

  // 3. Replace Current Single Photo
  replacePhotoFileInput = document.createElement('input');
  replacePhotoFileInput.type = 'file';
  replacePhotoFileInput.accept = 'image/*';
  replacePhotoFileInput.style.display = 'none';
  document.body.appendChild(replacePhotoFileInput);

  replacePhotoFileInput.addEventListener('change', () => {
    const file = replacePhotoFileInput?.files?.[0];
    if (!file || !activePostId) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const currentCat = categories[currentCatId];
      if (currentCat) {
        const entry = currentCat.entries.find((it) => it.id === activePostId);
        if (entry) {
          if (!entry.photos || !Array.isArray(entry.photos) || entry.photos.length === 0) {
            entry.photos = [entry.photoUrl || dataUrl];
          }
          entry.photos[currentPhotoIndex] = dataUrl;
          if (currentPhotoIndex === 0) {
            entry.photoUrl = dataUrl;
          }
          renderJournalModal(currentCatId);
          saveJournalData();
          showToast('🖼️ Đã cập nhật ảnh thành công!');
        }
      }
    };
    reader.readAsDataURL(file);
    if (replacePhotoFileInput) replacePhotoFileInput.value = '';
  });

  // 4. Create New Post With Multiple Photos
  newPostFileInput = document.createElement('input');
  newPostFileInput.type = 'file';
  newPostFileInput.multiple = true; // MULTIPLE FILES!
  newPostFileInput.accept = 'image/*';
  newPostFileInput.style.display = 'none';
  document.body.appendChild(newPostFileInput);

  newPostFileInput.addEventListener('change', async () => {
    const files = Array.from(newPostFileInput?.files || []);
    if (files.length === 0) return;

    showToast(`⏳ Đang xử lý ${files.length} ảnh...`);
    const dataUrls = await Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          })
      )
    );

    const currentCat = categories[currentCatId];
    if (currentCat && dataUrls.length > 0) {
      const now = new Date();
      const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

      const titleDefault =
        files.length > 1
          ? `Khoảnh khắc mới (${files.length} ảnh) — ${currentCat.titleVi}`
          : 'Tiêu đề khoảnh khắc mới';

      const newEntry: JournalEntry = {
        id: 'post-' + Date.now(),
        date: dateStr,
        title: titleDefault,
        story:
          'Hôm nay tôi ghi lại một kỷ niệm đáng nhớ. Nhấp chuột vào đây để trực tiếp viết câu chuyện, bối cảnh, cảm xúc hoặc những điều chiêm nghiệm của bạn...',
        photoUrl: dataUrls[0],
        photos: dataUrls,
        caption: `Bộ sưu tập ${files.length} khoảnh khắc đời thường.`,
        likes: 1,
        isLiked: true,
      };

      currentCat.entries.unshift(newEntry);
      activePostId = newEntry.id;
      currentPhotoIndex = 0;
      renderJournalModal(currentCatId);
      saveJournalData();
      showToast(`✨ Đã tạo bài viết mới với ${files.length} ảnh! Bấm vào chữ để sửa câu chuyện.`);
    }

    if (newPostFileInput) newPostFileInput.value = '';
  });
}

// Open Journal Modal
export function openExplorationJournal(catId?: 'photography' | 'trekking' | 'chinese') {
  if (isJournalOpen) return;
  isJournalOpen = true;

  const modal = document.getElementById('exploration-journal-modal');
  if (!modal) return;

  getLenis()?.stop();
  document.body.classList.add('loc-modal-locked');

  modal.removeAttribute('hidden');
  modal.classList.add('is-open');

  activePostId = null; // Start with the Instagram grid
  currentPhotoIndex = 0;
  const initialCat = catId || 'photography';
  renderJournalModal(initialCat);

  const container = modal.querySelector<HTMLElement>('.journal-modal-container');
  const backdrop = modal.querySelector<HTMLElement>('.journal-modal-backdrop');

  if (container) {
    gsap.fromTo(
      container,
      { opacity: 0, y: 36, scale: 0.94 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'power3.out' }
    );
  }

  if (backdrop) {
    gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
  }

  document.addEventListener('keydown', handleKeyDown);
}

// Close Journal Modal
export function closeExplorationJournal() {
  if (!isJournalOpen) return;
  isJournalOpen = false;

  const modal = document.getElementById('exploration-journal-modal');
  if (!modal) return;

  if (isEditModeActive()) {
    syncActivePostToState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  }

  activePostId = null;
  currentPhotoIndex = 0;

  const container = modal.querySelector<HTMLElement>('.journal-modal-container');
  const backdrop = modal.querySelector<HTMLElement>('.journal-modal-backdrop');

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
      },
    });
  } else {
    modal.classList.remove('is-open');
    modal.setAttribute('hidden', '');
    document.body.classList.remove('loc-modal-locked');
    getLenis()?.start();
  }

  document.removeEventListener('keydown', handleKeyDown);
}

// Handle Keyboard Navigation
function handleKeyDown(e: KeyboardEvent) {
  if (!isJournalOpen) return;

  // Esc closes Lightbox first, then goes back to grid, then closes modal
  if (e.key === 'Escape') {
    if (isLightboxOpen) {
      closeFullscreenLightbox();
      return;
    }
    if (activePostId) {
      syncActivePostToState();
      activePostId = null;
      renderJournalModal(currentCatId);
      return;
    }
    closeExplorationJournal();
    return;
  }

  // Left & Right arrow keys navigate photo carousel in post view
  if (activePostId && !isEditModeActive()) {
    const currentCat = categories[currentCatId];
    const entry = currentCat?.entries.find((it) => it.id === activePostId);
    if (entry) {
      const photos = getEntryPhotos(entry);
      if (photos.length > 1) {
        if (e.key === 'ArrowLeft' && currentPhotoIndex > 0) {
          e.preventDefault();
          currentPhotoIndex--;
          renderJournalModal(currentCatId);
        } else if (e.key === 'ArrowRight' && currentPhotoIndex < photos.length - 1) {
          e.preventDefault();
          currentPhotoIndex++;
          renderJournalModal(currentCatId);
        }
      }
    }
  }
}

// Main initializer
export function initExplorationJournal() {
  loadJournalData();
  setupFileInputs();

  const modal = document.getElementById('exploration-journal-modal');
  if (!modal) return;

  // Close triggers
  modal.querySelectorAll('[data-journal-close]').forEach((el) => {
    el.addEventListener('click', () => closeExplorationJournal());
  });

  // Tab switching
  modal.querySelectorAll<HTMLButtonElement>('.journal-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-journal-tab') as 'photography' | 'trekking' | 'chinese';
      if (tab && tab !== currentCatId) {
        syncActivePostToState();
        activePostId = null;
        currentPhotoIndex = 0;
        renderJournalModal(tab);
      }
    });
  });

  // Card triggers on main page #explorations
  const cards = document.querySelectorAll<HTMLElement>('.exploration-card[data-exploration-id]');
  cards.forEach((card) => {
    const catId = card.getAttribute('data-exploration-id') as 'photography' | 'trekking' | 'chinese';
    const handler = (e: Event) => {
      e.preventDefault();
      openExplorationJournal(catId || 'photography');
    };

    card.addEventListener('click', handler);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openExplorationJournal(catId || 'photography');
      }
    });
  });

  // Listen to Visual Editor Mode changes (Option + E)
  window.addEventListener('loc-edit-mode-changed', () => {
    if (isJournalOpen) {
      renderJournalModal(currentCatId);
    }
  });

  // Listen to Save All event from floating pill
  window.addEventListener('loc-save-all-requested', () => {
    saveJournalData();
  });
}
