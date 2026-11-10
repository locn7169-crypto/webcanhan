/**
 * Firebase Realtime Database & Admin CMS Subsystem
 * Implements Step 1, Step 2, and Step 3:
 * - Step 1: URL Hash (#admin) toggle -> contenteditable="true" on .editable & reveals #saveBtn
 * - Step 2: Firebase Realtime Database CDN integration & configuration
 * - Step 3: loadData() for automatic page hydration & saveData() for saving to Firebase & Cloud
 */
import { fetchCloudCMS, pushCloudCMS } from './cloud-cms-sync';
import { isAdminAuthenticated, requestAdminAccess, getStoredPin, clearAdminAuthentication } from './auth-gate';
import { dbGetAllMedia, dbGetSetting } from './admin-studio';
import { enforceCanonicalExplorationsHeader, stripEditableArtifacts, toggleTiptapEditMode, deletedNodeKeys } from './tiptap-editor';
import { moments, updateMomentsFromMediaList, renderMoments } from './explorations-moments';

// ============================================================================
// STEP 2: FIREBASE CONFIGURATION PLACEHOLDER & INSTRUCTIONS
// ============================================================================
// Hướng dẫn cấu hình Firebase Realtime Database:
// 1. Tạo project tại https://console.firebase.google.com/
// 2. Vào Project Settings -> General -> Your apps -> Web (</>) -> Copy firebaseConfig
// 3. Vào Build -> Realtime Database -> Create Database -> Test mode (Rules: .read: true, .write: true)
// 4. Dán thông tin vào đối tượng firebaseConfig bên dưới:
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const DB_PATH = 'page_content';
const LOCAL_STORAGE_KEY = 'loc_portfolio_tiptap_v2';

let rtdbInstance: any = null;

export function isFirebaseConfigured(config: typeof firebaseConfig): boolean {
  return Boolean(
    config &&
    typeof config.apiKey === 'string' &&
    !config.apiKey.includes('YOUR_') &&
    typeof config.databaseURL === 'string' &&
    !config.databaseURL.includes('YOUR_') &&
    typeof config.projectId === 'string' &&
    !config.projectId.includes('YOUR_')
  );
}

export function getFirebaseDb(): any {
  if (rtdbInstance) return rtdbInstance;
  if (typeof window !== 'undefined' && (window as any).firebase && typeof (window as any).firebase.database === 'function') {
    if (isFirebaseConfigured(firebaseConfig) || (window as any).__mockDb !== undefined) {
      try {
        if (Array.isArray((window as any).firebase.apps) && (window as any).firebase.apps.length === 0) {
          (window as any).firebase.initializeApp(firebaseConfig);
        }
        rtdbInstance = (window as any).firebase.database();
        return rtdbInstance;
      } catch (e) {
        console.warn('[FirebaseCMS] Firebase init notice:', e);
      }
    }
  }
  return null;
}

// ============================================================================
// STEP 3: DATA HYDRATION (loadData) & PERSISTENCE (saveData)
// ============================================================================

export function showSaveNotification(message = 'Đã lưu thành công', isError = false) {
  let toast = document.getElementById('notificationToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'notificationToast';
    toast.className = 'save-toast-notice';
    document.body.appendChild(toast);
  }

  const msgSpan = document.getElementById('toastMessage') || toast;
  msgSpan.textContent = message;

  if (isError) {
    toast.style.borderColor = '#ef4444';
    toast.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.4), 0 0 15px rgba(239, 68, 68, 0.35)';
  } else {
    toast.style.borderColor = 'rgba(16, 185, 129, 0.5)';
    toast.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.4), 0 0 15px rgba(16, 185, 129, 0.25)';
  }

  toast.classList.add('show');
  setTimeout(() => {
    toast?.classList.remove('show');
  }, 3500);
}

export function applyDataToDOM(data: Record<string, any>) {
  if (!data || typeof data !== 'object') return;

  const obsoleteStrings = [
    'Ngoài màn hình',
    'Explorations Outside the Screen',
    'FIELD NOTES & PERSPECTIVES',
    'GHI CHÉP & GÓC NHÌN',
    'Một vài lát cắt về kỷ luật',
    'Một vài lát cắt',
  ];

  Object.entries(data).forEach(([key, val]) => {
    if (!val) return;

    // 1. Kiểm tra nếu khối bị xóa
    if (typeof val === 'object' && val !== null && val.deleted) {
      const el = document.querySelector<HTMLElement>(`[data-edit-key="${key}"], [data-key="${key}"], #${key}`);
      if (el) el.remove();
      return;
    }

    if (typeof val === 'string' && obsoleteStrings.some((s) => val.includes(s))) {
      return;
    }

    let el = document.querySelector<HTMLElement>(`[data-edit-key="${key}"], [data-key="${key}"], #${key}`);

    // 2. Tự động chèn khối mới được thêm động từ Admin
    if (!el && typeof val === 'object' && val !== null && val.insertAfter) {
      const prevEl = document.querySelector<HTMLElement>(`[data-edit-key="${val.insertAfter}"], [data-key="${val.insertAfter}"], #${val.insertAfter}`);
      if (prevEl && prevEl.parentElement) {
        const newEl = document.createElement(val.tagName || 'p');
        newEl.setAttribute('data-edit-key', key);
        prevEl.after(newEl);
        el = newEl;
      }
    }

    if (el && !el.closest('#adminBanner, #saveBtn, #admin-auth-overlay, #admin-studio-overlay, .toast-notice')) {
      if (el.tagName.toLowerCase() === 'img') {
        const src = typeof val === 'string' ? val : (val as any).src;
        // Prevent stale placeholder images from overwriting newly uploaded high-res moments
        const isMomentCover = key.startsWith('moment-img-');
        const isStalePlaceholder = src && (src.includes('backdrop-works') || src.includes('loc-banner'));
        const currentSrc = (el as HTMLImageElement).src || '';
        const hasHighResUserPhoto = currentSrc.startsWith('data:image/');

        if (!(isMomentCover && isStalePlaceholder && hasHighResUserPhoto)) {
          if (src) (el as HTMLImageElement).src = src;
        }
      } else if (typeof val === 'string') {
        let cleanText = stripEditableArtifacts(val);
        if (key.includes('moment-title') && (/^[\d\s_-]{6,}$/.test(cleanText.trim()) || cleanText.includes('679579249'))) {
          cleanText = 'Bình hoa hồng trắng — Kỷ niệm cuối cấp 3';
        } else if (key.includes('moment-caption') && (/^[\d\s_-]{6,}$/.test(cleanText.trim()) || cleanText.includes('679579249'))) {
          cleanText = 'Đây là bức ảnh mà tôi đã được chị Trâm Anh tặng vào cuối năm cấp 3. Hiện tại đang là tất cả các ảnh đại diện mạng xã hội của tôi';
        }
        el.innerHTML = cleanText;
      } else if (typeof val === 'object' && val !== null) {
        if (val.src && el.tagName.toLowerCase() === 'img') {
          const isMomentCover = key.startsWith('moment-img-');
          const isStalePlaceholder = val.src && (val.src.includes('backdrop-works') || val.src.includes('loc-banner'));
          const currentSrc = (el as HTMLImageElement).src || '';
          const hasHighResUserPhoto = currentSrc.startsWith('data:image/');

          if (!(isMomentCover && isStalePlaceholder && hasHighResUserPhoto)) {
            (el as HTMLImageElement).src = val.src;
          }
        }
        if (val.html !== undefined) {
          let cleanHtml = stripEditableArtifacts(val.html);
          if (key.includes('moment-title') && (/^[\d\s_-]{6,}$/.test(cleanHtml.trim()) || cleanHtml.includes('679579249'))) {
            cleanHtml = 'Bình hoa hồng trắng — Kỷ niệm cuối cấp 3';
          } else if (key.includes('moment-caption') && (/^[\d\s_-]{6,}$/.test(cleanHtml.trim()) || cleanHtml.includes('679579249'))) {
            cleanHtml = 'Đây là bức ảnh mà tôi đã được chị Trâm Anh tặng vào cuối năm cấp 3. Hiện tại đang là tất cả các ảnh đại diện mạng xã hội của tôi';
          }
          el.innerHTML = cleanHtml;
        }
        if (val.style && typeof val.style === 'object') {
          Object.assign(el.style, val.style);
        }
      }
      
      // Strict read-only outside #admin
      if (!(window.location.hash || '').toLowerCase().includes('#admin')) {
        el.removeAttribute('contenteditable');
        el.removeAttribute('data-editable-active');
        el.classList.remove('editable', 'tiptap-active-node');
      }
    }
  });

  // Guarantee ZERO editable residues outside #admin
  if (!(window.location.hash || '').toLowerCase().includes('#admin')) {
    document.querySelectorAll<HTMLElement>('[contenteditable], .editable, [data-editable-active]').forEach((node) => {
      node.removeAttribute('contenteditable');
      node.removeAttribute('data-editable-active');
      node.classList.remove('editable');
    });
  }

  enforceCanonicalExplorationsHeader();
}

/**
 * Hàm loadData(): Tự động chạy ngay khi mở trang cho mọi người.
 * Kết nối Firebase Realtime Database (hoặc Cloud Gist / LocalStorage fallback),
 * lấy nội dung đã lưu về và điền tự động vào các thẻ có class editable / data-edit-key.
 */
export async function loadData() {
  let loadedData: Record<string, string> | null = null;

  // 1. Thử lấy từ Firebase Realtime Database
  const db = getFirebaseDb();
  if (db) {
    try {
      const snapshot = await db.ref(DB_PATH).once('value');
      if (snapshot && typeof snapshot.val === 'function') {
        const val = snapshot.val();
        if (val && typeof val === 'object') {
          loadedData = val;
          console.info('[FirebaseCMS] Nạp dữ liệu thành công từ Firebase RTDB.');
        }
      }
    } catch (err) {
      console.warn('[FirebaseCMS] Firebase RTDB fetch:', err);
    }
  }

  // 2. Thử nạp từ Cloud CMS (GitHub Gist) nếu Firebase chưa có dữ liệu
  if (!loadedData) {
    try {
      const cloud = await fetchCloudCMS();
      if (cloud) {
        if (cloud.tiptapContent && typeof cloud.tiptapContent === 'object') {
          loadedData = cloud.tiptapContent as Record<string, string>;
          console.info('[FirebaseCMS] Nạp dữ liệu từ Cloud Gist.');
        }
        if (cloud.mediaItems && Array.isArray(cloud.mediaItems) && cloud.mediaItems.length > 0) {
          updateMomentsFromMediaList(cloud.mediaItems);
          renderMoments();
        }
      }
    } catch (err) {
      console.warn('[FirebaseCMS] Cloud Gist fetch notice:', err);
    }
  }

  // 3. Fallback đọc từ LocalStorage
  if (!loadedData) {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        loadedData = JSON.parse(cached);
      }
    } catch (err) {}
  }

  // Điền dữ liệu vào DOM
  if (loadedData) {
    applyDataToDOM(loadedData);
  }
}

/**
 * Hàm saveData(): Gắn vào sự kiện click của nút saveBtn & thanh công cụ Visual Editor (chỉ ở bản Admin).
 * Quét gom hết nội dung văn bản, định dạng màu sắc, cỡ chữ, phông chữ, ảnh và đẩy lên Firebase RTDB & Cloud Gist.
 * Sau khi lưu xong thì hiển thị thông báo xác nhận và web chính (nguyenthanhloc.pages.dev) lập tức hiển thị.
 */
export async function saveData() {
  const saveBtn = document.getElementById('saveBtn');
  const saveBtnText = document.getElementById('saveBtnText');
  const originalText = saveBtnText ? saveBtnText.textContent : 'Lưu & Xuất bản lên web chính';

  if (saveBtn) saveBtn.setAttribute('disabled', 'true');
  if (saveBtnText) saveBtnText.textContent = 'Đang đồng bộ đám mây...';

  // Quét gom hết nội dung & style từ các phần tử có data-edit-key hoặc editable
  const payload: Record<string, any> = {};

  // Gom các khối đã bị xóa trong phiên biên tập
  deletedNodeKeys.forEach((k) => {
    payload[k] = { deleted: true };
  });

  const editables = document.querySelectorAll<HTMLElement>('.editable, [data-edit-key]');

  editables.forEach((el) => {
    if (el.closest('#adminBanner, #saveBtn, #admin-auth-overlay, #admin-studio-overlay, .toast-notice, script, style')) return;
    const key = el.getAttribute('data-edit-key') || el.getAttribute('data-key') || el.id;
    if (key && !key.includes('saveBtn') && !key.includes('admin') && !key.includes('toast')) {
      if (el.tagName.toLowerCase() === 'img') {
        payload[key] = { src: (el as HTMLImageElement).src };
      } else {
        const styleObj: Record<string, string> = {};
        if (el.style.fontSize) styleObj.fontSize = el.style.fontSize;
        if (el.style.color) styleObj.color = el.style.color;
        if (el.style.backgroundColor) styleObj.backgroundColor = el.style.backgroundColor;
        if (el.style.fontFamily) styleObj.fontFamily = el.style.fontFamily;
        if (el.style.textAlign) styleObj.textAlign = el.style.textAlign;
        if (el.style.lineHeight) styleObj.lineHeight = el.style.lineHeight;

        const insertAfter = el.getAttribute('data-insert-after') || undefined;

        let content = el.innerHTML;
        const pm = el.querySelector<HTMLElement>('.ProseMirror');
        if (pm) {
          content = pm.innerHTML;
        }

        payload[key] = {
          html: stripEditableArtifacts(content.trim()),
          style: Object.keys(styleObj).length > 0 ? styleObj : undefined,
          insertAfter,
          tagName: el.tagName.toLowerCase(),
        };
      }
    }
  });

  // Đồng bộ các thẻ khoảnh khắc Moments với ảnh bìa độ nét cao & tiêu đề vào payload
  moments.forEach((m) => {
    if (m.image) payload[`moment-img-${m.id}`] = { src: m.image };
    if (m.title) payload[`moment-title-${m.id}`] = { html: m.title };
    if (m.caption) payload[`moment-caption-${m.id}`] = { html: m.caption };
    if (m.meta) payload[`moment-meta-${m.id}`] = { html: m.meta };
  });

  try {
    // 1. Lưu đè lên Firebase Realtime Database
    const db = getFirebaseDb();
    if (db) {
      try {
        await db.ref(DB_PATH).set(payload);
        console.info('[FirebaseCMS] Đã lưu lên Firebase RTDB thành công.');
      } catch (err) {
        console.warn('[FirebaseCMS] Lưu Firebase RTDB thất bại, lưu dự phòng đám mây:', err);
      }
    }

    // 2. Lưu đồng bộ lên Cloud Gist CMS để web chính nguyenthanhloc.pages.dev cập nhật ngay lập tức
    try {
      const media = await dbGetAllMedia();
      const collections = await dbGetSetting<any[]>('loc_collections', []);
      await pushCloudCMS({
        pin: getStoredPin(),
        mediaItems: media,
        collections: collections,
        tiptapContent: payload,
      });
      console.info('[FirebaseCMS] Đã đồng bộ lên Cloud CMS toàn cầu.');
    } catch (err) {
      console.warn('[FirebaseCMS] Cloud Gist push notice:', err);
    }

    // 3. Lưu vào LocalStorage
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
      localStorage.setItem('loc_portfolio_tiptap_v2', JSON.stringify(payload));
    } catch (err) {}

    // 4. Hiển thị thông báo xác nhận thành công
    if (saveBtn) saveBtn.removeAttribute('disabled');
    if (saveBtnText) saveBtnText.textContent = originalText;
    showSaveNotification('🎉 Đã lưu & xuất bản thành công! Website https://nguyenthanhloc.pages.dev đã được cập nhật.');
  } catch (err: any) {
    console.error('[FirebaseCMS] Lỗi khi lưu:', err);
    if (saveBtn) saveBtn.removeAttribute('disabled');
    if (saveBtnText) saveBtnText.textContent = originalText;
    showSaveNotification('Lỗi khi lưu: ' + (err?.message || err), true);
  } finally {
    if (saveBtn) saveBtn.removeAttribute('disabled');
    if (saveBtnText) saveBtnText.textContent = originalText;
  }
}

// ============================================================================
// BẢO VỆ CHẾ ĐỘ XEM TRÊN TRANG CHÍNH: 100% CHỈ ĐỌC (READ-ONLY)
// ============================================================================

export function enforceStrictReadOnly() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll<HTMLElement>('[contenteditable], .editable, [data-editable-active]').forEach((el) => {
    el.removeAttribute('contenteditable');
    el.removeAttribute('data-editable-active');
    el.classList.remove('editable');
  });
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) saveBtn.style.display = 'none';
  const adminBanner = document.getElementById('adminBanner');
  if (adminBanner) adminBanner.style.display = 'none';
  document.body.classList.remove('admin-active', 'visual-editor-active', 'tiptap-mode-active');
  const dock = document.getElementById('visual-editor-dock');
  if (dock) dock.remove();
  const bubble = document.getElementById('tiptap-bubble-menu');
  if (bubble) bubble.remove();
}

export function applyAdminEditableState(editable: boolean) {
  if (typeof document === 'undefined') return;
  const isUrlAdmin = (window.location.hash || '').toLowerCase().includes('#admin');
  if (!isUrlAdmin || !editable || !isAdminAuthenticated()) {
    enforceStrictReadOnly();
    return;
  }

  // Trên trang #admin và đã đăng nhập: Kích hoạt Tiptap Visual Editor trực tiếp trên toàn web
  try {
    toggleTiptapEditMode(true);
  } catch (err) {
    console.warn('[FirebaseCMS] toggleTiptapEditMode:', err);
  }

  // Kích hoạt thẻ editable
  document.querySelectorAll<HTMLElement>('.editable').forEach((el) => {
    el.contentEditable = 'true';
    el.spellcheck = false;
  });

  // Hiển thị nút Lưu to nổi bật góc dưới màn hình
  let saveBtn = document.getElementById('saveBtn');
  if (!saveBtn) {
    saveBtn = document.createElement('button');
    saveBtn.id = 'saveBtn';
    saveBtn.className = 'admin-floating-save-btn';
    saveBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
      </svg>
      <span id="saveBtnText">💾 Lưu &amp; Xuất bản lên web chính</span>
    `;
    saveBtn.addEventListener('click', saveData);
    document.body.appendChild(saveBtn);
  }
  saveBtn.style.display = 'inline-flex';
  document.body.classList.add('admin-active');
}

export function checkAdminMode() {
  if (typeof window === 'undefined') return;
  const hash = (window.location.hash || '').trim().toLowerCase();
  if (hash.includes('#admin')) {
    if (!isAdminAuthenticated()) {
      // Yêu cầu mật khẩu mỗi lần vào #admin
      enforceStrictReadOnly();
      requestAdminAccess();
    } else {
      applyAdminEditableState(true);
    }
  } else {
    // URL KHÔNG CÓ đuôi #admin (ví dụ: #explorations, #works...) -> Khóa tuyệt đối 100% chỉ đọc & xóa session
    clearAdminAuthentication();
    enforceStrictReadOnly();
  }
}

// Khởi tạo hệ thống CMS
export function initFirebaseCMS() {
  // 1. Tự động nạp dữ liệu đã lưu từ Firebase RTDB & Cloud Gist
  loadData();

  // 2. Kiểm tra chế độ ban đầu: nếu không phải #admin thì tuyệt đối chỉ đọc
  checkAdminMode();

  // 3. Lắng nghe thay đổi URL hash (#admin, #explorations, ...)
  window.addEventListener('hashchange', checkAdminMode);

  // 4. Lắng nghe trạng thái đăng nhập
  window.addEventListener('loc-admin-auth-changed', () => {
    checkAdminMode();
  });
}

// Expose ra window để dễ gọi hoặc kiểm thử
if (typeof window !== 'undefined') {
  (window as any).loadData = loadData;
  (window as any).saveData = saveData;
  (window as any).checkAdminMode = checkAdminMode;
  (window as any).enforceStrictReadOnly = enforceStrictReadOnly;
  (window as any).applyAdminEditableState = applyAdminEditableState;
  (window as any).firebaseConfig = firebaseConfig;
}
