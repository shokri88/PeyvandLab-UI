/* Frontend prototype only. Patient fields/files remain in the current DOM, never persisted or sent. */
'use strict';
(() => {
  const form = document.querySelector('#admission-wizard');
  if (!form) return;
  const byId = id => document.getElementById(id);
  const steps = [...form.querySelectorAll('[data-ad-step]')];
  const digits = value => value.replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c));
  const fa = number => new Intl.NumberFormat('fa', {useGrouping:false}).format(number);
  const active = () => { try { const s = JSON.parse(sessionStorage.getItem('peyvand.demoSession')); return Boolean(s?.active && s.expiresAt > Date.now()); } catch { return false; } };
  const value = name => form.elements.namedItem(name)?.value?.trim() || '';
  const birthYear = byId('birth-year'), birthMonth = byId('birth-month'), birthDay = byId('birth-day');
  const persianParts = date => Object.fromEntries(new Intl.DateTimeFormat('en-US-u-ca-persian', {timeZone:'UTC',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(date).map(p => [p.type, Number(p.value)]));
  const today = persianParts(new Date());
  const option = (select, value, label) => select.add(new Option(label, String(value)));
  for (let y=today.year; y>=today.year-120; y--) option(birthYear,y,fa(y));
  const months = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  const isLeap = year => {
    for (let day=19; day<=22; day++) {
      const p = persianParts(new Date(Date.UTC(year+622,2,day)));
      if (p.year===year && p.month===12 && p.day===30) return true;
    }
    return false;
  };
  function birthOptions() {
    const year=Number(birthYear.value), oldMonth=birthMonth.value, oldDay=birthDay.value;
    birthMonth.length=1;
    months.forEach((name,i) => { if (!year || year!==today.year || i<today.month) option(birthMonth,i+1,name); });
    birthMonth.value=oldMonth;
    const month=Number(birthMonth.value);
    let days=month<=6?31:month<=11?30:isLeap(year)?30:29;
    if (year===today.year && month===today.month) days=today.day;
    birthDay.length=1;
    if (year && month) for(let d=1;d<=days;d++) option(birthDay,d,fa(d));
    birthDay.value=oldDay;
    birthDay.disabled=!year || !month;
    byId('birth-date').value=year && month && birthDay.value ? `${year}/${String(month).padStart(2,'0')}/${birthDay.value.padStart(2,'0')}` : '';
  }
  [birthYear,birthMonth,birthDay].forEach(select => select.addEventListener('change',birthOptions));
  form.addEventListener('reset',() => setTimeout(birthOptions,0));
  birthOptions();
  let current = 0;
  function error(message, field) {
    byId('ad-error').textContent = message;
    byId('ad-error').hidden = false;
    if (field) { field.setAttribute('aria-invalid','true'); field.setAttribute('aria-describedby','ad-error'); field.focus(); }
  }
  function conditional() {
    const home = value('service') === 'home';
    byId('home-fields').hidden = !home;
    ['city','address'].forEach(id => { byId(id).required = home; byId(id).disabled = !home; });
    const image = value('prescription') === 'image';
    byId('prescription-code-fields').hidden = image;
    byId('prescription-image-fields').hidden = !image;
    ['prescription-code','prescription-code-2'].forEach(id => byId(id).disabled = image);
    byId('prescription-code').required = !image;
    byId('prescription-image').disabled = !image;
    byId('prescription-image').required = image;
    [['insurance-other',value('insurance') === 'سایر'],['supplementary-name',value('supplementary') === 'دارم']].forEach(([id,show]) => {
      const input = byId(id); input.closest('.ad-field').hidden = !show; input.disabled = !show; input.required = show;
    });
    byId('gender').required = true;
    byId('insurance').required = true;
    const foreign = byId('foreign-patient').checked;
    form.querySelector('label[for="national-id"]').textContent = foreign ? 'شناسه اتباع یا شماره گذرنامه *' : 'کد ملی *';
    byId('national-id').inputMode = foreign ? 'text' : 'numeric';
  }
  function review() {
    const root = byId('ad-review'); root.replaceChildren();
    const fileName = id => byId(id).files[0]?.name || 'انتخاب نشده';
    const groups = [
      [1,'نوع خدمت',[['خدمت',value('service') === 'home' ? 'نمونه‌گیری در منزل' : 'نمونه‌گیری در آزمایشگاه']]],
      [2,'اطلاعات بیمار',[['نام بیمار',value('patient-name')],['شناسه',value('national-id')],['تاریخ تولد',value('birth-date')],['جنسیت',value('gender')],['همراه',value('mobile')],['تلفن دیگر',value('alternate-phone') || '—'],...(value('service') === 'home' ? [['شهر',value('city')],['نشانی',value('address')]] : [])]],
      [3,'نسخه',value('prescription') === 'image' ? [['فایل نسخه',fileName('prescription-image')]] : [['کد رهگیری',value('prescription-code')],['کد نسخه دوم',value('prescription-code-2') || '—']]],
      [4,'مدارک و بیمه',[['بیمه پایه',value('insurance') === 'سایر' ? value('insurance-other') : value('insurance')],['بیمه تکمیلی',value('supplementary') === 'دارم' ? value('supplementary-name') : 'ندارم'],['مدرک شناسایی',fileName('id-image')]]]
    ];
    groups.forEach(([index,title,fields]) => {
      const section = document.createElement('div'); section.className = 'ad-review-row';
      const header = document.createElement('header'); const strong = document.createElement('strong'); strong.textContent = title;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-sm btn-outline-primary'; button.textContent = 'ویرایش'; button.setAttribute('aria-label','ویرایش '+title); button.addEventListener('click',() => show(index));
      header.append(strong,button); const dl = document.createElement('dl');
      fields.forEach(([label,text]) => { const dt = document.createElement('dt'); dt.textContent = label; const dd = document.createElement('dd'); dd.textContent = text; dl.append(dt,dd); });
      section.append(header,dl); root.append(section);
    });
  }
  function show(index, focus=true) {
    current = index; conditional();
    steps.forEach((el,i) => { el.hidden = i !== index; });
    document.querySelectorAll('[data-ad-progress]').forEach((el,i) => {
      el.classList.toggle('is-done',i < index);
      if (i === index) el.setAttribute('aria-current','step'); else el.removeAttribute('aria-current');
    });
    byId('ad-counter').textContent = `مرحله ${fa(index+1)} از ۶`;
    byId('ad-back').hidden = index === 0;
    byId('ad-next').hidden = index === 0 && !active();
    byId('ad-next').textContent = index === 5 ? 'تکمیل پیش‌نمایش پذیرش' : 'ادامه';
    byId('ad-error').hidden = true;
    byId('ad-login').hidden = active(); byId('ad-signed-in').hidden = !active();
    if (index === 5) review();
    if (focus) byId('ad-title-'+index).focus();
  }
  function valid(index) {
    const fields = [...steps[index].querySelectorAll('input, select, textarea')].filter(el => !el.disabled);
    for (const field of fields) {
      field.setCustomValidity('');
      if (field.type === 'text' && field.required && !field.value.trim()) field.setCustomValidity('این فیلد را تکمیل کنید.');
      if (field.hasAttribute('data-upload') && field.files.length) {
        const file = field.files[0];
        if (!['image/jpeg','image/png','application/pdf'].includes(file.type) || !/\.(jpe?g|png|pdf)$/i.test(file.name)) field.setCustomValidity('فایل باید JPG، PNG یا PDF باشد.');
        else if (file.size > 10*1024*1024 || file.size === 0) field.setCustomValidity('فایل باید غیرخالی و حداکثر ۱۰ مگابایت باشد.');
      }
      if (field.id === 'national-id') {
        const n = field.value;
        if (byId('foreign-patient').checked) {
          if (!/^[a-zA-Z0-9]{5,20}$/.test(n)) field.setCustomValidity('شناسه اتباع یا گذرنامه را با ۵ تا ۲۰ حرف یا رقم وارد کنید.');
        } else {
          const sum = [...n.slice(0,9)].reduce((s,c,i) => s+Number(c)*(10-i),0)%11;
          if (!/^\d{10}$/.test(n) || /^(\d)\1{9}$/.test(n) || Number(n[9]) !== (sum < 2 ? sum : 11-sum)) field.setCustomValidity('کد ملی معتبر ۱۰ رقمی وارد کنید.');
        }
      }
      if (field.id === 'mobile') {
        field.value = field.value.replace(/[\s-]/g,'').replace(/^\+?98(?=9\d{9}$)/,'0');
        if (!/^09\d{9}$/.test(field.value)) field.setCustomValidity('شماره همراه ۱۱ رقمی با ۰۹ وارد کنید.');
      }
      if (field.id === 'alternate-phone' && field.value && !/^0\d{10}$/.test(field.value)) field.setCustomValidity('شماره تلفن ۱۱ رقمی با کد شهر وارد کنید.');
      if (field.id.startsWith('prescription-code') && field.value && !/^\d{3,30}$/.test(field.value)) field.setCustomValidity('کد نسخه را با ۳ تا ۳۰ رقم وارد کنید.');
      if (field.id === 'birth-day') {
        const parts = byId('birth-date').value.match(/^(1[23]\d{2})\/(\d{1,2})\/(\d{1,2})$/);
        let ok = false;
        if (parts) {
          const [,y,m,d] = parts.map(Number);
          const today = new Intl.DateTimeFormat('en-US-u-ca-persian', {year:'numeric',month:'numeric',day:'numeric'}).formatToParts(new Date());
          const t = Object.fromEntries(today.map(p=>[p.type,Number(p.value)]));
          // Persian calendar leap years can be validated via Intl by advancing from Nowruz.
          const gregorian = new Date(Date.UTC(y+621,2,20));
          let nowruz;
          for(let offset=-2;offset<=3;offset++) {
            const test = new Date(gregorian.getTime()+offset*86400000);
            const p = Object.fromEntries(new Intl.DateTimeFormat('en-US-u-ca-persian',{timeZone:'UTC',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(test).map(x=>[x.type,Number(x.value)]));
            if(p.year===y && p.month===1 && p.day===1) nowruz=test;
          }
          if (nowruz && m>=1 && m<=12 && d>=1 && d<=31) {
            const date = new Date(nowruz.getTime()+((m<=6?(m-1)*31:186+(m-7)*30)+d-1)*86400000);
            const p = Object.fromEntries(new Intl.DateTimeFormat('en-US-u-ca-persian',{timeZone:'UTC',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(date).map(x=>[x.type,Number(x.value)]));
            ok = p.year===y && p.month===m && p.day===d && y*10000+m*100+d <= t.year*10000+t.month*100+t.day;
          }
        }
        if(!ok) field.setCustomValidity('تاریخ شمسی معتبر و غیرآینده به شکل ۱۳۷۰/۰۱/۱۵ وارد کنید.');
      }
      if (!field.checkValidity()) { error(field.validity.valueMissing ? (field.type === 'checkbox' ? 'برای ادامه، این تأیید را علامت بزنید.' : field.type === 'radio' ? 'نوع خدمت را انتخاب کنید.' : 'این مورد را تکمیل یا انتخاب کنید.') : field.validationMessage,field); return false; }
    }
    return true;
  }
  form.addEventListener('submit',event => {
    event.preventDefault();
    if (!active()) { show(0); error('نشست نمایشی پایان یافته است؛ دوباره وارد شوید.'); return; }
    if (!valid(current)) return;
    if (current < 5) { show(current+1); return; }
    for (let i=1;i<5;i++) { if (!valid(i)) { show(i); valid(i); return; } }
    form.reset(); byId('ad-review').replaceChildren(); form.hidden = true; byId('ad-complete').hidden = false; byId('ad-complete').focus();
  });
  byId('ad-back').addEventListener('click',() => show(current-1));
  byId('ad-restart').addEventListener('click',() => { form.hidden=false; byId('ad-complete').hidden=true; show(active()?1:0); });
  form.addEventListener('input', event => {
    const input = event.target;
    if (input.hasAttribute('data-digits')) input.value = digits(input.value);
    input.setCustomValidity?.(''); input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); byId('ad-error').hidden = true;
  });
  form.addEventListener('change',() => { conditional(); if (current===5) review(); });
  form.querySelectorAll('[data-clear]').forEach(button => button.addEventListener('click',() => { const file=byId(button.dataset.clear); file.value=''; file.setCustomValidity(''); }));
  window.addEventListener('pageshow',() => { if (!active()) show(0,false); else if (current===0) show(1,false); });
  document.addEventListener('visibilitychange',() => { if (!document.hidden && !active()) show(0); });
  show(active()?1:0,false);
})();
