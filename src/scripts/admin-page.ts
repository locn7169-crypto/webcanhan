/**
 * Admin Portal Logic (admin.html)
 * Dedicated, separate administration interface for Lộc Studio.
 */
import { isAdminAuthenticated, verifyAdminPin, setAdminAuthenticated, clearAdminAuthentication, getStoredPin } from './auth-gate';
import { fetchCloudCMS, pushCloudCMS } from './cloud-cms-sync';
import { dbGetAllMedia, dbGetSetting } from './admin-studio';
import { getFirebaseDb, firebaseConfig } from './firebase-cms';

const STORAGE_KEY = 'loc_portfolio_tiptap_v2';
const DB_PATH = 'page_content';

// Default initial values for the form fields
const DEFAULT_VALUES: Record<string, string> = {
  'hero-name-first': 'Nguyễn',
  'hero-name-second': 'Thành Lộc',
  'hero-sig-cn': '阮城禄',
  'hero-tagline-en': 'Personal Website & Portfolio',
  'hero-quote-vi': 'Không gian cá nhân lưu giữ những điều tôi xây dựng, những điều tôi học hỏi và những điều tôi trân quý.',
  'hero-about-title': 'Đôi chút về tôi',
  'hero-about-p-0': 'Tôi là một lập trình viên và người xây dựng sản phẩm công nghệ tại TP. Hồ Chí Minh. Luôn kiên định với tinh thần "Tri hành hợp nhất" — học đi đôi với hành, tư duy sâu sắc từ nguyên lý gốc (first-principles) và không ngừng hoàn thiện bản thân mỗi ngày.',
  'hero-about-p-1': 'Với niềm đam mê thiết kế giao diện tinh xảo (craft & micro-interactions), tối ưu hiệu năng và xây dựng những ứng dụng thiết thực, tôi tạo ra không gian này như một cuốn nhật ký số ghi lại hành trình phát triển cá nhân.',
  'hero-bio-quote': 'Tập trung vào kỷ luật tự thân, vận động ngoài trời và sự tĩnh tại trong tâm trí.',
  'explorations-eyebrow': 'LIBRARY · THƯ VIỆN',
  'explorations-title': 'Thư Viện · Library',
  'carrd-name': 'Nguyễn Thành Lộc',
  'carrd-subtitle': '阮城禄 · Creator & Developer',
  'carrd-quote-cn': '知行合一',
  'carrd-quote-vi': 'Biết mà không làm thì chưa phải là biết thật sự.',
  'footer-quote': 'Được kiến tạo với sự tỉ mỉ, kỷ luật và niềm đam mê công nghệ vô tận.'
};

function showToast(msg = 'Đã lưu và xuất bản thành công!', isError = false) {
  const toast = document.getElementById('adminToast');
  const msgEl = document.getElementById('toastMsg');
  if (!toast || !msgEl) return;

  msgEl.textContent = msg;
  toast.style.background = isError ? '#7f1d1d' : '#064e3b';
  toast.style.borderColor = isError ? '#ef4444' : '#10b981';
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// 1. PIN Authentication
function setupAuth() {
  const modal = document.getElementById('pinGateModal');
  const form = document.getElementById('pinForm');
  const input = document.getElementById('adminPinInput') as HTMLInputElement;
  const logoutBtn = document.getElementById('logoutBtn');

  if (isAdminAuthenticated()) {
    if (modal) modal.style.display = 'none';
  } else {
    if (modal) modal.style.display = 'flex';
  }

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const pin = (input?.value || '').trim();
    if (verifyAdminPin(pin)) {
      setAdminAuthenticated(true);
      if (modal) modal.style.display = 'none';
      showToast('Đăng nhập Quản trị thành công!');
    } else {
      input.classList.add('shake');
      alert('Mã PIN không chính xác! Vui lòng thử lại.');
      setTimeout(() => input.classList.remove('shake'), 600);
    }
  });

  logoutBtn?.addEventListener('click', () => {
    clearAdminAuthentication();
    if (modal) modal.style.display = 'flex';
    if (input) input.value = '';
  });
}

// 2. Tab Navigation
function setupTabs() {
  const tabs = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
  const panels = document.querySelectorAll<HTMLElement>('.tab-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-tab');
      tabs.forEach((t) => t.classList.remove('active'));
      panels.forEach((p) => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPanel = document.getElementById(targetId || '');
      if (targetPanel) targetPanel.classList.add('active');
    });
  });
}

// 3. Load Data into Form Fields
async function loadFormData() {
  let data: Record<string, string> = { ...DEFAULT_VALUES };

  // Try reading from LocalStorage first (0ms)
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        data = { ...data, ...parsed };
      }
    }
  } catch {}

  // Try reading from Cloud Gist
  try {
    const cloud = await fetchCloudCMS();
    if (cloud && cloud.tiptapContent && typeof cloud.tiptapContent === 'object') {
      data = { ...data, ...(cloud.tiptapContent as Record<string, string>) };
    }
  } catch {}

  // Fill into inputs
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-key]').forEach((field) => {
    const key = field.getAttribute('data-key');
    if (key && data[key] !== undefined) {
      field.value = data[key];
    }
  });

  console.info('[AdminPortal] Form data loaded.');
}

// 4. Save and Publish Data
async function saveFormData() {
  const saveBtn = document.getElementById('saveAndPublishBtn') as HTMLButtonElement;
  const originalText = saveBtn ? saveBtn.innerHTML : 'Lưu &amp; Xuất bản';
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span>⏳ Đang xuất bản...</span>';
  }

  const payload: Record<string, string> = {};
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-key]').forEach((field) => {
    const key = field.getAttribute('data-key');
    if (key) {
      payload[key] = field.value.trim();
    }
  });

  // Always ensure canonical Thư Viện values
  payload['explorations-eyebrow'] = 'LIBRARY · THƯ VIỆN';
  payload['explorations-title'] = 'Thư Viện <span class="explorations-title-sub">· Library</span>';

  try {
    // 1. Save to LocalStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    // 2. Save to Firebase RTDB if available
    const db = getFirebaseDb();
    if (db) {
      try {
        await db.ref(DB_PATH).set(payload);
        console.info('[AdminPortal] Saved to Firebase RTDB.');
      } catch (e) {
        console.warn('[AdminPortal] Firebase RTDB save error:', e);
      }
    }

    // 3. Save to Cloud Gist CMS
    try {
      const media = await dbGetAllMedia();
      const collections = await dbGetSetting<any[]>('loc_collections', []);
      await pushCloudCMS({
        pin: getStoredPin(),
        mediaItems: media,
        collections: collections,
        tiptapContent: payload,
      });
      console.info('[AdminPortal] Published to Cloud CMS.');
    } catch (e) {
      console.warn('[AdminPortal] Cloud Gist push warning:', e);
    }

    showToast('✓ Đã lưu và xuất bản toàn bộ thành công!');
  } catch (err: any) {
    console.error('[AdminPortal] Save error:', err);
    showToast('Lỗi khi lưu: ' + (err?.message || err), true);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalText;
    }
  }
}

// App bootstrap
document.addEventListener('DOMContentLoaded', () => {
  setupAuth();
  setupTabs();
  loadFormData();

  const saveBtn = document.getElementById('saveAndPublishBtn');
  saveBtn?.addEventListener('click', saveFormData);

  const cloudSyncBtn = document.getElementById('cloudSyncTriggerBtn');
  cloudSyncBtn?.addEventListener('click', async () => {
    await saveFormData();
  });
});
