import { Editor, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import BubbleMenu from '@tiptap/extension-bubble-menu';

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
const STORAGE_KEY = 'loc_portfolio_tiptap_v1';

// Global Tiptap State
let activeEditor: Editor | null = null;
let activeTargetEl: HTMLElement | null = null;
let isEditMode = false;
let modalComposerEditor: Editor | null = null;

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
    }),
    Underline,
    TextStyle,
    Color,
    FontSize,
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

// Restore saved edits on page load
function restoreSavedContent() {
  try {
    let saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      saved = localStorage.getItem('loc_portfolio_edits_v4') || localStorage.getItem('loc_portfolio_edits_v3');
    }
    if (!saved) return;

    const edits: Record<string, any> = JSON.parse(saved);
    Object.entries(edits).forEach(([key, val]) => {
      const el = document.querySelector<HTMLElement>(`[data-edit-key="${key}"]`);
      if (el) {
        if (typeof val === 'string') {
          el.innerHTML = val;
        } else if (val && typeof val === 'object') {
          if (val.html !== undefined) el.innerHTML = val.html;
          if (val.style) {
            Object.assign(el.style, val.style);
          }
        }
      }
    });
    console.info('[Tiptap] Restored persisted content across website.');
  } catch (e) {
    console.warn('[Tiptap] Failed to restore content:', e);
  }
}

// Save all content to localStorage
export function saveAllTiptapContent() {
  if (activeEditor && activeTargetEl) {
    const key = activeTargetEl.getAttribute('data-edit-key');
    if (key) {
      activeTargetEl.innerHTML = activeEditor.getHTML();
    }
  }

  const edits: Record<string, { html: string; style: Record<string, string> }> = {};
  document.querySelectorAll<HTMLElement>('[data-edit-key]').forEach((el) => {
    const key = el.getAttribute('data-edit-key');
    if (key) {
      const styleObj: Record<string, string> = {};
      if (el.style.fontSize) styleObj.fontSize = el.style.fontSize;
      if (el.style.color) styleObj.color = el.style.color;
      if (el.style.textAlign) styleObj.textAlign = el.style.textAlign;
      if (el.style.lineHeight) styleObj.lineHeight = el.style.lineHeight;

      edits[key] = {
        html: el.innerHTML,
        style: styleObj,
      };
    }
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
    window.dispatchEvent(new CustomEvent('loc-save-all-requested'));
    showToast('💾 Tiptap: Đã lưu toàn bộ nội dung & định dạng thành công!');
  } catch (e) {
    console.error('[Tiptap] Save failed:', e);
    showToast('⚠️ Không thể lưu vào bộ nhớ tạm.');
  }
}

// Export content as JSON
export function exportTiptapContent() {
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
  if (!confirm('Anh có chắc muốn xóa tất cả chỉnh sửa và khôi phục về nội dung mặc định của website không?')) {
    return;
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
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

// Attach Tiptap Editor instance to clicked element
function attachTiptapToElement(targetEl: HTMLElement) {
  if (activeTargetEl === targetEl && activeEditor) {
    return;
  }

  // Commit previous active editor
  if (activeEditor && activeTargetEl) {
    activeTargetEl.innerHTML = activeEditor.getHTML();
    activeEditor.destroy();
    activeEditor = null;
    activeTargetEl.classList.remove('tiptap-active-node');
  }

  activeTargetEl = targetEl;
  targetEl.classList.add('tiptap-active-node');

  const bubbleMenuEl = document.getElementById('tiptap-bubble-menu') || undefined;

  // Initialize Tiptap on target
  activeEditor = new Editor({
    element: targetEl,
    extensions: getStandardExtensions(bubbleMenuEl),
    content: targetEl.innerHTML,
    autofocus: true,
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
  const isBlockquote = activeEditor.isActive('blockquote');

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
  dock.querySelector('[data-tt-action="blockquote"]')?.classList.toggle('active', isBlockquote);

  // Floating bubble states
  const bubble = document.getElementById('tiptap-bubble-menu');
  if (bubble) {
    bubble.querySelector('[data-tt-action="bold"]')?.classList.toggle('active', isBold);
    bubble.querySelector('[data-tt-action="italic"]')?.classList.toggle('active', isItalic);
    bubble.querySelector('[data-tt-action="underline"]')?.classList.toggle('active', isUnderline);
    bubble.querySelector('[data-tt-action="strike"]')?.classList.toggle('active', isStrike);
  }
}

// Setup Tiptap Floating Bubble Menu in DOM
function setupBubbleMenuDOM(): HTMLElement {
  let menu = document.getElementById('tiptap-bubble-menu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'tiptap-bubble-menu';
    menu.className = 'tiptap-bubble-menu';
    menu.innerHTML = `
      <div class="tt-bubble-group">
        <button type="button" class="tt-btn" data-tt-action="bold" title="In đậm (Cmd+B)"><strong>B</strong></button>
        <button type="button" class="tt-btn" data-tt-action="italic" title="In nghiêng (Cmd+I)"><em>I</em></button>
        <button type="button" class="tt-btn" data-tt-action="underline" title="Gạch chân (Cmd+U)"><u>U</u></button>
        <button type="button" class="tt-btn" data-tt-action="strike" title="Gạch ngang"><s>S</s></button>
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

// Setup Master Tiptap Control Dock
function setupTiptapDock() {
  if (document.getElementById('visual-editor-dock')) return;

  const dock = document.createElement('div');
  dock.id = 'visual-editor-dock';
  dock.className = 'visual-editor-dock hidden';
  dock.setAttribute('role', 'region');
  dock.setAttribute('aria-label', 'Trình soạn thảo Tiptap trực quan');

  dock.innerHTML = `
    <div class="editor-dock-container">
      <!-- Tiptap Studio Toolbar -->
      <div class="editor-format-bar">
        <!-- Brand / Engine Pill -->
        <div class="tiptap-engine-pill" title="Trình chỉnh sửa được cung cấp bởi Tiptap (ProseMirror engine)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M4 4h16v4h-6v12h-4V8H4V4z"/></svg>
          <span>Tiptap Engine</span>
        </div>

        <div class="editor-tool-sep"></div>

        <!-- Typography Marks -->
        <div class="editor-tool-group" title="Kiểu chữ cơ bản">
          <button type="button" class="editor-tool-btn" data-tt-action="bold" title="In đậm (Cmd+B)"><strong>B</strong></button>
          <button type="button" class="editor-tool-btn" data-tt-action="italic" title="In nghiêng (Cmd+I)"><em>I</em></button>
          <button type="button" class="editor-tool-btn" data-tt-action="underline" title="Gạch chân (Cmd+U)"><u>U</u></button>
          <button type="button" class="editor-tool-btn" data-tt-action="strike" title="Gạch ngang"><s>S</s></button>
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
          <button type="button" class="editor-tool-btn" data-tt-action="blockquote" title="Khối trích dẫn">”</button>
        </div>

        <div class="editor-tool-sep"></div>

        <!-- Font Size Scale -->
        <div class="editor-tool-group" title="Tăng giảm cỡ chữ">
          <button type="button" class="editor-tool-btn editor-font-btn" data-tt-action="font-down" title="Giảm cỡ chữ (−2px)">A−</button>
          <button type="button" class="editor-tool-btn editor-font-btn" data-tt-action="font-up" title="Tăng cỡ chữ (+2px)">A+</button>
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

        <!-- Insert & Divider -->
        <div class="editor-tool-group" title="Chèn dòng & Phân cách">
          <button type="button" class="editor-tool-btn editor-insert-btn" data-tt-action="hr" title="Chèn vạch ngăn cách (Horizontal Rule)">— Vạch ngăn</button>
          <button type="button" class="editor-tool-btn editor-insert-btn" data-tt-action="composer-open" title="Mở Trình Soạn Bài Tiptap Chuyên Sâu">✨ Soạn thảo Pro</button>
        </div>

        <div class="editor-tool-sep"></div>

        <!-- Color Swatches -->
        <div class="editor-tool-group" title="Màu chữ">
          <button type="button" class="editor-color-btn" data-color="#B88E38" style="background:#B88E38;" title="Vàng Hoàng gia"></button>
          <button type="button" class="editor-color-btn" data-color="#1C1A17" style="background:#1C1A17;" title="Mực Đen"></button>
          <button type="button" class="editor-color-btn" data-color="#FAF7F2" style="background:#FAF7F2; border:1px solid #777;" title="Trắng Kem"></button>
          <button type="button" class="editor-color-btn" data-color="#685E51" style="background:#685E51;" title="Ghi Ấm"></button>
          <button type="button" class="editor-tool-btn" data-tt-action="clear-format" title="Xóa định dạng (Reset)">🧹</button>
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
          <button type="button" class="editor-btn editor-btn-save" id="tt-save-btn" title="Lưu thay đổi vào máy">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            <span>Lưu thay đổi</span>
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

  // Tiptap Command bindings
  dock.querySelector('[data-tt-action="bold"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleBold().run());
  dock.querySelector('[data-tt-action="italic"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleItalic().run());
  dock.querySelector('[data-tt-action="underline"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleUnderline().run());
  dock.querySelector('[data-tt-action="strike"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleStrike().run());

  dock.querySelector('[data-tt-action="h1"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleHeading({ level: 1 }).run());
  dock.querySelector('[data-tt-action="h2"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleHeading({ level: 2 }).run());
  dock.querySelector('[data-tt-action="h3"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleHeading({ level: 3 }).run());

  dock.querySelector('[data-tt-action="bulletList"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleBulletList().run());
  dock.querySelector('[data-tt-action="orderedList"]')?.addEventListener('click', () => activeEditor?.chain().focus().toggleOrderedList().run());
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

  dock.querySelector('[data-tt-action="hr"]')?.addEventListener('click', () => {
    activeEditor?.chain().focus().setHorizontalRule().run();
    showToast('➖ Đã chèn vạch phân cách ngang!');
  });

  dock.querySelector('[data-tt-action="composer-open"]')?.addEventListener('click', () => {
    openTiptapComposerModal();
  });

  dock.querySelectorAll<HTMLElement>('.editor-color-btn').forEach((btn) => {
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
            <h3>Trình Soạn Thảo Văn Bản Toàn Năng</h3>
          </div>
          <button type="button" class="tiptap-composer-close" aria-label="Đóng">✕</button>
        </div>

        <div class="tiptap-composer-toolbar">
          <button type="button" class="tt-tool-btn" data-cm="bold"><strong>B</strong></button>
          <button type="button" class="tt-tool-btn" data-cm="italic"><em>I</em></button>
          <button type="button" class="tt-tool-btn" data-cm="underline"><u>U</u></button>
          <button type="button" class="tt-tool-btn" data-cm="strike"><s>S</s></button>
          <div class="tt-sep"></div>
          <button type="button" class="tt-tool-btn" data-cm="h1">H1</button>
          <button type="button" class="tt-tool-btn" data-cm="h2">H2</button>
          <button type="button" class="tt-tool-btn" data-cm="h3">H3</button>
          <div class="tt-sep"></div>
          <button type="button" class="tt-tool-btn" data-cm="bullet">Bullet</button>
          <button type="button" class="tt-tool-btn" data-cm="number">Number</button>
          <button type="button" class="tt-tool-btn" data-cm="quote">Quote</button>
          <button type="button" class="tt-tool-btn" data-cm="hr">Divider</button>
          <div class="tt-sep"></div>
          <button type="button" class="tt-tool-btn" data-cm="undo">↩ Undo</button>
          <button type="button" class="tt-tool-btn" data-cm="redo">↪ Redo</button>
        </div>

        <div class="tiptap-composer-canvas" id="tiptap-composer-canvas"></div>

        <div class="tiptap-composer-footer">
          <span class="tiptap-composer-hint">ProseMirror engine active · Soạn bài thoải mái, tự động format chuẩn HTML</span>
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
    modal.querySelector('[data-cm="h1"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().toggleHeading({ level: 1 }).run());
    modal.querySelector('[data-cm="h2"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().toggleHeading({ level: 2 }).run());
    modal.querySelector('[data-cm="h3"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().toggleHeading({ level: 3 }).run());
    modal.querySelector('[data-cm="bullet"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().toggleBulletList().run());
    modal.querySelector('[data-cm="number"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().toggleOrderedList().run());
    modal.querySelector('[data-cm="quote"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().toggleBlockquote().run());
    modal.querySelector('[data-cm="hr"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().setHorizontalRule().run());
    modal.querySelector('[data-cm="undo"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().undo().run());
    modal.querySelector('[data-cm="redo"]')?.addEventListener('click', () => modalComposerEditor?.chain().focus().redo().run());
  }

  const canvas = modal.querySelector('#tiptap-composer-canvas') as HTMLElement;
  if (!modalComposerEditor && canvas) {
    modalComposerEditor = new Editor({
      element: canvas,
      extensions: getStandardExtensions(),
      content: activeTargetEl?.innerHTML || '<h2>Tiêu đề bài viết mới</h2><p>Bắt đầu viết những dòng suy nghĩ, triết lý hoặc ghi chép hành trình của bạn tại đây với sức mạnh của Tiptap...</p>',
      autofocus: true,
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
  isEditMode = enable;
  const dock = document.getElementById('visual-editor-dock');

  if (enable) {
    document.body.classList.add('visual-editor-active', 'tiptap-mode-active');
    dock?.classList.remove('hidden');

    // Auto tag elements if needed
    document.querySelectorAll<HTMLElement>(
      'h1, h2, h3, h4, h5, h6, p, .text-body, .eyebrow span, .badge-pill, .bilingual-en, .bilingual-vi, .bilingual-sub, .bilingual-title-vi, .interest-tag, .principle-card h3, .principle-card p, .contact-method-value, .contact-method-label, .bio-chapter-title, .bio-chapter-period, .bio-chapter-body p, .bio-article-headline, .bio-article-lead, .welcome-marquee-en, .welcome-marquee-vi'
    ).forEach((el, idx) => {
      if (el.closest('#visual-editor-dock, #tiptap-bubble-menu, #tiptap-composer-modal, .toast-notice, script, style, svg')) return;
      if (!el.getAttribute('data-edit-key')) {
        const secId = el.closest('section[id], div[id]')?.id || 'doc';
        const tag = el.tagName.toLowerCase();
        el.setAttribute('data-edit-key', `tt-${secId}-${tag}-${idx}`);
      }
      el.setAttribute('data-editable-active', 'true');
    });

    window.dispatchEvent(new CustomEvent('loc-edit-mode-changed', { detail: { isEditMode: true } }));
    showToast('✨ Tiptap Studio: Đã kích hoạt! Nhấp vào bất kỳ đoạn chữ nào để bắt đầu.');
  } else {
    document.body.classList.remove('visual-editor-active', 'tiptap-mode-active');
    dock?.classList.add('hidden');
    closeTiptapComposerModal();

    if (activeEditor && activeTargetEl) {
      activeTargetEl.innerHTML = activeEditor.getHTML();
      activeEditor.destroy();
      activeEditor = null;
      activeTargetEl.classList.remove('tiptap-active-node');
      activeTargetEl = null;
    }

    document.querySelectorAll<HTMLElement>('[data-edit-key]').forEach((el) => {
      el.removeAttribute('data-editable-active');
    });

    window.dispatchEvent(new CustomEvent('loc-edit-mode-changed', { detail: { isEditMode: false } }));
    showToast('✕ Đã thoát chế độ chỉnh sửa Tiptap.');
  }
}

// Initialize Tiptap Visual Editor
export function initTiptapEditor() {
  restoreSavedContent();
  setupBubbleMenuDOM();
  setupTiptapDock();

  // Listen to clicks on editable elements to attach Tiptap
  document.addEventListener('click', (e) => {
    if (!isEditMode) return;
    const target = e.target as HTMLElement;

    if (target.closest('#visual-editor-dock, #tiptap-bubble-menu, #tiptap-composer-modal, .toast-notice')) {
      return;
    }

    const editableEl = target.closest<HTMLElement>('[data-editable-active="true"]');
    if (editableEl) {
      attachTiptapToElement(editableEl);
    }
  });

  // Listen for Option + E
  window.addEventListener('keydown', (e) => {
    const isEKey =
      e.code === 'KeyE' ||
      e.key === 'e' ||
      e.key === 'E' ||
      e.key === '´' ||
      e.key === 'Dead' ||
      (e as KeyboardEvent).keyCode === 69;

    if (e.altKey && isEKey) {
      e.preventDefault();
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

  console.info('[Tiptap] Rich Text Engine ready. Press Option + E to activate.');
}
