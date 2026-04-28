/* Renders the shared sidebar + top header.
 * Call renderShell('drill-point') from each page after the page-content element exists.
 */
(function () {
  const NAV = [
    { id: 'drill-point', href: 'drill-point.html', label: '드릴 포인트 수정', icon: 'precision_manufacturing' },
    { id: 'drill-taper', href: 'drill-taper.html', label: '드릴 테이퍼 취합', icon: 'straighten' },
    { id: 'drill-code',  href: 'drill-code.html',  label: '드릴 코드',       icon: 'terminal' },
    { id: 'code-list',   href: 'drill-code-list.html', label: '코드 저장소', icon: 'bookmarks' },
  ];

  // Pages within the same group share state across navigation.
  // Switching to a different group prompts confirmation and clears that group's state.
  const GROUP_OF = {
    'drill-point': 'point',
    'drill-taper': 'taper',
    'drill-code':  'code',
    'code-list':   'code',
  };
  const GROUP_KEYS = {
    'point': ['drill-point/v1'],
    'taper': ['drill-taper/v1'],
    'code':  ['drill-code/form/v1', 'drill-code-edit/form/v1'],
  };
  const CONFIRM_MSG = '다른 작업으로 넘어가시겠습니까?\n확인 시 현재 작업 내용이 초기화됩니다.';
  const DIALOG_TITLE = '드릴 어시스턴스의 메세지';

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  // Custom confirm modal — replaces native confirm() so the dialog header
  // reads "드릴 어시스턴스의 메세지" instead of the browser's "<domain>의 메시지".
  function drillConfirm(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.id = 'drill-confirm-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;';
      overlay.innerHTML = `
        <div role="dialog" aria-modal="true" style="background:#fff;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,0.25);min-width:340px;max-width:480px;overflow:hidden;">
          <div style="padding:14px 20px;border-bottom:1px solid #e5e5e5;font-weight:600;font-size:14px;color:#1d1b20;">${escapeHtml(DIALOG_TITLE)}</div>
          <div style="padding:20px;color:#1d1b20;font-size:14px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(message)}</div>
          <div style="padding:12px 16px;display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #f0f0f0;background:#fafafa;">
            <button data-act="cancel" style="padding:8px 16px;border:1px solid #d0d0d0;border-radius:8px;background:#fff;color:#1d1b20;cursor:pointer;font-size:13px;font-weight:500;">취소</button>
            <button data-act="ok" style="padding:8px 16px;border:none;border-radius:8px;background:#003f87;color:#fff;cursor:pointer;font-size:13px;font-weight:600;">확인</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      const okBtn = overlay.querySelector('[data-act=ok]');
      const cancelBtn = overlay.querySelector('[data-act=cancel]');
      function close(result) {
        document.removeEventListener('keydown', onKey, true);
        overlay.remove();
        resolve(result);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); close(false); }
        else if (e.key === 'Enter') { e.preventDefault(); close(true); }
      }
      okBtn.addEventListener('click', () => close(true));
      cancelBtn.addEventListener('click', () => close(false));
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
      document.addEventListener('keydown', onKey, true);
      setTimeout(() => okBtn.focus(), 0);
    });
  }

  function navItem(item, active) {
    const activeCls = 'bg-surface-container-lowest text-primary rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.02)] border border-outline-variant';
    const idleCls = 'text-secondary hover:text-on-surface hover:bg-surface-container rounded-lg';
    const filled = active ? ' filled' : '';
    return `
      <a href="${item.href}" data-nav="${item.id}"
         class="flex items-center gap-3 px-4 py-3 transition-all duration-200 ease-in-out ${active ? activeCls : idleCls}">
        <span class="material-symbols-outlined${filled}">${item.icon}</span>
        <span class="font-label-md text-label-md">${item.label}</span>
      </a>`;
  }

  function sidebar(activeId) {
    return `
      <aside class="fixed left-0 top-0 h-full w-[256px] border-r border-outline-variant bg-surface flex flex-col z-50">
        <a href="index.html" data-home="1" class="p-lg border-b border-outline-variant flex items-center gap-sm hover:bg-surface-container transition-colors">
          <div class="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-on-primary">
            <span class="material-symbols-outlined">precision_manufacturing</span>
          </div>
          <div>
            <h1 class="font-h3 text-[18px] text-primary tracking-tight">DRILL Assistant</h1>
            <p class="font-body-sm text-label-sm text-secondary">메인으로</p>
          </div>
        </a>
        <nav class="flex-1 overflow-y-auto p-md flex flex-col gap-xs">
          ${NAV.map(item => navItem(item, item.id === activeId)).join('')}
        </nav>
      </aside>`;
  }

  function header(title, icon) {
    return `
      <header class="h-16 px-margin flex justify-between items-center border-b border-outline-variant bg-surface-container-lowest sticky top-0 z-40">
        <div class="flex items-center gap-2 text-on-surface-variant">
          ${icon ? `<span class="material-symbols-outlined">${icon}</span>` : ''}
          <span class="font-label-md text-label-md">${title}</span>
        </div>
        <div class="flex items-center gap-md">
          <button id="drill-help-btn" class="text-secondary hover:text-primary transition-colors" title="도움말">
            <span class="material-symbols-outlined">help</span>
          </button>
        </div>
      </header>`;
  }

  // Single-button info dialog (uses the same look as drillConfirm).
  function drillAlert(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;';
      overlay.innerHTML = `
        <div role="dialog" aria-modal="true" style="background:#fff;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,0.25);min-width:340px;max-width:480px;overflow:hidden;">
          <div style="padding:14px 20px;border-bottom:1px solid #e5e5e5;font-weight:600;font-size:14px;color:#1d1b20;">${escapeHtml(DIALOG_TITLE)}</div>
          <div style="padding:20px;color:#1d1b20;font-size:14px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(message)}</div>
          <div style="padding:12px 16px;display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #f0f0f0;background:#fafafa;">
            <button data-act="ok" style="padding:8px 16px;border:none;border-radius:8px;background:#003f87;color:#fff;cursor:pointer;font-size:13px;font-weight:600;">확인</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      const okBtn = overlay.querySelector('[data-act=ok]');
      function close() {
        document.removeEventListener('keydown', onKey, true);
        overlay.remove();
        resolve();
      }
      function onKey(e) {
        if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); close(); }
      }
      okBtn.addEventListener('click', close);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      document.addEventListener('keydown', onKey, true);
      setTimeout(() => okBtn.focus(), 0);
    });
  }

  function bindNavGuard(activeId) {
    const currentGroup = GROUP_OF[activeId];
    if (!currentGroup) return;

    function clearAndGo(href) {
      // Block any pagehide / debounced writes from re-saving the about-to-be-cleared state.
      window.__drillSkipPersist = true;
      const keys = GROUP_KEYS[currentGroup] || [];
      const persist = window.DrillPersist;
      const ops = persist ? keys.map(k => persist.remove(k).catch(() => {})) : [];
      Promise.all(ops).finally(() => { window.location.href = href; });
    }

    function attachGuard(a) {
      a.addEventListener('click', async (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;
        const checker = window.__hasDrillWork;
        const hasWork = typeof checker === 'function' ? Boolean(checker()) : false;
        if (!hasWork) return; // no work in progress → free navigation, no confirm, no clear
        e.preventDefault();
        const ok = await drillConfirm(CONFIRM_MSG);
        if (!ok) return;
        clearAndGo(a.href);
      });
    }

    document.querySelectorAll('a[data-nav]').forEach(a => {
      const targetGroup = GROUP_OF[a.dataset.nav];
      if (targetGroup === currentGroup) return; // same group → free navigation
      attachGuard(a);
    });

    const homeLink = document.querySelector('a[data-home]');
    if (homeLink) attachGuard(homeLink);
  }

  window.renderShell = function (activeId, opts = {}) {
    const navEntry = NAV.find(n => n.id === activeId) || {};
    const title = navEntry.label || '';
    const icon = navEntry.icon || '';
    const slot = document.getElementById('app-shell');
    if (slot) slot.outerHTML = sidebar(activeId);

    const main = document.getElementById('app-main');
    if (main) {
      main.classList.add('ml-[256px]', 'flex-1', 'overflow-y-auto', 'bg-surface-container-lowest');
      main.insertAdjacentHTML('afterbegin', header(opts.headerTitle || title, icon));
    }

    bindNavGuard(activeId);

    const helpBtn = document.getElementById('drill-help-btn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        drillAlert('이용 가이드 및 사이트 오류 발생 시\njhkim@neotis.co.kr 로 문의 부탁드립니다.');
      });
    }
  };

  // ===== Version check + cross-tab refresh =====
  // After every deploy, scripts/write-version.js writes a fresh timestamp into
  // /version.json. Each tab polls this file; when the value changes, a banner
  // appears with a button that broadcasts a reload signal so all open tabs
  // refresh together in one click.
  const REFRESH_CHANNEL = 'drill-refresh-v1';
  const VERSION_URL = '/version.json';
  const POLL_INTERVAL_MS = 15000;
  const channel = ('BroadcastChannel' in window) ? new BroadcastChannel(REFRESH_CHANNEL) : null;
  let initialVersion = null;
  let bannerShown = false;

  if (channel) {
    channel.onmessage = (e) => {
      if (e && e.data === 'reload') window.location.reload();
    };
  }

  async function fetchVersion() {
    try {
      const res = await fetch(VERSION_URL + '?_=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return null;
      const json = await res.json();
      return json && json.v;
    } catch (_) { return null; }
  }

  function showRefreshBanner() {
    if (bannerShown || !document.body) return;
    bannerShown = true;
    const banner = document.createElement('div');
    banner.id = 'drill-refresh-banner';
    banner.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;background:#1d1b20;color:#fff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.25);padding:12px 16px;display:flex;align-items:center;gap:12px;font:14px/1.4 Inter,sans-serif;';
    banner.innerHTML = `
      <span class="material-symbols-outlined" style="font-size:20px">deployed_code</span>
      <span>새 버전이 배포되었습니다.</span>
      <button id="drill-refresh-btn" style="background:#fff;color:#1d1b20;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;">전체 새로고침</button>
      <button id="drill-refresh-close" title="닫기" style="background:none;color:#fff;border:none;cursor:pointer;font-size:20px;line-height:1;padding:0 4px;">&times;</button>
    `;
    document.body.appendChild(banner);
    document.getElementById('drill-refresh-btn').addEventListener('click', () => {
      if (channel) channel.postMessage('reload');
      window.location.reload();
    });
    document.getElementById('drill-refresh-close').addEventListener('click', () => {
      banner.remove();
      bannerShown = false;
    });
  }

  async function startVersionCheck() {
    initialVersion = await fetchVersion();
    if (initialVersion == null) return; // version.json missing or not deployed yet
    setInterval(async () => {
      const v = await fetchVersion();
      if (v != null && v !== initialVersion) showRefreshBanner();
    }, POLL_INTERVAL_MS);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startVersionCheck);
  } else {
    startVersionCheck();
  }
})();
