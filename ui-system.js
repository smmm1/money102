/* Moneyeep shared modern dashboard shell.
   Shared navigation, search, and display settings only. */
(function () {
  'use strict';
  document.documentElement.classList.add('moneyeep-ui-ready');
  const ready = () => {
    const inner = document.querySelector('.ui-topbar-inner');
    if (!inner || inner.querySelector('.moneyeep-header-tools')) return;
    const brand = inner.querySelector('.ui-topbar-brand');
    if (!brand) return;
    const tools = document.createElement('div');
    tools.className = 'moneyeep-header-tools';
    tools.innerHTML = `
      <label class="moneyeep-search">
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <input type="search" aria-label="ค้นหาในหน้านี้" placeholder="ค้นหาในหน้านี้..." />
        <kbd>Enter</kbd>
      </label>
      <div class="moneyeep-tool-wrap">
        <button class="moneyeep-icon-btn" type="button" aria-label="ตั้งค่า" aria-expanded="false" data-menu="settings"><i class="fa-solid fa-sliders"></i></button>
        <div class="moneyeep-popover" data-popover="settings" hidden>
          <strong>การตั้งค่า</strong><span>รูปแบบหน้าจอ Moneyeep</span><a href="./index.html">กลับหน้าหลัก</a>
        </div>
      </div>`;

    brand.insertAdjacentElement('afterend', tools);
    const search = tools.querySelector('input[type="search"]');
    search.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      const q = search.value.trim().toLocaleLowerCase();
      if (!q) return;
      const links = Array.from(document.querySelectorAll('.exercise-sidebar a, .sidebar .nav-link, .side-nav a, a.app-card'));
      const match = links.find(link => link.textContent.toLocaleLowerCase().includes(q));
      if (match && match.href) location.href = match.href;
      else {
        const candidates = Array.from(document.querySelectorAll('main h1, main h2, main h3, .content h1, .content h2, .content h3'));
        const heading = candidates.find(el => el.textContent.toLocaleLowerCase().includes(q));
        if (heading) heading.scrollIntoView({behavior:'smooth',block:'center'});
        else {
          search.setCustomValidity('ไม่พบเมนูหรือหัวข้อที่ตรงกับคำค้นหา');
          search.reportValidity();
          search.addEventListener('input', () => search.setCustomValidity(''), {once:true});
        }
      }
    });
    tools.querySelectorAll('[data-menu]').forEach(button => button.addEventListener('click', () => {
      const name = button.getAttribute('data-menu');
      const pop = tools.querySelector('[data-popover="' + name + '"]');
      const open = pop.hidden;
      tools.querySelectorAll('[data-popover]').forEach(p => p.hidden = true);
      tools.querySelectorAll('[data-menu]').forEach(b => b.setAttribute('aria-expanded','false'));
      pop.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
    }));
    document.addEventListener('click', event => {
      if (tools.contains(event.target)) return;
      tools.querySelectorAll('[data-popover]').forEach(p => p.hidden = true);
      tools.querySelectorAll('[data-menu]').forEach(b => b.setAttribute('aria-expanded','false'));
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, {once:true});
  else ready();
})();