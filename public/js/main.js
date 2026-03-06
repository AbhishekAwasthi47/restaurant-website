/* ═══════════════════════════════════════════════
   Kaze (風) — Main JavaScript
   Features: Wind canvas, cursor, parallax, ripple,
   animated counters, progress bar, scroll-to-top,
   active nav, testimonials (swipe + arrows),
   FAQ, menu modal, booking, forms, blog, hours
══════════════════════════════════════════════════ */

'use strict';

// ── State ──────────────────────────────────────────
let menuData = [];
let currentCat = 'all';
let sliderPos = 0;
let totalSlides = 0;

const testimonials = [
    { name: 'Aiko M.', text: '"The sashimi moriawase was transcendent. Each piece told a story of the season. I have dined across Tokyo and Kyoto — Kaze belongs in that conversation."', stars: 5, date: 'February 2026' },
    { name: 'James T.', text: '"Chef Hiroshi\'s omakase was one of the best dining experiences of my life. The seasonal shun menu was poetry on a plate. We will be back every season."', stars: 5, date: 'January 2026' },
    { name: 'Sophie L.', text: '"From the moment we walked in to the last bite of matcha tiramisu, every detail was perfect. Booking was effortless, service was warm and impeccable."', stars: 5, date: 'December 2025' },
    { name: 'Ravi & Priya', text: '"We celebrated our anniversary here. The private arrangement Chef Hiroshi created was breathtaking. The Wagyu nigiri alone is worth travelling across the city."', stars: 5, date: 'November 2025' },
    { name: 'Camille D.', text: '"The most beautiful restaurant in the city — and the food surpassed even that first impression. The Kaze Ramen is truly life-changing."', stars: 5, date: 'October 2025' },
    { name: 'Marcus B.', text: '"Incredible attention to dietary requirements. They crafted a fully vegan omakase for me that was as impressive as the standard menu. Rare artistry."', stars: 5, date: 'September 2025' },
];

// ── Inject UI Elements ─────────────────────────────
(function injectUI() {
    // Progress bar
    const pb = document.createElement('div');
    pb.id = 'progress-bar';
    document.body.prepend(pb);

    // Scroll-to-top button
    const st = document.createElement('button');
    st.id = 'scroll-top';
    st.setAttribute('aria-label', 'Back to top');
    st.innerHTML = '↑';
    document.body.appendChild(st);
    st.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // FAQ icons — replace ::after with inline span
    document.querySelectorAll('.faq-question').forEach(btn => {
        const icon = document.createElement('span');
        icon.className = 'faq-icon';
        icon.textContent = '+';
        btn.appendChild(icon);
    });
})();

// ── Wind Canvas ────────────────────────────────────
(function initWindCanvas() {
    const canvas = document.getElementById('wind-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, particles = [];

    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * W;
            this.y = Math.random() * H;
            this.vx = (Math.random() - 0.35) * 0.5;
            this.vy = Math.random() * 0.35 - 0.15;
            this.r = Math.random() * 1.6 + 0.3;
            this.alpha = Math.random() * 0.22 + 0.04;
            this.life = 0;
            this.maxLife = Math.random() * 350 + 200;
        }
        update() {
            this.x += this.vx; this.y += this.vy; this.life++;
            if (this.life > this.maxLife || this.x < -10 || this.x > W + 10) this.reset();
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(107,155,111,${this.alpha})`;
            ctx.fill();
        }
    }
    for (let i = 0; i < 70; i++) particles.push(new Particle());
    (function loop() { ctx.clearRect(0, 0, W, H); particles.forEach(p => { p.update(); p.draw(); }); requestAnimationFrame(loop); })();
})();

// ── Custom Cursor ──────────────────────────────────
(function initCursor() {
    const dot = document.getElementById('cursor-wind');
    if (!dot || window.matchMedia('(pointer: coarse)').matches) return;
    let mx = -100, my = -100, cx = -100, cy = -100;
    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
    document.addEventListener('mouseleave', () => dot.style.opacity = '0');
    document.querySelectorAll('a, button, .menu-card, .seasonal-card, .blog-card, .faq-question').forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('cursor-expanded'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-expanded'));
    });
    (function loop() { cx += (mx - cx) * .15; cy += (my - cy) * .15; dot.style.left = cx + 'px'; dot.style.top = cy + 'px'; requestAnimationFrame(loop); })();
})();

// ── Scroll Progress Bar & Scroll-to-Top ───────────
(function initScrollProgress() {
    const bar = document.getElementById('progress-bar');
    const btn = document.getElementById('scroll-top');
    window.addEventListener('scroll', () => {
        const pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight) * 100;
        if (bar) bar.style.width = pct + '%';
        if (btn) btn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
})();

// ── Nav: scroll behaviour + active links ──────────
(function initNav() {
    const header = document.getElementById('site-header');
    const toggle = document.getElementById('nav-toggle');
    const links = document.getElementById('nav-links');
    const sections = document.querySelectorAll('section[id]');

    // Scroll class
    function onScroll() {
        header.classList.toggle('scrolled', window.scrollY > 60);

        // Active nav link
        let current = '';
        sections.forEach(s => { if (window.scrollY >= s.offsetTop - 140) current = s.id; });
        links?.querySelectorAll('a').forEach(a => {
            a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
        });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Mobile toggle
    toggle?.addEventListener('click', () => {
        const open = links.classList.toggle('open');
        toggle.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', open);
        document.body.style.overflow = open ? 'hidden' : '';
    });
    links?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
        links.classList.remove('open');
        toggle?.classList.remove('open');
        toggle?.setAttribute('aria-expanded', false);
        document.body.style.overflow = '';
    }));

    // Date inputs min
    const today = new Date().toISOString().split('T')[0];
    ['bw-date', 'r-date'].forEach(id => { const el = document.getElementById(id); if (el) { el.min = today; el.value = today; } });
})();

// ── Ripple effect on all buttons ──────────────────
document.addEventListener('click', e => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    const r = document.createElement('span');
    r.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(r);
    setTimeout(() => r.remove(), 600);
});

// ── Scroll Reveal ──────────────────────────────────
function initRevealAnimations() {
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => obs.observe(el));
}
initRevealAnimations();

// ── Footer Year ────────────────────────────────────
const fy = document.getElementById('footer-year');
if (fy) fy.textContent = new Date().getFullYear();

// ── Animated Number Counters ───────────────────────
function initCounters() {
    const els = document.querySelectorAll('.stat-num[data-target]');
    if (!els.length) return;
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            const el = e.target;
            const target = parseFloat(el.dataset.target);
            const suffix = el.dataset.suffix || '';
            const dur = 1800;
            const start = performance.now();
            function tick(now) {
                const t = Math.min(1, (now - start) / dur);
                const ease = 1 - Math.pow(1 - t, 3);
                const val = target < 100 ? Math.round(ease * target * 10) / 10 : Math.round(ease * target);
                el.textContent = val + suffix;
                if (t < 1) requestAnimationFrame(tick);
                else el.textContent = target + suffix;
            }
            requestAnimationFrame(tick);
            obs.unobserve(el);
        });
    }, { threshold: .5 });
    els.forEach(el => obs.observe(el));
}

// ── Parallax on Hero Image ────────────────────────
(function initParallax() {
    const img = document.getElementById('hero-img');
    if (!img || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    window.addEventListener('scroll', () => {
        const y = window.scrollY;
        img.style.transform = `translateY(${y * 0.3}px)`;
    }, { passive: true });
})();

// ── Seasonal Petals ────────────────────────────────
(function initPetals() {
    const container = document.getElementById('seasonal-petals');
    if (!container) return;
    const month = new Date().getMonth();
    const sym = month >= 2 && month <= 4 ? '🌸' : month >= 5 && month <= 7 ? '🍃' : month >= 8 && month <= 10 ? '🍂' : '❄️';
    for (let i = 0; i < 14; i++) {
        const p = document.createElement('div');
        p.className = 'petal';
        p.textContent = sym;
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (Math.random() * 9 + 7) + 's';
        p.style.animationDelay = (Math.random() * 12) + 's';
        p.style.fontSize = (Math.random() * .9 + .6) + 'rem';
        container.appendChild(p);
    }
})();

// ── Seasonal Section (dynamic by month) ───────────
function updateSeasonalSection() {
    const month = new Date().getMonth();
    const seasons = [
        { kanji: '冬', name: 'Winter Menu', desc: 'Warm broths and earthy root vegetables anchor our January table.', title: 'Winter Solstice' },
        { kanji: '冬', name: 'Winter Menu', desc: 'Rich umami flavours celebrate the final weeks of winter.', title: 'Deep Winter' },
        { kanji: '春', name: 'Spring Menu', desc: 'Cherry blossoms inspire our April omakase. Delicate, fleeting, and utterly beautiful.', title: 'Sakura Awakening' },
        { kanji: '春', name: 'Spring Menu', desc: 'Spring bamboo shoots and fresh herbs breathe life into every dish.', title: 'Bamboo & Blossom' },
        { kanji: '夏', name: 'Summer Menu', desc: 'Chilled sashimi and vibrant yuzu notes celebrate the heat of summer.', title: 'Summer Radiance' },
        { kanji: '夏', name: 'Summer Menu', desc: 'Light, bright, and refreshing — the best of summer on a plate.', title: 'Coastal Summer' },
        { kanji: '夏', name: 'Summer Menu', desc: 'Late summer harvests bring the sweetest of seasonal produce.', title: 'Late Summer Harvest' },
        { kanji: '秋', name: 'Autumn Menu', desc: 'Matsutake mushrooms and autumn squash lead our harvest omakase.', title: 'Autumn Harvest' },
        { kanji: '秋', name: 'Autumn Menu', desc: 'Earthy, warming, and deeply satisfying — the flavours of fall.', title: 'Fallen Leaves' },
        { kanji: '秋', name: 'Autumn Menu', desc: 'Persimmons and wild mushrooms paint our October menu in amber.', title: 'Amber October' },
        { kanji: '冬', name: 'Winter Menu', desc: 'Yuzu-glazed black cod and yukinko radish warm November nights.', title: 'First Frost' },
        { kanji: '冬', name: 'Winter Menu', desc: 'Our most indulgent menu of the year — crafted for cold December nights.', title: 'Winter Solstice' },
    ];
    const s = seasons[month];
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('season-kanji', s.kanji);
    set('season-label', s.name);
    set('season-title', s.title);
    set('season-desc', s.desc);
}
updateSeasonalSection();

// ── API helpers ────────────────────────────────────
async function apiFetch(path, opts = {}) {
    const r = await fetch(path, { headers: { 'Content-Type': 'application/json', ...opts.headers }, ...opts });
    return r.json();
}

// ── Menu ───────────────────────────────────────────
async function loadMenu() {
    try {
        const res = await apiFetch('/api/menu');
        menuData = res.dishes || [];
        renderMenuGrid(menuData);
        renderSeasonalDishes(menuData);
        initCounters();
    } catch (e) { console.error('Menu load failed:', e); }
}

function renderMenuGrid(dishes) {
    const grid = document.getElementById('menu-grid');
    if (!grid) return;
    const filtered = currentCat === 'all' ? dishes : dishes.filter(d => d.category === currentCat);
    if (!filtered.length) {
        grid.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:48px;grid-column:1/-1">No dishes in this category yet.</p>`;
        return;
    }
    grid.innerHTML = filtered.map(d => `
    <article class="menu-card${d.available === false ? ' menu-card-unavailable' : ''} reveal"
             data-id="${d.id}" role="button" tabindex="0"
             onclick="openDishModal('${d.id}')"
             onkeypress="if(event.key==='Enter')openDishModal('${d.id}')"
             aria-label="View ${d.name} details">
      <div class="menu-card-img-wrap">
        <img src="${d.image || '/uploads/placeholder-dish.jpg'}"
             class="menu-card-img" alt="${d.name}" loading="lazy" />
      </div>
      <div class="menu-card-body">
        <p class="menu-card-cat">${d.category}</p>
        <h3 class="menu-card-name">${d.name}</h3>
        <p class="menu-card-desc">${d.description}</p>
        <div class="menu-card-footer">
          <span class="menu-card-price">₹${d.price}</span>
        </div>
      </div>
    </article>
  `).join('');
    initRevealAnimations();
}

function renderSeasonalDishes(dishes) {
    const grid = document.getElementById('seasonal-dishes');
    if (!grid) return;
    const seasonal = dishes.filter(d => d.tags && d.tags.includes('seasonal')).slice(0, 3);
    if (!seasonal.length) return;
    grid.innerHTML = seasonal.map(d => `
    <div class="seasonal-card reveal">
      <img src="${d.image || '/uploads/placeholder-dish.jpg'}" class="seasonal-card-img" alt="${d.name}" loading="lazy" />
      <div class="seasonal-card-body">
        <h3 class="seasonal-card-name">${d.name}</h3>
        <p class="seasonal-card-desc">${d.description}</p>
        <div class="seasonal-card-price">₹${d.price}</div>
      </div>
    </div>
  `).join('');
    initRevealAnimations();
}

// ── Menu Tabs ──────────────────────────────────────
document.getElementById('menu-tabs')?.addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCat = btn.dataset.cat;
    renderMenuGrid(menuData);
});

// ── Dish Modal ─────────────────────────────────────
function openDishModal(id) {
    const dish = menuData.find(d => d.id === id);
    if (!dish) return;
    const overlay = document.getElementById('dish-modal');
    document.getElementById('modal-img').src = dish.image || '/uploads/placeholder-dish.jpg';
    document.getElementById('modal-img').alt = dish.name;
    document.getElementById('modal-dish-name').textContent = dish.name;
    document.getElementById('modal-desc').textContent = dish.description;
    document.getElementById('modal-price').textContent = `₹${dish.price}`;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}
function closeDishModal() {
    document.getElementById('dish-modal')?.classList.remove('open');
    document.body.style.overflow = '';
}
document.getElementById('modal-close')?.addEventListener('click', closeDishModal);
document.getElementById('dish-modal')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeDishModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDishModal(); });

// ── Quick Book Widget ──────────────────────────────
document.getElementById('quick-book-btn')?.addEventListener('click', () => {
    const guests = document.getElementById('bw-guests')?.value;
    const date = document.getElementById('bw-date')?.value;
    const time = document.getElementById('bw-time')?.value;
    if (guests) document.getElementById('r-guests').value = guests;
    if (date) document.getElementById('r-date').value = date;
    if (time) document.getElementById('r-time').value = time;
    document.getElementById('reserve')?.scrollIntoView({ behavior: 'smooth' });
});

// ── Reservation Form ───────────────────────────────
document.getElementById('reserve-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const btn = document.getElementById('reserve-submit');
    const loader = document.getElementById('reserve-loader');
    const label = document.getElementById('reserve-btn-text');
    btn.disabled = true; loader.hidden = false; label.hidden = true;
    const data = Object.fromEntries(new FormData(form));
    try {
        const res = await apiFetch('/api/reservations', { method: 'POST', body: JSON.stringify(data) });
        if (res.success) {
            form.hidden = true;
            const success = document.getElementById('reserve-success');
            success.hidden = false;
            document.getElementById('reserve-confirm-msg').textContent = `Reservation ID: ${res.reservation.id} — We'll confirm by email within 30 minutes.`;
        } else { alert(res.message || 'Something went wrong. Please try again.'); }
    } catch { alert('Network error. Please try again.'); }
    finally { btn.disabled = false; loader.hidden = true; label.hidden = false; }
});

// ── Contact Form ───────────────────────────────────
document.getElementById('contact-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Sending…';
    const data = Object.fromEntries(new FormData(form));
    try {
        const res = await apiFetch('/api/contact', { method: 'POST', body: JSON.stringify(data) });
        if (res.success) { form.hidden = true; document.getElementById('contact-success').hidden = false; }
        else { alert(res.message || 'Something went wrong.'); }
    } catch { alert('Network error. Please try again.'); }
    finally { btn.disabled = false; btn.textContent = 'Send Message'; }
});

// ── Testimonials Slider (swipe + arrows) ──────────
(function initTestimonials() {
    const sliderEl = document.querySelector('.testimonials-slider');
    const track = document.querySelector('.testimonials-track');
    const dotsEl = document.getElementById('slider-dots');
    if (!sliderEl || !track) return;

    // Render slides
    track.innerHTML = testimonials.map(t => `
    <div class="testimonial-slide">
      <div class="review-card">
        <div class="review-rating">${'★'.repeat(t.stars)}</div>
        <p class="review-text">${t.text}</p>
        <div class="review-author">
          <div class="author-pill">${t.name.charAt(0)}</div>
          <div class="author-info">
            <h4>${t.name}</h4>
            <span>Google Review · ${t.date}</span>
          </div>
        </div>
      </div>
    </div>
  `).join('');
    totalSlides = testimonials.length;

    // Inject prev/next arrows into #slider-controls
    const controls = document.getElementById('slider-controls');
    if (!controls) return;
    controls.innerHTML = `
    <button class="slider-arrow" id="slider-prev" aria-label="Previous">&#8592;</button>
    <div class="slider-dots" id="slider-dots"></div>
    <button class="slider-arrow" id="slider-next" aria-label="Next">&#8594;</button>
  `;

    function updateSlider(animate = true) {
        const slideW = track.querySelector('.testimonial-slide')?.offsetWidth || 0;
        track.style.transition = animate ? 'transform .5s cubic-bezier(.4,0,.2,1)' : 'none';
        track.style.transform = `translateX(-${sliderPos * (slideW + 24)}px)`;
        renderDots();
    }

    function renderDots() {
        const d = document.getElementById('slider-dots');
        if (!d) return;
        d.innerHTML = '';
        for (let i = 0; i < totalSlides; i++) {
            const btn = document.createElement('button');
            btn.className = 'slider-dot' + (i === sliderPos ? ' active' : '');
            btn.setAttribute('aria-label', `Slide ${i + 1}`);
            btn.addEventListener('click', () => { sliderPos = i; updateSlider(); });
            d.appendChild(btn);
        }
    }

    updateSlider(false);

    document.getElementById('slider-prev')?.addEventListener('click', () => { sliderPos = (sliderPos - 1 + totalSlides) % totalSlides; updateSlider(); });
    document.getElementById('slider-next')?.addEventListener('click', () => { sliderPos = (sliderPos + 1) % totalSlides; updateSlider(); });

    // Auto-advance
    let timer = setInterval(() => { sliderPos = (sliderPos + 1) % totalSlides; updateSlider(); }, 5500);
    const cont = document.getElementById('testimonials');
    cont?.addEventListener('mouseenter', () => clearInterval(timer));
    cont?.addEventListener('mouseleave', () => { timer = setInterval(() => { sliderPos = (sliderPos + 1) % totalSlides; updateSlider(); }, 5500); });

    // Touch/swipe support
    let touchX = 0;
    sliderEl.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
    sliderEl.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 50) { sliderPos = dx < 0 ? (sliderPos + 1) % totalSlides : (sliderPos - 1 + totalSlides) % totalSlides; updateSlider(); }
    });

    window.addEventListener('resize', () => updateSlider(false));
})();

// ── FAQ Accordion ──────────────────────────────────
document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
        const isOpen = btn.getAttribute('aria-expanded') === 'true';
        document.querySelectorAll('.faq-question').forEach(b => {
            b.setAttribute('aria-expanded', 'false');
            b.nextElementSibling?.classList.remove('open');
        });
        if (!isOpen) {
            btn.setAttribute('aria-expanded', 'true');
            btn.nextElementSibling?.classList.add('open');
        }
    });
});

// ── Hours ──────────────────────────────────────────
async function loadHours() {
    try {
        const res = await apiFetch('/api/hours');
        const hrs = res.hours || {};
        const list = document.getElementById('hours-list');
        if (!list) return;
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        list.innerHTML = days.map(day => {
            const h = hrs[day]; if (!h) return '';
            const isToday = day === today;
            const label = day.charAt(0).toUpperCase() + day.slice(1);
            return `<div class="hours-row${isToday ? ' hours-today' : ''}">
        <span class="hours-day">${label}${isToday ? ' <span style="font-size:.7rem;background:var(--accent);color:#fff;border-radius:4px;padding:1px 6px;margin-left:4px">Today</span>' : ''}</span>
        <span class="hours-time${h.closed ? ' hours-closed' : ''}">${h.closed ? 'Closed' : h.open + ' – ' + h.close}</span>
      </div>`;
        }).join('');
    } catch { }
}

// ── Blog ───────────────────────────────────────────
async function loadBlog() {
    try {
        const res = await apiFetch('/api/posts?published=true');
        const posts = res.posts || [];
        const grid = document.getElementById('blog-grid');
        if (!grid || !posts.length) return;
        grid.innerHTML = posts.map(p => `
      <article class="blog-card reveal">
        <div class="blog-card-img-wrap">
          <img src="${p.image || '/uploads/placeholder-event.jpg'}" alt="${p.title}" class="blog-card-img" loading="lazy" />
        </div>
        <div class="blog-card-body">
          <span class="blog-type blog-type-${p.type}">${p.type}</span>
          <h3 class="blog-card-title">${p.title}</h3>
          <p class="blog-card-excerpt">${p.excerpt}</p>
          <p class="blog-card-meta">${new Date(p.date || p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </article>
    `).join('');
        initRevealAnimations();
    } catch { }
}

// ── Mobile sticky CTA ──────────────────────────────
const footerTrigger = document.getElementById('reserve');
if (footerTrigger) {
    const cta = document.getElementById('mobile-sticky-cta');
    new IntersectionObserver(entries => {
        if (cta) cta.style.display = entries[0].isIntersecting ? 'none' : '';
    }, { threshold: .1 }).observe(footerTrigger);
}

// ── About stat counters — set data attributes ──────
(function initStatAttributes() {
    const statNums = document.querySelectorAll('.stat-num');
    statNums.forEach(el => {
        const text = el.textContent.trim();
        if (text.includes('%')) { el.dataset.target = parseFloat(text); el.dataset.suffix = '%'; }
        else if (text.includes('+')) { el.dataset.target = parseFloat(text); el.dataset.suffix = '+'; }
        else { el.dataset.target = parseFloat(text); el.dataset.suffix = ''; }
        el.textContent = '0' + (el.dataset.suffix || '');
    });
})();

// ── Init ───────────────────────────────────────────
loadMenu();
loadHours();
loadBlog();
