(() => {
  const cfg = window.RENNOX_CONFIG || {};
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // ---------- Header: solid on scroll + mobile menu ----------
  const header = $('.header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const toggle = $('.nav-toggle');
  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  toggle.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('.mobile-menu a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));

  // Active nav link by section in view
  const links = $$('.nav-list .nav-link');
  const sections = links.map((l) => $(l.getAttribute('href'))).filter(Boolean);
  const navObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === `#${en.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => navObs.observe(s));

  // ---------- Reveal on scroll + stat counters ----------
  // Headless browsers (full-page screenshots, crawlers) never scroll: show everything at once.
  if (navigator.webdriver) {
    $$('.reveal').forEach((el) => el.classList.add('is-in'));
    $$('img[loading="lazy"]').forEach((img) => (img.loading = 'eager'));
  }
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      revealObs.unobserve(en.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el, i) => {
    // light stagger for siblings in the same grid
    const idx = [...el.parentElement.children].filter((c) => c.classList.contains('reveal')).indexOf(el);
    el.style.transitionDelay = `${Math.min(idx, 5) * 80}ms`;
    revealObs.observe(el);
  });

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const countObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      countObs.unobserve(en.target);
      const el = en.target;
      const to = +el.dataset.count;
      if (reduce) return;
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / 1600);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => countObs.observe(el));

  // ---------- About tabs ----------
  const tabs = $$('.tab-btn');
  tabs.forEach((btn) => btn.addEventListener('click', () => {
    tabs.forEach((b) => {
      const on = b === btn;
      b.setAttribute('aria-selected', String(on));
      $(`#${b.getAttribute('aria-controls')}`).hidden = !on;
    });
  }));

  // ---------- Service "Get a quote" links preselect the form ----------
  $$('[data-service]').forEach((a) => a.addEventListener('click', () => {
    const sel = $('#f-service');
    if (sel) sel.value = a.dataset.service;
  }));

  // ---------- Reviews slider ----------
  const track = $('.js-review-track');
  const dotsWrap = $('.js-dots');
  let current = 0;
  let timer;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function renderReviews(list) {
    track.innerHTML = list.map((r, i) => `
      <figure class="review${i === 0 ? ' is-active' : ''}" aria-roledescription="slide" aria-label="Review ${i + 1} of ${list.length}">
        <div class="stars" aria-label="${r.rating} out of 5 stars">${'★'.repeat(Math.round(r.rating))}${'☆'.repeat(5 - Math.round(r.rating))}</div>
        <blockquote>“${esc(r.text.length > 240 ? r.text.slice(0, 237).trimEnd() + '…' : r.text)}”</blockquote>
        <figcaption class="review-author">
          <span class="review-avatar">${r.photo ? `<img src="${esc(r.photo)}" alt="" referrerpolicy="no-referrer" loading="lazy">` : esc(r.author.charAt(0))}</span>
          <span><b>${esc(r.author)}</b><small>${esc(r.when || '')} · Google review</small></span>
          <svg class="g-mini" aria-hidden="true"><use href="#i-google"/></svg>
        </figcaption>
      </figure>`).join('');
    dotsWrap.innerHTML = list.map((_, i) => `<button class="dot${i === 0 ? ' is-active' : ''}" aria-label="Show review ${i + 1}"></button>`).join('');
    $$('.dot', dotsWrap).forEach((d, i) => d.addEventListener('click', () => go(i, true)));
    current = 0;
    autoplay();
  }
  function go(i, user) {
    const slides = $$('.review', track);
    const dots = $$('.dot', dotsWrap);
    if (!slides.length) return;
    current = (i + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle('is-active', k === current));
    dots.forEach((d, k) => d.classList.toggle('is-active', k === current));
    if (user) autoplay();
  }
  function autoplay() {
    clearInterval(timer);
    if (!reduce) timer = setInterval(() => go(current + 1), 7000);
  }
  $('.js-prev').addEventListener('click', () => go(current - 1, true));
  $('.js-next').addEventListener('click', () => go(current + 1, true));
  renderReviews(cfg.fallbackReviews || []);

  // Live Google reviews via Places API (New), loaded only when the section approaches the viewport.
  const g = cfg.google || {};
  if (g.placeId && g.apiKey) {
    const reviewsObs = new IntersectionObserver(async (entries) => {
      if (!entries[0].isIntersecting) return;
      reviewsObs.disconnect();
      try {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(g.apiKey)}&v=weekly&loading=async&callback=__rnxMaps`;
          window.__rnxMaps = res;
          s.onerror = rej;
          document.head.appendChild(s);
        });
        const { Place } = await google.maps.importLibrary('places');
        const place = new Place({ id: g.placeId });
        await place.fetchFields({ fields: ['rating', 'userRatingCount', 'reviews', 'googleMapsURI'] });
        if (place.rating) $('.js-rating').textContent = place.rating.toFixed(1);
        if (place.userRatingCount) $('.js-count').textContent = place.userRatingCount;
        if (place.googleMapsURI) $('.js-g-all').href = place.googleMapsURI;
        $('.js-g-write').href = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(g.placeId)}`;
        const reviews = (place.reviews || [])
          .filter((r) => r.text && r.rating >= 4)
          .map((r) => ({
            author: r.authorAttribution?.displayName || 'Google user',
            photo: r.authorAttribution?.photoURI,
            rating: r.rating,
            when: r.relativePublishTimeDescription,
            text: r.text,
          }));
        if (reviews.length) renderReviews(reviews);
      } catch (err) {
        console.warn('Google reviews could not be loaded; showing fallback.', err);
      }
    }, { rootMargin: '400px' });
    reviewsObs.observe($('#reviews'));
  }

  // ---------- Forms ----------
  $$('.js-form').forEach((form) => {
    const note = form.nextElementSibling?.classList.contains('form-note') ? form.nextElementSibling : $('.form-note', form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const required = $$('[required]', form);
      const invalid = required.filter((f) => !f.value.trim() || (f.type === 'tel' && f.value.replace(/\D/g, '').length < 7));
      required.forEach((f) => f.style.borderColor = invalid.includes(f) ? 'var(--red)' : '');
      if (invalid.length) {
        note.classList.remove('ok');
        note.textContent = 'Please enter a valid phone number' + (invalid.length > 1 || invalid[0].type !== 'tel' ? ' and fill in the required fields.' : '.');
        invalid[0].focus();
        return;
      }
      const btn = $('button[type="submit"]', form);
      btn.disabled = true;
      const data = Object.fromEntries(new FormData(form));
      data.form = form.dataset.form;
      data.page = location.href;
      try {
        if (cfg.formEndpoint) {
          const res = await fetch(cfg.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
          if (!res.ok) throw new Error(res.status);
        }
        form.reset();
        note.classList.add('ok');
        note.textContent = 'Thank you! We\'ll call you back within a few hours.';
        // Conversion event for Google Ads / GA4 / Meta if their tags are installed.
        window.dataLayer?.push({ event: 'generate_lead', form: data.form, service: data.service });
        window.gtag?.('event', 'generate_lead', { form: data.form });
        window.fbq?.('track', 'Lead');
      } catch {
        note.classList.remove('ok');
        note.textContent = 'Something went wrong. Please call us at +1 (305) 555-0123.';
      } finally {
        btn.disabled = false;
      }
    });
  });

  // Click tracking for phone + CTA buttons (forwarded to GTM if present)
  $$('[data-track]').forEach((el) => el.addEventListener('click', () => window.dataLayer?.push({ event: 'cta_click', cta: el.dataset.track })));

  $('.js-year').textContent = new Date().getFullYear();
})();
