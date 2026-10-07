/* Preduzetničke skakaonice: interactions
   Everything degrades gracefully: content is visible without JS, and with
   prefers-reduced-motion the animations are skipped. */

(() => {
  const EVENT_START = new Date('2026-11-21T09:00:00+01:00'); // time is a placeholder until the agenda is final
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  /* ---------- Menu ---------- */
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.menu');
  const setMenu = open => {
    document.body.classList.toggle('menu-open', open);
    toggle?.setAttribute('aria-expanded', String(open));
    menu?.setAttribute('aria-hidden', String(!open));
    if (window.__lenis) open ? window.__lenis.stop() : window.__lenis.start();
  };
  toggle?.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Brand arrows on buttons ----------
     At rest the arrow is the first part of the logo line (it rises and turns right). On hover the
     head travels along the rest of the logo line while the view pulls back to the full logo arrow.
     The HTML already holds the resting frame, so nothing jumps before this script runs. */
  const WAVE = 'M2.5 76C5.5 62 11 56 18 56C25 56 30 60 34 63C38 66 42 68.5 47.5 68.5C66 68.5 80 40 92 9';
  const ARROW_HEAD = [[2, 0], [.35, 1.67], [-1.1, 1.67], [.05, .5], [.05, -.5], [-1.1, -1.67], [.35, -1.67]]; // in stroke widths
  const REST_DRAWN = .2, REST_SCALE = 1.7, REST_SHIFT = [22.8, -66.7], SW_REST = 8, SW_LOGO = 6;
  // Hover-in runs a touch longer than the label shift; hover-out matches the label's .35s exactly
  const ARROW_IN_MS = 380, ARROW_OUT_MS = 350;
  const lerp = (a, b, t) => a + (b - a) * t;
  document.querySelectorAll('.btn svg.ba').forEach(svg => {
    const g = svg.querySelector('g'), path = g.querySelector('path'), head = g.querySelector('polygon');
    path.setAttribute('d', WAVE);
    const total = path.getTotalLength();
    // z = how far the view has pulled back, d = how much of the logo line is drawn (both 0..1)
    const draw = (z, d) => {
      const sc = lerp(REST_SCALE, 1, z);
      const sw = lerp(SW_REST, SW_LOGO, z) / sc, len = total * lerp(REST_DRAWN, 1, d);
      g.setAttribute('transform', `translate(${lerp(REST_SHIFT[0], 0, z)} ${lerp(REST_SHIFT[1], 0, z)}) scale(${sc})`);
      path.setAttribute('stroke-width', sw);
      path.style.strokeDasharray = `${len} ${total}`;
      const tip = path.getPointAtLength(len), back = path.getPointAtLength(Math.max(0, len - 1));
      const ang = Math.atan2(tip.y - back.y, tip.x - back.x), c = Math.cos(ang), s = Math.sin(ang);
      head.setAttribute('points', ARROW_HEAD.map(([u, v]) =>
        `${(tip.x + (u * c - v * s) * sw).toFixed(2)},${(tip.y + (u * s + v * c) * sw).toFixed(2)}`).join(' '));
    };
    // Each hover change starts a new tween from wherever the arrow is now.
    // In: the view pulls back faster than the head travels, so the head never leaves the tile.
    // Out: both ease back together on the same curve as the label.
    let z = 0, d = 0, raf = 0;
    const go = forward => {
      cancelAnimationFrame(raf);
      const z0 = z, d0 = d, ms = forward ? ARROW_IN_MS : ARROW_OUT_MS;
      if (reduceMotion) { z = d = forward ? 1 : 0; draw(z, d); return; }
      let start = 0;
      const tick = now => {
        if (!start) start = now;
        const u = Math.min(1, (now - start) / ms);
        if (forward) {
          z = z0 + (1 - z0) * (1 - Math.pow(1 - u, 5));
          d = d0 + (1 - d0) * (1 - Math.pow(1 - u, 2));
        } else {
          const k = Math.pow(1 - u, 4);
          z = z0 * k; d = d0 * k;
        }
        draw(z, d);
        if (u < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    draw(0, 0);
    const btn = svg.closest('.btn');
    btn.addEventListener('mouseenter', () => go(true));
    btn.addEventListener('mouseleave', () => go(false));
    btn.addEventListener('focus', () => go(true));
    btn.addEventListener('blur', () => go(false));
  });

  /* ---------- Nav background + hide on scroll down ---------- */
  const nav = document.querySelector('.nav');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    nav?.classList.toggle('scrolled', y > 40);
    nav?.classList.toggle('hidden', y > 400 && y > lastY && !document.body.classList.contains('menu-open'));
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Countdown ---------- */
  const cd = document.querySelector('[data-countdown]');
  if (cd) {
    const parts = ['d', 'h', 'm', 's'].map(k => cd.querySelector(`[data-cd="${k}"]`));
    const tick = () => {
      let diff = Math.max(0, EVENT_START - new Date());
      const d = Math.floor(diff / 864e5); diff -= d * 864e5;
      const h = Math.floor(diff / 36e5); diff -= h * 36e5;
      const m = Math.floor(diff / 6e4); diff -= m * 6e4;
      const s = Math.floor(diff / 1e3);
      [d, h, m, s].forEach((v, i) => { if (parts[i]) parts[i].textContent = String(v).padStart(2, '0'); });
    };
    tick(); setInterval(tick, 1000);
  }

  /* ---------- FAQ tabs ---------- */
  document.querySelectorAll('[data-tabs]').forEach(group => {
    const tabs = group.querySelectorAll('[role="tab"]');
    tabs.forEach(tab => tab.addEventListener('click', () => {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      window.ScrollTrigger?.refresh();
    }));
  });
  // only one FAQ item open at a time within a list
  document.querySelectorAll('.faq-panel').forEach(panel => {
    panel.querySelectorAll('details').forEach(d => d.addEventListener('toggle', () => {
      if (d.open) panel.querySelectorAll('details[open]').forEach(o => { if (o !== d) o.open = false; });
    }));
  });

  /* ---------- Lightbox (gallery page) ---------- */
  const lb = document.querySelector('.lightbox');
  if (lb) {
    const lbImg = lb.querySelector('img');
    const items = [...document.querySelectorAll('[data-lightbox]')];
    let idx = 0;
    const show = i => { idx = (i + items.length) % items.length; lbImg.src = items[idx].getAttribute('href'); lbImg.alt = items[idx].querySelector('img')?.alt || ''; };
    const open = i => { show(i); lb.hidden = false; document.body.style.overflow = 'hidden'; window.__lenis?.stop(); lb.querySelector('.lb-close').focus(); };
    const close = () => { lb.hidden = true; document.body.style.overflow = ''; window.__lenis?.start(); items[idx]?.focus(); };
    items.forEach((a, i) => a.addEventListener('click', e => { e.preventDefault(); open(i); }));
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.querySelector('.lb-prev').addEventListener('click', () => show(idx - 1));
    lb.querySelector('.lb-next').addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    document.addEventListener('keydown', e => {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  /* ---------- Contact form: sends straight to our inbox through FormSubmit (formsubmit.co) ----------
     A topic option can send to its own address (data-to); ?tema=<data-key> preselects a topic.
     Each address is activated once: the first send emails an "Activate Form" link to that inbox. */
  document.querySelectorAll('[data-contact-form]').forEach(form => {
    const key = new URLSearchParams(location.search).get('tema');
    const preset = key && form.querySelector(`option[data-key="${CSS.escape(key)}"]`);
    if (preset) preset.selected = true;
    const status = form.querySelector('.form-status');
    const button = form.querySelector('button[type="submit"]');
    const setStatus = (text, cls = '') => { status.textContent = text; status.className = `note form-status ${cls}`; };
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(form);
      if (f.get('_honey')) return; // filled only by spam bots
      const to = form.querySelector('select[name="tema"]')?.selectedOptions[0]?.dataset.to || form.dataset.contactForm;
      button.disabled = true;
      setStatus('Šaljem…');
      try {
        const res = await fetch(`https://formsubmit.co/ajax/${to}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            'Ime i prezime': f.get('ime'),
            email: f.get('email'),
            Tema: f.get('tema'),
            Poruka: f.get('poruka'),
            _subject: `[Skakaonice] ${f.get('tema')} – ${f.get('ime')}`,
            _template: 'table',
            _captcha: 'false'
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || String(data.success) !== 'true') throw new Error(data.message || res.status);
        form.reset();
        setStatus('Hvala! Poruka je poslata, javljamo se uskoro.', 'ok');
      } catch {
        setStatus(`Poruka nije poslata. Pokušaj ponovo ili piši direktno na ${to}.`, 'err');
      } finally {
        button.disabled = false;
      }
    });
  });

  /* ---------- Stickers: rest on the top edge of the headline's capital letters ----------
     The cap-letter top is computed from the font's real metrics, so the overlap is the same
     for every headline size and screen width. */
  const measureCtx = document.createElement('canvas').getContext('2d');
  // Default overlap as a fraction of the sticker height. Negative lifts the sticker so only
  // its tilted corner grazes the headline.
  const DEFAULT_OVERLAP = -0.1;
  const placeStickers = () => {
    document.querySelectorAll('.sticker:not(.flat)').forEach(s => {
      const host = s.offsetParent;
      const h = s.parentElement.querySelector('h1, h2, h3, .display');
      if (!host || !h) return;
      const cs = getComputedStyle(h);
      const fs = parseFloat(cs.fontSize);
      const lh = cs.lineHeight === 'normal' ? fs * 1.2 : parseFloat(cs.lineHeight);
      measureCtx.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
      const m = measureCtx.measureText('H');
      const ascent = m.fontBoundingBoxAscent ?? fs * .97;
      const descent = m.fontBoundingBoxDescent ?? fs * .25;
      const halfLeading = (lh - (ascent + descent)) / 2;
      const capTopInLine = halfLeading + ascent - m.actualBoundingBoxAscent;
      const hTop = h.getBoundingClientRect().top - host.getBoundingClientRect().top + parseFloat(cs.paddingTop);
      // data-overlap overrides the default with a fraction of the sticker height (0 = rests on the letters).
      const custom = parseFloat(s.dataset.overlap);
      const overlap = Number.isNaN(custom)
        ? s.offsetHeight * DEFAULT_OVERLAP
        : s.offsetHeight * custom;
      s.style.top = `${hTop + capTopInLine - s.offsetHeight + overlap}px`;
    });
  };
  placeStickers();
  (document.fonts?.ready || Promise.resolve()).then(placeStickers);
  let stickerTimer;
  window.addEventListener('resize', () => { clearTimeout(stickerTimer); stickerTimer = setTimeout(placeStickers, 120); });

  /* ---------- Placeholder buttons ("Prijave uskoro") ---------- */
  document.querySelectorAll('[aria-disabled="true"]').forEach(b => b.addEventListener('click', e => e.preventDefault()));

  if (!hasGsap || reduceMotion) return;

  /* ---------- Motion ---------- */
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(window.SplitText);

  // Smooth scroll (Lenis) driven by GSAP's ticker
  if (window.Lenis) {
    const lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length > 1 && document.querySelector(id)) { e.preventDefault(); lenis.scrollTo(id, { offset: -90 }); }
    }));
  }

  // Wait for fonts so text splits measure correctly
  (document.fonts?.ready || Promise.resolve()).then(() => {
    // Headline reveal: lines slide up from a mask
    document.querySelectorAll('[data-split]').forEach(el => {
      if (!window.SplitText) return;
      const split = new window.SplitText(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
      gsap.from(split.lines, {
        yPercent: 110, duration: 1, ease: 'power4.out', stagger: .08,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });

    // Scroll-scrubbed fill: words go from muted to full color as you scroll
    document.querySelectorAll('[data-fill]').forEach(el => {
      if (!window.SplitText) return;
      const split = new window.SplitText(el, { type: 'words', wordsClass: 'word' });
      const to = getComputedStyle(el).color;
      gsap.to(split.words, {
        color: to, stagger: .1, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true },
      });
    });

    // Generic fade-up reveals
    gsap.utils.toArray('[data-reveal]').forEach(el => {
      gsap.from(el, { y: 40, autoAlpha: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    gsap.utils.toArray('[data-stagger]').forEach(group => {
      gsap.from(group.children, { y: 50, autoAlpha: 0, duration: .9, ease: 'power3.out', stagger: .1, scrollTrigger: { trigger: group, start: 'top 85%', once: true } });
    });

    // Hero image: gentle zoom-out on load and parallax on scroll
    const heroImg = document.querySelector('.hero-media img');
    if (heroImg) {
      gsap.from(heroImg, { scale: 1.15, duration: 1.6, ease: 'power3.out' });
      gsap.to(heroImg, { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.hero-media', start: 'top top', end: 'bottom top', scrub: true } });
    }
    gsap.from('.hero .sticker', { scale: 0, rotate: -40, duration: .8, delay: .5, ease: 'back.out(2)' });

    // Stickers pop in when their heading enters
    gsap.utils.toArray('.heading .sticker, .page-hero .sticker').forEach(s => {
      gsap.from(s, { scale: 0, rotate: -40, duration: .7, ease: 'back.out(2)', scrollTrigger: { trigger: s, start: 'top 90%', once: true } });
    });

    // Floating photos drift past the statement text at different speeds
    gsap.utils.toArray('.floater').forEach((f, i) => {
      const dir = i % 2 ? 1 : -1;
      gsap.fromTo(f, { y: 160 + i * 40, rotate: dir * 6 }, {
        y: -160 - i * 40, rotate: -dir * 4, ease: 'none',
        scrollTrigger: { trigger: f.closest('.statement'), start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    // Count-up stats
    gsap.utils.toArray('[data-count]').forEach(el => {
      const end = parseFloat(el.dataset.count); const suffix = el.dataset.suffix || '';
      const obj = { v: 0 };
      gsap.to(obj, { v: end, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true },
        onUpdate: () => { el.textContent = Math.round(obj.v) + suffix; } });
    });

    // Gallery: pin the section and slide the track sideways (desktop); native swipe on mobile
    const mm = gsap.matchMedia();
    mm.add('(min-width: 761px)', () => {
      const pin = document.querySelector('.gallery-pin');
      const track = document.querySelector('.gallery-track');
      if (!pin || !track) return;
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true },
      });
      gsap.from(track.children, { y: 80, scale: .9, autoAlpha: 0, stagger: .08, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: pin, start: 'top 70%', once: true } });
    });

    // Agenda steps highlight as they pass the middle of the screen
    gsap.utils.toArray('.step').forEach(step => {
      ScrollTrigger.create({ trigger: step, start: 'top 60%', end: 'bottom 40%', toggleClass: 'is-active' });
    });

    // Parallax background on CTA band
    gsap.utils.toArray('.cta-band .bg').forEach(bg => {
      gsap.fromTo(bg, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: bg.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // Big footer wordmark rises in
    gsap.utils.toArray('.footer-big').forEach(el => {
      gsap.from(el, { yPercent: 60, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom bottom', scrub: true } });
    });

    ScrollTrigger.refresh();
  });
})();
