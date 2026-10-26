// In-Place Visual Editor for Nguyễn Thành Lộc's Portfolio
// Allows direct clicking and typing on any text, with localStorage persistence and export

export function initVisualEditor() {
  const STORAGE_KEY = 'loc_portfolio_edits_v1';
  let isEditMode = false;

  // Restore saved edits from localStorage on page load
  function restoreEdits() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const edits: Record<string, string> = JSON.parse(saved);

      Object.entries(edits).forEach(([key, html]) => {
        const el = document.querySelector(`[data-edit-key="${key}"]`);
        if (el) {
          el.innerHTML = html;
        }
      });
      console.info('[VisualEditor] Restored custom content from storage.');
    } catch (e) {
      console.warn('[VisualEditor] Failed to restore edits:', e);
    }
  }

  // Auto-tag key elements if not already tagged
  function ensureEditKeys() {
    const defaultSelectors: [string, string][] = [
      ['.hero-eyebrow span', 'hero-eyebrow'],
      ['.hero-title-line', 'hero-title'],
      ['.hero-tagline', 'hero-tagline'],
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

    // Also tag project card titles & descriptions
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

    // Also tag exploration cards
    document.querySelectorAll('.exploration-card').forEach((card, idx) => {
      const h3 = card.querySelector('h3');
      const p = card.querySelector('p');
      const coord = card.querySelector('.exploration-coord');
      if (h3 && !h3.getAttribute('data-edit-key')) h3.setAttribute('data-edit-key', `exp-h3-${idx}`);
      if (p && !p.getAttribute('data-edit-key')) p.setAttribute('data-edit-key', `exp-p-${idx}`);
      if (coord && !coord.getAttribute('data-edit-key')) coord.setAttribute('data-edit-key', `exp-coord-${idx}`);
    });
  }

  // Create the floating visual editor admin dock
  function createEditorDock() {
    if (document.getElementById('visual-editor-dock')) return;

    const dock = document.createElement('div');
    dock.id = 'visual-editor-dock';
    dock.className = 'visual-editor-dock hidden';
    dock.setAttribute('role', 'region');
    dock.setAttribute('aria-label', 'Trình chỉnh sửa trực quan');

    dock.innerHTML = `
      <div class="editor-dock-inner">
        <div class="editor-dock-status">
          <span class="editor-status-dot"></span>
          <span class="editor-status-title">Chế độ Sửa Chữ Trực Tiếp</span>
          <span class="editor-status-hint">(Nhấp chuột vào bất kỳ chữ nào để sửa)</span>
        </div>

        <div class="editor-dock-actions">
          <button type="button" class="editor-btn editor-btn-save" id="editor-save-btn" title="Lưu các thay đổi vào máy">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            <span>Lưu thay đổi</span>
          </button>

          <button type="button" class="editor-btn editor-btn-export" id="editor-export-btn" title="Tải file HTML đã sửa về máy để đẩy lên GitHub">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Xuất file</span>
          </button>

          <button type="button" class="editor-btn editor-btn-reset" id="editor-reset-btn" title="Xóa các thay đổi và trở về nguyên bản">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            <span>Đặt lại gốc</span>
          </button>

          <button type="button" class="editor-btn editor-btn-close" id="editor-close-btn" title="Thoát chế độ chỉnh sửa">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            <span>Thoát</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(dock);

    // Attach dock events
    document.getElementById('editor-save-btn')?.addEventListener('click', saveEdits);
    document.getElementById('editor-export-btn')?.addEventListener('click', exportHtml);
    document.getElementById('editor-reset-btn')?.addEventListener('click', resetEdits);
    document.getElementById('editor-close-btn')?.addEventListener('click', () => toggleEditMode(false));
  }

  // Toggle edit mode on/off
  function toggleEditMode(enable: boolean) {
    isEditMode = enable;
    const dock = document.getElementById('visual-editor-dock');

    if (enable) {
      document.body.classList.add('visual-editor-active');
      dock?.classList.remove('hidden');

      // Make all tagged elements editable
      document.querySelectorAll<HTMLElement>('[data-edit-key]').forEach((el) => {
        el.contentEditable = 'true';
        el.spellcheck = false;
        el.setAttribute('data-editable-active', 'true');
      });

      showToast('✏️ Đã bật chế độ Chỉnh Sửa! Bấm vào bất kỳ chữ nào để sửa.');
    } else {
      document.body.classList.remove('visual-editor-active');
      dock?.classList.add('hidden');

      // Disable editing
      document.querySelectorAll<HTMLElement>('[data-edit-key]').forEach((el) => {
        el.contentEditable = 'false';
        el.removeAttribute('data-editable-active');
      });

      showToast('✕ Đã thoát chế độ chỉnh sửa.');
    }
  }

  // Save edits to localStorage
  function saveEdits() {
    const edits: Record<string, string> = {};
    document.querySelectorAll<HTMLElement>('[data-edit-key]').forEach((el) => {
      const key = el.getAttribute('data-edit-key');
      if (key) {
        edits[key] = el.innerHTML;
      }
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
      showToast('💾 Đã lưu thay đổi thành công vào máy của anh!');
    } catch (e) {
      console.error('[VisualEditor] Save error:', e);
      showToast('⚠️ Không thể lưu vào bộ nhớ tạm.');
    }
  }

  // Export full HTML or JSON
  function exportHtml() {
    saveEdits();

    const edits: Record<string, string> = {};
    document.querySelectorAll<HTMLElement>('[data-edit-key]').forEach((el) => {
      const key = el.getAttribute('data-edit-key');
      if (key) {
        edits[key] = el.innerText.trim();
      }
    });

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(edits, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'loc-portfolio-content.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast('📤 Đã xuất file loc-portfolio-content.json về máy!');
  }

  // Reset edits to initial state
  function resetEdits() {
    if (!confirm('Anh có chắc muốn xóa tất cả chỉnh sửa và khôi phục về nội dung gốc không?')) {
      return;
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
      showToast('🔄 Đã khôi phục nội dung gốc! Đang tải lại...');
      setTimeout(() => {
        window.location.reload();
      }, 800);
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

  // Listen for keyboard shortcut: Option + E (or Alt + E)
  window.addEventListener('keydown', (e) => {
    const isEKey = e.code === 'KeyE' || e.key === 'e' || e.key === 'E' || e.key === '´' || e.key === 'Dead' || (e as KeyboardEvent).keyCode === 69;
    if (e.altKey && isEKey) {
      e.preventDefault();
      toggleEditMode(!isEditMode);
    }
  });

  // Bootstrap
  ensureEditKeys();
  restoreEdits();
  createEditorDock();

  console.info('[VisualEditor] In-place live editor loaded. Press Option + E to edit.');
}
