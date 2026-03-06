/* ═══════════════════════════════════════════════
   KAZE ADMIN — JavaScript
   Handles all panels, API CRUD, live preview
═══════════════════════════════════════════════ */

'use strict';

// ── API helper ──────────────────────────────────
async function api(path, opts = {}) {
    const r = await fetch(path, {
        headers: { 'Content-Type': 'application/json', ...opts.headers },
        ...opts,
    });
    if (r.status === 401) {
        window.location.href = '/admin/login.html';
        return { success: false };
    }
    return r.json();
}

// ── Toast ────────────────────────────────────────
function toast(msg, type = '') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show ' + type;
    setTimeout(() => el.className = 'toast', 3200);
}

// ── Confirm dialog ────────────────────────────────
function confirm(msg) {
    return new Promise(resolve => {
        const overlay = document.getElementById('confirm-modal');
        document.getElementById('confirm-message').textContent = msg;
        overlay.classList.add('open');
        document.getElementById('confirm-yes').onclick = () => { overlay.classList.remove('open'); resolve(true); };
        document.getElementById('confirm-no').onclick = () => { overlay.classList.remove('open'); resolve(false); };
    });
}

// ── Panel switching ───────────────────────────────
const panels = document.querySelectorAll('.panel');
const navBtns = document.querySelectorAll('.nav-item');
const topbarTitle = document.getElementById('topbar-title');

function switchPanel(name) {
    panels.forEach(p => p.classList.toggle('active', p.id === 'panel-' + name));
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.panel === name));
    const labels = {
        dashboard: 'Dashboard', menu: 'Menu Manager', reservations: 'Reservations',
        contacts: 'Messages', hours: 'Opening Hours', blog: 'Blog & Events',
        media: 'Media Library', settings: 'SEO & Settings', design: 'Design',
    };
    topbarTitle.textContent = labels[name] || name;
    // Lazy-load panel data
    if (name === 'menu') loadMenu();
    if (name === 'reservations') loadReservations();
    if (name === 'contacts') loadContacts();
    if (name === 'hours') loadHours();
    if (name === 'blog') loadPosts();
    if (name === 'media') loadMedia();
    if (name === 'settings') loadSettings();
    if (name === 'design') loadDesign();
}

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        switchPanel(btn.dataset.panel);
        // Close sidebar on mobile
        document.getElementById('sidebar').classList.remove('open');
        document.body.style.overflow = '';
    });
});

document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await api('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login.html';
});

// Dashboard "View All" link-buttons
document.querySelectorAll('.link-btn').forEach(btn => {
    btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
});

// Sidebar toggle (mobile)
document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open');
});
document.getElementById('sidebar-close').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
});

// ── Clock ───────────────────────────────────────
function updateClock() {
    const el = document.getElementById('topbar-time');
    if (el) el.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
updateClock();
setInterval(updateClock, 30000);

// ══════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════
async function loadDashboard() {
    try {
        const [menuRes, resRes, contRes] = await Promise.all([
            api('/api/menu'), api('/api/reservations'), api('/api/contact')
        ]);
        const dishes = menuRes.dishes || [];
        const reservs = resRes.reservations || [];
        const msgs = contRes.submissions || [];
        const pending = reservs.filter(r => r.status === 'pending').length;
        const unread = msgs.filter(m => !m.read).length;

        document.getElementById('stat-menu').textContent = dishes.length;
        document.getElementById('stat-reservations').textContent = reservs.length;
        document.getElementById('stat-pending').textContent = pending;
        document.getElementById('stat-messages').textContent = unread;

        // Badges
        const pb = document.getElementById('pending-badge');
        const ub = document.getElementById('unread-badge');
        if (pending > 0) { pb.textContent = pending; pb.classList.add('show'); } else pb.classList.remove('show');
        if (unread > 0) { ub.textContent = unread; ub.classList.add('show'); } else ub.classList.remove('show');

        // Recent reservations
        const rr = document.getElementById('recent-reservations');
        rr.innerHTML = reservs.slice(-5).reverse().map(r => `
      <div class="recent-item">
        <span class="recent-name">${r.name} — ${r.guests} guest${r.guests > 1 ? 's' : ''}</span>
        <span class="recent-meta">${r.date} at ${r.time} · <span class="badge badge-${r.status}">${r.status}</span></span>
      </div>
    `).join('') || '<p style="color:var(--text-sec);font-size:.85rem;padding:12px 0">No reservations yet.</p>';

        // Recent contacts
        const rc = document.getElementById('recent-contacts');
        rc.innerHTML = msgs.slice(-5).reverse().map(m => `
      <div class="recent-item">
        <span class="recent-name">${m.name} — ${m.subject}</span>
        <span class="recent-meta">${new Date(m.createdAt).toLocaleDateString()} · ${m.read ? 'Read' : '<b>Unread</b>'}</span>
      </div>
    `).join('') || '<p style="color:var(--text-sec);font-size:.85rem;padding:12px 0">No messages yet.</p>';

    } catch (e) { console.error(e); }
}

// ══════════════════════════════════════════════════
//  MENU MANAGER
// ══════════════════════════════════════════════════
let menuDataAdmin = [];
let editingDishId = null;

async function loadMenu() {
    const res = await api('/api/menu');
    menuDataAdmin = res.dishes || [];
    renderMenuTable(menuDataAdmin);
}

function renderMenuTable(dishes) {
    const tbody = document.getElementById('menu-tbody');
    if (!dishes.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-sec)">No dishes yet. Click "Add Dish" to get started.</td></tr>';
        return;
    }
    tbody.innerHTML = dishes.map(d => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <img src="${d.image || ''}" alt="" class="table-img"
               onerror="this.style.display='none'" />
          <span style="font-weight:500">${d.name}</span>
        </div>
      </td>
      <td style="text-transform:capitalize">${d.category}</td>
      <td>₹${d.price}</td>
      <td>${(d.tags || []).map(t => `<span class="badge badge-available" style="margin:2px">${t}</span>`).join('')}</td>
      <td><span class="badge ${d.available !== false ? 'badge-available' : 'badge-off'}">${d.available !== false ? 'Available' : 'Hidden'}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn btn-sm btn-ghost-dark" onclick="editDish('${d.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteDish('${d.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Menu search & filter
document.getElementById('menu-search')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    const cat = document.getElementById('menu-cat-filter').value;
    filterMenu(q, cat);
});
document.getElementById('menu-cat-filter')?.addEventListener('change', e => {
    const q = document.getElementById('menu-search').value.toLowerCase();
    filterMenu(q, e.target.value);
});
function filterMenu(q, cat) {
    let filtered = menuDataAdmin;
    if (cat !== 'all') filtered = filtered.filter(d => d.category === cat);
    if (q) filtered = filtered.filter(d => d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q));
    renderMenuTable(filtered);
}

// Add dish
document.getElementById('add-dish-btn')?.addEventListener('click', () => {
    editingDishId = null;
    document.getElementById('dish-form').reset();
    document.getElementById('dish-id').value = '';
    document.getElementById('dish-form-title').textContent = 'Add New Dish';
    document.getElementById('dish-form-submit').textContent = 'Add Dish';
    document.getElementById('dish-available').checked = true;
    document.getElementById('dish-form-card').style.display = 'block';
    document.getElementById('dish-form-card').scrollIntoView({ behavior: 'smooth' });
});
document.getElementById('dish-form-cancel')?.addEventListener('click', () => {
    document.getElementById('dish-form-card').style.display = 'none';
    editingDishId = null;
});

// Edit dish
window.editDish = function (id) {
    const d = menuDataAdmin.find(x => x.id === id);
    if (!d) return;
    editingDishId = id;
    document.getElementById('dish-id').value = id;
    document.getElementById('df-name').value = d.name;
    document.getElementById('df-category').value = d.category;
    document.getElementById('df-price').value = d.price;
    document.getElementById('df-desc').value = d.description;
    document.getElementById('df-image').value = d.image || '';
    document.getElementById('df-available').checked = d.available !== false;
    // Tags
    document.querySelectorAll('[name=tags]').forEach(cb => {
        cb.checked = (d.tags || []).includes(cb.value);
    });
    document.getElementById('dish-form-title').textContent = 'Edit Dish';
    document.getElementById('dish-form-submit').textContent = 'Update Dish';
    document.getElementById('dish-form-card').style.display = 'block';
    document.getElementById('dish-form-card').scrollIntoView({ behavior: 'smooth' });
};

// Delete dish
window.deleteDish = async function (id) {
    const ok = await confirm('Delete this dish? This cannot be undone.');
    if (!ok) return;
    await api(`/api/menu/${id}`, { method: 'DELETE' });
    toast('Dish deleted.', 'error');
    loadMenu();
};

// Save dish form
document.getElementById('dish-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const tags = [...document.querySelectorAll('[name=tags]:checked')].map(cb => cb.value);
    const body = {
        name: document.getElementById('df-name').value,
        category: document.getElementById('df-category').value,
        price: parseFloat(document.getElementById('df-price').value),
        description: document.getElementById('df-desc').value,
        image: document.getElementById('df-image').value,
        available: document.getElementById('df-available').checked,
        tags,
    };
    if (editingDishId) {
        await api(`/api/menu/${editingDishId}`, { method: 'PUT', body: JSON.stringify(body) });
        toast('Dish updated!', 'success');
    } else {
        await api('/api/menu', { method: 'POST', body: JSON.stringify(body) });
        toast('Dish added!', 'success');
    }
    document.getElementById('dish-form-card').style.display = 'none';
    editingDishId = null;
    loadMenu();
});

// ══════════════════════════════════════════════════
//  RESERVATIONS
// ══════════════════════════════════════════════════
let reservsData = [];

async function loadReservations() {
    const res = await api('/api/reservations');
    reservsData = res.reservations || [];
    renderReservations(reservsData);
}

function renderReservations(data) {
    const tbody = document.getElementById('res-tbody');
    if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-sec)">No reservations yet.</td></tr>';
        return;
    }
    tbody.innerHTML = data.slice().reverse().map(r => `
    <tr>
      <td><code style="font-size:.78rem">${r.id}</code></td>
      <td style="font-weight:500">${r.name}</td>
      <td>${r.email}<br><small style="color:var(--text-sec)">${r.phone || ''}</small></td>
      <td>${r.date}<br><small style="color:var(--text-sec)">${r.time}</small></td>
      <td>${r.guests}</td>
      <td style="max-width:160px;font-size:.82rem;color:var(--text-sec)">${r.notes || '—'}</td>
      <td><span class="badge badge-${r.status}">${r.status}</span></td>
      <td>
        <div class="table-actions">
          ${r.status === 'pending' ? `<button class="btn btn-sm btn-primary" onclick="confirmRes('${r.id}')">Confirm</button>` : ''}
          ${r.status !== 'cancelled' ? `<button class="btn btn-sm btn-ghost-dark" onclick="cancelRes('${r.id}')">Cancel</button>` : ''}
          <button class="btn btn-sm btn-danger" onclick="deleteRes('${r.id}')">Del</button>
        </div>
      </td>
    </tr>
  `).join('');
}

document.getElementById('res-status-filter')?.addEventListener('change', e => {
    const s = e.target.value;
    const filtered = s === 'all' ? reservsData : reservsData.filter(r => r.status === s);
    renderReservations(filtered);
});

window.confirmRes = async function (id) {
    await api(`/api/reservations/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'confirmed' }) });
    toast('Reservation confirmed!', 'success');
    loadReservations(); loadDashboard();
};
window.cancelRes = async function (id) {
    const ok = await confirm('Cancel this reservation?');
    if (!ok) return;
    await api(`/api/reservations/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'cancelled' }) });
    toast('Reservation cancelled.', 'error');
    loadReservations(); loadDashboard();
};
window.deleteRes = async function (id) {
    const ok = await confirm('Delete this reservation record?');
    if (!ok) return;
    await api(`/api/reservations/${id}`, { method: 'DELETE' });
    toast('Reservation deleted.', 'error');
    loadReservations(); loadDashboard();
};

// ══════════════════════════════════════════════════
//  CONTACTS
// ══════════════════════════════════════════════════
async function loadContacts() {
    const res = await api('/api/contact');
    const msgs = res.submissions || [];
    const list = document.getElementById('contacts-list');
    if (!msgs.length) {
        list.innerHTML = '<div class="card" style="text-align:center;color:var(--text-sec)">No messages yet.</div>';
        return;
    }
    list.innerHTML = msgs.slice().reverse().map(m => `
    <div class="card" style="border-left:3px solid ${m.read ? 'var(--border)' : 'var(--accent)'}; margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px">
        <div>
          <strong>${m.name}</strong> <span style="color:var(--text-sec);font-size:.85rem">&lt;${m.email}&gt;</span>
          <span class="badge ${m.read ? 'badge-off' : 'badge-published'}" style="margin-left:8px">${m.read ? 'Read' : 'Unread'}</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <small style="color:var(--text-sec)">${new Date(m.createdAt).toLocaleString()}</small>
          ${!m.read ? `<button class="btn btn-sm btn-ghost-dark" onclick="markRead('${m.id}')">Mark Read</button>` : ''}
          <button class="btn btn-sm btn-danger" onclick="deleteMsg('${m.id}')">Del</button>
        </div>
      </div>
      <p style="font-weight:600;font-size:.9rem;margin-bottom:6px">${m.subject}</p>
      <p style="color:var(--text-sec);font-size:.88rem;line-height:1.6">${m.message}</p>
    </div>
  `).join('');
}

window.markRead = async function (id) {
    await api(`/api/contact/${id}`, { method: 'PUT', body: JSON.stringify({ read: true }) });
    toast('Marked as read.', 'success');
    loadContacts(); loadDashboard();
};
window.deleteMsg = async function (id) {
    const ok = await confirm('Delete this message?');
    if (!ok) return;
    await api(`/api/contact/${id}`, { method: 'DELETE' });
    toast('Message deleted.', 'error');
    loadContacts(); loadDashboard();
};

// ══════════════════════════════════════════════════
//  HOURS
// ══════════════════════════════════════════════════
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

async function loadHours() {
    const res = await api('/api/hours');
    const hrs = res.hours || {};
    const editor = document.getElementById('hours-editor');
    editor.innerHTML = DAYS.map(day => {
        const h = hrs[day] || { open: '12:00', close: '22:00', closed: false };
        return `
      <div class="hours-row-edit" data-day="${day}">
        <span class="hours-day-label">${day.charAt(0).toUpperCase() + day.slice(1)}</span>
        <input type="time" class="h-open"  value="${h.open || '12:00'}" ${h.closed ? 'disabled' : ''} />
        <input type="time" class="h-close" value="${h.close || '22:00'}" ${h.closed ? 'disabled' : ''} />
        <label class="checkbox-label">
          <input type="checkbox" class="h-closed" ${h.closed ? 'checked' : ''} />
          &nbsp;Closed
        </label>
      </div>
    `;
    }).join('');

    // Toggle closed
    editor.querySelectorAll('.h-closed').forEach(cb => {
        cb.addEventListener('change', () => {
            const row = cb.closest('.hours-row-edit');
            row.querySelector('.h-open').disabled = cb.checked;
            row.querySelector('.h-close').disabled = cb.checked;
        });
    });
}

document.getElementById('hours-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {};
    DAYS.forEach(day => {
        const row = document.querySelector(`.hours-row-edit[data-day="${day}"]`);
        if (!row) return;
        data[day] = {
            open: row.querySelector('.h-open').value,
            close: row.querySelector('.h-close').value,
            closed: row.querySelector('.h-closed').checked,
        };
    });
    await api('/api/hours', { method: 'PUT', body: JSON.stringify(data) });
    toast('Opening hours saved!', 'success');
});

// ══════════════════════════════════════════════════
//  BLOG / POSTS
// ══════════════════════════════════════════════════
let postsData = [];
let editingPostId = null;

async function loadPosts() {
    const res = await api('/api/posts');
    postsData = res.posts || [];
    renderPosts(postsData);
}

function renderPosts(posts) {
    const grid = document.getElementById('posts-grid');
    if (!posts.length) {
        grid.innerHTML = '<div class="card" style="grid-column:1/-1;text-align:center;color:var(--text-sec)">No posts yet. Click "+ New Post" to create one.</div>';
        return;
    }
    grid.innerHTML = posts.map(p => `
    <div class="post-card">
      <img src="${p.image || ''}" alt="${p.title}" class="post-card-img"
           onerror="this.style.display='none'" />
      <div class="post-card-body">
        <p class="post-card-type">${p.type}</p>
        <p class="post-card-title">${p.title}</p>
        <p class="post-card-excerpt">${p.excerpt}</p>
        <div class="post-card-footer">
          <span class="badge ${p.published ? 'badge-published' : 'badge-draft'}">${p.published ? 'Published' : 'Draft'}</span>
          <div class="table-actions">
            <button class="btn btn-sm btn-ghost-dark" onclick="editPost('${p.id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deletePost('${p.id}')">Delete</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

document.getElementById('add-post-btn')?.addEventListener('click', () => {
    editingPostId = null;
    document.getElementById('post-form').reset();
    document.getElementById('post-form-title').textContent = 'New Post';
    document.getElementById('post-form-card').style.display = 'block';
    document.getElementById('post-form-card').scrollIntoView({ behavior: 'smooth' });
});
document.getElementById('post-form-cancel')?.addEventListener('click', () => {
    document.getElementById('post-form-card').style.display = 'none';
    editingPostId = null;
});

window.editPost = function (id) {
    const p = postsData.find(x => x.id === id);
    if (!p) return;
    editingPostId = id;
    document.getElementById('post-id').value = id;
    document.getElementById('pf-title').value = p.title;
    document.getElementById('pf-type').value = p.type;
    document.getElementById('pf-date').value = p.date || '';
    document.getElementById('pf-image').value = p.image || '';
    document.getElementById('pf-excerpt').value = p.excerpt;
    document.getElementById('pf-content').value = p.content || '';
    document.getElementById('pf-published').checked = p.published;
    document.getElementById('post-form-title').textContent = 'Edit Post';
    document.getElementById('post-form-card').style.display = 'block';
    document.getElementById('post-form-card').scrollIntoView({ behavior: 'smooth' });
};

window.deletePost = async function (id) {
    const ok = await confirm('Delete this post?');
    if (!ok) return;
    await api(`/api/posts/${id}`, { method: 'DELETE' });
    toast('Post deleted.', 'error');
    loadPosts();
};

document.getElementById('post-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const body = {
        title: document.getElementById('pf-title').value,
        type: document.getElementById('pf-type').value,
        date: document.getElementById('pf-date').value,
        image: document.getElementById('pf-image').value,
        excerpt: document.getElementById('pf-excerpt').value,
        content: document.getElementById('pf-content').value,
        published: document.getElementById('pf-published').checked,
        slug: document.getElementById('pf-title').value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    };
    if (editingPostId) {
        await api(`/api/posts/${editingPostId}`, { method: 'PUT', body: JSON.stringify(body) });
        toast('Post updated!', 'success');
    } else {
        await api('/api/posts', { method: 'POST', body: JSON.stringify(body) });
        toast('Post created!', 'success');
    }
    document.getElementById('post-form-card').style.display = 'none';
    editingPostId = null;
    loadPosts();
});

// ══════════════════════════════════════════════════
//  MEDIA LIBRARY
// ══════════════════════════════════════════════════
async function loadMedia() {
    const res = await api('/api/media');
    const files = res.files || [];
    const grid = document.getElementById('media-grid');
    if (!files.length) {
        grid.innerHTML = '<div class="media-placeholder">No images yet. Upload from the button above.</div>';
        return;
    }
    grid.innerHTML = files.map(f => `
    <div class="media-item">
      <img src="${f.url}" alt="${f.name}" class="media-item-img"
           onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\'><rect width=\\'100\\' height=\\'100\\' fill=\\'%23f4f5f7\\'/></svg>'" />
      <div class="media-item-name" title="${f.name}">${f.name}</div>
      <button class="media-item-del" onclick="deleteMedia('${f.name}')" aria-label="Delete ${f.name}">✕</button>
    </div>
  `).join('');
}

// Upload
document.getElementById('media-upload-input')?.addEventListener('change', async e => {
    const files = e.target.files;
    if (!files.length) return;
    const prog = document.getElementById('upload-progress');
    const fill = document.getElementById('progress-fill');
    const status = document.getElementById('upload-status');
    prog.style.display = 'flex';
    fill.style.width = '0';
    status.textContent = 'Uploading…';

    const fd = new FormData();
    for (const f of files) fd.append('files', f);

    try {
        fill.style.width = '60%';
        const res = await fetch('/api/media/upload', { method: 'POST', body: fd });
        const data = await res.json();
        fill.style.width = '100%';
        status.textContent = `Uploaded ${data.uploaded?.length || 0} file(s)`;
        setTimeout(() => { prog.style.display = 'none'; }, 2000);
        toast(`${data.uploaded?.length || 0} file(s) uploaded!`, 'success');
        loadMedia();
    } catch {
        status.textContent = 'Upload failed.';
        toast('Upload failed.', 'error');
    }
    e.target.value = '';
});

window.deleteMedia = async function (name) {
    const ok = await confirm(`Delete "${name}"?`);
    if (!ok) return;
    await api(`/api/media/${name}`, { method: 'DELETE' });
    toast('File deleted.', 'error');
    loadMedia();
};

// ══════════════════════════════════════════════════
//  SETTINGS
// ══════════════════════════════════════════════════
async function loadSettings() {
    const res = await api('/api/settings');
    const s = res.settings || {};
    const seo = s.seo || {};
    const hp = s.homepage || {};

    if (document.getElementById('seo-title')) document.getElementById('seo-title').value = seo.siteTitle || '';
    if (document.getElementById('seo-desc')) document.getElementById('seo-desc').value = seo.metaDescription || '';
    if (document.getElementById('seo-kw')) document.getElementById('seo-kw').value = seo.keywords || '';

    if (document.getElementById('hp-tagline')) document.getElementById('hp-tagline').value = hp.heroTagline || '';
    if (document.getElementById('hp-sub')) document.getElementById('hp-sub').value = hp.heroSubtext || '';
    if (document.getElementById('hp-chef-name')) document.getElementById('hp-chef-name').value = hp.chefName || '';
    if (document.getElementById('hp-chef-bio')) document.getElementById('hp-chef-bio').value = hp.chefBio || '';
    if (document.getElementById('hp-story')) document.getElementById('hp-story').value = hp.restaurantStory || '';
}

document.getElementById('seo-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    await api('/api/settings', {
        method: 'PUT', body: JSON.stringify({
            seo: {
                siteTitle: document.getElementById('seo-title').value,
                metaDescription: document.getElementById('seo-desc').value,
                keywords: document.getElementById('seo-kw').value,
            }
        })
    });
    toast('SEO settings saved!', 'success');
});

document.getElementById('homepage-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    await api('/api/settings', {
        method: 'PUT', body: JSON.stringify({
            homepage: {
                heroTagline: document.getElementById('hp-tagline').value,
                heroSubtext: document.getElementById('hp-sub').value,
                chefName: document.getElementById('hp-chef-name').value,
                chefBio: document.getElementById('hp-chef-bio').value,
                restaurantStory: document.getElementById('hp-story').value,
            }
        })
    });
    toast('Homepage content saved!', 'success');
});

// ══════════════════════════════════════════════════
//  DESIGN
// ══════════════════════════════════════════════════
async function loadDesign() {
    const res = await api('/api/settings');
    const d = (res.settings || {}).design || {};
    if (d.accentColor) {
        document.getElementById('d-accent').value = d.accentColor;
        document.getElementById('d-accent-text').value = d.accentColor;
    }
    if (d.bgPrimary) {
        document.getElementById('d-bg').value = d.bgPrimary;
        document.getElementById('d-bg-text').value = d.bgPrimary;
    }
    if (d.textPrimary) {
        document.getElementById('d-text').value = d.textPrimary;
        document.getElementById('d-text-text').value = d.textPrimary;
    }
    if (d.fontHeading) document.getElementById('d-font-head').value = d.fontHeading;
    if (d.fontBody) document.getElementById('d-font-body').value = d.fontBody;
    updatePreview();
}

function syncColorField(colorId, textId) {
    const pick = document.getElementById(colorId);
    const txt = document.getElementById(textId);
    pick?.addEventListener('input', () => { txt.value = pick.value; updatePreview(); });
    txt?.addEventListener('input', () => { if (/^#[0-9A-Fa-f]{6}$/.test(txt.value)) { pick.value = txt.value; updatePreview(); } });
}
syncColorField('d-accent', 'd-accent-text');
syncColorField('d-bg', 'd-bg-text');
syncColorField('d-text', 'd-text-text');
document.getElementById('d-font-head')?.addEventListener('change', updatePreview);
document.getElementById('d-font-body')?.addEventListener('change', updatePreview);

function updatePreview() {
    const accent = document.getElementById('d-accent')?.value || '#7A9E7E';
    const bg = document.getElementById('d-bg')?.value || '#F8F7F4';
    const text = document.getElementById('d-text')?.value || '#1a1a1a';
    const fhHead = document.getElementById('d-font-head')?.value || 'Cormorant Garamond';
    const fBody = document.getElementById('d-font-body')?.value || 'Inter';

    const box = document.getElementById('preview-box');
    const header = document.getElementById('preview-header');
    const body = document.getElementById('preview-body');
    const heading = document.getElementById('preview-heading');
    const t = document.getElementById('preview-text');
    const btn = document.getElementById('preview-btn');
    if (!box) return;

    box.style.fontFamily = fBody + ', sans-serif';
    body.style.background = bg;
    body.style.color = text;
    heading.style.fontFamily = fhHead + ', serif';
    t.style.color = '#6b7280';
    btn.style.background = accent;
    document.getElementById('preview-kanji').style.color = accent;
}

document.getElementById('design-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    await api('/api/settings', {
        method: 'PUT', body: JSON.stringify({
            design: {
                accentColor: document.getElementById('d-accent').value,
                bgPrimary: document.getElementById('d-bg').value,
                textPrimary: document.getElementById('d-text').value,
                fontHeading: document.getElementById('d-font-head').value,
                fontBody: document.getElementById('d-font-body').value,
            }
        })
    });
    toast('Design settings saved!', 'success');
});

// ── Init ────────────────────────────────────────
loadDashboard();
