/* HTML account prototype. Demo OTP/session only: replace with server auth before production. */
'use strict';
(() => {
  const keys = {session: 'peyvand.demoSession', otp: 'peyvand.demoOtp', profile: 'peyvand.demoProfile'};
  const pages = ['login.html', 'verify.html', 'history.html', 'request-details.html', 'profile.html', 'logout.html'];
  const requestIds = ['1001','1002','1003','1004','1005','1006'];
  const currentPage = location.pathname.split('/').pop();
  const normalizeDigits = value => String(value).replace(/[۰-۹]/g, char => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(char))).replace(/[٠-٩]/g, char => String('٠١٢٣٤٥٦٧٨٩'.indexOf(char)));
  const normalizeText = value => normalizeDigits(value).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\u200c/g,'').trim().toLowerCase();
  const persianNumber = value => new Intl.NumberFormat('fa-IR', {useGrouping: false}).format(value);
  const read = key => { try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; } };
  const write = (key, value) => { try { sessionStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };
  const remove = key => { try { sessionStorage.removeItem(key); } catch { /* Storage may be disabled. */ } };
  const session = () => { const data = read(keys.session); return data && data.active && data.expiresAt > Date.now() ? data : null; };
  const safeNext = value => {
    try {
      const url = new URL(value || 'history.html', location.href);
      const name = url.pathname.split('/').pop();
      if (url.origin === location.origin && ['history.html','profile.html','request-details.html','admission.html'].includes(name)) return name + url.search;
    } catch { /* Fall back to the local history page. */ }
    return 'history.html';
  };
  const setMessage = (element, text) => { if (element) { element.textContent = text; element.hidden = !text; } };
  const profileName = () => { const profile = read(keys.profile); return profile ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'کاربر نمونه' : 'کاربر نمونه'; };
  function renderAccount() {
    const active = session();
    document.querySelectorAll('[data-account-entry]').forEach(link => { link.textContent = active ? profileName() : 'ورود به کاربری'; link.href = active ? 'history.html' : 'login.html'; });
    document.querySelectorAll('[data-account-caption]').forEach(el => { el.textContent = active ? 'نشست نمایشی فعال است' : 'ورود با رمز یک‌بارمصرف'; });
    document.querySelectorAll('[data-profile-name]').forEach(el => { el.textContent = profileName(); });
    document.querySelectorAll('[data-session-mobile]').forEach(el => { el.textContent = active ? active.maskedMobile : '—'; });
    document.querySelectorAll('.account-toggle').forEach(button => { button.classList.toggle('is-account-page', pages.includes(currentPage)); });
    document.querySelectorAll('#accountSubmenu .dropdown-item').forEach(link => {
      const target = link.getAttribute('href');
      if (target === currentPage || (currentPage === 'request-details.html' && target === 'history.html')) link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
    if (document.body.hasAttribute('data-protected-account')) {
      document.querySelector('[data-account-gate]').hidden = Boolean(active);
      document.querySelector('[data-account-content]').hidden = !active;
      document.querySelectorAll('[data-login-return]').forEach(link => { link.href = 'login.html?next=' + encodeURIComponent(safeNext(currentPage + location.search)); });
    }
    document.querySelectorAll('[data-already-signed-in]').forEach(el => { el.hidden = !active; });
  }
  const loginDestination = safeNext(new URLSearchParams(location.search).get('next'));
  document.querySelectorAll('[data-already-signed-in] a').forEach(link => { link.href=loginDestination; link.textContent=loginDestination.startsWith('admission.html') ? 'ادامه پذیرش و انتخاب خدمت' : 'ادامه به حساب کاربری'; });
  renderAccount();
  window.addEventListener('pageshow', renderAccount);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) renderAccount(); });
  const activeSession = session();
  if (activeSession) window.setTimeout(renderAccount, Math.max(0, activeSession.expiresAt - Date.now()) + 100);

  const loginForm = document.querySelector('#login-form');
  if (loginForm) {
    const mobile = loginForm.querySelector('#login-mobile');
    mobile.addEventListener('input', () => { mobile.value = normalizeDigits(mobile.value).replace(/[\s-]/g,'').replace(/^\+?98(?=9\d{9}$)/,'0'); });
    loginForm.addEventListener('submit', event => {
      event.preventDefault(); loginForm.classList.add('was-validated');
      if (!loginForm.checkValidity()) { mobile.focus(); return; }
      const next = safeNext(new URLSearchParams(location.search).get('next'));
      // Store only a masked number, not a real phone number or a secret OTP.
      const maskedMobile = mobile.value.slice(0,3) + '•••••' + mobile.value.slice(-3);
      if (!write(keys.otp, {maskedMobile, next, expiresAt: Date.now()+120000, resendAt: Date.now()+60000, attempts: 0})) {
        setMessage(document.querySelector('#login-error'), 'ذخیره نشست مرورگر در دسترس نیست؛ تنظیمات مرورگر را بررسی کنید.'); return;
      }
      location.assign('verify.html?next=' + encodeURIComponent(next));
    });
  }

  const otpForm = document.querySelector('#otp-form');
  if (otpForm) {
    const code = otpForm.querySelector('#otp-code');
    const verify = document.querySelector('#verify-otp');
    const resend = document.querySelector('#resend-otp');
    const error = document.querySelector('#otp-error');
    const tick = () => {
      const otp = read(keys.otp);
      if (!otp) {
        verify.disabled = true; resend.disabled = true;
        setMessage(error, 'ابتدا شماره همراه را در صفحه ورود وارد کنید.'); return;
      }
      document.querySelector('#otp-mobile').textContent = otp.maskedMobile;
      document.querySelector('#change-mobile').href = 'login.html?next=' + encodeURIComponent(safeNext(otp.next));
      const remaining = Math.max(0, Math.ceil((otp.expiresAt-Date.now())/1000));
      const resendRemaining = Math.max(0, Math.ceil((otp.resendAt-Date.now())/1000));
      document.querySelector('#otp-expiry').textContent = remaining ? `اعتبار کد نمایشی: ${persianNumber(remaining)} ثانیه` : 'اعتبار کد به پایان رسیده؛ کد جدید دریافت کنید.';
      document.querySelector('#resend-countdown').textContent = resendRemaining ? `دریافت مجدد تا ${persianNumber(resendRemaining)} ثانیه دیگر` : 'امکان دریافت مجدد فعال است.';
      resend.disabled = resendRemaining > 0;
      verify.disabled = remaining === 0 || otp.attempts >= 5;
    };
    code.addEventListener('input', () => { code.value = normalizeDigits(code.value).replace(/\D/g,'').slice(0,6); code.removeAttribute('aria-invalid'); setMessage(error,''); });
    otpForm.addEventListener('submit', event => {
      event.preventDefault(); otpForm.classList.add('was-validated');
      if (!otpForm.checkValidity()) { code.focus(); return; }
      const otp = read(keys.otp);
      if (!otp || otp.expiresAt <= Date.now()) { setMessage(error,'اعتبار کد تمام شده است. کد جدید دریافت کنید.'); tick(); return; }
      if (otp.attempts >= 5) { setMessage(error,'تعداد تلاش‌های نمایشی تمام شده؛ کد جدید دریافت کنید.'); tick(); return; }
      if (code.value !== '123456') {
        otp.attempts++; write(keys.otp, otp);
        setMessage(error, otp.attempts >= 5 ? 'تعداد تلاش‌ها تمام شد. پس از فعال‌شدن دکمه، کد جدید دریافت کنید.' : 'کد صحیح نیست. برای این پیش‌نمایش، ۱۲۳۴۵۶ را وارد کنید.');
        code.setAttribute('aria-invalid','true'); code.focus(); tick(); return;
      }
      if (!write(keys.session, {active: true, maskedMobile: otp.maskedMobile, expiresAt: Date.now()+1800000})) {
        setMessage(error,'امکان ایجاد نشست نمایشی وجود ندارد.'); return;
      }
      const next = safeNext(new URLSearchParams(location.search).get('next') || otp.next); remove(keys.otp); location.assign(next);
    });
    resend.addEventListener('click', () => {
      const otp = read(keys.otp); if (!otp || otp.resendAt > Date.now()) return;
      otp.expiresAt = Date.now()+120000; otp.resendAt = Date.now()+60000; otp.attempts = 0;
      write(keys.otp,otp); code.value=''; otpForm.classList.remove('was-validated'); setMessage(error,'');
      setMessage(document.querySelector('#resend-status'),'کد نمایشی جدید: ۱۲۳۴۵۶. پیامکی ارسال نشده است.'); tick(); code.focus();
    });
    let timer;
    const startTimer = () => { window.clearInterval(timer); tick(); timer = window.setInterval(tick,1000); };
    startTimer();
    window.addEventListener('pageshow', startTimer);
    window.addEventListener('pagehide', () => window.clearInterval(timer));
  }

  const historySearch = document.querySelector('[data-history-search]');
  if (historySearch) {
    let status = 'all';
    const filter = () => {
      let count=0; const query=normalizeText(historySearch.value);
      document.querySelectorAll('[data-history-item]').forEach(item => {
        const match = (status === 'all' || status === item.dataset.status) && normalizeText(item.textContent).includes(query);
        item.hidden = !match; if (match) count++;
      });
      document.querySelector('[data-history-empty]').hidden = count !== 0;
      document.querySelector('[data-history-count]').textContent = `${persianNumber(count)} درخواست`;
    };
    document.querySelectorAll('[data-history-filter]').forEach(chip => chip.addEventListener('click', () => {
      status=chip.dataset.historyFilter;
      document.querySelectorAll('[data-history-filter]').forEach(other => other.setAttribute('aria-pressed',String(other===chip))); filter();
    }));
    historySearch.addEventListener('input',filter);
    document.querySelector('[data-reset-history]').addEventListener('click', () => {
      status='all'; historySearch.value='';
      document.querySelectorAll('[data-history-filter]').forEach(chip => chip.setAttribute('aria-pressed',String(chip.dataset.historyFilter==='all'))); filter();
    }); filter();
  }
  if (document.querySelector('[data-request-id]')) {
    const id = new URLSearchParams(location.search).get('request');
    let found=false;
    document.querySelectorAll('[data-request-id]').forEach(article => { const match=requestIds.includes(id) && article.dataset.requestId===id; article.hidden=!match; if(match) found=true; });
    document.querySelector('[data-request-not-found]').hidden=found;
  }
  document.querySelectorAll('[data-demo-payment]').forEach(button => button.addEventListener('click', () => {
    button.parentElement.querySelector('[data-payment-message]').hidden=false;
  }));

  const profileForm = document.querySelector('#profile-form');
  if (profileForm) {
    const fields=['firstName','lastName','nationalId','birthDate','alternatePhone','postalCode','gender','city','address'];
    const existing=read(keys.profile) || {firstName:'کاربر',lastName:'نمونه',city:'شیراز'};
    fields.forEach(name => { profileForm.elements.namedItem(name).value=existing[name] || ''; });
    profileForm.querySelectorAll('[data-normalize-digits]').forEach(input => input.addEventListener('input', () => { input.value=normalizeDigits(input.value);
      if (input.name === 'birthDate') {
        const digits=input.value.replace(/\D/g,'').slice(0,8);
        input.value=[digits.slice(0,4),digits.slice(4,6),digits.slice(6,8)].filter(Boolean).join('/');
      } }));
    profileForm.addEventListener('submit', event => {
      event.preventDefault(); if (!session()) { renderAccount(); return; }
      profileForm.classList.add('was-validated');
      if (!profileForm.checkValidity()) { profileForm.querySelector(':invalid').focus(); return; }
      const profile={}; fields.forEach(name => { profile[name]=profileForm.elements.namedItem(name).value.trim(); });
      if (!profile.firstName || !profile.lastName) { setMessage(document.querySelector('#profile-feedback'),'نام و نام خانوادگی را کامل وارد کنید.'); return; }
      const saved=write(keys.profile,profile);
      setMessage(document.querySelector('#profile-feedback'),saved ? 'تغییرات فقط در نشست نمایشی همین مرورگر ذخیره شدند.' : 'امکان ذخیره تغییرات در مرورگر وجود ندارد.'); renderAccount();
    });
  }
  document.querySelector('#confirm-logout')?.addEventListener('click', () => {
    Object.values(keys).forEach(remove); renderAccount();
    setMessage(document.querySelector('#logout-feedback'),'از حساب نمایشی خارج شدید.');
    document.querySelector('#confirm-logout').disabled=true;
  });
})();
