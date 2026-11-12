import { Editor, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import BubbleMenu from '@tiptap/extension-bubble-menu';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CharacterCount from '@tiptap/extension-character-count';
import { isAdminAuthenticated, requestAdminAccess } from './auth-gate';
import { dbGetSetting, dbSetSetting } from './admin-studio';

// Custom Tiptap Extension for dynamic Font Size scaling
export const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
        },
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

// Storage Key for persisted content
const STORAGE_KEY = 'loc_portfolio_tiptap_v2';

// Set of node keys deleted by the user during this session
export const deletedNodeKeys = new Set<string>();

// Canonical Font Family map for the editor
export const FONT_MAP: Record<string, string> = {
  sans: "system-ui, -apple-system, 'SF Pro Display', Inter, sans-serif",
  cophong: "'Noto Serif SC', 'Playfair Display', 'Cinzel', serif",
  editorial: "'Newsreader', 'Playfair Display', Georgia, serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

// Global Tiptap State
let activeEditor: Editor | null = null;
let activeTargetEl: HTMLElement | null = null;
let isEditMode = false;
let modalComposerEditor: Editor | null = null;
let imageUploadInput: HTMLInputElement | null = null;

export function getActiveTiptapEditor(): Editor | null {
  return activeEditor;
}

// Helper to show toasts
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

// Create standard Tiptap extensions configuration
function getStandardExtensions(bubbleMenuEl?: HTMLElement) {
  const exts: any[] = [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4],
      },
      horizontalRule: {},
      link: {
        openOnClick: false,
      },
      underline: {},
    }),
    TextStyle,
    Color,
    FontSize,
    Image.configure({
      inline: false,
      allowBase64: true,
    }),
    Highlight.configure({
      multicolor: true,
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    CharacterCount,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
  ];

  if (bubbleMenuEl) {
    exts.push(
      BubbleMenu.configure({
        element: bubbleMenuEl,
        options: {
          placement: 'top',
        },
      })
    );
  }

  return exts;
}

// Stable, deterministic tagging of all editable text nodes across the site
export function ensureStableEditKeys() {
  const semanticSelectors: [string, string][] = [
    ['.hero-editorial-eyebrow .eyebrow-line-en', 'hero-eyebrow-en'],
    ['.hero-editorial-eyebrow .eyebrow-line-vi', 'hero-eyebrow-vi'],
    ['.name-line-first', 'hero-name-first'],
    ['.name-line-second', 'hero-name-second'],
    ['.hero-signature-subtitle .sig-cn', 'hero-sig-cn'],
    ['.hero-portfolio-italic', 'hero-tagline-en'],
    ['.quote-bar-text', 'hero-quote-vi'],
    ['.hero-about-title', 'hero-about-title'],
    ['.hero-bio-name', 'hero-bio-name'],
    ['.hero-bio-signature', 'hero-bio-sig'],
    ['.hero-bio-quote', 'hero-bio-quote'],
    ['.brand-text', 'brand-name'],
    ['.brand-subtext', 'brand-subname'],
    ['#works .title-section', 'works-title'],
    ['#synthesis .title-section', 'synthesis-title'],
    ['#explorations .eyebrow span', 'explorations-eyebrow'],
    ['#explorations .explorations-title', 'explorations-title'],
    ['#explorations .explorations-subtitle', 'explorations-subtitle'],
    ['#contact .title-section', 'contact-title'],
    ['.carrd-name', 'carrd-name'],
    ['.carrd-subtitle', 'carrd-subtitle'],
    ['.carrd-quote-chinese', 'carrd-quote-cn'],
    ['.carrd-quote-box .bilingual-en', 'carrd-quote-en'],
    ['.carrd-quote-vi', 'carrd-quote-vi'],
    ['.carrd-avatar-img', 'carrd-avatar-img'],
    ['.carrd-banner-img', 'carrd-banner-img'],
    ['.footer-quote', 'footer-quote'],
  ];

  semanticSelectors.forEach(([sel, key]) => {
    const el = document.querySelector<HTMLElement>(sel);
    if (el && !el.getAttribute('data-edit-key')) {
      el.setAttribute('data-edit-key', key);
    }
  });

  // Also tag paragraphs in about body
  document.querySelectorAll<HTMLElement>('.hero-about-body p').forEach((p, idx) => {
    if (!p.getAttribute('data-edit-key')) {
      p.setAttribute('data-edit-key', `hero-about-p-${idx}`);
    }
  });

  // Tag all text-bearing candidates systematically
  const candidates = document.querySelectorAll<HTMLElement>(
    'h1, h2, h3, h4, h5, h6, p, .text-body, .eyebrow span, .badge-pill, .bilingual-en, .bilingual-vi, .bilingual-sub, .bilingual-title-vi, .interest-tag, .contact-method-value, .contact-method-label, .bio-chapter-title, .bio-chapter-period, .bio-chapter-body p, .bio-article-headline, .bio-article-lead, .welcome-marquee-en, .welcome-marquee-vi'
  );

  candidates.forEach((el, idx) => {
    if (el.closest('#synthesis, #visual-editor-dock, #tiptap-bubble-menu, #tiptap-composer-modal, .toast-notice, #admin-studio-overlay, #admin-auth-overlay, #previewModal, #exploration-journal-modal, script, style, svg')) return;
    if (!el.getAttribute('data-edit-key')) {
      const secId = el.closest('section[id], div[id]')?.id || 'doc';
      const tag = el.tagName.toLowerCase();
      el.setAttribute('data-edit-key', `tt-${secId}-${tag}-${idx}`);
    }
  });
}

export function enforceCanonicalExplorationsHeader() {
  const titleEl = document.querySelector<HTMLElement>('[data-edit-key="explorations-title"], #explorations .explorations-title');
  if (titleEl) {
    titleEl.innerHTML = '<span class="lang-text-vi">Thư Viện</span><span class="lang-text-en">Library</span>';
  }
  const eyebrowEl = document.querySelector<HTMLElement>('[data-edit-key="explorations-eyebrow"], #explorations .eyebrow span');
  if (eyebrowEl) {
    eyebrowEl.innerHTML = '<span class="lang-text-vi">THƯ VIỆN &amp; KHOẢNH KHẮC</span><span class="lang-text-en">LIBRARY &amp; MOMENTS</span>';
  }
  const subtitleEl = document.querySelector<HTMLElement>('[data-edit-key="explorations-subtitle"], #explorations .explorations-subtitle');
  if (subtitleEl) {
    subtitleEl.remove();
  }
}

export function stripEditableArtifacts(html: string): string {
  if (!html || typeof html !== 'string') return html;
  return html
    .replace(/\s*contenteditable(=(["'].*?["']|[^\s>]*))?/gi, '')
    .replace(/\s*data-editable-active(=(["'].*?["']|[^\s>]*))?/gi, '')
    .replace(/\s*spellcheck=(["']).*?\1/gi, '')
    .replace(/\bclass=(["'])(.*?)\1/gi, (_match, quote, classes) => {
      const filtered = classes
        .split(/\s+/)
        .filter((c: string) => c !== 'editable' && c !== 'tiptap-active-node')
        .join(' ')
        .trim();
      return filtered ? `class=${quote}${filtered}${quote}` : '';
    });
}

function sanitizeEdits(edits: Record<string, any>): boolean {
  if (!edits || typeof edits !== 'object') return false;
  let changed = false;
  const obsoleteStrings = [
    'Ngoài màn hình',
    'Explorations Outside the Screen',
    'FIELD NOTES & PERSPECTIVES',
    'GHI CHÉP & GÓC NHÌN',
    'FIELD NOTES',
    'Một vài lát cắt về kỷ luật',
    'Một vài lát cắt',
    'Tổng quan & Dự báo',
    'Overview & Forecast',
    'Giao dịch & Giỏ tiền',
    'Transactions & Jars',
    'bilingual-title-vi',
    'bilingual-en',
    'bilingual-vi',
    'bilingual-sub',
    'Learn Anything, Your Way — Nền tảng học tập',
    'Không giới hạn điều bạn có thể học — Learn Anything',
    'Hiểu tiền hôm nay. Nhìn thấy ngày mai. — Understand today\'s money',
    'LIBRARY · THƯ VIỆN',
    'Thư Viện · Library',
    'Outside the Screen',
    'EXPLORATIONS · OUTSIDE THE SCREEN',
  ];

  const obsoleteKeys = [
    'hero-sig-studio',
    'explorations-subtitle',
    'works-title',
    'synthesis-title',
    'contact-title',
    'tt-works-span-34',
    'tt-synthesis-div-47',
    'tt-loc-learn-modal-p-109',
  ];

  Object.keys(edits).forEach((key) => {
    const val = edits[key];
    const text = typeof val === 'string' ? val : (val?.html || JSON.stringify(val));
    const isObsoleteString = obsoleteStrings.some((s) => text.includes(s));
    const isObsoleteKey = obsoleteKeys.some((k) => key === k || key.includes('explorations-subtitle')) || key.startsWith('tt-synthesis-') || key.includes('synthesis');
    if (isObsoleteString || isObsoleteKey) {
      delete edits[key];
      changed = true;
    } else if (typeof edits[key] === 'string' && (edits[key].includes('contenteditable') || edits[key].includes('editable'))) {
      edits[key] = stripEditableArtifacts(edits[key]);
      changed = true;
    }
  });

  return changed;
}

function applyEditsToDOM(edits: Record<string, any>) {
  if (!edits || typeof edits !== 'object') return;
  const obsoleteStrings = [
    'Ngoài màn hình',
    'Explorations Outside the Screen',
    'FIELD NOTES & PERSPECTIVES',
    'GHI CHÉP & GÓC NHÌN',
    'FIELD NOTES',
    'Một vài lát cắt',
    'Tổng quan & Dự báo',
    'Overview & Forecast',
    'Giao dịch & Giỏ tiền',
    'Transactions & Jars',
    'bilingual-title-vi',
    'bilingual-en',
    'bilingual-vi',
    'bilingual-sub',
    'Learn Anything, Your Way — Nền tảng học tập',
    'Không giới hạn điều bạn có thể học — Learn Anything',
    'Hiểu tiền hôm nay. Nhìn thấy ngày mai. — Understand today\'s money',
    'LIBRARY · THƯ VIỆN',
    'Thư Viện · Library',
    'Outside the Screen',
    'EXPLORATIONS · OUTSIDE THE SCREEN',
  ];

  const obsoleteKeys = [
    'hero-sig-studio',
    'explorations-subtitle',
    'works-title',
    'synthesis-title',
    'contact-title',
    'tt-works-span-34',
    'tt-synthesis-div-47',
    'tt-loc-learn-modal-p-109',
  ];

  Object.entries(edits).forEach(([key, val]) => {
    // 1. Kiểm tra nếu khối bị xóa
    if (val && typeof val === 'object' && val.deleted) {
      const el = document.querySelector<HTMLElement>(`[data-edit-key="${key}"]`);
      if (el) el.remove();
      return;
    }

    // Never allow obsolete strings or keys to overwrite DOM
    const valStr = typeof val === 'string' ? val : (val?.html || JSON.stringify(val) || '');
    if (
      obsoleteStrings.some((s) => valStr.includes(s)) ||
      obsoleteKeys.some((k) => key === k || key.includes('explorations-subtitle')) ||
      key.startsWith('tt-synthesis-') || key.includes('synthesis')
    ) {
      return;
    }

    let el = document.querySelector<HTMLElement>(`[data-edit-key="${key}"]`);

    // 2. Chèn khối động nếu có insertAfter
    if (!el && val && typeof val === 'object' && val.insertAfter) {
      const prevEl = document.querySelector<HTMLElement>(`[data-edit-key="${val.insertAfter}"]`);
      if (prevEl && prevEl.parentElement) {
        const newEl = document.createElement(val.tagName || 'p');
        newEl.setAttribute('data-edit-key', key);
        prevEl.after(newEl);
        el = newEl;
      }
    }

    if (el) {
      if (el.tagName.toLowerCase() === 'img') {
        const src = typeof val === 'string' ? val : (val?.src || val?.html);
        if (src) (el as HTMLImageElement).src = src;
      } else if (typeof val === 'string') {
        el.innerHTML = stripEditableArtifacts(val);
      } else if (val && typeof val === 'object') {
        if (val.html !== undefined) el.innerHTML = stripEditableArtifacts(val.html);
        if (val.style) {
          Object.assign(el.style, val.style);
        }
      }
      el.removeAttribute('contenteditable');
      el.classList.remove('editable');
    }
  });

  // Strip any leftover contenteditable or editable class across whole document
  document.querySelectorAll<HTMLElement>('[contenteditable], .editable').forEach((node) => {
    node.removeAttribute('contenteditable');
    node.classList.remove('editable');
  });

  // Re-assert canonical header immediately after any DOM write
  enforceCanonicalExplorationsHeader();
}

// Restore saved edits on page load (synchronous localStorage first, then IndexedDB)
export function restoreSavedContent() {
  ensureStableEditKeys();

  // Enforce canonical title and eyebrow for Thư Viện section first
  enforceCanonicalExplorationsHeader();

  try {
    let saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      saved = localStorage.getItem('loc_portfolio_tiptap_v1') || localStorage.getItem('loc_portfolio_edits_v4') || localStorage.getItem('loc_portfolio_edits_v3');
    }
    if (saved) {
      const parsed = JSON.parse(saved);
      if (sanitizeEdits(parsed)) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        } catch {}
      }
      applyEditsToDOM(parsed);
      enforceCanonicalExplorationsHeader();
      console.info('[Tiptap] Restored persisted content from localStorage.');
    }
  } catch (e) {
    console.warn('[Tiptap] Failed to restore content from localStorage:', e);
  }

  // Also query IndexedDB in background to ensure quota or multi-tab persistence
  dbGetSetting<Record<string, any> | null>('tiptap_content', null)
    .then((dbEdits) => {
      if (dbEdits && typeof dbEdits === 'object' && Object.keys(dbEdits).length > 0) {
        if (sanitizeEdits(dbEdits)) {
          dbSetSetting('tiptap_content', dbEdits);
        }
        applyEditsToDOM(dbEdits);
        enforceCanonicalExplorationsHeader();
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(dbEdits));
        } catch {}
      }
    })
    .catch(() => {});
}

// Save all content to localStorage and IndexedDB
export function saveAllTiptapContent() {
  if (!isAdminAuthenticated()) {
    showToast('🔒 Bạn không có quyền lưu nội dung. Vui lòng đăng nhập quản trị.');
    return;
  }

  if (activeEditor && activeTargetEl) {
    const html = activeEditor.getHTML();
    activeTargetEl.innerHTML = html;
  }

  const edits: Record<string, { html?: string; src?: string; style?: Record<string, string>; insertAfter?: string; tagName?: string; deleted?: boolean }> = {};
  
  deletedNodeKeys.forEach((k) => {
    edits[k] = { deleted: true };
  });

  document.querySelectorAll<HTMLElement>('[data-edit-key]').forEach((el) => {
    const key = el.getAttribute('data-edit-key');
    if (key) {
      if (el.tagName.toLowerCase() === 'img') {
        edits[key] = { src: (el as HTMLImageElement).src };
      } else {
        const styleObj: Record<string, string> = {};
        if (el.style.fontSize) styleObj.fontSize = el.style.fontSize;
        if (el.style.color) styleObj.color = el.style.color;
        if (el.style.backgroundColor) styleObj.backgroundColor = el.style.backgroundColor;
        if (el.style.fontFamily) styleObj.fontFamily = el.style.fontFamily;
        if (el.style.textAlign) styleObj.textAlign = el.style.textAlign;
        if (el.style.lineHeight) styleObj.lineHeight = el.style.lineHeight;

        let htmlContent = el.innerHTML;
        const pm = el.querySelector<HTMLElement>('.ProseMirror');
        if (pm && activeEditor && activeTargetEl === el) {
          htmlContent = activeEditor.getHTML();
        }

        const insertAfter = el.getAttribute('data-insert-after') || undefined;

        edits[key] = {
          html: stripEditableArtifacts(htmlContent.trim()),
          style: Object.keys(styleObj).length > 0 ? styleObj : undefined,
          insertAfter,
          tagName: el.tagName.toLowerCase(),
        };
      }
    }
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
    dbSetSetting('tiptap_content', edits).catch(() => {});
    window.dispatchEvent(new CustomEvent('loc-save-all-requested'));

    if (typeof (window as any).saveData === 'function') {
      (window as any).saveData();
    } else {
      showToast('🎉 Đã lưu & xuất bản thành công! Website https://nguyenthanhloc.pages.dev đã được cập nhật.');
    }
  } catch (e) {
    console.error('[Tiptap] Save failed:', e);
    showToast('⚠️ Không thể lưu vào bộ nhớ tạm.');
  }
}

// Export content as JSON
export function exportTiptapContent() {
  if (!isAdminAuthenticated()) {
    showToast('🔒 Vui lòng đăng nhập quản trị để xuất nội dung.');
    return;
  }

  saveAllTiptapContent();
  const edits: Record<string, any> = {};
  document.querySelectorAll<HTMLElement>('[data-edit-key]').forEach((el) => {
    const key = el.getAttribute('data-edit-key');
    if (key) {
      edits[key] = {
        text: el.innerText.trim(),
        html: el.innerHTML,
        style: {
          fontSize: el.style.fontSize || undefined,
          color: el.style.color || undefined,
          textAlign: el.style.textAlign || undefined,
          lineHeight: el.style.lineHeight || undefined,
        },
      };
    }
  });

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(edits, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', 'loc-portfolio-tiptap-export.json');
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();

  showToast('📤 Tiptap: Đã xuất file loc-portfolio-tiptap-export.json!');
}

// Reset edits to initial state
export function resetTiptapContent() {
  if (!isAdminAuthenticated()) {
    showToast('🔒 Vui lòng đăng nhập quản trị để khôi phục nội dung.');
    return;
  }

  if (!confirm('Anh có chắc muốn xóa tất cả chỉnh sửa và khôi phục về nội dung mặc định của website không?')) {
    return;
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('loc_portfolio_tiptap_v1');
    localStorage.removeItem('loc_portfolio_edits_v4');
    localStorage.removeItem('loc_portfolio_edits_v3');
    showToast('🔄 Đang khôi phục nội dung gốc...');
    setTimeout(() => {
      window.location.reload();
    }, 700);
  } catch (e) {
    console.warn(e);
  }
}

// Cleanly attach Tiptap Editor instance to clicked element
function attachTiptapToElement(targetEl: HTMLElement) {
  if (activeTargetEl === targetEl && activeEditor) {
    return;
  }

  // Commit previous active editor
  if (activeEditor && activeTargetEl) {
    const prevHTML = activeEditor.getHTML();
    activeEditor.destroy();
    activeEditor = null;
    activeTargetEl.innerHTML = prevHTML;
    activeTargetEl.classList.remove('tiptap-active-node');
  }

  activeTargetEl = targetEl;
  targetEl.classList.add('tiptap-active-node');

  const bubbleMenuEl = document.getElementById('tiptap-bubble-menu') || undefined;
  const initialContent = targetEl.innerHTML;

  // Clear target so Tiptap ProseMirror mounts as sole child
  targetEl.innerHTML = '';

  activeEditor = new Editor({
    element: targetEl,
    extensions: getStandardExtensions(bubbleMenuEl),
    content: initialContent,
    autofocus: 'end',
    editable: true,
    onUpdate: () => {
      updateDockButtonStates();
    },
    onSelectionUpdate: () => {
      updateDockButtonStates();
    },
  });

  updateDockButtonStates();
}

// Update Active/Inactive states on dock buttons based on Tiptap state
function updateDockButtonStates() {
  if (!activeEditor) return;

  const isBold = activeEditor.isActive('bold');
  const isItalic = activeEditor.isActive('italic');
  const isUnderline = activeEditor.isActive('underline');
  const isStrike = activeEditor.isActive('strike');
  const isH1 = activeEditor.isActive('heading', { level: 1 });
  const isH2 = activeEditor.isActive('heading', { level: 2 });
  const isH3 = activeEditor.isActive('heading', { level: 3 });
  const isBulletList = activeEditor.isActive('bulletList');
  const isOrderedList = activeEditor.isActive('orderedList');
  const isTaskList = activeEditor.isActive('taskList');
  const isBlockquote = activeEditor.isActive('blockquote');
  const isHighlight = activeEditor.isActive('highlight');

  const dock = document.getElementById('visual-editor-dock');
  if (!dock) return;

  dock.querySelector('[data-tt-action="bold"]')?.classList.toggle('active', isBold);
  dock.querySelector('[data-tt-action="italic"]')?.classList.toggle('active', isItalic);
  dock.querySelector('[data-tt-action="underline"]')?.classList.toggle('active', isUnderline);
  dock.querySelector('[data-tt-action="strike"]')?.classList.toggle('active', isStrike);
  dock.querySelector('[data-tt-action="h1"]')?.classList.toggle('active', isH1);
  dock.querySelector('[data-tt-action="h2"]')?.classList.toggle('active', isH2);
  dock.querySelector('[data-tt-action="h3"]')?.classList.toggle('active', isH3);
  dock.querySelector('[data-tt-action="bulletList"]')?.classList.toggle('active', isBulletList);
  dock.querySelector('[data-tt-action="orderedList"]')?.classList.toggle('active', isOrderedList);
  dock.querySelector('[data-tt-action="taskList"]')?.classList.toggle('active', isTaskList);
  dock.querySelector('[data-tt-action="blockquote"]')?.classList.toggle('active', isBlockquote);
  dock.querySelector('[data-tt-action="highlight"]')?.classList.toggle('active', isHighlight);

  // Floating bubble states
  const bubble = document.getElementById('tiptap-bubble-menu');
  if (bubble) {
    bubble.querySelector('[data-tt-action="bold"]')?.classList.toggle('active', isBold);
    bubble.querySelector('[data-tt-action="italic"]')?.classList.toggle('active', isItalic);
    bubble.querySelector('[data-tt-action="underline"]')?.classList.toggle('active', isUnderline);
    bubble.querySelector('[data-tt-action="strike"]')?.classList.toggle('active', isStrike);
    bubble.querySelector('[data-tt-action="highlight"]')?.classList.toggle('active', isHighlight);
  }
}

// Setup Tiptap Floating Bubble Menu in DOM
function setupBubbleMenuDOM(): HTMLElement {
  let menu = document.getElementById('tiptap-bubble-menu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'tiptap-bubble-menu';
    menu.className = 'tiptap-bubble-menu';
    menu.style.position = 'fixed';
    menu.style.top = '-9999px';
    menu.style.left = '-9999px';
    menu.style.display = 'none';
    menu.innerHTML = `
      <div class="tt-bubble-group">
        <button type="button" class="tt-btn" data-tt-action="bold" title="In đậm (Cmd+B)"><strong>B</strong></button>
        <button type="button" class="tt-btn" data-tt-action="italic" title="In nghiêng (Cmd+I)"><em>I</em></button>
        <button type="button" class="tt-btn" data-tt-action="underline" title="Gạch chân (Cmd+U)"><u>U</u></button>
        <button type="button" class="tt-btn" data-tt-action="strike" title="Gạch ngang"><s>S</s></button>
        <button type="button" class="tt-btn" data-tt-action="highlight" title="Dạ quang">🖍️</button>
      </div>

      <div class="tt-sep"></div>

      <div class="tt-bubble-group">
        <button type="button" class="tt-btn" data-tt-action="font-down" title="Giảm cỡ chữ">A−</button>
        <button type="button" class="tt-btn" data-tt-action="font-up" title="Tăng cỡ chữ">A+</button>
      </div>

      <div class="tt-sep"></div>

      <div class="tt-bubble-group">
        <button type="button" class="tt-color-dot" data-color="#B88E38" style="background:#B88E38;" title="Vàng Hoàng Gia"></button>
        <button type="button" class="tt-color-dot" data-color="#1C1A17" style="background:#1C1A17;" title="Mực Đen"></button>
        <button type="button" class="tt-color-dot" data-color="#FAF7F2" style="background:#FAF7F2; border:1px solid #777;" title="Trắng Kem"></button>
        <button type="button" class="tt-color-dot" data-color="#E11D48" style="background:#E11D48;" title="Đỏ Điểm Nhấn"></button>
      </div>

      <div class="tt-sep"></div>

      <div class="tt-bubble-group">
        <button type="button" class="tt-btn" data-tt-action="align-left" title="Căn trái">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 6h16M4 12h10M4 18h14"/></svg>
        </button>
        <button type="button" class="tt-btn" data-tt-action="align-center" title="Căn giữa">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 6h16M7 12h10M5 18h14"/></svg>
        </button>
      </div>

      <div class="tt-sep"></div>

      <div class="tt-bubble-group">
        <label class="tt-bubble-color-label" title="Tự chọn màu chữ" style="position:relative;display:inline-flex;align-items:center;cursor:pointer;padding:0 3px;">
          <input type="color" id="tt-bubble-custom-color" value="#B88E38" style="position:absolute;opacity:0;width:0;height:0;pointer-events:none;" />
          <span style="font-size:12px;">🎨</span>
        </label>
        <button type="button" class="tt-btn" data-tt-action="delete-node" title="Xóa khối này" style="color:#ef4444;">🗑️</button>
      </div>
    `;
    document.body.appendChild(menu);

    // Bind bubble actions
    menu.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => e.preventDefault());
    });

    menu.querySelector('[data-tt-action="bold"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleBold().run());
    menu.querySelector('[data-tt-action="italic"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleItalic().run());
    menu.querySelector('[data-tt-action="underline"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleUnderline().run());
    menu.querySelector('[data-tt-action="strike"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleStrike().run());
    menu.querySelector('[data-tt-action="highlight"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleHighlight({ color: '#fef08a' }).run());

    menu.querySelector('[data-tt-action="font-down"]')?.addEventListener('click', () => adjustActiveFontSize(-2));
    menu.querySelector('[data-tt-action="font-up"]')?.addEventListener('click', () => adjustActiveFontSize(2));

    menu.querySelector('[data-tt-action="align-left"]')?.addEventListener('click', () => activeEditor?.chain().focus().setTextAlign('left').run());
    menu.querySelector('[data-tt-action="align-center"]')?.addEventListener('click', () => activeEditor?.chain().focus().setTextAlign('center').run());

    menu.querySelectorAll<HTMLElement>('.tt-color-dot').forEach((btn) => {
      btn.addEventListener('click', () => {
        const color = btn.getAttribute('data-color');
        if (color && activeEditor) {
          activeEditor.chain().focus().setColor(color).run();
        }
      });
    });

    menu.querySelector<HTMLInputElement>('#tt-bubble-custom-color')?.addEventListener('input', (e) => {
      const color = (e.target as HTMLInputElement).value;
      if (color && activeEditor) {
        activeEditor.chain().focus().setColor(color).run();
      }
    });

    menu.querySelector('[data-tt-action="delete-node"]')?.addEventListener('click', () => {
      deleteCurrentBlock();
    });
  }

  return menu;
}

// Adjust font size on active Tiptap selection or element
function adjustActiveFontSize(delta: number) {
  if (!activeEditor) return;

  const { view, state } = activeEditor;
  const { from, to } = state.selection;

  let currentSize = 16;
  try {
    const domNode = view.domAtPos(from).node;
    const parentEl = domNode.nodeType === Node.ELEMENT_NODE ? (domNode as HTMLElement) : domNode.parentElement;
    if (parentEl) {
      currentSize = parseFloat(window.getComputedStyle(parentEl).fontSize) || 16;
    }
  } catch {
    currentSize = 16;
  }

  const targetSize = Math.max(10, Math.min(84, Math.round(currentSize + delta)));

  if (from !== to) {
    activeEditor.chain().focus().setFontSize(`${targetSize}px`).run();
  } else if (activeTargetEl) {
    activeTargetEl.style.fontSize = `${targetSize}px`;
  }

  showToast(`🔠 Tiptap Cỡ chữ: ${targetSize}px`);
}

// Setup File Input for Tiptap Image Insert
function setupImageUploadInput() {
  imageUploadInput = document.createElement('input');
  imageUploadInput.type = 'file';
  imageUploadInput.accept = 'image/*';
  imageUploadInput.style.display = 'none';
  document.body.appendChild(imageUploadInput);

  imageUploadInput.addEventListener('change', () => {
    const file = imageUploadInput?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (activeEditor) {
        activeEditor.chain().focus().setImage({ src: dataUrl }).run();
        showToast('🖼️ Tiptap: Đã chèn ảnh vào văn bản!');
      } else if (modalComposerEditor) {
        modalComposerEditor.chain().focus().setImage({ src: dataUrl }).run();
        showToast('🖼️ Tiptap Composer: Đã chèn ảnh!');
      }
    };
    reader.readAsDataURL(file);
    if (imageUploadInput) imageUploadInput.value = '';
  });
}

// Block Management Helpers (Add paragraph, Add heading, Duplicate, Delete)
function addParagraphBlock() {
  if (!activeTargetEl) {
    showToast('⚠️ Vui lòng nhấp chọn một vị trí hoặc đoạn văn trên web trước.');
    return;
  }
  const newP = document.createElement('p');
  newP.className = 'editable text-body';
  const newKey = `tt-user-p-${Date.now()}`;
  newP.setAttribute('data-edit-key', newKey);
  newP.setAttribute('data-editable-active', 'true');
  const prevKey = activeTargetEl.getAttribute('data-edit-key') || '';
  if (prevKey) newP.setAttribute('data-insert-after', prevKey);
  newP.innerHTML = 'Nội dung đoạn văn mới được thêm vào trang. Nhấp vào đây để chỉnh sửa nội dung này...';
  
  activeTargetEl.after(newP);
  attachTiptapToElement(newP);
  showToast('➕ Đã thêm đoạn văn mới! Bấm "Lưu" để cập nhật lên web.');
}

function addHeadingBlock() {
  if (!activeTargetEl) {
    showToast('⚠️ Vui lòng nhấp chọn một vị trí trên web trước.');
    return;
  }
  const newH = document.createElement('h3');
  newH.className = 'editable title-sub';
  const newKey = `tt-user-h-${Date.now()}`;
  newH.setAttribute('data-edit-key', newKey);
  newH.setAttribute('data-editable-active', 'true');
  const prevKey = activeTargetEl.getAttribute('data-edit-key') || '';
  if (prevKey) newH.setAttribute('data-insert-after', prevKey);
  newH.innerHTML = 'Tiêu đề mới';
  
  activeTargetEl.after(newH);
  attachTiptapToElement(newH);
  showToast('➕ Đã thêm tiêu đề mới! Bấm "Lưu" để cập nhật lên web.');
}

function duplicateCurrentBlock() {
  if (!activeTargetEl) {
    showToast('⚠️ Vui lòng nhấp chọn một khối để nhân bản.');
    return;
  }
  const clone = activeTargetEl.cloneNode(true) as HTMLElement;
  const newKey = `tt-user-dup-${Date.now()}`;
  clone.setAttribute('data-edit-key', newKey);
  clone.setAttribute('data-editable-active', 'true');
  const prevKey = activeTargetEl.getAttribute('data-edit-key') || '';
  if (prevKey) clone.setAttribute('data-insert-after', prevKey);
  clone.classList.remove('tiptap-active-node');
  
  activeTargetEl.after(clone);
  attachTiptapToElement(clone);
  showToast('📋 Đã nhân bản khối thành công!');
}

function deleteCurrentBlock() {
  if (!activeTargetEl) {
    showToast('⚠️ Vui lòng nhấp chọn khối cần xóa.');
    return;
  }
  const key = activeTargetEl.getAttribute('data-edit-key');
  if (key) {
    deletedNodeKeys.add(key);
  }
  const target = activeTargetEl;
  if (activeEditor) {
    activeEditor.destroy();
    activeEditor = null;
  }
  activeTargetEl = null;
  target.remove();
  showToast('🗑️ Đã xóa khối khỏi trang. Nhớ bấm "Lưu thay đổi" để cập nhật lên web chính!');
}

// Global state for dock position and collapse
let savedDockCoords: { x: number; y: number } | null = null;
let isDockCollapsed = false;

// Setup Master Tiptap Control Dock
function setupTiptapDock() {
  if (document.getElementById('visual-editor-dock')) return;

  const dock = document.createElement('div');
  dock.id = 'visual-editor-dock';
  dock.className = 'visual-editor-dock hidden';
  dock.setAttribute('role', 'region');
  dock.setAttribute('aria-label', 'Trình soạn thảo Tiptap trực quan');

  if (savedDockCoords) {
    dock.style.transform = 'none';
    dock.style.bottom = 'auto';
    dock.style.left = `${savedDockCoords.x}px`;
    dock.style.top = `${savedDockCoords.y}px`;
  }

  if (isDockCollapsed) {
    dock.classList.add('is-collapsed');
  }

  dock.innerHTML = `
    <div class="editor-dock-container">
      <!-- Drag Bar & Collapse Handle -->
      <div class="editor-dock-drag-bar" id="tt-dock-drag-bar" title="Nhấp giữ và kéo để di chuyển thanh công cụ">
        <div class="editor-dock-drag-handle">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style="opacity: 0.65;"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
          <span class="editor-dock-drag-label">Kéo để di chuyển</span>
        </div>
        <div class="editor-dock-header-controls">
          <button type="button" class="editor-dock-ctrl-btn" id="tt-dock-collapse-btn" title="Thu nhỏ / Mở rộng thanh công cụ">
            <svg class="icon-dock-toggle" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        </div>
      </div>

      <!-- Tiptap Studio Toolbar -->
      <div class="editor-format-bar">
        <!-- Brand / Engine Pill -->
        <div class="tiptap-engine-pill" title="Trình chỉnh sửa được cung cấp bởi Tiptap (GitHub: ueberdosis/tiptap)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M4 4h16v4h-6v12h-4V8H4V4z"/></svg>
          <span>Tiptap v3 Engine</span>
        </div>

        <div class="editor-tool-sep"></div>

        <!-- Font Family Selector (Kiểu chữ) -->
        <div class="editor-tool-group" title="Kiểu chữ (Phông chữ)">
          <select id="tt-font-family-select" class="editor-select-font" title="Chọn kiểu chữ">
            <option value="">Kiểu chữ (Mặc định)</option>
            <option value="sans">Hiện đại (Sans-serif)</option>
            <option value="cophong">Cổ phong (Thư pháp / Serif)</option>
            <option value="editorial">Biên tập (Editorial Serif)</option>
            <option value="mono">Kỹ thuật (Monospace)</option>
          </select>
        </div>

        <div class="editor-tool-sep"></div>

        <!-- Typography Marks -->
        <div class="editor-tool-group" title="Kiểu chữ cơ bản">
          <button type="button" class="editor-tool-btn" data-tt-action="bold" title="In đậm (Cmd+B)"><strong>B</strong></button>
          <button type="button" class="editor-tool-btn" data-tt-action="italic" title="In nghiêng (Cmd+I)"><em>I</em></button>
          <button type="button" class="editor-tool-btn" data-tt-action="underline" title="Gạch chân (Cmd+U)"><u>U</u></button>
          <button type="button" class="editor-tool-btn" data-tt-action="strike" title="Gạch ngang"><s>S</s></button>
          <button type="button" class="editor-tool-btn" data-tt-action="highlight" title="Dạ quang">🖍️</button>
        </div>

        <div class="editor-tool-sep"></div>

        <!-- Headings & Structure -->
        <div class="editor-tool-group" title="Tiêu đề & Khối">
          <button type="button" class="editor-tool-btn" data-tt-action="h1" title="Tiêu đề H1">H1</button>
          <button type="button" class="editor-tool-btn" data-tt-action="h2" title="Tiêu đề H2">H2</button>
          <button type="button" class="editor-tool-btn" data-tt-action="h3" title="Tiêu đề H3">H3</button>
          <button type="button" class="editor-tool-btn" data-tt-action="bulletList" title="Danh sách chấm">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
          <button type="button" class="editor-tool-btn" data-tt-action="orderedList" title="Danh sách số">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/></svg>
          </button>
          <button type="button" class="editor-tool-btn" data-tt-action="taskList" title="Danh sách công việc (Checkbox)">☑️</button>
          <button type="button" class="editor-tool-btn" data-tt-action="blockquote" title="Khối trích dẫn">”</button>
        </div>

        <div class="editor-tool-sep"></div>

        <!-- Font Size Scale & Selector -->
        <div class="editor-tool-group" title="Cỡ chữ">
          <button type="button" class="editor-tool-btn editor-font-btn" data-tt-action="font-down" title="Giảm cỡ chữ (−2px)">A−</button>
          <button type="button" class="editor-tool-btn editor-font-btn" data-tt-action="font-up" title="Tăng cỡ chữ (+2px)">A+</button>
          <select id="tt-font-size-select" class="editor-select-size" title="Chọn nhanh cỡ chữ">
            <option value="">Cỡ chữ</option>
            <option value="12px">12px</option>
            <option value="14px">14px</option>
            <option value="16px">16px</option>
            <option value="18px">18px</option>
            <option value="20px">20px</option>
            <option value="24px">24px</option>
            <option value="28px">28px</option>
            <option value="32px">32px</option>
            <option value="40px">40px</option>
            <option value="48px">48px</option>
            <option value="56px">56px</option>
            <option value="64px">64px</option>
          </select>
        </div>

        <div class="editor-tool-sep"></div>

        <!-- Alignments -->
        <div class="editor-tool-group" title="Căn lề">
          <button type="button" class="editor-tool-btn" data-tt-action="align-left" title="Căn trái">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 6h16M4 12h10M4 18h14"/></svg>
          </button>
          <button type="button" class="editor-tool-btn" data-tt-action="align-center" title="Căn giữa">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 6h16M7 12h10M5 18h14"/></svg>
          </button>
          <button type="button" class="editor-tool-btn" data-tt-action="align-right" title="Căn phải">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 6h16M10 12h10M6 18h14"/></svg>
          </button>
          <button type="button" class="editor-tool-btn" data-tt-action="line-height" title="Giãn dòng dọc">↕️ Giãn dòng</button>
        </div>

        <div class="editor-tool-sep"></div>

        <!-- Color Swatches & Native Color Pickers (Tô màu chữ) -->
        <div class="editor-tool-group" title="Tô màu chữ">
          <button type="button" class="editor-color-btn" data-color="#B88E38" style="background:#B88E38;" title="Vàng Hoàng gia"></button>
          <button type="button" class="editor-color-btn" data-color="#1C1A17" style="background:#1C1A17;" title="Mực Đen"></button>
          <button type="button" class="editor-color-btn" data-color="#FAF7F2" style="background:#FAF7F2; border:1px solid #777;" title="Trắng Kem"></button>
          <button type="button" class="editor-color-btn" data-color="#E11D48" style="background:#E11D48;" title="Đỏ Chu Sa"></button>
          <button type="button" class="editor-color-btn" data-color="#10B981" style="background:#10B981;" title="Xanh Ngọc"></button>
          <button type="button" class="editor-color-btn" data-color="#3B82F6" style="background:#3B82F6;" title="Xanh Coban"></button>
          <label class="editor-color-picker-label" title="Tự chọn màu chữ">
            <input type="color" id="tt-custom-text-color" value="#B88E38" class="editor-color-picker-input" />
            <span class="editor-color-picker-badge">🎨 Màu chữ</span>
          </label>
        </div>

        <div class="editor-tool-sep"></div>

        <!-- Highlight & Background Color (Tô màu nền / Dạ quang) -->
        <div class="editor-tool-group" title="Tô màu nền / Dạ quang">
          <button type="button" class="editor-color-btn" data-bg-color="#fef08a" style="background:#fef08a;" title="Dạ quang Vàng"></button>
          <button type="button" class="editor-color-btn" data-bg-color="#bbf7d0" style="background:#bbf7d0;" title="Dạ quang Xanh lá"></button>
          <button type="button" class="editor-color-btn" data-bg-color="#bfdbfe" style="background:#bfdbfe;" title="Dạ quang Xanh dương"></button>
          <button type="button" class="editor-color-btn" data-bg-color="#fbcfe8" style="background:#fbcfe8;" title="Dạ quang Hồng"></button>
          <label class="editor-color-picker-label" title="Tự chọn màu nền">
            <input type="color" id="tt-custom-bg-color" value="#fef08a" class="editor-color-picker-input" />
            <span class="editor-color-picker-badge">🖍️ Nền</span>
          </label>
        </div>

        <div class="editor-tool-sep"></div>

        <!-- Block Management (Quản lý khối trên trang) -->
        <div class="editor-tool-group" title="Quản lý khối (Thêm / Bớt / Nhân bản / Xóa)">
          <button type="button" class="editor-tool-btn editor-insert-btn" data-tt-action="add-paragraph" title="Thêm một đoạn văn mới bên dưới">+ Đoạn văn</button>
          <button type="button" class="editor-tool-btn editor-insert-btn" data-tt-action="add-heading" title="Thêm một tiêu đề mới bên dưới">+ Tiêu đề</button>
          <button type="button" class="editor-tool-btn editor-insert-btn" data-tt-action="duplicate-node" title="Nhân bản khối đang chọn">📋 Nhân bản</button>
          <button type="button" class="editor-tool-btn editor-delete-btn" data-tt-action="delete-node" title="Xóa khối đang chọn khỏi trang">🗑️ Xóa khối</button>
          <button type="button" class="editor-tool-btn" data-tt-action="insert-image" title="Đổi / Chèn ảnh từ máy tính">🖼️ Đổi ảnh</button>
          <button type="button" class="editor-tool-btn" data-tt-action="clear-format" title="Xóa định dạng (Reset)">🧹 Xóa định dạng</button>
          <button type="button" class="editor-tool-btn editor-insert-btn" data-tt-action="composer-open" title="Mở Trình Soạn Bài Tiptap Chuyên Sâu">✨ Soạn thảo Pro</button>
        </div>

        <div class="editor-tool-sep"></div>

        <!-- History: Undo / Redo -->
        <div class="editor-tool-group" title="Lịch sử">
          <button type="button" class="editor-tool-btn" data-tt-action="undo" title="Hoàn tác (Cmd+Z)">↩</button>
          <button type="button" class="editor-tool-btn" data-tt-action="redo" title="Làm lại (Cmd+Shift+Z)">↪</button>
        </div>
      </div>

      <!-- Bottom Meta & Actions Row -->
      <div class="editor-dock-bottom-row">
        <div class="editor-dock-status">
          <span class="editor-status-dot"></span>
          <span class="editor-status-title">Tiptap Visual Editor Active</span>
          <span class="editor-status-hint">(Nhấp vào bất kỳ đoạn chữ nào để kích hoạt Tiptap)</span>
        </div>

        <div class="editor-dock-actions">
          <button type="button" class="editor-btn editor-btn-save" id="tt-save-btn" title="Lưu và xuất bản ngay lên web chính https://nguyenthanhloc.pages.dev">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            <span>💾 Lưu &amp; Xuất bản lên web chính</span>
          </button>
          <button type="button" class="editor-btn editor-btn-export" id="tt-export-btn" title="Xuất file JSON">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Xuất file</span>
          </button>
          <button type="button" class="editor-btn editor-btn-reset" id="tt-reset-btn" title="Đặt lại gốc">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            <span>Đặt lại gốc</span>
          </button>
          <button type="button" class="editor-btn editor-btn-close" id="tt-close-btn" title="Thoát chế độ sửa">
            <span>✕ Thoát</span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(dock);

  // Prevent focus stealing on button mousedown
  dock.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('mousedown', (e) => e.preventDefault());
  });

  // Font family selector change
  const fontSelect = dock.querySelector<HTMLSelectElement>('#tt-font-family-select');
  fontSelect?.addEventListener('change', () => {
    const val = fontSelect.value;
    const fontCss = FONT_MAP[val] || '';
    if (activeTargetEl) {
      activeTargetEl.style.fontFamily = fontCss;
      showToast(`🔤 Kiểu chữ: ${val ? fontSelect.options[fontSelect.selectedIndex].text : 'Mặc định'}`);
    }
  });

  // Font size selector change
  const sizeSelect = dock.querySelector<HTMLSelectElement>('#tt-font-size-select');
  sizeSelect?.addEventListener('change', () => {
    const sizeVal = sizeSelect.value;
    if (!sizeVal) return;
    if (activeEditor && !activeEditor.state.selection.empty) {
      activeEditor.chain().focus().setFontSize(sizeVal).run();
    } else if (activeTargetEl) {
      activeTargetEl.style.fontSize = sizeVal;
    }
    showToast(`🔠 Cỡ chữ: ${sizeVal}`);
  });

  // Custom text color input
  dock.querySelector<HTMLInputElement>('#tt-custom-text-color')?.addEventListener('input', (e) => {
    const col = (e.target as HTMLInputElement).value;
    if (activeEditor && !activeEditor.state.selection.empty) {
      activeEditor.chain().focus().setColor(col).run();
    } else if (activeTargetEl) {
      activeTargetEl.style.color = col;
    }
    showToast(`🎨 Màu chữ: ${col}`);
  });

  // Custom background color input
  dock.querySelector<HTMLInputElement>('#tt-custom-bg-color')?.addEventListener('input', (e) => {
    const bgCol = (e.target as HTMLInputElement).value;
    if (activeEditor && !activeEditor.state.selection.empty) {
      activeEditor.chain().focus().toggleHighlight({ color: bgCol }).run();
    } else if (activeTargetEl) {
      activeTargetEl.style.backgroundColor = bgCol;
      activeTargetEl.style.borderRadius = '4px';
      if (!activeTargetEl.style.padding) activeTargetEl.style.padding = '0.15em 0.35em';
    }
    showToast(`🖍️ Màu nền: ${bgCol}`);
  });

  // Background color swatches
  dock.querySelectorAll<HTMLElement>('[data-bg-color]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const bgCol = btn.getAttribute('data-bg-color');
      if (bgCol) {
        if (activeEditor && !activeEditor.state.selection.empty) {
          activeEditor.chain().focus().toggleHighlight({ color: bgCol }).run();
        } else if (activeTargetEl) {
          activeTargetEl.style.backgroundColor = bgCol;
          activeTargetEl.style.borderRadius = '4px';
          if (!activeTargetEl.style.padding) activeTargetEl.style.padding = '0.15em 0.35em';
        }
        showToast(`🖍️ Màu nền: ${bgCol}`);
      }
    });
  });

  // Block management actions
  dock.querySelector('[data-tt-action="add-paragraph"]')?.addEventListener('click', addParagraphBlock);
  dock.querySelector('[data-tt-action="add-heading"]')?.addEventListener('click', addHeadingBlock);
  dock.querySelector('[data-tt-action="duplicate-node"]')?.addEventListener('click', duplicateCurrentBlock);
  dock.querySelector('[data-tt-action="delete-node"]')?.addEventListener('click', deleteCurrentBlock);

  // Tiptap Command bindings
  dock.querySelector('[data-tt-action="bold"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleBold().run());
  dock.querySelector('[data-tt-action="italic"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleItalic().run());
  dock.querySelector('[data-tt-action="underline"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleUnderline().run());
  dock.querySelector('[data-tt-action="strike"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleStrike().run());
  dock.querySelector('[data-tt-action="highlight"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleHighlight({ color: '#fef08a' }).run());

  dock.querySelector('[data-tt-action="h1"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleHeading({ level: 1 }).run());
  dock.querySelector('[data-tt-action="h2"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleHeading({ level: 2 }).run());
  dock.querySelector('[data-tt-action="h3"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleHeading({ level: 3 }).run());

  dock.querySelector('[data-tt-action="bulletList"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleBulletList().run());
  dock.querySelector('[data-tt-action="orderedList"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleOrderedList().run());
  dock.querySelector('[data-tt-action="taskList"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleTaskList().run());
  dock.querySelector('[data-tt-action="blockquote"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleBlockquote().run());

  dock.querySelector('[data-tt-action="font-down"]')?.addEventListener('click', () => adjustActiveFontSize(-2));
  dock.querySelector('[data-tt-action="font-up"]')?.addEventListener('click', () => adjustActiveFontSize(2));

  dock.querySelector('[data-tt-action="align-left"]')?.addEventListener('click', () => activeEditor?.chain().focus().setTextAlign('left').run());
  dock.querySelector('[data-tt-action="align-center"]')?.addEventListener('click', () => activeEditor?.chain().focus().setTextAlign('center').run());
  dock.querySelector('[data-tt-action="align-right"]')?.addEventListener('click', () => activeEditor?.chain().focus().setTextAlign('right').run());

  dock.querySelector('[data-tt-action="line-height"]')?.addEventListener('click', () => {
    if (!activeTargetEl) {
      showToast('⚠️ Nhấp vào đoạn văn để giãn dòng.');
      return;
    }
    const current = activeTargetEl.style.lineHeight;
    let next = '1.8';
    if (current === '1.8') next = '2.2';
    else if (current === '2.2') next = '1.45';
    activeTargetEl.style.lineHeight = next;
    showToast(`↕️ Giãn dòng: ${next}`);
  });

  dock.querySelector('[data-tt-action="insert-image"]')?.addEventListener('click', () => {
    imageUploadInput?.click();
  });

  dock.querySelector('[data-tt-action="hr"]')?.addEventListener('click', () => {
    activeEditor?.chain().focus().setHorizontalRule().run();
    showToast('➖ Đã chèn vạch phân cách ngang!');
  });

  dock.querySelector('[data-tt-action="composer-open"]')?.addEventListener('click', () => {
    openTiptapComposerModal();
  });

  dock.querySelectorAll<HTMLElement>('.editor-color-btn[data-color]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const color = btn.getAttribute('data-color');
      if (color && activeEditor) {
        activeEditor.chain().focus().setColor(color).run();
        showToast(`🎨 Tiptap: Đã áp dụng màu ${color}`);
      }
    });
  });

  dock.querySelector('[data-tt-action="clear-format"]')?.addEventListener('click', () => {
    activeEditor?.chain().focus().unsetAllMarks().clearNodes().run();
    if (activeTargetEl) {
      activeTargetEl.style.fontSize = '';
      activeTargetEl.style.color = '';
      activeTargetEl.style.backgroundColor = '';
      activeTargetEl.style.fontFamily = '';
      activeTargetEl.style.textAlign = '';
      activeTargetEl.style.lineHeight = '';
    }
    showToast('🧹 Đã xóa toàn bộ định dạng!');
  });

  dock.querySelector('[data-tt-action="undo"]')?.addEventListener('click', () => activeEditor?.chain().focus().undo().run());
  dock.querySelector('[data-tt-action="redo"]')?.addEventListener('click', () => activeEditor?.chain().focus().redo().run());

  // Save, Export, Reset, Close
  document.getElementById('tt-save-btn')?.addEventListener('click', saveAllTiptapContent);
  document.getElementById('tt-export-btn')?.addEventListener('click', exportTiptapContent);
  document.getElementById('tt-reset-btn')?.addEventListener('click', resetTiptapContent);
  document.getElementById('tt-close-btn')?.addEventListener('click', () => toggleTiptapEditMode(false));

  // Enable Smooth Dragging & Collapse
  setupDockDragging(dock);
}

// Setup Dragging & Collapsing for the Dock
function setupDockDragging(dock: HTMLElement) {
  const dragBar = dock.querySelector<HTMLElement>('#tt-dock-drag-bar');
  const collapseBtn = dock.querySelector<HTMLButtonElement>('#tt-dock-collapse-btn');

  // Collapse / Expand Toggle
  collapseBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    isDockCollapsed = !isDockCollapsed;
    dock.classList.toggle('is-collapsed', isDockCollapsed);
    const icon = collapseBtn.querySelector('.icon-dock-toggle');
    if (icon) {
      icon.innerHTML = isDockCollapsed
        ? '<path d="m18 15-6-6-6 6"/>'
        : '<path d="m6 9 6 6 6-6"/>';
    }
  });

  // Dragging logic
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  const onPointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, [data-tt-action], .editor-color-btn')) {
      return;
    }

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const rect = dock.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    dock.classList.add('is-dragging');
    dock.style.transform = 'none';
    dock.style.bottom = 'auto';
    dock.style.left = `${initialLeft}px`;
    dock.style.top = `${initialTop}px`;

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    let newX = initialLeft + deltaX;
    let newY = initialTop + deltaY;

    const minX = 8;
    const maxX = window.innerWidth - dock.offsetWidth - 8;
    const minY = 8;
    const maxY = window.innerHeight - dock.offsetHeight - 8;

    newX = Math.max(minX, Math.min(newX, Math.max(minX, maxX)));
    newY = Math.max(minY, Math.min(newY, Math.max(minY, maxY)));

    dock.style.left = `${newX}px`;
    dock.style.top = `${newY}px`;

    savedDockCoords = { x: newX, y: newY };
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!isDragging) return;
    isDragging = false;
    dock.classList.remove('is-dragging');
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  if (dragBar) {
    dragBar.addEventListener('pointerdown', onPointerDown);
    dragBar.addEventListener('pointermove', onPointerMove);
    dragBar.addEventListener('pointerup', onPointerUp);
    dragBar.addEventListener('pointercancel', onPointerUp);
  }
}

// Fullscreen Tiptap Studio Pro Composer Modal
function openTiptapComposerModal() {
  let modal = document.getElementById('tiptap-composer-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'tiptap-composer-modal';
    modal.className = 'tiptap-composer-modal';
    modal.innerHTML = `
      <div class="tiptap-composer-backdrop"></div>
      <div class="tiptap-composer-window">
        <div class="tiptap-composer-header">
          <div class="tiptap-composer-title-group">
            <span class="tiptap-badge">Tiptap Studio Pro</span>
            <h3>Trình Soạn Thảo Văn Bản Toàn Năng (ProseMirror Engine)</h3>
          </div>
          <button type="button" class="tiptap-composer-close" aria-label="Đóng">✕</button>
        </div>

        <div class="tiptap-composer-toolbar">
          <button type="button" class="tt-tool-btn" data-cm="bold"><strong>B</strong></button>
          <button type="button" class="tt-tool-btn" data-cm="italic"><em>I</em></button>
          <button type="button" class="tt-tool-btn" data-cm="underline"><u>U</u></button>
          <button type="button" class="tt-tool-btn" data-cm="strike"><s>S</s></button>
          <button type="button" class="tt-tool-btn" data-cm="highlight">🖍️ Dạ quang</button>
          <div class="tt-sep"></div>
          <button type="button" class="tt-tool-btn" data-cm="h1">H1</button>
          <button type="button" class="tt-tool-btn" data-cm="h2">H2</button>
          <button type="button" class="tt-tool-btn" data-cm="h3">H3</button>
          <div class="tt-sep"></div>
          <button type="button" class="tt-tool-btn" data-cm="bullet">Bullet</button>
          <button type="button" class="tt-tool-btn" data-cm="number">Number</button>
          <button type="button" class="tt-tool-btn" data-cm="task">☑️ Task</button>
          <button type="button" class="tt-tool-btn" data-cm="quote">Quote</button>
          <button type="button" class="tt-tool-btn" data-cm="image">🖼️ Chèn ảnh</button>
          <button type="button" class="tt-tool-btn" data-cm="hr">— Divider</button>
          <div class="tt-sep"></div>
          <button type="button" class="tt-tool-btn" data-cm="undo">↩ Undo</button>
          <button type="button" class="tt-tool-btn" data-cm="redo">↪ Redo</button>
        </div>

        <div class="tiptap-composer-canvas" id="tiptap-composer-canvas"></div>

        <div class="tiptap-composer-footer">
          <div class="tiptap-composer-meta">
            <span class="tiptap-composer-count" id="tiptap-composer-count">0 từ · 0 ký tự</span>
          </div>
          <div class="tiptap-composer-actions">
            <button type="button" class="btn btn-secondary tiptap-composer-cancel">Hủy</button>
            <button type="button" class="btn btn-primary tiptap-composer-apply">Áp dụng vào phần đang chọn</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.tiptap-composer-close')?.addEventListener('click', closeTiptapComposerModal);
    modal.querySelector('.tiptap-composer-cancel')?.addEventListener('click', closeTiptapComposerModal);
    modal.querySelector('.tiptap-composer-backdrop')?.addEventListener('click', closeTiptapComposerModal);

    modal.querySelector('.tiptap-composer-apply')?.addEventListener('click', () => {
      if (modalComposerEditor && activeTargetEl) {
        const html = modalComposerEditor.getHTML();
        activeTargetEl.innerHTML = html;
        if (activeEditor) {
          activeEditor.commands.setContent(html);
        }
        saveAllTiptapContent();
        showToast('✨ Đã áp dụng văn bản từ Tiptap Studio!');
        closeTiptapComposerModal();
      } else {
        showToast('⚠️ Hãy nhấp vào một vị trí trên trang web để chèn nội dung này vào.');
      }
    });

    // Tool bindings
    modal.querySelector('[data-cm="bold"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().toggleBold().run());
    modal.querySelector('[data-cm="italic"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().toggleItalic().run());
    modal.querySelector('[data-cm="underline"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().toggleUnderline().run());
    modal.querySelector('[data-cm="strike"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().toggleStrike().run());
    modal.querySelector('[data-cm="highlight"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().toggleHighlight({ color: '#fef08a' }).run());
    modal.querySelector('[data-cm="h1"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().toggleHeading({ level: 1 }).run());
    modal.querySelector('[data-cm="h2"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().toggleHeading({ level: 2 }).run());
    modal.querySelector('[data-cm="h3"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().toggleHeading({ level: 3 }).run());
    modal.querySelector('[data-cm="bullet"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().toggleBulletList().run());
    modal.querySelector('[data-cm="number"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().toggleOrderedList().run());
    modal.querySelector('[data-cm="task"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().toggleTaskList().run());
    modal.querySelector('[data-cm="quote"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().toggleBlockquote().run());
    modal.querySelector('[data-cm="image"]')?.addEventListener('click', () => imageUploadInput?.click());
    modal.querySelector('[data-cm="hr"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().setHorizontalRule().run());
    modal.querySelector('[data-cm="undo"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().undo().run());
    modal.querySelector('[data-cm="redo"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().redo().run());
  }

  const canvas = modal.querySelector('#tiptap-composer-canvas') as HTMLElement;
  const countEl = modal.querySelector('#tiptap-composer-count') as HTMLElement;

  if (!modalComposerEditor && canvas) {
    modalComposerEditor = new Editor({
      element: canvas,
      extensions: getStandardExtensions(),
      content: activeTargetEl?.innerHTML || '<h2>Tiêu đề bài viết mới</h2><p>Bắt đầu viết những dòng suy nghĩ, triết lý hoặc ghi chép hành trình của bạn tại đây với sức mạnh của Tiptap...</p>',
      autofocus: true,
      onUpdate: ({ editor }) => {
        const words = editor.storage.characterCount.words();
        const chars = editor.storage.characterCount.characters();
        if (countEl) countEl.textContent = `${words} từ · ${chars} ký tự`;
      },
    });
  } else if (modalComposerEditor && activeTargetEl) {
    modalComposerEditor.commands.setContent(activeTargetEl.innerHTML);
  }

  modal.classList.add('is-open');
}

function closeTiptapComposerModal() {
  const modal = document.getElementById('tiptap-composer-modal');
  modal?.classList.remove('is-open');
}

// Toggle Tiptap Visual Editor Mode
export function toggleTiptapEditMode(enable: boolean) {
  // BẮT BUỘC: Chỉ cho phép chỉnh sửa khi URL có đuôi #admin
  const isUrlAdmin = (window.location.hash || '').toLowerCase().includes('#admin');
  if (enable && !isUrlAdmin) {
    return;
  }

  if (enable && !isAdminAuthenticated()) {
    showToast('🔒 Vui lòng nhập mật khẩu PIN quản trị để kích hoạt chế độ chỉnh sửa.');
    requestAdminAccess();
    return;
  }

  isEditMode = enable;

  if (enable) {
    setupBubbleMenuDOM();
    setupTiptapDock();
    setupImageUploadInput();

    const dock = document.getElementById('visual-editor-dock');
    document.body.classList.add('visual-editor-active', 'tiptap-mode-active');
    dock?.classList.remove('hidden');

    ensureStableEditKeys();

    document.querySelectorAll<HTMLElement>('[data-edit-key]').forEach((el) => {
      if (el.tagName.toLowerCase() === 'img') {
        el.style.cursor = 'pointer';
        el.title = 'Nhấp vào đây để đổi ảnh này từ máy tính';
      } else {
        el.setAttribute('data-editable-active', 'true');
      }
    });

    window.dispatchEvent(new CustomEvent('loc-edit-mode-changed', { detail: { isEditMode: true } }));
    showToast('✨ Tiptap Studio: Đã kích hoạt! Nhấp vào bất kỳ đoạn chữ nào để sửa hoặc nhấp vào ảnh để thay đổi.');
  } else {
    document.body.classList.remove('visual-editor-active', 'tiptap-mode-active');
    
    // Completely remove bubble menu from DOM
    const bubbleMenu = document.getElementById('tiptap-bubble-menu');
    bubbleMenu?.remove();

    // Completely remove dock from DOM
    const dock = document.getElementById('visual-editor-dock');
    dock?.remove();

    closeTiptapComposerModal();

    if (activeEditor && activeTargetEl) {
      const finalHTML = activeEditor.getHTML();
      activeEditor.destroy();
      activeEditor = null;
      activeTargetEl.innerHTML = finalHTML;
      activeTargetEl.classList.remove('tiptap-active-node');
      activeTargetEl = null;
    }

    document.querySelectorAll<HTMLElement>('[data-edit-key]').forEach((el) => {
      el.removeAttribute('data-editable-active');
      if (el.tagName.toLowerCase() === 'img') {
        el.style.cursor = '';
        el.title = '';
      }
    });

    // Cưỡng chế gỡ bỏ toàn bộ contenteditable và data-editable-active khi tắt chế độ sửa
    document.querySelectorAll<HTMLElement>('[contenteditable], [data-editable-active]').forEach((el) => {
      el.removeAttribute('contenteditable');
      el.removeAttribute('data-editable-active');
    });

    window.dispatchEvent(new CustomEvent('loc-edit-mode-changed', { detail: { isEditMode: false } }));
    showToast('✕ Đã thoát chế độ chỉnh sửa Tiptap.');
  }
}

// Initialize Tiptap Visual Editor
export function initTiptapEditor() {
  restoreSavedContent();
  // Do NOT mount any editor toolbars or bubble menus on initial page load!
  // They are strictly spawned on demand via Option + E when authenticated.

  // Listen to clicks on editable elements or editable images to attach Tiptap / change image
  document.addEventListener('click', (e) => {
    if (!isEditMode) return;
    const target = e.target as HTMLElement;

    if (target.closest('#visual-editor-dock, #tiptap-bubble-menu, #tiptap-composer-modal, .toast-notice, #admin-studio-overlay, #admin-auth-overlay')) {
      return;
    }

    // Editable image replacement
    const imgEl = target.closest<HTMLImageElement>('img[data-edit-key]');
    if (imgEl) {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = () => {
        const file = fileInput.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (re) => {
            imgEl.src = re.target?.result as string;
            saveAllTiptapContent();
            showToast('🖼️ Đã cập nhật ảnh và lưu trữ thành công!');
          };
          reader.readAsDataURL(file);
        }
      };
      fileInput.click();
      return;
    }

    const editableEl = target.closest<HTMLElement>('[data-editable-active="true"]');
    if (editableEl) {
      attachTiptapToElement(editableEl);
    }
  });

  // Listen for Option + E (or Alt + E)
  window.addEventListener('keydown', (e) => {
    const isEKey =
      e.code === 'KeyE' ||
      e.key === 'e' ||
      e.key === 'E' ||
      e.key === '´' ||
      e.key === 'Dead' ||
      (e as KeyboardEvent).keyCode === 69;

    if (e.altKey && isEKey) {
      // BẮT BUỘC: Nếu URL không có đuôi #admin (ví dụ: #explorations, trang chủ...) -> KHÔNG LÀM GÌ CẢ
      const isUrlAdmin = (window.location.hash || '').toLowerCase().includes('#admin');
      if (!isUrlAdmin) {
        return;
      }

      if (!isAdminAuthenticated()) {
        showToast('🔒 Vui lòng nhập mật khẩu PIN quản trị để chỉnh sửa.');
        requestAdminAccess();
        return;
      }
      toggleTiptapEditMode(!isEditMode);
      return;
    }

    if (isEditMode && (e.metaKey || e.ctrlKey)) {
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        saveAllTiptapContent();
      }
    }
  });

  // Lắng nghe thay đổi URL hash: Nếu rời khỏi #admin (như bấm vào #explorations) -> TẮT NGAY lập tức
  window.addEventListener('hashchange', () => {
    const isNowAdmin = (window.location.hash || '').toLowerCase().includes('#admin');
    if (!isNowAdmin) {
      if (isEditMode) {
        toggleTiptapEditMode(false);
      }
      document.querySelectorAll<HTMLElement>('[contenteditable], [data-editable-active]').forEach((el) => {
        el.removeAttribute('contenteditable');
        el.removeAttribute('data-editable-active');
      });
      document.body.classList.remove('visual-editor-active', 'tiptap-mode-active');
      document.getElementById('visual-editor-dock')?.remove();
      document.getElementById('tiptap-bubble-menu')?.remove();
    }
  });

  // Đảm bảo khi mở trang mà không có #admin thì 100% chỉ đọc
  if (!(window.location.hash || '').toLowerCase().includes('#admin')) {
    isEditMode = false;
    document.querySelectorAll<HTMLElement>('[contenteditable], [data-editable-active]').forEach((el) => {
      el.removeAttribute('contenteditable');
      el.removeAttribute('data-editable-active');
    });
    document.body.classList.remove('visual-editor-active', 'tiptap-mode-active');
    document.getElementById('visual-editor-dock')?.remove();
    document.getElementById('tiptap-bubble-menu')?.remove();
  }

  (window as any).toggleTiptapEditMode = toggleTiptapEditMode;
  (window as any).saveAllTiptapContent = saveAllTiptapContent;

  console.info('[Tiptap] Rich Text Engine ready.');
}
