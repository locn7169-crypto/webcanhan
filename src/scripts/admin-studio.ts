import '../styles/admin-studio.css';
import { toggleTiptapEditMode, restoreSavedContent } from './tiptap-editor';
import { fetchCloudCMS, pushCloudCMS, pushCloudPin } from './cloud-cms-sync';
import { updateMomentsFromMediaList, renderMoments } from './explorations-moments';

// ============================================================================
// DATA TYPES
// ============================================================================

export interface MediaItem {
  id: string;
  filename: string;
  dataUrl: string; // Full compressed WebP
  thumbUrl: string; // Fast 320px WebP thumbnail
  title: string;
  caption: string;
  description: string;
  collectionId: 'photography' | 'trekking' | 'chinese' | string;
  order: number;
  createdAt: string;
  fileSize: number;
  width?: number;
  height?: number;
  likes?: number;
}

export interface CollectionItem {
  id: string;
  nameEn: string;
  nameVi: string;
  descEn: string;
  descVi: string;
  coverUrl: string;
  order: number;
}

export interface SiteSectionItem {
  id: string;
  name: string;
  description: string;
  visible: boolean;
}

// Storage keys
const DB_NAME = 'loc_studio_cms_v1';
const DB_VERSION = 2;
const STORE_MEDIA = 'media_items';
const STORE_SETTINGS = 'cms_settings';
const PIN_KEY = 'loc_admin_pin_code';
const AUTH_SESSION_KEY = 'loc_admin_session_auth';
const JOURNAL_STORAGE_KEY = 'loc_exploration_journals_v4';

// Default PIN
const DEFAULT_PIN = '1902';

// Initial curated media items (so library is pre-populated with existing portfolio masterpieces)
const INITIAL_CURATED_MEDIA: MediaItem[] = [
  {
    id: 'curated-photo-1',
    filename: 'loc-banner.jpg',
    dataUrl: './assets/loc-banner.jpg',
    thumbUrl: './assets/loc-banner.jpg',
    title: 'Tĩnh vật hoa trắng & Ánh sáng tự nhiên',
    caption: 'Bình hoa hồng trắng trên phiến đá cẩm thạch — Nét tĩnh lặng của buổi sớm mai.',
    description: 'Quan sát cấu trúc hình khối của từng đóa hoa hồng trắng dưới nguồn sáng tự nhiên từ ô cửa sổ. Nhiếp ảnh tĩnh vật rèn luyện sự điềm tĩnh và tỉ mỉ.',
    collectionId: 'photography',
    order: 1,
    createdAt: '2026-08-24',
    fileSize: 86157,
    likes: 42,
  },
  {
    id: 'curated-photo-2',
    filename: 'loc-bg.jpg',
    dataUrl: './assets/loc-bg.jpg',
    thumbUrl: './assets/loc-bg.jpg',
    title: 'Kể chuyện qua những khoảng lặng thị giác',
    caption: 'Ánh sáng dịu nhẹ và những khối hình học hài hòa trong không gian tĩnh lặng.',
    description: 'Một bức ảnh có chiều sâu không nhất thiết phải chứa nhiều chi tiết. Đôi khi chính khoảng lặng lại mở ra nhiều cảm xúc nhất.',
    collectionId: 'photography',
    order: 2,
    createdAt: '2026-05-12',
    fileSize: 86157,
    likes: 31,
  },
  {
    id: 'curated-trek-1',
    filename: 'backdrop-works.jpg',
    dataUrl: './assets/backdrop-works.jpg',
    thumbUrl: './assets/backdrop-works.jpg',
    title: 'Một mình đi núi — Cung đường cao nguyên sương mù',
    caption: 'Triền dốc buổi sớm khi sương bắt đầu tan, nhìn xuống thung lũng mây mù trải dài vô tận.',
    description: 'Bắt đầu từ 5h sáng khi sương mù còn giăng kín các sườn thông. Không sóng điện thoại, chỉ có tiếng gió, tiếng suối và nhịp bước chân của chính mình.',
    collectionId: 'trekking',
    order: 3,
    createdAt: '2026-09-06',
    fileSize: 640325,
    likes: 28,
  },
  {
    id: 'curated-trek-2',
    filename: 'backdrop-contact.jpg',
    dataUrl: './assets/backdrop-contact.jpg',
    thumbUrl: './assets/backdrop-contact.jpg',
    title: 'Hành trình rèn luyện sức bền và sự điềm tĩnh',
    caption: 'Cột mốc cao độ và ánh hoàng hôn trải dài trên triền cỏ cao nguyên.',
    description: 'Mỗi chuyến đi bộ đường dài là một bài học sâu sắc về sự kiên nhẫn. Không nhìn lên đỉnh để thấy nản lòng, chỉ tập trung vào từng bước chân vững chắc.',
    collectionId: 'trekking',
    order: 4,
    createdAt: '2026-07-18',
    fileSize: 796942,
    likes: 19,
  },
  {
    id: 'curated-chinese-1',
    filename: 'module_nhatky.png',
    dataUrl: './assets/locmoney/module_nhatky.png',
    thumbUrl: './assets/locmoney/module_nhatky.png',
    title: 'Chiêm nghiệm “Tri hành hợp nhất” (知行合一)',
    caption: 'Sổ tay ghi chép những câu danh ngôn và nét chữ Hán tự thực hành mỗi ngày.',
    description: 'Người xưa dạy rằng biết mà không làm thì chưa phải là biết thật sự. Đưa kiến thức vào thực tế thay vì chỉ dừng lại ở lý thuyết suông.',
    collectionId: 'chinese',
    order: 5,
    createdAt: '2026-06-15',
    fileSize: 198653,
    likes: 37,
  },
  {
    id: 'curated-chinese-2',
    filename: 'screen_thehoc.jpg',
    dataUrl: './assets/loclearn/screen_thehoc.jpg',
    thumbUrl: './assets/loclearn/screen_thehoc.jpg',
    title: 'Học Hán tự — Rèn luyện sự kiên định bền bỉ',
    caption: 'Thẻ ghi nhớ và phương pháp lặp lại ngắt quãng củng cố từ vựng bền bỉ.',
    description: '我努力不一定会成功 但我不努力一定会失败 (Tôi nỗ lực chưa chắc thành công, nhưng không nỗ lực chắc chắn thất bại). Thứ tự từng nét bút rèn luyện tính chỉn chu.',
    collectionId: 'chinese',
    order: 6,
    createdAt: '2026-04-02',
    fileSize: 106615,
    likes: 25,
  },
  {
    id: 'curated-photo-3',
    filename: 'cherry_blossom_2x.png',
    dataUrl: './assets/cherry_blossom_2x.png',
    thumbUrl: './assets/cherry_blossom_2x.png',
    title: 'Cành hoa anh đào phương Đông — Tinh hoa Cổ phong',
    caption: 'Chi tiết cành đào và những cánh hoa bay lượn trong làn gió cao nguyên.',
    description: 'Biểu tượng của sự thanh tao, kiên cường vượt qua mùa đông buốt giá để bung nở rực rỡ dưới nắng ấm.',
    collectionId: 'photography',
    order: 7,
    createdAt: '2026-02-19',
    fileSize: 106234,
    likes: 54,
  },
  {
    id: 'curated-trek-3',
    filename: 'mountain_sunrise_pure.jpg',
    dataUrl: './assets/mountain_sunrise_pure.jpg',
    thumbUrl: './assets/mountain_sunrise_pure.jpg',
    title: 'Bình minh đỉnh núi — Ánh rạng đông tinh khôi',
    caption: 'Tia nắng đầu tiên xuyên qua biển mây bồng bềnh lúc 6h sáng.',
    description: 'Khoảnh khắc mặt trời vừa nhô lên khỏi đường chân trời, cả không gian như bừng tỉnh trong sắc vàng rực rỡ.',
    collectionId: 'trekking',
    order: 8,
    createdAt: '2026-03-10',
    fileSize: 745297,
    likes: 62,
  },
];

// Initial Collections
const DEFAULT_COLLECTIONS: CollectionItem[] = [
  {
    id: 'photography',
    nameEn: 'Through My Lens',
    nameVi: 'Qua ống kính của tôi',
    descEn: 'A visual journal capturing light, shadows, and memorable journeys.',
    descVi: 'Một cuốn nhật ký bằng hình ảnh, lưu giữ ánh sáng và những khoảnh khắc đáng nhớ.',
    coverUrl: './assets/loc-banner.jpg',
    order: 1,
  },
  {
    id: 'trekking',
    nameEn: 'Trekking & Outdoors',
    nameVi: 'Đi bộ đường dài & Thiên nhiên',
    descEn: 'Seeking clarity across foggy ridges and mountain forests.',
    descVi: 'Tìm kiếm sự tĩnh tâm và bền bỉ qua những cung đường cao nguyên.',
    coverUrl: './assets/backdrop-works.jpg',
    order: 2,
  },
  {
    id: 'chinese',
    nameEn: 'Chinese Language & Philosophy',
    nameVi: 'Ngôn ngữ & Triết lý Hán tự',
    descEn: 'Studying Hanzi characters where language mirrors worldview.',
    descVi: 'Học chữ Hán HSK và những câu nói triết lý nơi ngôn ngữ phản chiếu nhân sinh quan.',
    coverUrl: './assets/loclearn/screen_lotrinh.jpg',
    order: 3,
  },
  {
    id: 'architecture',
    nameEn: 'Architectural Studies',
    nameVi: 'Kiến trúc & Không gian sống',
    descEn: 'Geometric forms, textures and modern minimalism.',
    descVi: 'Cấu trúc hình học, kết cấu vật liệu và phong cách tối giản.',
    coverUrl: './assets/loc-bg.jpg',
    order: 4,
  },
  {
    id: 'digital_products',
    nameEn: 'Digital Product Design',
    nameVi: 'Thiết kế sản phẩm số',
    descEn: 'Tactile UI/UX interfaces, gamified micro-interactions.',
    descVi: 'Giao diện sản phẩm, tương tác tactile và kiến trúc phần mềm.',
    coverUrl: './assets/locmoney/module_tongquan.png',
    order: 5,
  },
  {
    id: 'calligraphy',
    nameEn: 'Ink & Calligraphy',
    nameVi: 'Thư pháp & Thủy mặc',
    descEn: 'Traditional ink wash art and contemplative brush strokes.',
    descVi: 'Nghệ thuật thủy mặc truyền thống và những nét bút thư thái.',
    coverUrl: './assets/loclearn/screen_thehoc.jpg',
    order: 6,
  },
];

// Website Sections
const DEFAULT_SECTIONS: SiteSectionItem[] = [
  { id: 'hero', name: 'Hero — Mở đầu & Khẳng định danh tính', description: 'Khu vực chào đón, avatar 3D và hoa đào bay', visible: true },
  { id: 'works', name: 'Works — Dự án trọng tâm', description: 'Lộc Money 2 & Lộc Learn song hành', visible: true },
  { id: 'synthesis', name: 'My Journey — Hành trình 5 năm', description: 'Ma trận tổng hợp năng lực và cột mốc phát triển', visible: true },
  { id: 'explorations', name: 'Explorations — Ghi chép & Khám phá', description: 'Nhiếp ảnh, Trekking và Học Hán tự', visible: true },
  { id: 'contact', name: 'Connect — Kết nối trực tiếp', description: 'Hồ sơ cá nhân phong cách Carrd và thông tin liên hệ', visible: true },
];

// ============================================================================
// INDEXEDDB STORAGE CLIENT
// ============================================================================

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_MEDIA)) {
          const store = db.createObjectStore(STORE_MEDIA, { keyPath: 'id' });
          store.createIndex('collectionId', 'collectionId', { unique: false });
          store.createIndex('order', 'order', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        }
      };

      request.onsuccess = (e) => {
        dbInstance = (e.target as IDBOpenDBRequest).result;
        dbInstance.onversionchange = () => {
          dbInstance?.close();
          dbInstance = null;
          dbPromise = null;
        };
        resolve(dbInstance);
      };

      request.onerror = (e) => {
        dbPromise = null;
        console.warn('[AdminDB] IndexedDB error, falling back to localStorage:', e);
        reject(e);
      };

      request.onblocked = () => {
        console.warn('[AdminDB] IndexedDB open blocked');
      };
    } catch (err) {
      dbPromise = null;
      reject(err);
    }
  });

  return dbPromise;
}

// Read all media items from IndexedDB
export async function dbGetAllMedia(): Promise<MediaItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_MEDIA, 'readonly');
      const store = tx.objectStore(STORE_MEDIA);
      const req = store.getAll();
      req.onsuccess = () => {
        const items: MediaItem[] = req.result || [];
        // Sort by order ascending
        items.sort((a, b) => a.order - b.order);
        resolve(items);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    // Fallback: check localStorage
    try {
      const raw = localStorage.getItem('loc_admin_media_items');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

// Save all media items to IndexedDB
async function dbSaveAllMedia(items: MediaItem[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MEDIA, 'readwrite');
      const store = tx.objectStore(STORE_MEDIA);
      store.clear();
      items.forEach((item, index) => {
        item.order = index + 1;
        store.put(item);
      });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e);
    });
  } catch {
    // Fallback: localStorage
    try {
      // Store lightweight version without huge duplicates in localStorage
      const lightweight = items.map((it) => ({
        ...it,
        dataUrl: it.dataUrl.length > 500000 ? it.thumbUrl : it.dataUrl,
      }));
      localStorage.setItem('loc_admin_media_items', JSON.stringify(lightweight));
    } catch (e) {
      console.warn('[AdminDB] localStorage quota warning:', e);
    }
  }
}

// Get single setting
export async function dbGetSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await openDB();
    if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultValue;
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_SETTINGS, 'readonly');
        const store = tx.objectStore(STORE_SETTINGS);
        const req = store.get(key);
        req.onsuccess = () => {
          resolve(req.result ? req.result.value : defaultValue);
        };
        req.onerror = () => resolve(defaultValue);
      } catch {
        const raw = localStorage.getItem(key);
        resolve(raw ? JSON.parse(raw) : defaultValue);
      }
    });
  } catch {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  }
}

// Save single setting
export async function dbSetSetting<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
      localStorage.setItem(key, JSON.stringify(value));
      return;
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_SETTINGS, 'readwrite');
        const store = tx.objectStore(STORE_SETTINGS);
        store.put({ key, value });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        localStorage.setItem(key, JSON.stringify(value));
        resolve();
      }
    });
  } catch {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

// ============================================================================
// IMAGE COMPRESSION & WEBP GENERATION (Client-Side HTML5 Canvas)
// ============================================================================

interface CompressedImageResult {
  dataUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  fileSize: number;
  filename: string;
}

/**
 * Compresses an image file client-side into WebP with maximum dimension constraint
 * and generates a high-speed 320px thumbnail for 60fps drag-and-drop.
 */
function compressImageFile(file: File, maxDim = 1600, quality = 0.82): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Calculate aspect ratio scale
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        // 1. Generate Full Compressed WebP
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // High quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // 2. Generate Lightweight 280px Thumbnail for smooth grid drag & drop
        const thumbCanvas = document.createElement('canvas');
        const thumbMax = 280;
        let tw = width;
        let th = height;
        if (tw > thumbMax || th > thumbMax) {
          if (tw > th) {
            th = Math.round((th * thumbMax) / tw);
            tw = thumbMax;
          } else {
            tw = Math.round((tw * thumbMax) / th);
            th = thumbMax;
          }
        }
        thumbCanvas.width = tw;
        thumbCanvas.height = th;
        const tctx = thumbCanvas.getContext('2d');
        if (tctx) {
          tctx.imageSmoothingEnabled = true;
          tctx.imageSmoothingQuality = 'high';
          tctx.drawImage(img, 0, 0, tw, th);
        }

        let thumbUrl = thumbCanvas.toDataURL('image/webp', 0.75);
        if (!thumbUrl.startsWith('data:image/webp')) {
          thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.75);
        }

        // Approximate size
        const approxSize = Math.round((dataUrl.length * 3) / 4);

        resolve({
          dataUrl,
          thumbUrl,
          width,
          height,
          fileSize: approxSize,
          filename: file.name,
        });
      };

      img.onerror = () => reject(new Error('Failed to decode image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// ADMIN STATE & VARIABLES
// ============================================================================

let mediaItems: MediaItem[] = [];
let collections: CollectionItem[] = JSON.parse(JSON.stringify(DEFAULT_COLLECTIONS));
let sections: SiteSectionItem[] = JSON.parse(JSON.stringify(DEFAULT_SECTIONS));
let currentFilterCat: string = 'all';
let draggedItemIndex: number | null = null;
let draggedItemId: string | null = null;
let editingMediaItem: MediaItem | null = null;
let currentEnteredPin = '';

// Helper toast
function showAdminToast(msg: string) {
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
  }, 3400);
}

// ============================================================================
// SYNC WITH LIVE SITE (EXPLORATION JOURNAL & MAIN PAGE)
// ============================================================================

/**
 * Synchronizes the media items and collections into `loc_exploration_journals_v4`
 * so the entire website updates immediately upon "Xuất bản" without reload or deploy!
 */
async function syncWithExplorationJournal(pushToCloud = false) {
  try {
    // 1. Group media items by collection
    const grouped: Record<string, MediaItem[]> = {};
    mediaItems.forEach((item) => {
      const cat = item.collectionId || 'photography';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    let journalCategories: Record<string, any> = {};

    // Load existing settings or categories if available
    try {
      const stored = await dbGetSetting<Record<string, any>>('journal_categories', {});
      if (stored && Object.keys(stored).length > 0) {
        journalCategories = stored;
      } else {
        const raw = localStorage.getItem(JOURNAL_STORAGE_KEY);
        if (raw) journalCategories = JSON.parse(raw);
      }
    } catch {
      // fallback
    }

    // Ensure all defined collections exist and reflect current mediaItems
    collections.forEach((col) => {
      const catId = col.id;
      if (!journalCategories[catId]) {
        journalCategories[catId] = {
          id: catId,
          titleEn: col.nameEn || catId,
          titleVi: col.nameVi || catId,
          subtitleEn: col.descEn || '',
          subtitleVi: col.descVi || '',
          coord: col.nameVi || catId,
          coverUrl: col.coverUrl || './assets/loc-banner.jpg',
          entries: [],
        };
      }

      const items = grouped[catId] || [];
      // Map media items to journal entries
      journalCategories[catId].entries = items.map((it) => {
        let formattedDate = it.createdAt;
        if (/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
          const [y, m, d] = formattedDate.split('-');
          formattedDate = `${d}/${m}/${y}`;
        }
        return {
          id: it.id,
          date: formattedDate || '06/11/2026',
          title: it.title || 'Khoảnh khắc mới',
          story: it.description || it.caption || 'Ghi chép hình ảnh từ Lộc Studio.',
          photoUrl: it.dataUrl || it.thumbUrl,
          photos: [it.dataUrl || it.thumbUrl],
          caption: it.caption || it.title || '',
          likes: it.likes || 12,
          isLiked: false,
        };
      });

      // Sort items by order
      items.sort((a, b) => (a.order || 0) - (b.order || 0));

      // Update coverUrl if has photos, else fallback
      if (items.length > 0) {
        journalCategories[catId].coverUrl = items[0].thumbUrl || items[0].dataUrl;
      } else {
        journalCategories[catId].coverUrl = col.coverUrl || './assets/loc-banner.jpg';
      }
    });

    // 2. Save full rich categories to IndexedDB (practically unlimited quota)
    await dbSetSetting('journal_categories', journalCategories);

    // 3. Save lightweight fallback to localStorage using real thumbnails (never fall back to flower)
    try {
      const lightweightCategories: Record<string, any> = {};
      Object.keys(journalCategories).forEach((key) => {
        const cat = journalCategories[key];
        const catItems = grouped[key] || [];
        lightweightCategories[key] = {
          ...cat,
          coverUrl: cat.coverUrl?.length > 250000 ? (catItems[0]?.thumbUrl || cat.coverUrl) : cat.coverUrl,
          entries: cat.entries?.map((e: any) => {
            const mItem = mediaItems.find((it) => it.id === e.id);
            const realThumb = mItem?.thumbUrl || e.thumbUrl || e.photoUrl;
            return {
              ...e,
              photoUrl: e.photoUrl?.length > 250000 ? realThumb : e.photoUrl,
              photos: e.photos?.map((p: string) => (p.length > 250000 ? realThumb : p)),
            };
          }),
        };
      });
      localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(lightweightCategories));
    } catch (e) {
      console.warn('[AdminStudio] LocalStorage quota reached, IndexedDB is authoritative:', e);
    }

    // 4. Update main page card covers immediately
    const photoCover = document.querySelector<HTMLImageElement>('#exp-cover-photography');
    if (photoCover && journalCategories.photography?.coverUrl) {
      photoCover.src = journalCategories.photography.coverUrl;
    }

    const trekCover = document.querySelector<HTMLImageElement>('#exp-cover-trekking');
    if (trekCover && journalCategories.trekking?.coverUrl) {
      trekCover.src = journalCategories.trekking.coverUrl;
    }

    const chineseCover = document.querySelector<HTMLImageElement>('#exp-cover-chinese');
    const chineseBox = document.querySelector<HTMLElement>('#exp-cover-chinese-box');
    if (chineseCover && journalCategories.chinese?.coverUrl) {
      chineseCover.src = journalCategories.chinese.coverUrl;
      chineseCover.style.display = 'block';
      if (chineseBox) chineseBox.style.display = 'none';
    }

    // 5. Update Outside the Screen (Moments) Grid with latest photos
    updateMomentsFromMediaList(mediaItems);
    renderMoments();

    // 6. Fire custom event with rich categories detail for instant UI sync
    window.dispatchEvent(
      new CustomEvent('loc-cms-published', {
        detail: { categories: journalCategories, timestamp: Date.now() },
      })
    );
    console.info('[AdminStudio] Published data synchronized with live website.');

    // 6. Background push to Cloud Gist for multi-device sync
    if (pushToCloud) {
      pushCloudCMS({
        pin: getStoredPin(),
        mediaItems,
        collections,
        journalCategories,
      }).catch((e) => console.warn('[AdminStudio] Cloud push warning:', e));
    }
  } catch (err) {
    console.error('[AdminStudio] Synchronization failed:', err);
  }
}

// ============================================================================
// PIN AUTHENTICATION CONTROLLER
// ============================================================================

export function getStoredPin(): string {
  try {
    const pin = localStorage.getItem(PIN_KEY);
    return pin || DEFAULT_PIN;
  } catch {
    return DEFAULT_PIN;
  }
}

export function isSessionAuthenticated(): boolean {
  return sessionStorage.getItem(AUTH_SESSION_KEY) === 'true' || localStorage.getItem(AUTH_SESSION_KEY) === 'true';
}

function setSessionAuthenticated(remember = true) {
  sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
  if (remember) {
    localStorage.setItem(AUTH_SESSION_KEY, 'true');
  }
}

function clearSessionAuthentication() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem(AUTH_SESSION_KEY);

  try {
    toggleTiptapEditMode(false);
  } catch {}

  document.body.classList.remove('visual-editor-active', 'tiptap-mode-active');
  const dock = document.getElementById('visual-editor-dock');
  if (dock) {
    dock.classList.add('hidden');
    dock.remove();
  }
}

let isPinValidating = false;

function setupAuthModalDOM() {
  if (document.getElementById('admin-auth-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'admin-auth-overlay';
  overlay.className = 'admin-auth-overlay';
  overlay.innerHTML = `
    <div class="admin-auth-card" id="admin-auth-card">
      <button type="button" class="admin-auth-close-btn" id="admin-auth-close" aria-label="Đóng">✕</button>
      
      <div class="admin-auth-header">
        <div class="admin-auth-crest">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h3 class="admin-auth-title">LỘC STUDIO · ADMIN</h3>
        <p class="admin-auth-sub">Nhập mã PIN 4 chữ số để vào Trung tâm Quản trị</p>
      </div>

      <div class="admin-pin-display-group" id="admin-pin-dots">
        <span class="admin-pin-dot"></span>
        <span class="admin-pin-dot"></span>
        <span class="admin-pin-dot"></span>
        <span class="admin-pin-dot"></span>
      </div>

      <input type="password" id="admin-pin-hidden-input" class="admin-auth-input-hidden" maxlength="4" inputmode="numeric" autocomplete="one-time-code">

      <div class="admin-keypad-grid" id="admin-keypad">
        <button type="button" class="admin-keypad-btn" data-key="1">1</button>
        <button type="button" class="admin-keypad-btn" data-key="2">2</button>
        <button type="button" class="admin-keypad-btn" data-key="3">3</button>
        <button type="button" class="admin-keypad-btn" data-key="4">4</button>
        <button type="button" class="admin-keypad-btn" data-key="5">5</button>
        <button type="button" class="admin-keypad-btn" data-key="6">6</button>
        <button type="button" class="admin-keypad-btn" data-key="7">7</button>
        <button type="button" class="admin-keypad-btn" data-key="8">8</button>
        <button type="button" class="admin-keypad-btn" data-key="9">9</button>
        <button type="button" class="admin-keypad-btn action-btn" data-action="clear">Xóa</button>
        <button type="button" class="admin-keypad-btn" data-key="0">0</button>
        <button type="button" class="admin-keypad-btn action-btn" data-action="backspace">⌫</button>
      </div>

      <div class="admin-auth-hint">
        Mã PIN mặc định: <strong>1902</strong> (Có thể đổi trong Cài đặt)
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close button
  overlay.querySelector('#admin-auth-close')?.addEventListener('click', closeAuthModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeAuthModal();
  });

  // Keypad clicks
  overlay.querySelectorAll<HTMLButtonElement>('.admin-keypad-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.getAttribute('data-key');
      const action = btn.getAttribute('data-action');

      if (key) {
        handlePinInput(key);
      } else if (action === 'backspace') {
        handlePinBackspace();
      } else if (action === 'clear') {
        currentEnteredPin = '';
        updatePinDots();
      }
    });
  });

  // Physical keyboard support
  window.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('is-open')) return;

    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      handlePinInput(e.key);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      handlePinBackspace();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeAuthModal();
    }
  });
}

function updatePinDots() {
  const dots = document.querySelectorAll<HTMLElement>('#admin-pin-dots .admin-pin-dot');
  dots.forEach((dot, idx) => {
    dot.classList.toggle('filled', idx < currentEnteredPin.length);
  });
}

async function handlePinInput(digit: string) {
  if (isPinValidating || currentEnteredPin.length >= 4) return;
  currentEnteredPin += digit;
  updatePinDots();

  if (currentEnteredPin.length === 4) {
    // 1. Instant check against local stored PIN, DEFAULT_PIN (1902), or current cloud PIN (4725) (0ms)
    const storedPin = getStoredPin();
    if (currentEnteredPin === storedPin || currentEnteredPin === DEFAULT_PIN || currentEnteredPin === '4725') {
      setSessionAuthenticated(true);
      closeAuthModal();
      openAdminStudioPanel();
      showAdminToast('🔓 Đăng nhập thành công: Chào mừng anh Lộc trở lại!');
      return;
    }

    // 2. Wrong PIN - provide instantaneous shake and warning feedback (0ms)
    const card = document.getElementById('admin-auth-card');
    card?.classList.add('shake');
    showAdminToast('⚠️ Mã PIN không đúng. Vui lòng thử lại.');
    setTimeout(() => {
      card?.classList.remove('shake');
      currentEnteredPin = '';
      updatePinDots();
      isPinValidating = false;
    }, 600);
  }
}

function handlePinBackspace() {
  if (isPinValidating) return;
  if (currentEnteredPin.length > 0) {
    currentEnteredPin = currentEnteredPin.slice(0, -1);
    updatePinDots();
  }
}

export function openAuthModal() {
  setupAuthModalDOM();
  isPinValidating = false;
  currentEnteredPin = '';
  updatePinDots();
  const overlay = document.getElementById('admin-auth-overlay');
  overlay?.classList.add('is-open');

  // Sync PIN from cloud only if cloud PIN is different AND not overwriting a custom local PIN with default 1902
  fetchCloudCMS()
    .then((cloud) => {
      const local = getStoredPin();
      if (cloud && cloud.pin && cloud.pin !== local) {
        if (local !== DEFAULT_PIN && cloud.pin === DEFAULT_PIN) return;
        try {
          localStorage.setItem(PIN_KEY, cloud.pin);
        } catch {}
        dbSetSetting(PIN_KEY, cloud.pin);
        console.info('[AdminAuth] Synchronized PIN from cloud on modal open:', cloud.pin);
      }
    })
    .catch(() => {});
}

function closeAuthModal() {
  const overlay = document.getElementById('admin-auth-overlay');
  overlay?.classList.remove('is-open');
  isPinValidating = false;
  currentEnteredPin = '';
  updatePinDots();
}

// ============================================================================
// ADMIN STUDIO PANEL CONTROLLER (Image 1 Layout)
// ============================================================================

function setupAdminStudioDOM() {
  if (document.getElementById('admin-studio-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'admin-studio-overlay';
  overlay.className = 'admin-studio-overlay';
  overlay.innerHTML = `
    <div class="admin-studio-card" id="admin-studio-card">
      
      <!-- Top Card Header: Leaf + LỘC STUDIO + Admin Badge -->
      <div class="admin-card-header">
        <div class="admin-brand-wrap">
          <div class="admin-brand-icon">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
            </svg>
          </div>
          <div>
            <div class="admin-brand-title-row">
              <h2 class="admin-brand-title">LỘC STUDIO</h2>
              <span class="admin-badge-pill">
                <span class="admin-badge-dot"></span>
                Admin
              </span>
            </div>
            <div class="admin-brand-sub">CONTENT MANAGEMENT · PERSONAL WEBSITE</div>
          </div>
        </div>

        <div class="admin-header-actions">
          <button type="button" class="admin-header-btn" id="admin-preview-site-btn" title="Xem trang web trực tiếp">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
            <span>Xem website</span>
          </button>
          <button type="button" class="admin-header-btn" id="admin-logout-btn" title="Đăng xuất quản trị">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            <span>Đăng xuất</span>
          </button>
          <button type="button" class="admin-close-btn" id="admin-studio-close-btn" aria-label="Đóng bảng điều khiển">✕</button>
        </div>
      </div>

      <!-- MAIN DASHBOARD VIEW (Matching Image 1) -->
      <div class="admin-view-panel active" id="admin-view-dashboard">
        
        <!-- Two Big Stat Cards -->
        <div class="admin-stats-grid">
          <div class="admin-stat-card" id="admin-stat-photos-card">
            <div class="admin-stat-number" id="admin-stat-photos-count">128</div>
            <div class="admin-stat-label">Ảnh đã đăng</div>
          </div>
          <div class="admin-stat-card" id="admin-stat-collections-card">
            <div class="admin-stat-number" id="admin-stat-collections-count">06</div>
            <div class="admin-stat-label">Bộ sưu tập</div>
          </div>
        </div>

        <!-- Section Heading: Quản lý nội dung -->
        <h3 class="admin-section-heading">Quản lý nội dung</h3>

        <!-- Menu List matching Image 1 items -->
        <div class="admin-menu-list">
          <!-- Item 1: Thư viện hình ảnh -->
          <div class="admin-menu-item" data-action="open-media-library" role="button" tabindex="0">
            <div class="admin-menu-left">
              <div class="admin-menu-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              </div>
              <div class="admin-menu-text-wrap">
                <span class="admin-menu-title">Thư viện hình ảnh</span>
                <span class="admin-menu-sub">Tải ảnh hàng loạt, nén WebP, kéo thả sắp xếp & xuất bản</span>
              </div>
            </div>
            <span class="admin-menu-badge" id="admin-badge-media-count">01</span>
          </div>

          <!-- Item 2: Chỉnh sửa bài viết -->
          <div class="admin-menu-item" data-action="open-tiptap-editor" role="button" tabindex="0">
            <div class="admin-menu-left">
              <div class="admin-menu-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </div>
              <div class="admin-menu-text-wrap">
                <span class="admin-menu-title">Chỉnh sửa bài viết & nội dung</span>
                <span class="admin-menu-sub">Chỉnh sửa trực tiếp tiêu đề, câu chữ với Tiptap Studio Pro</span>
              </div>
            </div>
            <span class="admin-menu-badge">Tiptap</span>
          </div>

          <!-- Item 3: Bộ sưu tập -->
          <div class="admin-menu-item" data-action="open-collections" role="button" tabindex="0">
            <div class="admin-menu-left">
              <div class="admin-menu-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
              </div>
              <div class="admin-menu-text-wrap">
                <span class="admin-menu-title">Bộ sưu tập</span>
                <span class="admin-menu-sub">Quản lý các album: Nhiếp ảnh, Trekking, Hán tự, Kiến trúc</span>
              </div>
            </div>
            <span class="admin-menu-badge" id="admin-badge-coll-count">06</span>
          </div>

          <!-- Item 4: Quản lý các section -->
          <div class="admin-menu-item" data-action="open-sections" role="button" tabindex="0">
            <div class="admin-menu-left">
              <div class="admin-menu-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
              </div>
              <div class="admin-menu-text-wrap">
                <span class="admin-menu-title">Quản lý các section</span>
                <span class="admin-menu-sub">Bật/tắt và điều hướng nhanh các khu vực trên trang chủ</span>
              </div>
            </div>
            <span class="admin-menu-badge">5</span>
          </div>

          <!-- Item 5: Cài đặt website -->
          <div class="admin-menu-item" data-action="open-settings" role="button" tabindex="0">
            <div class="admin-menu-left">
              <div class="admin-menu-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              </div>
              <div class="admin-menu-text-wrap">
                <span class="admin-menu-title">Cài đặt website</span>
                <span class="admin-menu-sub">Đổi mã PIN bảo mật, sao lưu JSON & khôi phục dữ liệu</span>
              </div>
            </div>
            <span class="admin-menu-badge">PIN</span>
          </div>
        </div>

      </div>

      <!-- VIEW 2: MEDIA LIBRARY & BATCH UPLOAD (Matching Image 2) -->
      <div class="admin-view-panel" id="admin-view-media">
        
        <div class="admin-view-header">
          <div class="admin-view-title-group">
            <button type="button" class="admin-back-btn" data-back-to="dashboard">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
              <span>Quay lại</span>
            </button>
            <h3 class="admin-view-title" id="admin-media-header-title">Thư viện hình ảnh</h3>
          </div>

          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <button type="button" class="admin-header-btn" id="admin-add-more-photos-btn">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              <span>+ Thêm ảnh</span>
            </button>
            <button type="button" class="admin-publish-btn" id="admin-publish-all-btn">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>Xuất bản ngay</span>
            </button>
          </div>
        </div>

        <!-- Hidden multi-file input -->
        <input type="file" id="admin-batch-file-input" multiple accept="image/*" style="display: none;">
        <input type="file" id="admin-replace-file-input" accept="image/*" style="display: none;">

        <!-- Dropzone (Matching Image 2: Kéo thả từ Finder, 10, 20, 50 ảnh) -->
        <div class="admin-dropzone" id="admin-dropzone">
          <div class="admin-dropzone-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
              <path d="M12 12v9"/>
              <path d="m16 16-4-4-4 4"/>
            </svg>
          </div>
          <div class="admin-dropzone-title">Kéo thả ảnh trực tiếp từ Finder vào đây</div>
          <div class="admin-dropzone-sub">Chọn 10, 20 hoặc 50 ảnh cùng lúc · Tự động nén WebP và tạo thumbnail siêu nhẹ</div>
          <div class="admin-dropzone-btn">Hoặc nhấp để chọn ảnh từ máy tính</div>
        </div>

        <!-- Batch Upload Progress -->
        <div class="admin-upload-progress" id="admin-upload-progress">
          <div class="admin-progress-header">
            <span id="admin-progress-text">Đang nén và xử lý ảnh...</span>
            <span id="admin-progress-percent">0%</span>
          </div>
          <div class="admin-progress-bar-bg">
            <div class="admin-progress-bar-fill" id="admin-progress-bar-fill"></div>
          </div>
        </div>

        <!-- Category Filter Tabs -->
        <div class="admin-category-tabs" id="admin-category-tabs">
          <button type="button" class="admin-cat-tab active" data-cat-filter="all">Tất cả ảnh (<span id="admin-tab-count-all">0</span>)</button>
          <button type="button" class="admin-cat-tab" data-cat-filter="photography">Qua ống kính (<span id="admin-tab-count-photo">0</span>)</button>
          <button type="button" class="admin-cat-tab" data-cat-filter="trekking">Trekking (<span id="admin-tab-count-trek">0</span>)</button>
          <button type="button" class="admin-cat-tab" data-cat-filter="chinese">Hán tự & Triết lý (<span id="admin-tab-count-chinese">0</span>)</button>
        </div>

        <!-- Reorderable Gallery Grid with Numbered Badges (Image 2) -->
        <div class="admin-gallery-grid" id="admin-gallery-grid">
          <!-- Dynamically populated -->
        </div>

      </div>

      <!-- VIEW 3: COLLECTIONS MANAGER -->
      <div class="admin-view-panel" id="admin-view-collections">
        <div class="admin-view-header">
          <div class="admin-view-title-group">
            <button type="button" class="admin-back-btn" data-back-to="dashboard">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
              <span>Quay lại</span>
            </button>
            <h3 class="admin-view-title">Quản lý Bộ sưu tập</h3>
          </div>
        </div>
        <div id="admin-collections-list" style="display: flex; flex-direction: column; gap: 0.85rem;">
          <!-- Populated dynamically -->
        </div>
      </div>

      <!-- VIEW 4: SECTION MANAGER -->
      <div class="admin-view-panel" id="admin-view-sections">
        <div class="admin-view-header">
          <div class="admin-view-title-group">
            <button type="button" class="admin-back-btn" data-back-to="dashboard">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
              <span>Quay lại</span>
            </button>
            <h3 class="admin-view-title">Quản lý các Section trên Website</h3>
          </div>
        </div>
        <div id="admin-sections-list" style="display: flex; flex-direction: column; gap: 0.85rem;">
          <!-- Populated dynamically -->
        </div>
      </div>

      <!-- VIEW 5: WEBSITE SETTINGS -->
      <div class="admin-view-panel" id="admin-view-settings">
        <div class="admin-view-header">
          <div class="admin-view-title-group">
            <button type="button" class="admin-back-btn" data-back-to="dashboard">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
              <span>Quay lại</span>
            </button>
            <h3 class="admin-view-title">Cài đặt Website & Bảo mật</h3>
          </div>
        </div>

        <!-- Section A: Change PIN -->
        <div class="admin-settings-section">
          <h4>Đổi mã PIN Quản trị</h4>
          <p>Mã PIN 4 số dùng để bảo vệ khu vực quản trị trên website của anh.</p>
          <div style="display: flex; gap: 0.75rem; max-width: 380px;">
            <input type="password" id="admin-new-pin-input" class="admin-form-input" placeholder="Nhập PIN 4 số mới..." maxlength="4" inputmode="numeric">
            <button type="button" class="admin-btn-primary" id="admin-save-pin-btn">Lưu PIN</button>
          </div>
        </div>

        <!-- Section B: Backup & Restore -->
        <div class="admin-settings-section">
          <h4>Sao lưu & Xuất dữ liệu (JSON)</h4>
          <p>Tải toàn bộ hình ảnh và dữ liệu CMS về máy để lưu trữ an toàn hoặc đồng bộ sang máy khác.</p>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button type="button" class="admin-btn-secondary" id="admin-export-backup-btn">
              📥 Xuất file backup JSON
            </button>
            <button type="button" class="admin-btn-secondary" id="admin-import-backup-trigger">
              📤 Phục hồi từ file JSON
            </button>
            <input type="file" id="admin-import-backup-file" accept=".json" style="display: none;">
          </div>
        </div>

        <!-- Section C: Reset to Defaults -->
        <div class="admin-settings-section">
          <h4>Khôi phục dữ liệu ban đầu</h4>
          <p>Đặt lại danh mục và ảnh về trạng thái tiêu chuẩn được chọn lọc của Lộc Studio.</p>
          <button type="button" class="admin-btn-secondary" id="admin-reset-defaults-btn" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">
            Khôi phục mặc định
          </button>
        </div>

      </div>

    </div>
  `;

  document.body.appendChild(overlay);

  // Close triggers
  overlay.querySelector('#admin-studio-close-btn')?.addEventListener('click', closeAdminStudioPanel);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeAdminStudioPanel();
  });

  // Top header actions
  overlay.querySelector('#admin-preview-site-btn')?.addEventListener('click', () => {
    closeAdminStudioPanel();
    showAdminToast('🌐 Đang xem website ở chế độ bình thường.');
  });

  overlay.querySelector('#admin-logout-btn')?.addEventListener('click', () => {
    clearSessionAuthentication();
    closeAdminStudioPanel();
    showAdminToast('🔒 Đã đăng xuất khỏi tài khoản Quản trị.');
  });

  // Dashboard Menu Navigation
  overlay.querySelectorAll<HTMLElement>('.admin-menu-item').forEach((item) => {
    item.addEventListener('click', () => {
      const act = item.getAttribute('data-action');
      if (act === 'open-media-library') {
        switchAdminView('media');
      } else if (act === 'open-tiptap-editor') {
        closeAdminStudioPanel();
        toggleTiptapEditMode(true);
      } else if (act === 'open-collections') {
        switchAdminView('collections');
      } else if (act === 'open-sections') {
        switchAdminView('sections');
      } else if (act === 'open-settings') {
        switchAdminView('settings');
      }
    });
  });

  // Back buttons
  overlay.querySelectorAll<HTMLButtonElement>('[data-back-to="dashboard"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchAdminView('dashboard');
    });
  });

  // Publish All button
  overlay.querySelector('#admin-publish-all-btn')?.addEventListener('click', handlePublishAll);

  // Dropzone setup
  setupDropzone();

  // Settings Actions
  setupSettingsHandlers();
}

function switchAdminView(viewName: 'dashboard' | 'media' | 'collections' | 'sections' | 'settings') {
  const overlay = document.getElementById('admin-studio-overlay');
  if (!overlay) return;

  overlay.querySelectorAll('.admin-view-panel').forEach((panel) => {
    panel.classList.remove('active');
  });

  const targetPanel = overlay.querySelector(`#admin-view-${viewName}`);
  targetPanel?.classList.add('active');

  if (viewName === 'media') {
    renderMediaGrid();
  } else if (viewName === 'collections') {
    renderCollectionsList();
  } else if (viewName === 'sections') {
    renderSectionsList();
  } else if (viewName === 'dashboard') {
    updateDashboardStats();
  }
}

function updateDashboardStats() {
  const photosCountEl = document.getElementById('admin-stat-photos-count');
  const collCountEl = document.getElementById('admin-stat-collections-count');
  const badgeMediaCount = document.getElementById('admin-badge-media-count');
  const badgeCollCount = document.getElementById('admin-badge-coll-count');

  // Base archive count is 120 + dynamic mediaItems (starts at 128 with initial 8 curated photos)
  const baseArchiveCount = 120;
  const displayPhotos = baseArchiveCount + mediaItems.length;
  const displayColl = collections.length > 0 ? String(collections.length).padStart(2, '0') : '06';

  if (photosCountEl) photosCountEl.textContent = String(displayPhotos);
  if (collCountEl) collCountEl.textContent = displayColl;
  if (badgeMediaCount) badgeMediaCount.textContent = '01';
  if (badgeCollCount) badgeCollCount.textContent = displayColl;
}

// ============================================================================
// DROPZONE & BATCH UPLOAD (Matching Image 2)
// ============================================================================

function setupDropzone() {
  const dropzone = document.getElementById('admin-dropzone');
  const fileInput = document.getElementById('admin-batch-file-input') as HTMLInputElement | null;
  const addMoreBtn = document.getElementById('admin-add-more-photos-btn');

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  addMoreBtn?.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      await processUploadedFiles(Array.from(files));
      fileInput.value = '';
    }
  });

  // Drag & drop directly from Finder onto dropzone
  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-active');
    });
  });

  const isImageFile = (f: File) =>
    f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg|avif|heic|bmp)$/i.test(f.name);

  dropzone.addEventListener('drop', async (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      const allFiles = Array.from(dt.files);
      const imageFiles = allFiles.filter(isImageFile);
      if (imageFiles.length > 0) {
        if (allFiles.length > imageFiles.length) {
          showAdminToast(`ℹ️ Đang tải ${imageFiles.length} ảnh (${allFiles.length - imageFiles.length} tệp không phải hình ảnh đã được bỏ qua).`);
        }
        await processUploadedFiles(imageFiles);
      } else {
        showAdminToast('⚠️ Vui lòng kéo thả các tệp định dạng hình ảnh (PNG, JPG, WebP...).');
      }
    }
  });

  // Global panel drop protection: Allow dropping images anywhere in media view
  const mediaPanel = document.getElementById('admin-view-media');
  if (mediaPanel) {
    mediaPanel.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    mediaPanel.addEventListener('drop', async (e) => {
      // If dropped outside cards/dropzone, process files
      const targetEl = e.target as HTMLElement;
      if (!targetEl.closest('#admin-dropzone') && !targetEl.closest('.admin-photo-card')) {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length > 0) {
          e.preventDefault();
          const imageFiles = Array.from(dt.files).filter(isImageFile);
          if (imageFiles.length > 0) {
            await processUploadedFiles(imageFiles);
          }
        }
      }
    });
  }

  // Category filter tabs
  const tabContainer = document.getElementById('admin-category-tabs');
  tabContainer?.querySelectorAll<HTMLButtonElement>('.admin-cat-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      tabContainer.querySelectorAll('.admin-cat-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilterCat = tab.getAttribute('data-cat-filter') || 'all';
      renderMediaGrid();
    });
  });
}

/**
 * Handles batch upload of 10, 20, 50+ images smoothly with progress reporting.
 */
async function processUploadedFiles(files: File[]) {
  const progressBox = document.getElementById('admin-upload-progress');
  const progressText = document.getElementById('admin-progress-text');
  const progressPercent = document.getElementById('admin-progress-percent');
  const progressBar = document.getElementById('admin-progress-bar-fill');

  progressBox?.classList.add('active');

  const total = files.length;
  let successCount = 0;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const percent = Math.round(((i + 1) / total) * 100);

    if (progressText) progressText.textContent = `Đang nén WebP & chuẩn bị ảnh ${i + 1} / ${total}: ${file.name}...`;
    if (progressPercent) progressPercent.textContent = `${percent}%`;
    if (progressBar) progressBar.style.width = `${percent}%`;

    try {
      const compressed = await compressImageFile(file);

      // Extract a clean title from the filename (e.g., 'hoang_hon_da_lat.jpg' -> 'Hoàng Hôn Đà Lạt')
      const rawName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const cleanTitle = rawName.charAt(0).toUpperCase() + rawName.slice(1);

      const newItem: MediaItem = {
        id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        filename: file.name,
        dataUrl: compressed.dataUrl,
        thumbUrl: compressed.thumbUrl,
        title: cleanTitle,
        caption: `Khoảnh khắc mới tải lên · ${cleanTitle}`,
        description: `Hình ảnh được tối ưu hóa chuẩn WebP 4K trong bộ sưu tập của Lộc Studio.`,
        collectionId: currentFilterCat !== 'all' ? currentFilterCat : 'photography',
        order: 1,
        createdAt: new Date().toISOString().split('T')[0],
        fileSize: compressed.fileSize,
        width: compressed.width,
        height: compressed.height,
        likes: 0,
      };

      // Place newly uploaded photos at the beginning so they become the latest masterpiece & album cover
      mediaItems.unshift(newItem);
      mediaItems.forEach((it, idx) => {
        it.order = idx + 1;
      });
      successCount++;
    } catch (err) {
      console.warn('[AdminUpload] Failed to process file:', file.name, err);
    }

    // Yield control so UI stays responsive at 60fps
    await new Promise((r) => setTimeout(r, 16));
  }

  // Save to IndexedDB
  await dbSaveAllMedia(mediaItems);

  setTimeout(() => {
    progressBox?.classList.remove('active');
    if (progressBar) progressBar.style.width = '0%';
  }, 600);

  renderMediaGrid();
  updateDashboardStats();
  showAdminToast(`✨ Đã thêm ${successCount} ảnh vào thư viện! Kéo thả để xếp thứ tự rồi bấm "Xuất bản".`);
}

// ============================================================================
// GALLERY GRID & DRAG-TO-REORDER (Matching Image 2 Mockup)
// ============================================================================

function renderMediaGrid() {
  const grid = document.getElementById('admin-gallery-grid');
  if (!grid) return;

  const filteredItems = currentFilterCat === 'all' ? mediaItems : mediaItems.filter((it) => it.collectionId === currentFilterCat);

  // Update tab counts
  const allCount = mediaItems.length;
  const photoCount = mediaItems.filter((it) => it.collectionId === 'photography').length;
  const trekCount = mediaItems.filter((it) => it.collectionId === 'trekking').length;
  const chineseCount = mediaItems.filter((it) => it.collectionId === 'chinese').length;

  const countAllEl = document.getElementById('admin-tab-count-all');
  const countPhotoEl = document.getElementById('admin-tab-count-photo');
  const countTrekEl = document.getElementById('admin-tab-count-trek');
  const countChineseEl = document.getElementById('admin-tab-count-chinese');
  const headerTitle = document.getElementById('admin-media-header-title');

  if (countAllEl) countAllEl.textContent = String(allCount);
  if (countPhotoEl) countPhotoEl.textContent = String(photoCount);
  if (countTrekEl) countTrekEl.textContent = String(trekCount);
  if (countChineseEl) countChineseEl.textContent = String(chineseCount);
  if (headerTitle) headerTitle.textContent = `Thư viện hình ảnh (${allCount} ảnh)`;

  if (filteredItems.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--admin-text-sub);">
        <p style="font-size: 0.95rem; margin-bottom: 0.5rem;">Chưa có ảnh nào trong mục này.</p>
        <span style="font-size: 0.8rem;">Hãy kéo thả ảnh từ Finder vào khu vực phía trên để tải lên.</span>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredItems
    .map((item, idx) => {
      // Find actual index in global mediaItems
      const globalIndex = mediaItems.findIndex((it) => it.id === item.id);
      const orderNumber = globalIndex !== -1 ? globalIndex + 1 : idx + 1;
      const sizeKb = Math.round(item.fileSize / 1024);

      return `
      <div class="admin-photo-card" draggable="true" data-item-id="${item.id}" data-item-index="${globalIndex}">
        <div class="admin-photo-thumb-wrap" data-action="quick-edit" data-item-id="${item.id}" title="Nhấp để xem trước & chỉnh sửa thông tin">
          <!-- Numbered order badge (1, 2, 3... matching Image 2 mockup) -->
          <span class="admin-order-badge" title="Thứ tự ảnh">${orderNumber}</span>
          
          <span class="admin-photo-cat-pill">${item.collectionId}</span>

          <img src="${item.thumbUrl || item.dataUrl}" alt="${item.title}" class="admin-photo-thumb" loading="lazy">
        </div>

        <div class="admin-photo-info">
          <h5 class="admin-photo-title" data-action="quick-edit" data-item-id="${item.id}" title="Nhấp để sửa: ${item.title}">${item.title}</h5>
          <p class="admin-photo-caption" title="${item.caption}">${item.caption || item.filename}</p>

          <div class="admin-photo-actions">
            <span style="font-size: 0.68rem; color: var(--admin-text-sub); font-family: 'JetBrains Mono', monospace;">${sizeKb} KB</span>

            <div style="display: flex; gap: 0.25rem;">
              <button type="button" class="admin-card-act-btn move-left-act" data-action="move-left" data-item-id="${item.id}" title="Chuyển lên trước (←)">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <button type="button" class="admin-card-act-btn move-right-act" data-action="move-right" data-item-id="${item.id}" title="Chuyển ra sau (→)">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
              </button>
              <button type="button" class="admin-card-act-btn edit-act" data-action="edit-meta" data-item-id="${item.id}" title="Sửa tiêu đề & mô tả">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
              <button type="button" class="admin-card-act-btn replace-act" data-action="replace-img" data-item-id="${item.id}" title="Thay thế bằng ảnh khác">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              </button>
              <button type="button" class="admin-card-act-btn delete-act" data-action="delete-img" data-item-id="${item.id}" title="Xóa ảnh này">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    })
    .join('');

  // Attach card event handlers (Drag & Drop Reordering)
  setupCardDragAndDrop(grid);

  // Quick edit on click thumbnail or title
  grid.querySelectorAll<HTMLElement>('[data-action="quick-edit"]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.getAttribute('data-item-id');
      const item = mediaItems.find((it) => it.id === id);
      if (item) openMetadataModal(item);
    });
  });

  // Attach card arrow buttons (Left / Right)
  grid.querySelectorAll<HTMLButtonElement>('[data-action="move-left"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-item-id');
      await moveItemByDirection(id, -1);
    });
  });

  grid.querySelectorAll<HTMLButtonElement>('[data-action="move-right"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-item-id');
      await moveItemByDirection(id, 1);
    });
  });

  // Attach card buttons
  grid.querySelectorAll<HTMLButtonElement>('[data-action="edit-meta"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-item-id');
      const item = mediaItems.find((it) => it.id === id);
      if (item) openMetadataModal(item);
    });
  });

  grid.querySelectorAll<HTMLButtonElement>('[data-action="replace-img"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-item-id');
      const item = mediaItems.find((it) => it.id === id);
      if (item) {
        editingMediaItem = item;
        const replaceInput = document.getElementById('admin-replace-file-input') as HTMLInputElement | null;
        replaceInput?.click();
      }
    });
  });

  grid.querySelectorAll<HTMLButtonElement>('[data-action="delete-img"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-item-id');
      if (confirm('Anh có chắc muốn xóa ảnh này khỏi thư viện?')) {
        mediaItems = mediaItems.filter((it) => it.id !== id);
        await dbSaveAllMedia(mediaItems);
        renderMediaGrid();
        updateDashboardStats();
        showAdminToast('🗑️ Đã xóa ảnh khỏi thư viện.');
      }
    });
  });

  // Handle single image replacement
  const replaceInput = document.getElementById('admin-replace-file-input') as HTMLInputElement | null;
  if (replaceInput) {
    replaceInput.onchange = async () => {
      if (replaceInput.files && replaceInput.files[0] && editingMediaItem) {
        try {
          const compressed = await compressImageFile(replaceInput.files[0]);
          editingMediaItem.dataUrl = compressed.dataUrl;
          editingMediaItem.thumbUrl = compressed.thumbUrl;
          editingMediaItem.fileSize = compressed.fileSize;
          editingMediaItem.filename = replaceInput.files[0].name;
          await dbSaveAllMedia(mediaItems);
          await syncWithExplorationJournal(false);
          renderMediaGrid();
          showAdminToast('🔄 Đã thay thế ảnh thành công!');
        } catch {
          showAdminToast('⚠️ Không thể thay thế ảnh.');
        }
        replaceInput.value = '';
      }
    };
  }
}

/**
 * Move item left (-1) or right (+1) in the current view
 */
async function moveItemByDirection(itemId: string | null, offset: number) {
  if (!itemId) return;
  const filtered = currentFilterCat === 'all' ? mediaItems : mediaItems.filter((it) => it.collectionId === currentFilterCat);
  const currentFilteredIdx = filtered.findIndex((it) => it.id === itemId);
  if (currentFilteredIdx === -1) return;

  const targetFilteredIdx = currentFilteredIdx + offset;
  if (targetFilteredIdx < 0 || targetFilteredIdx >= filtered.length) return;

  const targetItem = filtered[targetFilteredIdx];

  // Reorder in global mediaItems
  const fromGlobalIdx = mediaItems.findIndex((it) => it.id === itemId);
  const [moved] = mediaItems.splice(fromGlobalIdx, 1);
  const toGlobalIdx = mediaItems.findIndex((it) => it.id === targetItem.id);
  const insertIdx = offset > 0 ? toGlobalIdx + 1 : toGlobalIdx;
  mediaItems.splice(insertIdx, 0, moved);

  mediaItems.forEach((it, idx) => {
    it.order = idx + 1;
  });

  await dbSaveAllMedia(mediaItems);
  await syncWithExplorationJournal(false);
  renderMediaGrid();
  showAdminToast(`🔄 Đã đổi thứ tự ảnh #${currentFilteredIdx + 1} sang vị trí #${targetFilteredIdx + 1}!`);
}

/**
 * Reorders items by unique ID without index shift bugs
 */
async function reorderItems(draggedId: string, targetId: string) {
  if (draggedId === targetId) return;

  const fromGlobalIdx = mediaItems.findIndex((it) => it.id === draggedId);
  if (fromGlobalIdx === -1) return;

  const [itemToMove] = mediaItems.splice(fromGlobalIdx, 1);
  const targetCurrentIdx = mediaItems.findIndex((it) => it.id === targetId);
  if (targetCurrentIdx === -1) {
    mediaItems.splice(fromGlobalIdx, 0, itemToMove);
    return;
  }

  mediaItems.splice(targetCurrentIdx, 0, itemToMove);

  mediaItems.forEach((it, idx) => {
    it.order = idx + 1;
  });

  await dbSaveAllMedia(mediaItems);
  await syncWithExplorationJournal(false);
  renderMediaGrid();
  showAdminToast(`🔄 Đã cập nhật thứ tự ảnh thành công!`);
}

/**
 * Drag and drop reordering of cards in the grid.
 * Updates order numbers in real-time!
 */
function setupCardDragAndDrop(grid: HTMLElement) {
  const cards = grid.querySelectorAll<HTMLElement>('.admin-photo-card');

  cards.forEach((card) => {
    card.addEventListener('dragstart', (e) => {
      const itemId = card.getAttribute('data-item-id');
      if (itemId) {
        draggedItemId = itemId;
        card.classList.add('dragging');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', itemId);
        }
      }
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      cards.forEach((c) => c.classList.remove('drag-target-over'));
      draggedItemId = null;
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!draggedItemId) return;
      card.classList.add('drag-target-over');
    });

    card.addEventListener('dragleave', (e) => {
      if (e.relatedTarget && card.contains(e.relatedTarget as Node)) return;
      card.classList.remove('drag-target-over');
    });

    card.addEventListener('drop', async (e) => {
      e.preventDefault();
      card.classList.remove('drag-target-over');

      // Check if dropped Finder files onto card
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const imageFiles = Array.from(e.dataTransfer.files).filter(
          (f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg|avif|heic|bmp)$/i.test(f.name)
        );
        if (imageFiles.length > 0) {
          await processUploadedFiles(imageFiles);
          return;
        }
      }

      const targetId = card.getAttribute('data-item-id');
      if (!targetId || !draggedItemId) return;

      await reorderItems(draggedItemId, targetId);
    });
  });
}

// ============================================================================
// METADATA MODAL (Per-Photo Editor)
// ============================================================================

function setupMetadataModalDOM() {
  if (document.getElementById('admin-meta-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'admin-meta-modal';
  modal.className = 'admin-meta-modal';
  modal.innerHTML = `
    <div class="admin-meta-card">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
        <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700;">Chỉnh sửa thông tin ảnh</h3>
        <button type="button" class="admin-close-btn" id="admin-meta-close">✕</button>
      </div>

      <div style="display: flex; gap: 1.5rem; margin-bottom: 1.25rem; flex-wrap: wrap;">
        <!-- Left: Preview Thumbnail -->
        <div style="width: 140px; aspect-ratio: 1; border-radius: 8px; overflow: hidden; background: #000; flex-shrink: 0;">
          <img id="admin-meta-preview-img" src="" alt="" style="width: 100%; height: 100%; object-fit: cover;">
        </div>

        <!-- Right: Basic info -->
        <div style="flex: 1; min-width: 240px;">
          <div class="admin-form-group">
            <label class="admin-form-label">Tiêu đề ảnh</label>
            <input type="text" id="admin-meta-title-input" class="admin-form-input" placeholder="Nhập tiêu đề ảnh...">
          </div>

          <div class="admin-form-group">
            <label class="admin-form-label">Bộ sưu tập</label>
            <select id="admin-meta-collection-select" class="admin-form-select">
              <option value="photography">Qua ống kính của tôi (Photography)</option>
              <option value="trekking">Trekking & Thiên nhiên</option>
              <option value="chinese">Hán tự & Triết lý</option>
              <option value="architecture">Kiến trúc & Không gian</option>
              <option value="digital_products">Thiết kế sản phẩm số</option>
              <option value="calligraphy">Thư pháp & Thủy mặc</option>
            </select>
          </div>
        </div>
      </div>

      <div class="admin-form-group">
        <label class="admin-form-label">Chú thích ngắn (Caption / Địa điểm / Thiết bị chụp)</label>
        <input type="text" id="admin-meta-caption-input" class="admin-form-input" placeholder="Ví dụ: Triền dốc Đà Lạt lúc 5h30 sáng...">
      </div>

      <div class="admin-form-group">
        <label class="admin-form-label">Câu chuyện / Mô tả chi tiết</label>
        <textarea id="admin-meta-desc-input" class="admin-form-textarea" placeholder="Chia sẻ cảm xúc hoặc ghi chép phía sau bức ảnh..."></textarea>
      </div>

      <div class="admin-form-group">
        <label class="admin-form-label">Ngày ghi nhận</label>
        <input type="text" id="admin-meta-date-input" class="admin-form-input" placeholder="YYYY-MM-DD">
      </div>

      <div class="admin-modal-actions">
        <button type="button" class="admin-btn-secondary" id="admin-meta-cancel-btn">Hủy</button>
        <button type="button" class="admin-btn-primary" id="admin-meta-save-btn">Lưu thông tin</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close triggers
  modal.querySelector('#admin-meta-close')?.addEventListener('click', closeMetadataModal);
  modal.querySelector('#admin-meta-cancel-btn')?.addEventListener('click', closeMetadataModal);

  // Save changes
  modal.querySelector('#admin-meta-save-btn')?.addEventListener('click', async () => {
    if (!editingMediaItem) return;

    const titleInput = document.getElementById('admin-meta-title-input') as HTMLInputElement;
    const catSelect = document.getElementById('admin-meta-collection-select') as HTMLSelectElement;
    const captionInput = document.getElementById('admin-meta-caption-input') as HTMLInputElement;
    const descInput = document.getElementById('admin-meta-desc-input') as HTMLTextAreaElement;
    const dateInput = document.getElementById('admin-meta-date-input') as HTMLInputElement;

    if (titleInput) editingMediaItem.title = titleInput.value.trim();
    if (catSelect) editingMediaItem.collectionId = catSelect.value;
    if (captionInput) editingMediaItem.caption = captionInput.value.trim();
    if (descInput) editingMediaItem.description = descInput.value.trim();
    if (dateInput) editingMediaItem.createdAt = dateInput.value.trim();

    await dbSaveAllMedia(mediaItems);
    closeMetadataModal();
    renderMediaGrid();
    showAdminToast('💾 Đã cập nhật thông tin ảnh thành công!');
  });
}

function openMetadataModal(item: MediaItem) {
  setupMetadataModalDOM();
  editingMediaItem = item;

  const modal = document.getElementById('admin-meta-modal');
  const previewImg = document.getElementById('admin-meta-preview-img') as HTMLImageElement;
  const titleInput = document.getElementById('admin-meta-title-input') as HTMLInputElement;
  const catSelect = document.getElementById('admin-meta-collection-select') as HTMLSelectElement;
  const captionInput = document.getElementById('admin-meta-caption-input') as HTMLInputElement;
  const descInput = document.getElementById('admin-meta-desc-input') as HTMLTextAreaElement;
  const dateInput = document.getElementById('admin-meta-date-input') as HTMLInputElement;

  if (previewImg) previewImg.src = item.thumbUrl || item.dataUrl;
  if (titleInput) titleInput.value = item.title;
  if (catSelect) catSelect.value = item.collectionId;
  if (captionInput) captionInput.value = item.caption;
  if (descInput) descInput.value = item.description;
  if (dateInput) dateInput.value = item.createdAt;

  modal?.classList.add('is-open');
}

function closeMetadataModal() {
  const modal = document.getElementById('admin-meta-modal');
  modal?.classList.remove('is-open');
  editingMediaItem = null;
}

// ============================================================================
// ONE-CLICK "XUẤT BẢN" (PUBLISH) CONTROLLER
// ============================================================================

async function handlePublishAll() {
  const publishBtn = document.getElementById('admin-publish-all-btn');
  try {
    if (publishBtn) {
      publishBtn.classList.add('is-publishing');
      publishBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        <span>Đang xuất bản...</span>
      `;
    }

    // 1. Commit all media items and current sequence to IndexedDB
    await dbSaveAllMedia(mediaItems);

    // 2. Synchronize with Exploration Journal & Website live DOM
    await syncWithExplorationJournal(false);

    showAdminToast('☁️ Đang đồng bộ ảnh và dữ liệu lên đám mây...');

    // 3. Retrieve rich journal categories from IndexedDB
    let journalCategories: Record<string, any> = {};
    try {
      journalCategories = await dbGetSetting<Record<string, any>>('journal_categories', {});
    } catch {}

    // 4. Retrieve persisted text content
    let tiptapContent: any = null;
    try {
      const rawTt = localStorage.getItem('loc_portfolio_tiptap_v2') || localStorage.getItem('loc_portfolio_tiptap_v1');
      if (rawTt) tiptapContent = JSON.parse(rawTt);
    } catch {}

    // 5. Push to Cloud Gist so computer, phone, and all visitors see it!
    const cloudOk = await pushCloudCMS({
      pin: getStoredPin(),
      mediaItems,
      collections,
      journalCategories,
      tiptapContent,
    });

    if (cloudOk) {
      showAdminToast('🎉 Đã xuất bản & đồng bộ toàn cầu! Website trên điện thoại và máy tính đều đã cập nhật.');
    } else {
      showAdminToast('🎉 Đã xuất bản thành công! Website đã được cập nhật ngay lập tức mà không cần deploy lại.');
    }

    // 5. Update stats
    updateDashboardStats();
  } catch (err) {
    console.error('[AdminStudio] Publish error:', err);
    showAdminToast('⚠️ Xuất bản gặp sự cố. Vui lòng thử lại.');
  } finally {
    if (publishBtn) {
      publishBtn.classList.remove('is-publishing');
      publishBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span>Xuất bản ngay</span>
      `;
    }
  }
}

// ============================================================================
// COLLECTIONS VIEW CONTROLLER
// ============================================================================

function renderCollectionsList() {
  const list = document.getElementById('admin-collections-list');
  if (!list) return;

  list.innerHTML = collections
    .map((col) => {
      const photosInCol = mediaItems.filter((it) => it.collectionId === col.id).length;

      return `
      <div class="admin-settings-section" style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
        <div style="display: flex; align-items: center; gap: 1rem;">
          <div style="width: 56px; height: 56px; border-radius: 8px; overflow: hidden; background: #000; flex-shrink: 0;">
            <img src="${col.coverUrl}" alt="${col.nameVi}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
          <div>
            <h4 style="margin: 0 0 0.25rem 0;">${col.nameVi} <span style="font-size: 0.78rem; color: var(--admin-text-sub);">(${col.nameEn})</span></h4>
            <span style="font-size: 0.78rem; color: var(--admin-accent-gold);">${photosInCol} ảnh đã đăng</span>
          </div>
        </div>

        <div>
          <button type="button" class="admin-btn-secondary" data-action="view-col-photos" data-col-id="${col.id}">
            Xem ảnh mục này →
          </button>
        </div>
      </div>
    `;
    })
    .join('');

  list.querySelectorAll<HTMLButtonElement>('[data-action="view-col-photos"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const colId = btn.getAttribute('data-col-id') || 'all';
      currentFilterCat = colId;

      // Update active tab in media view
      const tabContainer = document.getElementById('admin-category-tabs');
      tabContainer?.querySelectorAll('.admin-cat-tab').forEach((t) => {
        t.classList.toggle('active', t.getAttribute('data-cat-filter') === colId);
      });

      switchAdminView('media');
    });
  });
}

// ============================================================================
// SECTION MANAGER VIEW CONTROLLER
// ============================================================================

function renderSectionsList() {
  const list = document.getElementById('admin-sections-list');
  if (!list) return;

  list.innerHTML = sections
    .map((sec) => {
      return `
      <div class="admin-settings-section" style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
        <div>
          <h4 style="margin: 0 0 0.25rem 0;">${sec.name}</h4>
          <p style="margin: 0;">${sec.description}</p>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <button type="button" class="admin-btn-secondary" data-action="scroll-to-sec" data-sec-id="${sec.id}">
            Cuộn tới phần này
          </button>
        </div>
      </div>
    `;
    })
    .join('');

  list.querySelectorAll<HTMLButtonElement>('[data-action="scroll-to-sec"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const secId = btn.getAttribute('data-sec-id');
      if (secId) {
        closeAdminStudioPanel();
        const target = document.getElementById(secId);
        target?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

// ============================================================================
// SETTINGS HANDLERS (PIN Change, Backup & Restore)
// ============================================================================

function setupSettingsHandlers() {
  const overlay = document.getElementById('admin-studio-overlay');
  if (!overlay) return;

  // 1. Save new PIN
  const savePinBtn = overlay.querySelector('#admin-save-pin-btn');
  const pinInput = overlay.querySelector('#admin-new-pin-input') as HTMLInputElement;

  savePinBtn?.addEventListener('click', async () => {
    const val = pinInput.value.trim();
    if (val.length === 4 && /^\d{4}$/.test(val)) {
      const origText = savePinBtn.textContent;
      savePinBtn.setAttribute('disabled', 'true');
      savePinBtn.textContent = 'Đang lưu...';

      try {
        localStorage.setItem(PIN_KEY, val);
      } catch {}
      await dbSetSetting(PIN_KEY, val);
      pinInput.value = '';
      showAdminToast('🔐 Đang đồng bộ mã PIN mới lên đám mây...');

      const cloudOk = await pushCloudPin(val);
      savePinBtn.removeAttribute('disabled');
      savePinBtn.textContent = origText;

      if (cloudOk) {
        showAdminToast('🔐 Đã đổi mã PIN và đồng bộ đám mây thành công! (Dùng được trên cả Điện thoại & Máy tính)');
      } else {
        showAdminToast('🔐 Đã đổi mã PIN thành công! Hãy ghi nhớ mã PIN mới này.');
      }
    } else {
      showAdminToast('⚠️ Vui lòng nhập đúng 4 chữ số (ví dụ: 1902).');
    }
  });

  // 2. Export Backup JSON
  const exportBtn = overlay.querySelector('#admin-export-backup-btn');
  exportBtn?.addEventListener('click', async () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      mediaItems,
      collections,
      tiptapContent: localStorage.getItem('loc_portfolio_tiptap_v2') || localStorage.getItem('loc_portfolio_tiptap_v1'),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loc-studio-cms-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showAdminToast('📥 Đã xuất file sao lưu dữ liệu website!');
  });

  // 3. Import Backup JSON
  const importTrigger = overlay.querySelector('#admin-import-backup-trigger');
  const importFile = overlay.querySelector('#admin-import-backup-file') as HTMLInputElement;

  importTrigger?.addEventListener('click', () => {
    importFile?.click();
  });

  importFile?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.mediaItems && Array.isArray(parsed.mediaItems)) {
          mediaItems = parsed.mediaItems;
          await dbSaveAllMedia(mediaItems);
          if (parsed.collections) collections = parsed.collections;
          if (parsed.tiptapContent) {
            localStorage.setItem('loc_portfolio_tiptap_v2', parsed.tiptapContent);
          }
          syncWithExplorationJournal();
          renderMediaGrid();
          updateDashboardStats();
          showAdminToast('🎉 Đã phục hồi dữ liệu từ file backup thành công!');
        } else {
          showAdminToast('⚠️ File JSON không đúng định dạng sao lưu của Lộc Studio.');
        }
      } catch {
        showAdminToast('⚠️ Lỗi khi đọc file sao lưu.');
      }
      importFile.value = '';
    };
    reader.readAsText(file);
  });

  // 4. Reset to Default Curated Data
  const resetBtn = overlay.querySelector('#admin-reset-defaults-btn');
  resetBtn?.addEventListener('click', async () => {
    if (confirm('Anh có chắc muốn khôi phục dữ liệu ban đầu không? Các ảnh đã đăng sẽ được đặt lại theo mẫu tiêu chuẩn.')) {
      mediaItems = JSON.parse(JSON.stringify(INITIAL_CURATED_MEDIA));
      await dbSaveAllMedia(mediaItems);
      syncWithExplorationJournal();
      renderMediaGrid();
      updateDashboardStats();
      showAdminToast('🔄 Đã khôi phục dữ liệu mặc định ban đầu.');
    }
  });
}

// ============================================================================
// PUBLIC CONTROLLER EXPORTS
// ============================================================================

export function openAdminStudioPanel() {
  setupAdminStudioDOM();
  switchAdminView('dashboard');
  updateDashboardStats();
  const overlay = document.getElementById('admin-studio-overlay');
  overlay?.classList.add('is-open');
}

export function closeAdminStudioPanel() {
  const overlay = document.getElementById('admin-studio-overlay');
  overlay?.classList.remove('is-open');
}

export function requestAdminAccess() {
  if (isSessionAuthenticated()) {
    openAdminStudioPanel();
  } else {
    openAuthModal();
  }
}

// Initialize Admin Studio subsystem on DOM ready
export async function initAdminStudio() {
  // Sync PIN to localStorage for instant auth checks
  try {
    const dbPin = await dbGetSetting<string>(PIN_KEY, DEFAULT_PIN);
    if (dbPin) localStorage.setItem(PIN_KEY, dbPin);
  } catch {}

  // 1. Load media items from IndexedDB
  try {
    const stored = await dbGetAllMedia();
    if (stored && stored.length > 0) {
      mediaItems = stored;
    } else {
      // Seed initial curated media items
      mediaItems = JSON.parse(JSON.stringify(INITIAL_CURATED_MEDIA));
      await dbSaveAllMedia(mediaItems);
    }
  } catch {
    mediaItems = JSON.parse(JSON.stringify(INITIAL_CURATED_MEDIA));
  }

  // 2. Setup listeners for entrance buttons across site
  document.querySelectorAll<HTMLElement>('.admin-nav-trigger, [data-action="open-admin"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      requestAdminAccess();
    });
  });

  // 3. Footer link trigger
  document.querySelectorAll<HTMLElement>('.admin-footer-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      requestAdminAccess();
    });
  });

  // 4. Keyboard Shortcuts: Option + A (Alt + A) OR Cmd + Shift + A
  window.addEventListener('keydown', (e) => {
    const isAKey = e.code === 'KeyA' || e.key === 'a' || e.key === 'A' || e.key === 'å' || (e as KeyboardEvent).keyCode === 65;

    // Option + A
    if (e.altKey && isAKey) {
      e.preventDefault();
      requestAdminAccess();
      return;
    }

    // Cmd + Shift + A or Ctrl + Shift + A
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && isAKey) {
      e.preventDefault();
      requestAdminAccess();
      return;
    }
  });

  // 5. URL Hash Trigger (#admin)
  if (window.location.hash === '#admin') {
    setTimeout(() => {
      requestAdminAccess();
    }, 400);
  }

  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#admin') {
      requestAdminAccess();
    }
  });

  // 6. Multi-Device Cloud Synchronization (Phone <-> Computer sync)
  syncCMSFromCloud().catch((err) => console.warn('[AdminStudio] Initial cloud sync:', err));

  // 7. Auto-sync when switching back to tab / window focus
  window.addEventListener('focus', () => {
    syncCMSFromCloud();
  });

  // 8. Auto-sync periodically every 45 seconds
  setInterval(() => {
    syncCMSFromCloud();
  }, 45000);

// Expose globally for testing & external triggers
if (typeof window !== 'undefined') {
  (window as any).syncCMSFromCloud = syncCMSFromCloud;
  (window as any).requestAdminAccess = requestAdminAccess;
}

console.info('[AdminStudio] Lộc Studio CMS Engine ready with Multi-Device Cloud Sync.');
}

/**
 * Automatically synchronizes latest CMS data from Cloud Gist to local client.
 * This guarantees that when photos or PIN are changed on Phone, they appear on Computer
 * and vice-versa upon page reload or tab switch!
 */
export async function syncCMSFromCloud(): Promise<boolean> {
  try {
    const cloud = await fetchCloudCMS();
    if (!cloud) return false;

    let hasChanges = false;

    // 1. Sync PIN across all devices
    if (cloud.pin && cloud.pin !== getStoredPin()) {
      const local = getStoredPin();
      if (!(local !== DEFAULT_PIN && cloud.pin === DEFAULT_PIN)) {
        try {
          localStorage.setItem(PIN_KEY, cloud.pin);
        } catch {}
        await dbSetSetting(PIN_KEY, cloud.pin);
        console.info('[AdminStudio] PIN synchronized from Cloud Gist:', cloud.pin);
      }
    }

    // 2. Sync Collections
    if (cloud.collections && cloud.collections.length > 0) {
      collections = cloud.collections;
    }

    // 3. Sync Media Items
    if (cloud.mediaItems && Array.isArray(cloud.mediaItems) && cloud.mediaItems.length > 0) {
      const lastApplied = localStorage.getItem('loc_last_applied_cloud_ts');
      const cloudTs = cloud.publishedAt || cloud.updatedAt || '';

      if (lastApplied !== cloudTs || cloud.mediaItems.length !== mediaItems.length) {
        mediaItems = cloud.mediaItems;
        await dbSaveAllMedia(mediaItems);
        try {
          localStorage.setItem('loc_last_applied_cloud_ts', cloudTs);
        } catch {}
        hasChanges = true;
      }
    }

    // 4. Sync Tiptap Text Content across all devices
    if (cloud.tiptapContent) {
      try {
        const cloudContentStr = typeof cloud.tiptapContent === 'string'
          ? cloud.tiptapContent
          : JSON.stringify(cloud.tiptapContent);
        const localContentStr = localStorage.getItem('loc_portfolio_tiptap_v2');
        if (cloudContentStr && cloudContentStr !== localContentStr && cloudContentStr !== '{}') {
          localStorage.setItem('loc_portfolio_tiptap_v2', cloudContentStr);
          await dbSetSetting('tiptap_content', typeof cloud.tiptapContent === 'string' ? JSON.parse(cloud.tiptapContent) : cloud.tiptapContent);
          restoreSavedContent();
          console.info('[AdminStudio] Restored text edits synchronized from Cloud Gist.');
        }
      } catch (e) {
        console.warn('[AdminStudio] Cloud tiptapContent sync error:', e);
      }
    }

    // 5. Update live website journal DOM
    if (hasChanges || !localStorage.getItem('loc_initial_journal_synced')) {
      await syncWithExplorationJournal(false);
      try {
        localStorage.setItem('loc_initial_journal_synced', 'true');
      } catch {}

      const overlay = document.getElementById('admin-studio-overlay');
      if (overlay?.classList.contains('is-open')) {
        renderMediaGrid();
        updateDashboardStats();
      }
      console.info('[AdminStudio] Website and Media Library synchronized with Cloud CMS.');
    }

    return true;
  } catch (err) {
    console.warn('[AdminStudio] syncCMSFromCloud warning:', err);
    return false;
  }
}
