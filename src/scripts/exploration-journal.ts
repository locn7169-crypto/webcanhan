import gsap from 'gsap';
import { getLenis } from './lenis-scroll';

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  story: string;
  photoUrl: string;
  caption: string;
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

const STORAGE_KEY = 'loc_exploration_journals_v3';

// Default initial data matching Loc's real interests
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
        caption: 'Triền dốc buổi sớm khi sương bắt đầu tan, nhìn xuống thung lũng mây mù trải dài vô tận.',
      },
      {
        id: 'trek-2',
        date: '18/07/2026',
        title: 'Hành trình rèn luyện sức bền và sự điềm tĩnh',
        story:
          'Mỗi chuyến đi bộ đường dài là một bài học sâu sắc về sự kiên nhẫn. Khi đối diện với những con dốc cao gập ghềnh, bạn học cách không nhìn lên đỉnh núi để thấy nản lòng, mà chỉ tập trung vào từng bước chân vững chắc ngay trước mắt. Về đích không chỉ là chạm tới độ cao, mà là chiến thắng sự lười biếng của chính bản thân.',
        photoUrl: '/assets/backdrop-contact.jpg',
        caption: 'Cột mốc cao độ và ánh hoàng hôn trải dài trên triền cỏ cao nguyên.',
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
        caption: 'Bình hoa hồng trắng trên phiến đá cẩm thạch — Nét tĩnh lặng của buổi sớm mai.',
      },
      {
        id: 'photo-2',
        date: '12/05/2026',
        title: 'Kể chuyện qua những khoảng lặng thị giác',
        story:
          'Một bức ảnh có chiều sâu không nhất thiết phải chứa nhiều chi tiết. Đôi khi, chính khoảng trắng và sự tối giản trong khung hình lại mở ra nhiều cảm xúc nhất cho người xem. Bức ảnh là một ghi chép thị giác không lời, lưu giữ khoảnh khắc thời gian ngưng đọng.',
        photoUrl: '/assets/loc-bg.jpg',
        caption: 'Ánh sáng dịu nhẹ và những khối hình học hài hòa trong không gian tĩnh lặng.',
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
        caption: 'Sổ tay ghi chép những câu danh ngôn và nét chữ Hán tự thực hành mỗi ngày.',
      },
      {
        id: 'chinese-2',
        date: '02/04/2026',
        title: 'Học Hán tự — Rèn luyện sự kiên định bền bỉ',
        story:
          'Học chữ Hán từ con số 0 đòi hỏi tính kỷ luật rất cao. Thứ tự từng nét bút, bộ thủ và cấu trúc chữ nhắc nhở tôi về sự chỉn chu. Câu nói tâm đắc: “Tôi nỗ lực chưa chắc thành công, nhưng không nỗ lực chắc chắn thất bại” (我努力不一定会成功 但我不努力一定会失败).',
        photoUrl: '/assets/loclearn/screen_thehoc.jpg',
        caption: 'Thẻ ghi nhớ và phương pháp lặp lại ngắt quãng củng cố từ vựng bền bỉ.',
      },
    ],
  },
};

// Global module state
let categories: Record<string, ExplorationCategory> = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
let currentCatId: 'photography' | 'trekking' | 'chinese' = 'photography';
let activePostId: string | null = null; // null = Gallery Grid; string = Single Post Inspector
let isJournalOpen = false;

// File input elements
let coverFileInput: HTMLInputElement | null = null;
let photoFileInput: HTMLInputElement | null = null;
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

// Load data from localStorage
function loadJournalData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
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

  // View A: Single Post View (Instagram Style Modal View)
  if (activePostId) {
    const entryIndex = currentCat.entries.findIndex((it) => it.id === activePostId);
    const entry = currentCat.entries[entryIndex] || currentCat.entries[0];
    if (!entry) {
      activePostId = null;
      renderJournalModal(catId);
      return;
    }

    const prevEntry = entryIndex > 0 ? currentCat.entries[entryIndex - 1] : null;
    const nextEntry = entryIndex < currentCat.entries.length - 1 ? currentCat.entries[entryIndex + 1] : null;

    scrollContainer.innerHTML = `
      <div class="insta-post-view">
        <!-- Back Navigation Bar -->
        <div class="insta-post-nav-bar">
          <button type="button" class="btn btn-secondary insta-back-btn" title="Quay lại danh mục ảnh">
            <i data-lucide="arrow-left" style="width: 14px; height: 14px;"></i>
            <span>← Quay lại danh mục</span>
          </button>

          <div class="insta-pagination-group">
            <span class="insta-counter">Khoảnh khắc ${entryIndex + 1} / ${currentCat.entries.length}</span>
            <div class="insta-arrows">
              <button type="button" class="insta-arrow-btn insta-prev-btn" ${!prevEntry ? 'disabled' : ''} title="Bài trước">
                <i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i>
              </button>
              <button type="button" class="insta-arrow-btn insta-next-btn" ${!nextEntry ? 'disabled' : ''} title="Bài tiếp theo">
                <i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Main Instagram Card Layout: Left Photo + Right Story -->
        <article class="insta-card">
          <!-- Left: Photo Stage -->
          <div class="insta-photo-stage">
            <img src="${entry.photoUrl}" alt="${entry.title}" class="insta-main-photo">
            ${
              isEditing
                ? `<button type="button" class="btn btn-secondary insta-change-photo-btn" data-action="change-photo" data-entry-id="${entry.id}">
                     <i data-lucide="image" style="width: 14px; height: 14px;"></i>
                     <span>Đổi ảnh này</span>
                   </button>`
                : ''
            }
          </div>

          <!-- Right: Author & Story Panel -->
          <div class="insta-detail-panel">
            <!-- Author Header -->
            <div class="insta-author-row">
              <div class="insta-author-left">
                <img src="/assets/loc-avatar.jpg" alt="Nguyễn Thành Lộc" class="insta-avatar">
                <div class="insta-author-meta">
                  <span class="insta-author-name">Nguyễn Thành Lộc</span>
                  <span class="insta-category-tag">${currentCat.titleVi}</span>
                </div>
              </div>
              <span class="insta-post-date" ${isEditing ? 'contenteditable="true" spellcheck="false"' : ''}>${entry.date}</span>
            </div>

            <!-- Scrollable Content Body -->
            <div class="insta-detail-body">
              <h3 class="insta-post-title" ${isEditing ? 'contenteditable="true" spellcheck="false"' : ''}>${entry.title}</h3>
              
              <div class="insta-story-box">
                <p class="insta-post-story" ${isEditing ? 'contenteditable="true" spellcheck="false"' : ''}>${entry.story}</p>
              </div>

              <div class="insta-caption-box">
                <span class="insta-caption-label">Chú thích ảnh:</span>
                <p class="insta-post-caption" ${isEditing ? 'contenteditable="true" spellcheck="false"' : ''}>${entry.caption || 'Nhấp để nhập chú thích ảnh...'}</p>
              </div>
            </div>

            <!-- Footer Action Panel -->
            <div class="insta-detail-footer">
              ${
                isEditing
                  ? `
                <div class="insta-edit-actions-row">
                  <button type="button" class="btn btn-secondary btn-danger-subtle insta-delete-btn" data-action="delete" data-entry-id="${entry.id}">
                    <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                    <span>Xóa bài này</span>
                  </button>
                  <button type="button" class="btn btn-primary insta-save-post-btn">
                    <i data-lucide="check" style="width: 14px; height: 14px;"></i>
                    <span>Lưu bài viết</span>
                  </button>
                </div>
              `
                  : `
                <div class="insta-hint-row">
                  <span class="insta-hint-text">Ghi chép hành trình thực tế của Nguyễn Thành Lộc</span>
                </div>
              `
              }
            </div>
          </div>
        </article>
      </div>
    `;

    // Bind Single Post Actions
    scrollContainer.querySelector('.insta-back-btn')?.addEventListener('click', () => {
      syncActivePostToState();
      activePostId = null;
      renderJournalModal(currentCatId);
    });

    scrollContainer.querySelector('.insta-prev-btn')?.addEventListener('click', () => {
      if (prevEntry) {
        syncActivePostToState();
        activePostId = prevEntry.id;
        renderJournalModal(currentCatId);
      }
    });

    scrollContainer.querySelector('.insta-next-btn')?.addEventListener('click', () => {
      if (nextEntry) {
        syncActivePostToState();
        activePostId = nextEntry.id;
        renderJournalModal(currentCatId);
      }
    });

    scrollContainer.querySelector('[data-action="change-photo"]')?.addEventListener('click', () => {
      photoFileInput?.click();
    });

    scrollContainer.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
      if (confirm('Anh có chắc muốn xóa khoảnh khắc này không?')) {
        currentCat.entries = currentCat.entries.filter((it) => it.id !== entry.id);
        activePostId = null;
        renderJournalModal(currentCatId);
        saveJournalData();
      }
    });

    scrollContainer.querySelector('.insta-save-post-btn')?.addEventListener('click', () => {
      saveJournalData();
    });

    return;
  }

  // View B: Instagram Gallery Grid View
  let gridItemsHtml = '';

  // 1. If in Edit Mode: First card is "+ Tạo bài viết mới"
  if (isEditing) {
    gridItemsHtml += `
      <div class="insta-create-card" role="button" tabindex="0" title="Tạo bài viết & thêm ảnh mới vào mục này">
        <div class="insta-create-inner">
          <div class="insta-create-icon-wrap">
            <i data-lucide="plus" style="width: 24px; height: 24px;"></i>
          </div>
          <span class="insta-create-title">+ Tạo bài viết mới</span>
          <span class="insta-create-sub">Thêm ảnh &amp; ghi chép bối cảnh</span>
        </div>
      </div>
    `;
  }

  // 2. Existing Post Tiles
  currentCat.entries.forEach((entry, idx) => {
    gridItemsHtml += `
      <article class="insta-grid-item" data-entry-id="${entry.id}" role="button" tabindex="0" aria-label="${entry.title}">
        <div class="insta-tile-media">
          <img src="${entry.photoUrl}" alt="${entry.title}" class="insta-tile-img" loading="lazy">
          <div class="insta-tile-overlay">
            <span class="insta-tile-date">${entry.date}</span>
            <h5 class="insta-tile-title">${entry.title}</h5>
            <span class="insta-tile-badge">Xem chi tiết →</span>
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
                 <i data-lucide="image" style="width: 14px; height: 14px;"></i>
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
          <span class="insta-stat-pill"><strong>${currentCat.entries.length}</strong> khoảnh khắc</span>
          <span class="insta-stat-pill">Cập nhật: <strong>${currentCat.entries[0]?.date || 'Gần đây'}</strong></span>
          ${
            isEditing
              ? '<span class="insta-edit-indicator">✏️ Đang bật Option + E (Bấm vào thẻ dấu + để tạo bài)</span>'
              : ''
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

  // Create new post button
  scrollContainer.querySelector<HTMLElement>('.insta-create-card')?.addEventListener('click', () => {
    newPostFileInput?.click();
  });

  // Change cover button
  scrollContainer.querySelector<HTMLElement>('.insta-change-cover-btn')?.addEventListener('click', () => {
    coverFileInput?.click();
  });
}

// Setup file upload inputs
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

  // 2. Change Photo inside Active Post
  photoFileInput = document.createElement('input');
  photoFileInput.type = 'file';
  photoFileInput.accept = 'image/*';
  photoFileInput.style.display = 'none';
  document.body.appendChild(photoFileInput);

  photoFileInput.addEventListener('change', () => {
    const file = photoFileInput?.files?.[0];
    if (!file || !activePostId) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const currentCat = categories[currentCatId];
      if (currentCat) {
        const entry = currentCat.entries.find((it) => it.id === activePostId);
        if (entry) {
          entry.photoUrl = dataUrl;
          renderJournalModal(currentCatId);
          saveJournalData();
          showToast('🖼️ Đã đổi ảnh bài viết thành công!');
        }
      }
    };
    reader.readAsDataURL(file);
    if (photoFileInput) photoFileInput.value = '';
  });

  // 3. New Post File Input
  newPostFileInput = document.createElement('input');
  newPostFileInput.type = 'file';
  newPostFileInput.accept = 'image/*';
  newPostFileInput.style.display = 'none';
  document.body.appendChild(newPostFileInput);

  newPostFileInput.addEventListener('change', () => {
    const file = newPostFileInput?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const currentCat = categories[currentCatId];
      if (currentCat) {
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

        const newEntry: JournalEntry = {
          id: 'post-' + Date.now(),
          date: dateStr,
          title: 'Tiêu đề khoảnh khắc mới',
          story:
            'Hôm nay tôi ghi lại một kỷ niệm đáng nhớ. Nhấp chuột vào đây để trực tiếp viết câu chuyện, bối cảnh, cảm xúc hoặc những điều chiêm nghiệm của bạn...',
          photoUrl: dataUrl,
          caption: 'Thêm dòng chú thích ảnh ngắn gọn...',
        };

        currentCat.entries.unshift(newEntry);
        activePostId = newEntry.id; // Open the new post directly in the post viewer
        renderJournalModal(currentCatId);
        saveJournalData();
        showToast('✨ Đã tạo bài viết mới! Bạn có thể chỉnh sửa nội dung ngay bây giờ.');
      }
    };
    reader.readAsDataURL(file);
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

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isJournalOpen) {
    e.preventDefault();
    if (activePostId) {
      // If inside single post view, pressing Escape goes back to grid
      syncActivePostToState();
      activePostId = null;
      renderJournalModal(currentCatId);
    } else {
      closeExplorationJournal();
    }
  }
}

// Main Initializer
export function initExplorationJournal() {
  loadJournalData();
  setupFileInputs();

  const modal = document.getElementById('exploration-journal-modal');
  if (!modal) return;

  // Trigger clicks on exploration cards in main page
  const cards = document.querySelectorAll<HTMLElement>('.exploration-card[data-exploration-id]');
  cards.forEach((card) => {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', 'Xem bộ sưu tập khoảnh khắc & nhật ký');

    const handleClick = (e: Event) => {
      if (isEditModeActive() && (e.target as HTMLElement).hasAttribute('data-edit-key')) {
        return;
      }
      e.preventDefault();
      const catId = card.getAttribute('data-exploration-id') as 'photography' | 'trekking' | 'chinese';
      openExplorationJournal(catId || 'photography');
    };

    card.addEventListener('click', handleClick);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        handleClick(e);
      }
    });
  });

  // Close buttons
  modal.querySelectorAll<HTMLElement>('.journal-modal-close').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      closeExplorationJournal();
    });
  });

  // Backdrop click to close
  modal.querySelector<HTMLElement>('.journal-modal-backdrop')?.addEventListener('click', () => {
    closeExplorationJournal();
  });

  // Tab switching
  modal.querySelectorAll<HTMLButtonElement>('.journal-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-journal-tab') as 'photography' | 'trekking' | 'chinese';
      if (target && target !== currentCatId) {
        if (isEditModeActive()) syncActivePostToState();
        activePostId = null; // Reset to grid view of that category
        renderJournalModal(target);
      }
    });
  });

  // Listen for Option + E mode changes
  window.addEventListener('loc-edit-mode-changed', () => {
    if (isJournalOpen) {
      renderJournalModal(currentCatId);
    }
  });

  // Global save requested
  window.addEventListener('loc-save-all-requested', () => {
    saveJournalData();
  });

  console.info('[ExplorationJournal] Instagram-style Moments & Story Diary ready.');
}
