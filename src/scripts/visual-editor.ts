// In-Place Visual Editor & Rich Text Studio for Nguyễn Thành Lộc's Website
// Provides full formatting tools: Bold, Italic, Underline, Strikethrough,
// Font-size scaling, Line-breaks, Paragraph insertion, Dividers, Alignment,
// Line-height adjustment, and Color themes with localStorage persistence.

export function initVisualEditor() {
  const STORAGE_KEY = 'loc_portfolio_edits_v4';
  let isEditMode = false;
  let activeEditableEl: HTMLElement | null = null;
  let savedRange: Range | null = null;

  // Save current window selection range
  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange = sel.getRangeAt(0).cloneRange();
    }
  }

  // Restore saved selection range
  function restoreSelection() {
    if (!savedRange) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange);
    }
  }

  // Restore saved edits from localStorage on page load
  function restoreEdits() {
    try {
      let saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        saved = localStorage.getItem('loc_portfolio_edits_v3');
      }
      if (!saved) return;
      const edits: Record<string, { html?: string; style?: Record<string, string> } | string> = JSON.parse(saved);

      Object.entries(edits).forEach(([key, val]) => {
        const el = document.querySelector<HTMLElement>(`[data-edit-key="${key}"]`);
        if (el) {
          if (typeof val === 'string') {
            el.innerHTML = val;
          } else {
            if (val.html !== undefined) el.innerHTML = val.html;
            if (val.style) {
              Object.assign(el.style, val.style);
            }
          }
        }
      });
      console.info('[VisualEditor] Restored customized typography and content.');
    } catch (e) {
      console.warn('[VisualEditor] Failed to restore edits:', e);
    }
  }

  // Tag elements across the website so all text can be edited & styled
  function ensureEditKeys() {
    const defaultSelectors: [string, string][] = [
      ['.hero-eyebrow span', 'hero-eyebrow'],
      ['.hero-title-line', 'hero-title'],
      ['.hero-tagline', 'hero-tagline'],
      ['.workbench-code-snippet', 'hero-code-snippet'],
      ['.hero-bio-meta h3', 'hero-bio-name'],
      ['.hero-bio-meta span', 'hero-bio-title'],
      ['.hero-bio-quote', 'hero-bio-quote'],
      ['.brand-text', 'brand-name'],
      ['.brand-subtext', 'brand-subname'],
      ['.nav-status span:last-child', 'nav-status'],
      ['.section-philosophy .title-section', 'philosophy-title'],
      ['.section-philosophy .text-body', 'philosophy-body'],
      ['#works .title-section', 'works-title'],
      ['#synthesis .title-section', 'synthesis-title'],
      ['#explorations .title-section', 'explorations-title'],
      ['#principles .title-section', 'principles-title'],
      ['#contact .title-section', 'contact-title'],
      ['.footer-quote', 'footer-quote'],
    ];

    defaultSelectors.forEach(([sel, key]) => {
      const el = document.querySelector(sel);
      if (el && !el.getAttribute('data-edit-key')) {
        el.setAttribute('data-edit-key', key);
      }
    });

    // Tag project cards
    document.querySelectorAll('.project-card').forEach((card, idx) => {
      const title = card.querySelector('.project-card-title');
      const desc = card.querySelector('.project-desc');
      if (title && !title.getAttribute('data-edit-key')) {
        title.setAttribute('data-edit-key', `project-title-${idx}`);
      }
      if (desc && !desc.getAttribute('data-edit-key')) {
        desc.setAttribute('data-edit-key', `project-desc-${idx}`);
      }
    });

    // Tag exploration cards
    document.querySelectorAll('.exploration-card').forEach((card, idx) => {
      const h3 = card.querySelector('h3');
      const pList = card.querySelectorAll('p');
      const coord = card.querySelector('.exploration-coord');
      if (h3 && !h3.getAttribute('data-edit-key')) h3.setAttribute('data-edit-key', `exp-h3-${idx}`);
      pList.forEach((p, pIdx) => {
        if (!p.getAttribute('data-edit-key')) p.setAttribute('data-edit-key', `exp-p-${idx}-${pIdx}`);
      });
      if (coord && !coord.getAttribute('data-edit-key')) coord.setAttribute('data-edit-key', `exp-coord-${idx}`);
    });

    // Universally tag all text elements
    const candidates = document.querySelectorAll<HTMLElement>(
      'h1, h2, h3, h4, h5, h6, p, .text-body, .eyebrow span, .badge-pill, .bilingual-en, .bilingual-vi, .bilingual-sub, .bilingual-title-vi, .interest-tag, .principle-card h3, .principle-card p, .contact-method-value, .contact-method-label, .bio-chapter-title, .bio-chapter-period, .bio-chapter-body p, .bio-article-headline, .bio-article-lead, .welcome-marquee-en, .welcome-marquee-vi, .editor-custom-paragraph'
    );

    candidates.forEach((el, idx) => {
      if (el.closest('#visual-editor-dock, #editor-floating-toolbar, .toast-notice, script, style, svg')) return;
      if (!el.getAttribute('data-edit-key')) {
        const secId = el.closest('section[id], div[id]')?.id || 'doc';
        const tag = el.tagName.toLowerCase();
        el.setAttribute('data-edit-key', `auto-${secId}-${tag}-${idx}`);
      }
    });
  }

  // Execute standard formatting command
  function formatDoc(command: string, value: string | undefined = undefined) {
    restoreSelection();
    document.execCommand(command, false, value);
    saveSelection();
    triggerAutoSaveNotice();
  }

  // Adjust font size by delta (+2px or -2px)
  function adjustFontSize(delta: number) {
    restoreSelection();
    const sel = window.getSelection();

    if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const parentEl = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? (range.commonAncestorContainer as HTMLElement)
        : range.commonAncestorContainer.parentElement;

      const currentSize = parseFloat(window.getComputedStyle(parentEl || document.body).fontSize) || 16;
      const targetSize = Math.max(10, Math.min(84, Math.round(currentSize + delta)));

      // Wrap selection in span with target font-size
      const span = document.createElement('span');
      span.style.fontSize = `${targetSize}px`;

      try {
        const extracted = range.extractContents();
        span.appendChild(extracted);
        range.insertNode(span);
        sel.selectAllChildren(span);
        saveSelection();
      } catch {
        document.execCommand('fontSize', false, delta > 0 ? '5' : '2');
      }
      showToast(`🔠 Cỡ chữ bôi đen: ${targetSize}px`);
    } else if (activeEditableEl) {
      const currentSize = parseFloat(window.getComputedStyle(activeEditableEl).fontSize) || 16;
      const targetSize = Math.max(10, Math.min(84, Math.round(currentSize + delta)));
      activeEditableEl.style.fontSize = `${targetSize}px`;
      showToast(`🔠 Cỡ chữ khối: ${targetSize}px`);
    } else {
      showToast('⚠️ Vui lòng nhấp vào một dòng chữ trước khi chỉnh cỡ.');
    }
  }

  // Insert a soft line break (<br>) at cursor
  function insertLineBreak() {
    restoreSelection();
    const sel = window.getSelection();

    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const br = document.createElement('br');
      range.insertNode(br);
      range.setStartAfter(br);
      range.setEndAfter(br);
      sel.removeAllRanges();
      sel.addRange(range);
      saveSelection();
      showToast('↵ Đã thêm 1 dòng ngắt mới!');
    } else if (activeEditableEl) {
      activeEditableEl.innerHTML += '<br>';
      showToast('↵ Đã thêm dòng ngắt vào cuối khối!');
    }
  }

  // Insert a new editable paragraph below current element
  function insertNewParagraph() {
    if (!activeEditableEl) {
      showToast('⚠️ Hãy nhấp chọn đoạn văn bạn muốn thêm dòng bên dưới.');
      return;
    }

    const newP = document.createElement('p');
    newP.className = 'editor-custom-paragraph';
    newP.setAttribute('data-edit-key', `user-p-${Date.now()}`);
    newP.setAttribute('data-editable-active', 'true');
    newP.contentEditable = 'true';
    newP.style.cssText = 'margin: 0.85rem 0; line-height: 1.8; color: var(--ink-primary); font-size: 1rem;';
    newP.innerHTML = 'Nhấp vào đây để viết nội dung mới...';

    activeEditableEl.insertAdjacentElement('afterend', newP);

    // Bind event
    bindEditableEvents(newP);

    newP.focus();
    activeEditableEl = newP;

    showToast('➕ Đã chèn thêm đoạn văn mới!');
  }

  // Insert a decorative horizontal divider line
  function insertDivider() {
    if (!activeEditableEl) {
      showToast('⚠️ Nhấp chọn vị trí muốn chèn vạch ngăn cách.');
      return;
    }

    const hr = document.createElement('hr');
    hr.className = 'editor-custom-divider';
    hr.style.cssText =
      'border: none; border-top: 1px solid var(--accent-gold); margin: 1.75rem auto; width: 60%; opacity: 0.65;';

    activeEditableEl.insertAdjacentElement('afterend', hr);
    showToast('➖ Đã chèn đường kẻ ngăn cách!');
  }

  // Change text alignment (Left, Center, Right)
  function setAlignment(align: 'left' | 'center' | 'right') {
    if (activeEditableEl) {
      activeEditableEl.style.textAlign = align;
      showToast(`↔️ Căn ${align === 'left' ? 'trái' : align === 'center' ? 'giữa' : 'phải'}`);
    } else {
      formatDoc(`justify${align.charAt(0).toUpperCase() + align.slice(1)}`);
    }
  }

  // Toggle vertical line-height spacing
  function toggleLineHeight() {
    if (!activeEditableEl) {
      showToast('⚠️ Nhấp vào đoạn văn để giãn dòng.');
      return;
    }

    const current = activeEditableEl.style.lineHeight;
    let next = '1.8';
    let label = 'Thoáng đãng (1.8)';

    if (current === '1.8') {
      next = '2.2';
      label = 'Nghệ thuật rộng (2.2)';
    } else if (current === '2.2') {
      next = '1.45';
      label = 'Gọn gàng (1.45)';
    }

    activeEditableEl.style.lineHeight = next;
    showToast(`↕️ Giãn dòng: ${label}`);
  }

  // Apply color to selected text or active element
  function applyColor(colorHex: string, colorName: string) {
    restoreSelection();
    const sel = window.getSelection();

    if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
      document.execCommand('foreColor', false, colorHex);
      showToast(`🎨 Đã đổi màu chữ bôi đen sang ${colorName}`);
    } else if (activeEditableEl) {
      activeEditableEl.style.color = colorHex;
      showToast(`🎨 Đã đổi màu toàn bộ khối sang ${colorName}`);
    } else {
      showToast('⚠️ Nhấp vào chữ để đổi màu.');
    }
  }

  // Clear formatting
  function clearFormatting() {
    restoreSelection();
    document.execCommand('removeFormat');
    if (activeEditableEl) {
      activeEditableEl.style.fontSize = '';
      activeEditableEl.style.color = '';
      activeEditableEl.style.textAlign = '';
      activeEditableEl.style.lineHeight = '';
    }
    showToast('🧹 Đã xóa các định dạng tùy chỉnh về mặc định!');
  }

  function triggerAutoSaveNotice() {
    // Optional indicator
  }

  // Create Floating Contextual Bubble Toolbar (Notion/Medium style)
  function createFloatingBubbleToolbar() {
    if (document.getElementById('editor-floating-toolbar')) return;

    const bar = document.createElement('div');
    bar.id = 'editor-floating-toolbar';
    bar.className = 'editor-floating-toolbar hidden';
    bar.innerHTML = `
      <div class="bubble-btn-group">
        <button type="button" class="bubble-btn" data-tool="bold" title="In đậm (Cmd+B)"><strong>B</strong></button>
        <button type="button" class="bubble-btn" data-tool="italic" title="In nghiêng (Cmd+I)"><em>I</em></button>
        <button type="button" class="bubble-btn" data-tool="underline" title="Gạch chân (Cmd+U)"><u>U</u></button>
        <button type="button" class="bubble-btn" data-tool="strike" title="Gạch ngang"><s>S</s></button>
      </div>

      <div class="bubble-divider"></div>

      <div class="bubble-btn-group">
        <button type="button" class="bubble-btn" data-tool="font-down" title="Giảm cỡ chữ">A−</button>
        <button type="button" class="bubble-btn" data-tool="font-up" title="Tăng cỡ chữ">A+</button>
      </div>

      <div class="bubble-divider"></div>

      <div class="bubble-btn-group">
        <button type="button" class="bubble-btn bubble-color-dot" data-color="#B88E38" data-cname="Vàng Hoàng gia" style="background:#B88E38;" title="Màu Vàng đồng"></button>
        <button type="button" class="bubble-btn bubble-color-dot" data-color="#1C1A17" data-cname="Mực Đen" style="background:#1C1A17;" title="Màu Mực đen"></button>
        <button type="button" class="bubble-btn bubble-color-dot" data-color="#FAF7F2" data-cname="Trắng Ngà" style="background:#FAF7F2; border:1px solid #999;" title="Màu Trắng ngà"></button>
        <button type="button" class="bubble-btn bubble-color-dot" data-color="#E11D48" data-cname="Đỏ Nhấn" style="background:#E11D48;" title="Màu Đỏ điểm nhấn"></button>
      </div>

      <div class="bubble-divider"></div>

      <div class="bubble-btn-group">
        <button type="button" class="bubble-btn" data-tool="align-left" title="Căn trái">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 6h16M4 12h10M4 18h14"/></svg>
        </button>
        <button type="button" class="bubble-btn" data-tool="align-center" title="Căn giữa">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 6h16M7 12h10M5 18h14"/></svg>
        </button>
        <button type="button" class="bubble-btn" data-tool="line-break" title="Thêm dòng ngắt (↵)">↵</button>
        <button type="button" class="bubble-btn" data-tool="clear" title="Xóa định dạng">✕</button>
      </div>
    `;

    document.body.appendChild(bar);

    // Prevent focus stealing when clicking buttons
    bar.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => e.preventDefault());
    });

    // Tool actions
    bar.querySelector('[data-tool="bold"]')?.addEventListener('click', () => formatDoc('bold'));
    bar.querySelector('[data-tool="italic"]')?.addEventListener('click', () => formatDoc('italic'));
    bar.querySelector('[data-tool="underline"]')?.addEventListener('click', () => formatDoc('underline'));
    bar.querySelector('[data-tool="strike"]')?.addEventListener('click', () => formatDoc('strikeThrough'));
    bar.querySelector('[data-tool="font-down"]')?.addEventListener('click', () => adjustFontSize(-2));
    bar.querySelector('[data-tool="font-up"]')?.addEventListener('click', () => adjustFontSize(2));
    bar.querySelector('[data-tool="align-left"]')?.addEventListener('click', () => setAlignment('left'));
    bar.querySelector('[data-tool="align-center"]')?.addEventListener('click', () => setAlignment('center'));
    bar.querySelector('[data-tool="line-break"]')?.addEventListener('click', () => insertLineBreak());
    bar.querySelector('[data-tool="clear"]')?.addEventListener('click', () => clearFormatting());

    bar.querySelectorAll<HTMLElement>('.bubble-color-dot').forEach((btn) => {
      btn.addEventListener('click', () => {
        const color = btn.getAttribute('data-color') || '#B88E38';
        const name = btn.getAttribute('data-cname') || 'Màu';
        applyColor(color, name);
      });
    });
  }

  // Update floating bubble position on text selection
  function updateFloatingBubble() {
    const bar = document.getElementById('editor-floating-toolbar');
    if (!bar) return;

    if (!isEditMode) {
      bar.classList.add('hidden');
      return;
    }

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      bar.classList.add('hidden');
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      bar.classList.add('hidden');
      return;
    }

    // Verify selection is within an editable element
    const container = range.commonAncestorContainer;
    const editableParent =
      container.nodeType === Node.ELEMENT_NODE
        ? (container as HTMLElement).closest('[data-editable-active="true"]')
        : container.parentElement?.closest('[data-editable-active="true"]');

    if (!editableParent) {
      bar.classList.add('hidden');
      return;
    }

    bar.classList.remove('hidden');
    const barRect = bar.getBoundingClientRect();
    const top = Math.max(10, rect.top - barRect.height - 10 + window.scrollY);
    const left = Math.max(10, Math.min(window.innerWidth - barRect.width - 10, rect.left + rect.width / 2 - barRect.width / 2 + window.scrollX));

    bar.style.top = `${top}px`;
    bar.style.left = `${left}px`;
  }

  // Create the comprehensive Master Visual Editor Dock
  function createEditorDock() {
    if (document.getElementById('visual-editor-dock')) return;

    const dock = document.createElement('div');
    dock.id = 'visual-editor-dock';
    dock.className = 'visual-editor-dock hidden';
    dock.setAttribute('role', 'region');
    dock.setAttribute('aria-label', 'Trình chỉnh sửa nội dung và kiểu chữ');

    dock.innerHTML = `
      <div class="editor-dock-container">
        <!-- Top Row: Full Rich-Text Formatting Palette -->
        <div class="editor-format-bar">
          <!-- Text Styling Group -->
          <div class="editor-tool-group" title="Kiểu chữ cơ bản">
            <button type="button" class="editor-tool-btn" data-action="bold" title="In đậm (Cmd+B)"><strong>B</strong></button>
            <button type="button" class="editor-tool-btn" data-action="italic" title="In nghiêng (Cmd+I)"><em>I</em></button>
            <button type="button" class="editor-tool-btn" data-action="underline" title="Gạch chân (Cmd+U)"><u>U</u></button>
            <button type="button" class="editor-tool-btn" data-action="strike" title="Gạch ngang chữ"><s>S</s></button>
          </div>

          <div class="editor-tool-sep"></div>

          <!-- Font Size Scaling Group -->
          <div class="editor-tool-group" title="Tăng giảm cỡ chữ">
            <button type="button" class="editor-tool-btn editor-font-btn" data-action="font-down" title="Giảm cỡ chữ (−2px)">A−</button>
            <button type="button" class="editor-tool-btn editor-font-btn" data-action="font-up" title="Tăng cỡ chữ (+2px)">A+</button>
          </div>

          <div class="editor-tool-sep"></div>

          <!-- Alignment & Spacing Group -->
          <div class="editor-tool-group" title="Căn lề & Giãn dòng">
            <button type="button" class="editor-tool-btn" data-action="align-left" title="Căn lề trái">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 6h16M4 12h10M4 18h14"/></svg>
            </button>
            <button type="button" class="editor-tool-btn" data-action="align-center" title="Căn lề giữa">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 6h16M7 12h10M5 18h14"/></svg>
            </button>
            <button type="button" class="editor-tool-btn" data-action="align-right" title="Căn lề phải">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 6h16M10 12h10M6 18h14"/></svg>
            </button>
            <button type="button" class="editor-tool-btn" data-action="line-height" title="Giãn dòng dọc (1.4 / 1.8 / 2.2)">↕️ Giãn dòng</button>
          </div>

          <div class="editor-tool-sep"></div>

          <!-- Structural Inserts Group (Lines, Paragraphs, Dividers) -->
          <div class="editor-tool-group" title="Chèn dòng & Phân cách">
            <button type="button" class="editor-tool-btn editor-insert-btn" data-action="insert-break" title="Xuống dòng mềm (Enter)">↵ Thêm dòng</button>
            <button type="button" class="editor-tool-btn editor-insert-btn" data-action="insert-paragraph" title="Thêm một đoạn văn mới bên dưới">+ Đoạn mới</button>
            <button type="button" class="editor-tool-btn editor-insert-btn" data-action="insert-divider" title="Chèn đường kẻ phân cách ngang">— Vạch ngăn</button>
          </div>

          <div class="editor-tool-sep"></div>

          <!-- Color Presets -->
          <div class="editor-tool-group" title="Màu chữ">
            <button type="button" class="editor-color-btn" data-color="#B88E38" data-cname="Vàng Hoàng gia" style="background:#B88E38;" title="Màu Vàng đồng nghệ thuật"></button>
            <button type="button" class="editor-color-btn" data-color="#1C1A17" data-cname="Mực Đen" style="background:#1C1A17;" title="Màu Mực đen tự nhiên"></button>
            <button type="button" class="editor-color-btn" data-color="#FAF7F2" data-cname="Trắng Ngà" style="background:#FAF7F2; border:1px solid #777;" title="Màu Trắng kem"></button>
            <button type="button" class="editor-color-btn" data-color="#685E51" data-cname="Ghi Ấm" style="background:#685E51;" title="Màu Ghi ấm"></button>
            <button type="button" class="editor-tool-btn" data-action="clear-format" title="Xóa định dạng về mặc định">🧹</button>
          </div>
        </div>

        <!-- Bottom Row: Meta & Persistence Actions -->
        <div class="editor-dock-bottom-row">
          <div class="editor-dock-status">
            <span class="editor-status-dot"></span>
            <span class="editor-status-title">Chế độ Sửa Chữ Trực Tiếp</span>
            <span class="editor-status-hint">(Nhấp chuột vào bất kỳ chữ nào để sửa hoặc dùng bộ công cụ trên)</span>
          </div>

          <div class="editor-dock-actions">
            <button type="button" class="editor-btn editor-btn-save" id="editor-save-btn" title="Lưu toàn bộ thay đổi vào trình duyệt">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              <span>Lưu thay đổi</span>
            </button>
            <button type="button" class="editor-btn editor-btn-export" id="editor-export-btn" title="Tải về file JSON lưu trữ nội dung">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Xuất file</span>
            </button>
            <button type="button" class="editor-btn editor-btn-reset" id="editor-reset-btn" title="Xóa các thay đổi tùy chỉnh, khôi phục gốc">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              <span>Đặt lại gốc</span>
            </button>
            <button type="button" class="editor-btn editor-btn-close" id="editor-close-btn" title="Thoát chế độ chỉnh sửa">
              <span>✕ Thoát</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(dock);

    // Prevent loss of selection when clicking dock buttons
    dock.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => e.preventDefault());
    });

    // Formatting button bindings
    dock.querySelector('[data-action="bold"]')?.addEventListener('click', () => formatDoc('bold'));
    dock.querySelector('[data-action="italic"]')?.addEventListener('click', () => formatDoc('italic'));
    dock.querySelector('[data-action="underline"]')?.addEventListener('click', () => formatDoc('underline'));
    dock.querySelector('[data-action="strike"]')?.addEventListener('click', () => formatDoc('strikeThrough'));

    dock.querySelector('[data-action="font-down"]')?.addEventListener('click', () => adjustFontSize(-2));
    dock.querySelector('[data-action="font-up"]')?.addEventListener('click', () => adjustFontSize(2));

    dock.querySelector('[data-action="align-left"]')?.addEventListener('click', () => setAlignment('left'));
    dock.querySelector('[data-action="align-center"]')?.addEventListener('click', () => setAlignment('center'));
    dock.querySelector('[data-action="align-right"]')?.addEventListener('click', () => setAlignment('right'));
    dock.querySelector('[data-action="line-height"]')?.addEventListener('click', () => toggleLineHeight());

    dock.querySelector('[data-action="insert-break"]')?.addEventListener('click', () => insertLineBreak());
    dock.querySelector('[data-action="insert-paragraph"]')?.addEventListener('click', () => insertNewParagraph());
    dock.querySelector('[data-action="insert-divider"]')?.addEventListener('click', () => insertDivider());

    dock.querySelectorAll<HTMLElement>('.editor-color-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const color = btn.getAttribute('data-color') || '#B88E38';
        const name = btn.getAttribute('data-cname') || 'Màu';
        applyColor(color, name);
      });
    });

    dock.querySelector('[data-action="clear-format"]')?.addEventListener('click', () => clearFormatting());

    // Dock action buttons
    document.getElementById('editor-save-btn')?.addEventListener('click', saveEdits);
    document.getElementById('editor-export-btn')?.addEventListener('click', exportHtml);
    document.getElementById('editor-reset-btn')?.addEventListener('click', resetEdits);
    document.getElementById('editor-close-btn')?.addEventListener('click', () => toggleEditMode(false));
  }

  // Bind focus and click events to an editable element
  function bindEditableEvents(el: HTMLElement) {
    el.addEventListener('focus', () => {
      activeEditableEl = el;
      saveSelection();
    });

    el.addEventListener('click', () => {
      activeEditableEl = el;
      saveSelection();
    });

    el.addEventListener('keyup', () => {
      saveSelection();
    });

    el.addEventListener('mouseup', () => {
      saveSelection();
    });

    // Support Shift+Enter or Enter without breaking HTML
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (el.tagName.toLowerCase().startsWith('h') || el.classList.contains('eyebrow')) {
          e.preventDefault();
          insertLineBreak();
        }
      }
    });
  }

  // Toggle edit mode on/off
  function toggleEditMode(enable: boolean) {
    isEditMode = enable;
    const dock = document.getElementById('visual-editor-dock');
    const bubble = document.getElementById('editor-floating-toolbar');

    if (enable) {
      document.body.classList.add('visual-editor-active');
      dock?.classList.remove('hidden');

      // Ensure any newly added elements are tagged
      ensureEditKeys();

      // Make all tagged elements editable
      document.querySelectorAll<HTMLElement>('[data-edit-key]').forEach((el) => {
        el.contentEditable = 'true';
        el.spellcheck = false;
        el.setAttribute('data-editable-active', 'true');
        bindEditableEvents(el);
      });

      window.dispatchEvent(new CustomEvent('loc-edit-mode-changed', { detail: { isEditMode: true } }));
      showToast('✏️ Đã bật Bộ Công Cụ Biên Tập! Chọn chữ để sửa định dạng, cỡ chữ, căn dòng.');
    } else {
      document.body.classList.remove('visual-editor-active');
      dock?.classList.add('hidden');
      bubble?.classList.add('hidden');

      // Disable editing
      document.querySelectorAll<HTMLElement>('[data-edit-key]').forEach((el) => {
        el.contentEditable = 'false';
        el.removeAttribute('data-editable-active');
      });

      window.dispatchEvent(new CustomEvent('loc-edit-mode-changed', { detail: { isEditMode: false } }));
      showToast('✕ Đã thoát chế độ chỉnh sửa.');
    }
  }

  // Save edits to localStorage
  function saveEdits() {
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
      showToast('💾 Đã lưu toàn bộ nội dung, cỡ chữ và kiểu dáng vào máy của anh!');
    } catch (e) {
      console.error('[VisualEditor] Save error:', e);
      showToast('⚠️ Không thể lưu vào bộ nhớ tạm.');
    }
  }

  // Export full JSON file
  function exportHtml() {
    saveEdits();

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
    downloadAnchor.setAttribute('download', 'loc-portfolio-typography.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast('📤 Đã xuất file loc-portfolio-typography.json về máy!');
  }

  // Reset edits to initial state
  function resetEdits() {
    if (!confirm('Anh có chắc muốn xóa tất cả chỉnh sửa cỡ chữ, định dạng và khôi phục về mặc định ban đầu không?')) {
      return;
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('loc_portfolio_edits_v3');
      showToast('🔄 Đã khôi phục mặc định ban đầu! Đang tải lại...');
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (e) {
      console.warn(e);
    }
  }

  // Toast notification helper
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

  // Listen for keyboard shortcuts:
  // Option + E (or Alt + E) -> toggle edit mode
  // Cmd + B -> Bold, Cmd + I -> Italic, Cmd + U -> Underline
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
      toggleEditMode(!isEditMode);
      return;
    }

    if (isEditMode && (e.metaKey || e.ctrlKey)) {
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        formatDoc('bold');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        formatDoc('italic');
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        formatDoc('underline');
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        saveEdits();
      }
    }
  });

  // Track selection changes to show/hide contextual floating toolbar
  document.addEventListener('selectionchange', () => {
    if (isEditMode) {
      updateFloatingBubble();
    }
  });

  // Bootstrap
  ensureEditKeys();
  restoreEdits();
  createEditorDock();
  createFloatingBubbleToolbar();

  console.info('[VisualEditor] Rich Text Studio ready.');
}
