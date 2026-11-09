/**
 * Firebase Realtime Database & Admin CMS Subsystem
 * Implements Step 1, Step 2, and Step 3:
 * - Step 1: URL Hash (#admin) toggle -> contenteditable="true" on .editable & reveals #saveBtn
 * - Step 2: Firebase Realtime Database CDN integration & configuration
 * - Step 3: loadData() for automatic page hydration & saveData() for saving to Firebase & Cloud
 */
import { fetchCloudCMS, pushCloudCMS } from './cloud-cms-sync';
import { isAdminAuthenticated, requestAdminAccess, getStoredPin } from './auth-gate';
import { dbGetAllMedia, dbGetSetting } from './admin-studio';
import { enforceCanonicalExplorationsHeader, stripEditableArtifacts } from './tiptap-editor';

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

export function applyDataToDOM(data: Record<string, string>) {
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
    if (!val || typeof val !== 'string') return;

    if (obsoleteStrings.some((s) => val.includes(s)) || key.includes('explorations-subtitle')) {
      return;
    }

    const el = document.querySelector<HTMLElement>(`[data-edit-key="${key}"], [data-key="${key}"], #${key}`);
    if (el && !el.closest('#adminBanner, #saveBtn, #admin-auth-overlay, #admin-studio-overlay, .toast-notice')) {
      if (el.tagName.toLowerCase() === 'img') {
        (el as HTMLImageElement).src = val;
      } else {
        el.innerHTML = stripEditableArtifacts(val);
      }
      el.removeAttribute('contenteditable');
      el.classList.remove('editable');
    }
  });

  document.querySelectorAll<HTMLElement>('[contenteditable], .editable').forEach((node) => {
    node.removeAttribute('contenteditable');
    node.classList.remove('editable');
  });

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
      if (cloud && cloud.tiptapContent && typeof cloud.tiptapContent === 'object') {
        loadedData = cloud.tiptapContent as Record<string, string>;
        console.info('[FirebaseCMS] Nạp dữ liệu từ Cloud Gist.');
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
 * Hàm saveData(): Gắn vào sự kiện click của nút saveBtn (chỉ ở bản Admin).
 * Quét gom hết nội dung bên trong các thẻ editable và đẩy lên Firebase để lưu đè lại.
 * Sau khi lưu xong thì hiển thị thông báo "Đã lưu thành công".
 */
export async function saveData() {
  const saveBtn = document.getElementById('saveBtn');
  const saveBtnText = document.getElementById('saveBtnText');
  const originalText = saveBtnText ? saveBtnText.textContent : 'Lưu thay đổi';

  if (saveBtn) saveBtn.setAttribute('disabled', 'true');
  if (saveBtnText) saveBtnText.textContent = 'Đang lưu...';

  // Quét gom hết nội dung từ các thẻ editable
  const payload: Record<string, string> = {};
  const editables = document.querySelectorAll<HTMLElement>('.editable, [data-edit-key]');

  editables.forEach((el) => {
    if (el.closest('#adminBanner, #saveBtn, #admin-auth-overlay, #admin-studio-overlay, .toast-notice, script, style')) return;
    const key = el.getAttribute('data-edit-key') || el.getAttribute('data-key') || el.id;
    if (key && !key.includes('saveBtn') && !key.includes('admin') && !key.includes('toast')) {
      if (el.tagName.toLowerCase() === 'img') {
        payload[key] = (el as HTMLImageElement).src;
      } else {
        payload[key] = el.innerHTML.trim();
      }
    }
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

    // 2. Lưu đồng bộ lên Cloud Gist CMS để các thiết bị khác xem được ngay
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
    } catch (err) {}

    // 4. Hiển thị thông báo xác nhận: "Đã lưu thành công"
    showSaveNotification('Đã lưu thành công');
  } catch (err: any) {
    console.error('[FirebaseCMS] Lỗi khi lưu:', err);
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
  document.querySelectorAll<HTMLElement>('[contenteditable], .editable').forEach((el) => {
    el.removeAttribute('contenteditable');
    el.classList.remove('editable');
  });
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) saveBtn.style.display = 'none';
  const adminBanner = document.getElementById('adminBanner');
  if (adminBanner) adminBanner.style.display = 'none';
  document.body.classList.remove('admin-active');
}

export function checkAdminMode() {
  if (typeof window === 'undefined') return;
  const hash = (window.location.hash || '').trim().toLowerCase();
  if (hash.includes('#admin')) {
    requestAdminAccess();
  }
  enforceStrictReadOnly();
}

// Khởi tạo hệ thống CMS
export function initFirebaseCMS() {
  // 1. Tự động nạp dữ liệu đã lưu từ Firebase RTDB & Cloud Gist
  loadData();

  // 2. Tuyệt đối đảm bảo trang chính 100% chỉ đọc (loại bỏ mọi yếu tố chỉnh sửa trực tiếp)
  enforceStrictReadOnly();

  // 3. Lắng nghe thay đổi URL hash (#admin)
  window.addEventListener('hashchange', checkAdminMode);

  // 4. Lắng nghe trạng thái đăng nhập
  window.addEventListener('loc-admin-auth-changed', () => {
    enforceStrictReadOnly();
  });

  // 5. Kiểm tra trạng thái URL khi vừa mở trang
  if ((window.location.hash || '').toLowerCase().includes('#admin')) {
    setTimeout(checkAdminMode, 300);
  }
}

// Expose ra window để dễ gọi hoặc kiểm thử
if (typeof window !== 'undefined') {
  (window as any).loadData = loadData;
  (window as any).saveData = saveData;
  (window as any).checkAdminMode = checkAdminMode;
  (window as any).enforceStrictReadOnly = enforceStrictReadOnly;
  (window as any).firebaseConfig = firebaseConfig;
}
