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

const STORAGE_KEY = 'loc_exploration_journals_v2';

// Initial default data matching Loc's real life & interests
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
let isJournalOpen = false;
let activeEditingEntryId: string | null = null;
let activeTriggerEl: HTMLElement | null = null;

// File input elements
let coverFileInput: HTMLInputElement | null = null;
let photoFileInput: HTMLInputElement | null = null;

// Helpers
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

  // Update main page card cover images
  updateMainPageCardCovers();
}

// Save data to localStorage
export function saveJournalData() {
  try {
    // Capture any in-progress contentEditable text in the open modal
    syncModalContentToState();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    updateMainPageCardCovers();
    showToast('💾 Đã lưu toàn bộ nhật ký & ảnh khám phá!');
  } catch (e) {
    console.error('[Journal] Save failed:', e);
    showToast('⚠️ Không thể lưu nhật ký vào bộ nhớ.');
  }
}

// Sync DOM contenteditable back to state
function syncModalContentToState() {
  const modal = document.getElementById('exploration-journal-modal');
  if (!modal || !isJournalOpen) return;

  const currentCat = categories[currentCatId];
  if (!currentCat) return;

  // Title & subtitles
  const titleEnEl = modal.querySelector<HTMLElement>('.journal-cover-title-en');
  const titleViEl = modal.querySelector<HTMLElement>('.journal-cover-title-vi');
  const subViEl = modal.querySelector<HTMLElement>('.journal-cover-sub-vi');
  if (titleEnEl) currentCat.titleEn = titleEnEl.innerText.trim();
  if (titleViEl) currentCat.titleVi = titleViEl.innerText.trim();
  if (subViEl) currentCat.subtitleVi = subViEl.innerText.trim();

  // Entries
  const entryEls = modal.querySelectorAll<HTMLElement>('.journal-entry-card');
  entryEls.forEach((el) => {
    const id = el.getAttribute('data-entry-id');
    const entry = currentCat.entries.find((it) => it.id === id);
    if (entry) {
      const dateEl = el.querySelector<HTMLElement>('.journal-entry-date');
      const titleEl = el.querySelector<HTMLElement>('.journal-entry-title');
      const storyEl = el.querySelector<HTMLElement>('.journal-entry-story');
      const captionEl = el.querySelector<HTMLElement>('.journal-entry-caption');

      if (dateEl) entry.date = dateEl.innerText.trim();
      if (titleEl) entry.title = titleEl.innerText.trim();
      if (storyEl) entry.story = storyEl.innerText.trim();
      if (captionEl) entry.caption = captionEl.innerText.trim();
    }
  });
}

// Update card cover visuals in the main page #explorations section
function updateMainPageCardCovers() {
  // Photography
  const photoCard = document.querySelector<HTMLImageElement>('#exp-cover-photography');
  if (photoCard && categories.photography?.coverUrl) {
    photoCard.src = categories.photography.coverUrl;
  }

  // Trekking
  const trekCard = document.querySelector<HTMLImageElement>('#exp-cover-trekking');
  if (trekCard && categories.trekking?.coverUrl) {
    trekCard.src = categories.trekking.coverUrl;
  }

  // Chinese
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

// Render the Journal Modal Contents
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

  // Cover Image
  const coverImg = modal.querySelector<HTMLImageElement>('.journal-cover-bg');
  if (coverImg) {
    coverImg.src = currentCat.coverUrl;
    coverImg.alt = currentCat.titleVi;
  }

  // Cover Texts
  const titleEnEl = modal.querySelector<HTMLElement>('.journal-cover-title-en');
  const titleViEl = modal.querySelector<HTMLElement>('.journal-cover-title-vi');
  const subViEl = modal.querySelector<HTMLElement>('.journal-cover-sub-vi');
  const coordEl = modal.querySelector<HTMLElement>('.journal-cover-coord');

  if (titleEnEl) {
    titleEnEl.textContent = currentCat.titleEn;
    titleEnEl.contentEditable = isEditing ? 'true' : 'false';
  }
  if (titleViEl) {
    titleViEl.textContent = currentCat.titleVi;
    titleViEl.contentEditable = isEditing ? 'true' : 'false';
  }
  if (subViEl) {
    subViEl.textContent = currentCat.subtitleVi;
    subViEl.contentEditable = isEditing ? 'true' : 'false';
  }
  if (coordEl) {
    coordEl.textContent = currentCat.coord;
  }

  // Change Cover Button
  const changeCoverBtn = modal.querySelector<HTMLElement>('.journal-change-cover-btn');
  if (changeCoverBtn) {
    changeCoverBtn.style.display = isEditing ? 'inline-flex' : 'none';
  }

  // Add New Entry Button
  const addEntryBar = modal.querySelector<HTMLElement>('.journal-add-entry-bar');
  if (addEntryBar) {
    addEntryBar.style.display = isEditing ? 'flex' : 'none';
  }

  // Save changes button in modal header
  const modalSaveBtn = modal.querySelector<HTMLElement>('.journal-modal-save-btn');
  if (modalSaveBtn) {
    modalSaveBtn.style.display = isEditing ? 'inline-flex' : 'none';
  }

  // Timeline Entries
  const timelineContainer = modal.querySelector<HTMLElement>('.journal-timeline-list');
  if (!timelineContainer) return;

  if (currentCat.entries.length === 0) {
    timelineContainer.innerHTML = `
      <div class="journal-empty-state">
        <p>Chưa có ghi chép nhật ký nào trong mục này.</p>
        ${
          isEditing
            ? '<button type="button" class="btn btn-secondary journal-add-first-btn">+ Thêm bài viết đầu tiên</button>'
            : '<span style="font-size: 0.9rem; color: var(--ink-muted);">Bật Option + E để thêm ghi chép & ảnh của bạn.</span>'
        }
      </div>
    `;

    timelineContainer.querySelector('.journal-add-first-btn')?.addEventListener('click', () => {
      addNewEntry();
    });
    return;
  }

  let entriesHtml = '';
  currentCat.entries.forEach((entry, idx) => {
    entriesHtml += `
      <article class="journal-entry-card" data-entry-id="${entry.id}">
        <!-- Timeline Spine Dot -->
        <div class="journal-timeline-node">
          <div class="journal-node-dot"></div>
          <span class="journal-node-line"></span>
        </div>

        <div class="journal-entry-inner">
          <header class="journal-entry-header">
            <div class="journal-entry-meta">
              <span class="journal-entry-num">Mục #${currentCat.entries.length - idx}</span>
              <span class="journal-entry-date" ${isEditing ? 'contenteditable="true" spellcheck="false"' : ''}>${entry.date}</span>
            </div>

            ${
              isEditing
                ? `<div class="journal-entry-actions">
                     <button type="button" class="journal-btn-change-photo" data-action="change-photo" data-entry-id="${entry.id}" title="Đổi ảnh cho bài viết này">
                       <i data-lucide="image" style="width: 14px; height: 14px;"></i>
                       <span>Đổi ảnh</span>
                     </button>
                     <button type="button" class="journal-btn-delete-entry" data-action="delete" data-entry-id="${entry.id}" title="Xóa bài viết này">
                       <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                       <span>Xóa</span>
                     </button>
                   </div>`
                : ''
            }
          </header>

          <h4 class="journal-entry-title" ${isEditing ? 'contenteditable="true" spellcheck="false"' : ''}>${entry.title}</h4>

          <!-- Photo Container -->
          ${
            entry.photoUrl
              ? `
            <figure class="journal-entry-figure">
              <div class="journal-photo-wrapper">
                <img src="${entry.photoUrl}" alt="${entry.title}" class="journal-entry-img" loading="lazy">
              </div>
              <figcaption class="journal-entry-caption" ${isEditing ? 'contenteditable="true" spellcheck="false"' : ''}>${entry.caption || 'Nhấp để nhập mô tả ảnh...'}</figcaption>
            </figure>
          `
              : ''
          }

          <!-- Story Text -->
          <div class="journal-entry-story-wrap">
            <p class="journal-entry-story" ${isEditing ? 'contenteditable="true" spellcheck="false"' : ''}>${entry.story}</p>
          </div>
        </div>
      </article>
    `;
  });

  timelineContainer.innerHTML = entriesHtml;

  // Bind entry actions
  timelineContainer.querySelectorAll<HTMLButtonElement>('[data-action="change-photo"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const entryId = btn.getAttribute('data-entry-id');
      if (entryId) {
        activeEditingEntryId = entryId;
        photoFileInput?.click();
      }
    });
  });

  timelineContainer.querySelectorAll<HTMLButtonElement>('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const entryId = btn.getAttribute('data-entry-id');
      if (entryId && confirm('Anh có chắc muốn xóa ghi chép này không?')) {
        currentCat.entries = currentCat.entries.filter((it) => it.id !== entryId);
        renderJournalModal(currentCatId);
        saveJournalData();
      }
    });
  });
}

// Add a new timeline entry
function addNewEntry() {
  const currentCat = categories[currentCatId];
  if (!currentCat) return;

  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const newEntry: JournalEntry = {
    id: 'entry-' + Date.now(),
    date: dateStr,
    title: 'Ghi chép khoảnh khắc mới',
    story:
      'Hôm nay tôi ghi lại một khoảnh khắc đáng nhớ. Nhấp chuột vào đây để trực tiếp viết câu chuyện, bối cảnh, cảm xúc hoặc những điều chiêm nghiệm của anh...',
    photoUrl: currentCat.coverUrl || '/assets/loc-banner.jpg',
    caption: 'Thêm dòng ghi chú hoặc mô tả về bức ảnh này...',
  };

  currentCat.entries.unshift(newEntry);
  renderJournalModal(currentCatId);
  saveJournalData();

  // Focus the new title for immediate editing
  setTimeout(() => {
    const firstTitle = document.querySelector<HTMLElement>('.journal-entry-card:first-child .journal-entry-title');
    firstTitle?.focus();
  }, 100);
}

// Open the Journal Modal
export function openExplorationJournal(catId?: 'photography' | 'trekking' | 'chinese') {
  if (isJournalOpen) return;
  isJournalOpen = true;

  const modal = document.getElementById('exploration-journal-modal');
  if (!modal) return;

  getLenis()?.stop();
  document.body.classList.add('loc-modal-locked');

  modal.removeAttribute('hidden');
  modal.classList.add('is-open');

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

// Close the Journal Modal
export function closeExplorationJournal() {
  if (!isJournalOpen) return;
  isJournalOpen = false;

  const modal = document.getElementById('exploration-journal-modal');
  if (!modal) return;

  // Auto-sync any unsaved text edits
  if (isEditModeActive()) {
    syncModalContentToState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  }

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
        activeTriggerEl?.focus();
      },
    });
  } else {
    modal.classList.remove('is-open');
    modal.setAttribute('hidden', '');
    document.body.classList.remove('loc-modal-locked');
    getLenis()?.start();
    activeTriggerEl?.focus();
  }

  document.removeEventListener('keydown', handleKeyDown);
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isJournalOpen) {
    e.preventDefault();
    closeExplorationJournal();
  }
}

// Setup file upload inputs
function setupFileInputs() {
  // Cover File Input
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
        showToast('📷 Đã cập nhật ảnh bìa mới thành công!');
      }
    };
    reader.readAsDataURL(file);
    if (coverFileInput) coverFileInput.value = '';
  });

  // Entry Photo File Input
  photoFileInput = document.createElement('input');
  photoFileInput.type = 'file';
  photoFileInput.accept = 'image/*';
  photoFileInput.style.display = 'none';
  document.body.appendChild(photoFileInput);

  photoFileInput.addEventListener('change', () => {
    const file = photoFileInput?.files?.[0];
    if (!file || !activeEditingEntryId) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const currentCat = categories[currentCatId];
      if (currentCat) {
        const entry = currentCat.entries.find((it) => it.id === activeEditingEntryId);
        if (entry) {
          entry.photoUrl = dataUrl;
          renderJournalModal(currentCatId);
          saveJournalData();
          showToast('🖼️ Đã thay ảnh cho nhật ký thành công!');
        }
      }
      activeEditingEntryId = null;
    };
    reader.readAsDataURL(file);
    if (photoFileInput) photoFileInput.value = '';
  });
}

// Main initializer
export function initExplorationJournal() {
  loadJournalData();
  setupFileInputs();

  const modal = document.getElementById('exploration-journal-modal');
  if (!modal) return;

  // Triggers on Exploration Cards in the main page
  const cards = document.querySelectorAll<HTMLElement>('.exploration-card[data-exploration-id]');
  cards.forEach((card) => {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', 'Xem nhật ký ảnh và ghi chép bối cảnh');

    const handleClick = (e: Event) => {
      // If user is currently in edit mode and clicks on an editable title, don't hijack
      if (isEditModeActive() && (e.target as HTMLElement).hasAttribute('data-edit-key')) {
        return;
      }
      e.preventDefault();
      activeTriggerEl = card;
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
        if (isEditModeActive()) syncModalContentToState();
        renderJournalModal(target);
      }
    });
  });

  // Change Cover Button Click
  modal.querySelector<HTMLElement>('.journal-change-cover-btn')?.addEventListener('click', () => {
    coverFileInput?.click();
  });

  // Add New Entry Button Click
  modal.querySelector<HTMLElement>('.journal-add-entry-btn')?.addEventListener('click', () => {
    addNewEntry();
  });

  // Save Modal Button Click
  modal.querySelector<HTMLElement>('.journal-modal-save-btn')?.addEventListener('click', () => {
    saveJournalData();
  });

  // Listen for Option + E mode changes to update UI in real-time
  window.addEventListener('loc-edit-mode-changed', () => {
    if (isJournalOpen) {
      renderJournalModal(currentCatId);
    }
  });

  // Listen for global save requested from dock
  window.addEventListener('loc-save-all-requested', () => {
    saveJournalData();
  });

  console.info('[ExplorationJournal] Interactive field notes & photo diary ready.');
}
