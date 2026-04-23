/* Renders the shared sidebar + top header.
 * Call renderShell('drill-point') from each page after the page-content element exists.
 */
(function () {
  const NAV = [
    { id: 'dashboard',   href: 'index.html',       label: '대시보드',     icon: 'dashboard' },
    { id: 'drill-point', href: 'drill-point.html', label: '드릴 포인트',  icon: 'precision_manufacturing' },
    { id: 'drill-taper', href: 'drill-taper.html', label: '드릴 테이퍼',  icon: 'straighten' },
    { id: 'drill-code',  href: 'drill-code.html',  label: '드릴 코드',    icon: 'terminal' },
    { id: 'files',       href: 'files.html',       label: '파일',         icon: 'folder' },
    { id: 'settings',    href: 'settings.html',    label: '설정',         icon: 'settings' },
  ];

  function navItem(item, active) {
    const activeCls = 'bg-surface-container-lowest text-primary rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.02)] border border-outline-variant';
    const idleCls = 'text-secondary hover:text-on-surface hover:bg-surface-container rounded-lg';
    const filled = active ? ' filled' : '';
    return `
      <a href="${item.href}"
         class="flex items-center gap-3 px-4 py-3 transition-all duration-200 ease-in-out ${active ? activeCls : idleCls}">
        <span class="material-symbols-outlined${filled}">${item.icon}</span>
        <span class="font-label-md text-label-md">${item.label}</span>
      </a>`;
  }

  function sidebar(activeId) {
    return `
      <aside class="fixed left-0 top-0 h-full w-[256px] border-r border-outline-variant bg-surface flex flex-col z-50">
        <div class="p-lg border-b border-outline-variant">
          <div class="flex items-center gap-sm mb-lg">
            <div class="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-on-primary">
              <span class="material-symbols-outlined">precision_manufacturing</span>
            </div>
            <div>
              <h1 class="font-h3 text-[18px] text-primary tracking-tight">DRILL Assistant</h1>
              <p class="font-body-sm text-label-sm text-secondary">Productivity Suite</p>
            </div>
          </div>
          <button class="w-full py-md px-md bg-primary text-on-primary rounded-lg font-label-md text-label-md flex items-center justify-center gap-xs hover:bg-primary-container transition-colors shadow-sm">
            <span class="material-symbols-outlined text-[18px]">add</span>
            새 작업
          </button>
        </div>
        <nav class="flex-1 overflow-y-auto p-md flex flex-col gap-xs">
          ${NAV.map(item => navItem(item, item.id === activeId)).join('')}
        </nav>
        <div class="p-md border-t border-outline-variant">
          <div class="flex items-center gap-sm">
            <div class="w-10 h-10 rounded-full border border-outline-variant bg-secondary-container flex items-center justify-center text-on-secondary-container font-label-md">관</div>
            <div>
              <p class="font-label-md text-label-md text-on-surface">관리자</p>
              <p class="font-body-sm text-label-sm text-secondary">admin@neotis.co.kr</p>
            </div>
          </div>
        </div>
      </aside>`;
  }

  function header(title) {
    return `
      <header class="h-16 px-margin flex justify-between items-center border-b border-outline-variant bg-surface-container-lowest sticky top-0 z-40">
        <div class="relative w-96">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
          <input class="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                 placeholder="작업, 파일, 도면, 코드 검색..." type="text"/>
        </div>
        <div class="flex items-center gap-md">
          <span class="font-label-md text-label-md text-on-surface-variant hidden md:inline">${title}</span>
          <button class="text-secondary hover:text-primary transition-colors relative" title="알림">
            <span class="material-symbols-outlined">notifications</span>
            <span class="absolute top-0 right-0 w-2 h-2 bg-error rounded-full"></span>
          </button>
          <button class="text-secondary hover:text-primary transition-colors" title="도움말">
            <span class="material-symbols-outlined">help</span>
          </button>
        </div>
      </header>`;
  }

  window.renderShell = function (activeId, opts = {}) {
    const title = (NAV.find(n => n.id === activeId) || {}).label || '';
    const slot = document.getElementById('app-shell');
    if (slot) slot.outerHTML = sidebar(activeId);

    const main = document.getElementById('app-main');
    if (main) {
      main.classList.add('ml-[256px]', 'flex-1', 'overflow-y-auto', 'bg-surface-container-lowest');
      main.insertAdjacentHTML('afterbegin', header(opts.headerTitle || title));
    }
  };
})();
