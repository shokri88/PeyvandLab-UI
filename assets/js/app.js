/* Shared, progressive enhancement. All content and navigation remain in HTML. */
'use strict';
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.carousel').forEach(el => {
    if (window.bootstrap) new bootstrap.Carousel(el, { interval: false, ride: false, touch: true, keyboard: true });
  });
  // Deliberately manual carousels: no moving content while reading.
  if (reduceMotion) document.documentElement.classList.add('reduced-motion');
  const search = document.querySelector('[data-search]');
  if (search) {
    let category = 'all';
    const normalize = text => text.toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c\u200f\u200e]/g, '').trim();
    const filter = () => {
      const term = normalize(search.value); let count = 0;
      document.querySelectorAll('[data-item]').forEach(item => {
        const match = normalize(item.textContent).includes(term) && (category === 'all' || item.dataset.category === category);
        item.hidden = !match; if (match) count++;
      });
      const empty = document.querySelector('[data-empty]'); if (empty) empty.hidden = count !== 0;
    };
    search.value = new URLSearchParams(location.search).get('q') || '';
    search.addEventListener('input', filter);
    document.querySelectorAll('[data-filter]').forEach(chip => chip.addEventListener('click', () => {
      category = chip.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
      filter();
    })); filter();
  }
  const testTitle = document.querySelector('#selected-test');
  const allowedTests = ['CBC','Ferritin','FBS','HbA1c','TSH','Vitamin D','Iron','HbA2','Lipid Profile','Urine Culture','Creatinine','AMH'];
  const selected = new URLSearchParams(location.search).get('test');
  if (testTitle && allowedTests.includes(selected)) testTitle.textContent = `راهنمای آزمایش ${selected}`;
  const form = document.querySelector('#admission-demo');
  if (form) form.addEventListener('submit', event => {
    event.preventDefault(); form.classList.add('was-validated');
    if (!form.checkValidity()) {
      form.querySelector(':invalid')?.focus(); return;
    }
    const message = document.querySelector('#demo-feedback');
    message.textContent = `انتخاب شما: ${form.querySelector('#service').value}، ${form.querySelector('#visit-day').value}، ${form.querySelector('#visit-time').value}. این یک پیش‌نمایش است؛ برای ثبت واقعی از سامانه پذیرش استفاده کنید.`;
    message.hidden = false;
  });
  let deferredInstall;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); deferredInstall = event;
  });
  document.querySelector('#install-app')?.addEventListener('click', async () => {
    if (deferredInstall) {
      await deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null;
    } else document.querySelector('#install-help').hidden = false;
  });
  const connection = document.querySelector('#connection-status');
  const setConnection = () => { if (connection) connection.hidden = navigator.onLine; };
  window.addEventListener('online', setConnection); window.addEventListener('offline', setConnection); setConnection();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost','127.0.0.1'].includes(location.hostname))) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {
      // The website remains usable when installation or caching is unavailable.
    }));
  }
})();
