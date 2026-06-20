// ── STATE ──
const S = {
  token: localStorage.getItem('adminToken'),
  adminId: localStorage.getItem('adminId'),
  adminRole: localStorage.getItem('adminRole') || 'admin',
  section: 'dashboard',
  listings: [], leads: [], bookings: [], notifications: [],
  chatSessions: [], currentSession: null,
  chatInterval: null,
  notifInterval: null,
  leadFilter: 'all', bookingFilter: 'all', bookingSourceFilter: 'all',
  adminName: localStorage.getItem('adminName') || 'Admin'
};

// ── API ──
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${S.token}`, ...opts.headers },
    ...opts
  });
  return res.json();
}

// ── TOAST ──
function toast(msg, type = 'success') {
  const iconMap = { success: 'check-circle', error: 'exclamation-circle', info: 'info-circle', warn: 'exclamation-triangle' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fas fa-${iconMap[type]||'check-circle'}"></i><span>${msg}</span><div class="toast-progress"></div>`;
  const container = document.getElementById('toastContainer');
  container.appendChild(el);
  // Stack limit: keep max 5
  const toasts = container.querySelectorAll('.toast');
  if (toasts.length > 5) toasts[0].remove();
  setTimeout(() => el.remove(), 3500);
}

// ── LOGIN PAGE ──
function renderLogin() {
  document.getElementById('app').innerHTML = `
    <button type="button" class="theme-toggle theme-toggle--admin theme-toggle--login" data-theme-toggle aria-label="Switch to dark mode">
      <i class="fas fa-moon" aria-hidden="true"></i>
      <i class="fas fa-sun" aria-hidden="true"></i>
    </button>
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">
          <div class="logo-text"><img src="/assets/logo.png" alt="Ten&See logo"><span>Ten&See</span></div>
          <p>Admin Dashboard</p>
        </div>
        <div class="login-error" id="loginError"></div>
        <div class="form-group">
          <label class="form-label">Username</label>
          <input class="form-input" id="loginUser" placeholder="admin" onkeydown="if(event.key==='Enter')login()">
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input class="form-input" type="password" id="loginPass" placeholder="••••••••" onkeydown="if(event.key==='Enter')login()">
        </div>
        <button class="btn btn-gold" style="width:100%;margin-top:0.5rem;" onclick="login()">
          <i class="fas fa-sign-in-alt"></i> Sign In
        </button>
      </div>
    </div>
  `;
  window.TenSeeTheme?.bindToggles?.();
}

async function login() {
  const u = document.getElementById('loginUser').value;
  const p = document.getElementById('loginPass').value;
  try {
    const data = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ username: u, password: p }) });
    if (data.success) {
      localStorage.setItem('adminToken', data.token);
      S.token = data.token;
      S.adminName = u.charAt(0).toUpperCase() + u.slice(1);
      localStorage.setItem('adminName', S.adminName);
      S.adminId = data.admin?.id;
      localStorage.setItem('adminId', S.adminId);
      S.adminRole = data.admin?.role || 'admin';
      localStorage.setItem('adminRole', S.adminRole);
      renderApp();
    } else {
      document.getElementById('loginError').style.display = 'block';
      document.getElementById('loginError').textContent = 'Invalid credentials. Please try again.';
    }
  } catch { toast('Connection error', 'error'); }
}

function logout() {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminName');
  S.token = null;
  clearInterval(S.chatInterval);
  clearInterval(S.notifInterval);
  renderLogin();
}

// ── MAIN APP ──
function renderApp() {
  document.getElementById('app').innerHTML = `
    <div class="layout">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-logo">
          <div class="logo-text"><img src="/assets/logo.png" alt="Ten&See logo"><span>Ten&See</span></div>
          <div class="logo-sub">Admin Panel</div>
        </div>
        <nav class="sidebar-nav">
          <div class="nav-section-label">Overview</div>
          <div class="nav-item active" id="nav-dashboard" onclick="showSection('dashboard')"><i class="fas fa-chart-line"></i> Dashboard</div>
          <div class="nav-section-label">Manage</div>
          <div class="nav-item" id="nav-properties" onclick="showSection('properties')"><i class="fas fa-city"></i> Properties</div>
          <div class="nav-item" id="nav-listings" onclick="showSection('listings')"><i class="fas fa-building"></i> All Rooms</div>
          <div class="nav-item" id="nav-leads" onclick="showSection('leads')"><i class="fas fa-users"></i> Leads</div>
          <div class="nav-item" id="nav-bookings" onclick="showSection('bookings')"><i class="fas fa-calendar-check"></i> Bookings</div>
          <div class="nav-item" id="nav-chat" onclick="showSection('chat')"><i class="fas fa-comments"></i> Live Chat <span class="nav-badge" id="chatBadge" style="display:none">0</span></div>
          <div class="nav-section-label">Insights</div>
          <div class="nav-item" id="nav-analytics" onclick="showSection('analytics')"><i class="fas fa-chart-bar"></i> Analytics</div>
          <div class="nav-item" id="nav-reports" onclick="showSection('reports')"><i class="fas fa-file-alt"></i> Reports</div>
          <div class="nav-item" id="nav-audit" onclick="showSection('audit')"><i class="fas fa-shield-alt"></i> Audit Log</div>
          <div class="nav-item" id="nav-vaultgraph" onclick="showSection('vaultgraph')"><i class="fas fa-project-diagram"></i> Vault Graph</div>
        <div class="nav-section-label">Team</div>
<div class="nav-item" id="nav-teamchat" onclick="showSection('teamchat')"><i class="fas fa-user-friends"></i> Team Chat <span class="nav-badge" id="teamChatBadge" style="display:none">0</span></div>
<div class="nav-item" id="nav-tasks" onclick="showSection('tasks')"><i class="fas fa-tasks"></i> Task Board</div>
${S.adminRole === 'superadmin' ? `<div class="nav-section-label">System</div>
<div class="nav-item" id="nav-adminmgmt" onclick="showSection('adminmgmt')"><i class="fas fa-user-shield"></i> Admin Management</div>` : ''}
        </nav>
        <div class="sidebar-footer">
          <div class="admin-profile">
            <div class="admin-avatar" id="sidebarAvatar" onclick="openModal('avatarModal');initAvatarModal();" title="Edit Avatar" style="cursor:pointer;position:relative;overflow:visible;font-size:${S.adminAvatar?.emoji ? '1.4rem' : '1rem'};background:${S.adminAvatar?.bg || 'var(--gold)'};transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">${S.adminAvatar?.emoji || S.adminName.charAt(0)}<span style="position:absolute;bottom:-2px;right:-2px;background:var(--surface2);border-radius:50%;width:14px;height:14px;font-size:8px;display:flex;align-items:center;justify-content:center;"><i class="fas fa-pencil-alt"></i></span></div>
            <div>
              <div class="admin-name">${S.adminName}</div>
              <div class="admin-role">${S.adminRole === 'superadmin' ? 'Super Admin' : 'Admin'}</div>
            </div>
            <button class="btn-logout" onclick="logout()" title="Logout"><i class="fas fa-sign-out-alt"></i></button>
          </div>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <div>
            <div class="topbar-title" id="topbarTitle">Dashboard</div>
            <div class="topbar-subtitle" id="topbarSub">Welcome back, ${S.adminName}</div>
          </div>
          <div class="topbar-actions">
            <button type="button" class="theme-toggle theme-toggle--admin" data-theme-toggle aria-label="Switch to dark mode">
              <i class="fas fa-moon" aria-hidden="true"></i>
              <i class="fas fa-sun" aria-hidden="true"></i>
            </button>
            <button class="notif-btn" onclick="toggleNotifPanel()" title="Notifications">
              <i class="fas fa-bell"></i>
              <span class="notif-dot" id="notifDot">0</span>
            </button>
          </div>
        </header>
        <div class="content">
          <div class="section active" id="sec-dashboard"></div>
          <div class="section" id="sec-properties"></div>
          <div class="section" id="sec-listings"></div>
          <div class="section" id="sec-leads"></div>
          <div class="section" id="sec-bookings"></div>
          <div class="section" id="sec-chat"></div>
          <div class="section" id="sec-teamchat"></div>
          <div class="section" id="sec-analytics"></div>
          <div class="section" id="sec-reports"></div>
          <div class="section" id="sec-audit"></div>
          <div class="section" id="sec-tasks"></div>
          <div class="section" id="sec-team"></div>
          <div class="section" id="sec-adminmgmt"></div>
          <div class="section" id="sec-vaultgraph"></div>
        </div>
      </div>
    </div>
  `;
  loadDashboard();
  pollNotifications();
  S.notifInterval = setInterval(pollNotifications, 30000);
  initSocket();
  // Sync avatar from DB so all other admins can see it in real-time
  api('/api/admin/profile').then(r => {
    if (r?.data?.avatar?.emoji) {
      S.adminAvatar = r.data.avatar;
      localStorage.setItem('myAvatar', JSON.stringify(r.data.avatar));
    } else {
      S.adminAvatar = JSON.parse(localStorage.getItem('myAvatar') || '{"emoji":"🦁","bg":"#c9a84c"}');
    }
  }).catch(() => {
    S.adminAvatar = JSON.parse(localStorage.getItem('myAvatar') || '{"emoji":"🦁","bg":"#c9a84c"}');
  });
  window.TenSeeTheme?.bindToggles?.();
  // Show mobile nav
  document.getElementById('mobileBottomNav').style.display = '';
  // Init pro features
  initKeyboardShortcuts();
  initPullToRefresh();
  initSmartNotifPoller();
}

// ── NAVIGATION ──
const TITLES = {
  dashboard: ['Dashboard', 'Platform overview'],
  listings: ['Listings', 'Manage property listings'],
  leads: ['Leads', 'Track customer inquiries'],
  bookings: ['Bookings', 'Manage booking requests'],
  chat: ['Live Chat', 'Customer conversations'],
  teamchat: ['Team Chat', 'Internal staff messaging'],
  analytics: ['Analytics', 'Performance insights'],
  reports: ['Reports', 'Detailed data reports'],
  audit: ['Audit Log', 'Admin activity history'],
  tasks: ['Task Board', 'Team task management'],
  properties: ['Properties', 'Manage properties and rooms'],
  team: ['Team', 'Manage admin users'],
  adminmgmt: ['Admin Management', 'Manage admin accounts'],
  vaultgraph: ['Vault Graph', 'Obsidian-style knowledge graph']
};

function showSection(sec) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('nav-' + sec)?.classList.add('active');
  document.getElementById('sec-' + sec).classList.add('active');
  document.getElementById('topbarTitle').textContent = TITLES[sec][0];
  document.getElementById('topbarSub').textContent = TITLES[sec][1];
  S.section = sec;

  clearInterval(S.chatInterval);

  const loaders = {
    dashboard: loadDashboard, properties: loadProperties, listings: loadListings, leads: loadLeads,
    bookings: loadBookings, chat: () => { loadChat(); S.chatInterval = setInterval(() => { loadChatSessions(); if (S.currentSession) loadMessages(S.currentSession); }, 5000); },
    teamchat: loadTeamChat,
    analytics: loadAnalytics, reports: loadReports, audit: loadAudit, tasks: loadTasks,
    team: loadTeam,
    adminmgmt: loadAdminManagement,
    vaultgraph: loadVaultGraph
  };
  loaders[sec]?.();

  // Close notif panel
  document.getElementById('notifPanel').classList.remove('active');
  // Sync mobile bottom nav
  updateMobNav(sec);
}

// ── DASHBOARD ──
async function loadDashboard() {
  const sec = document.getElementById('sec-dashboard');
  sec.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  try {
    const [dash, comp] = await Promise.all([
      api('/api/analytics/dashboard'),
      api('/api/reports/comparison')
    ]);
    const d = dash.data; const c = comp.data;

    sec.innerHTML = `
      <div class="stats-grid" id="dashStatsGrid">
        ${statCard('fa-users', 'si-gold', d.totalLeads, 'Total Leads', c?.changes?.leads, '%', "navigateFromStat('leads')")}
        ${statCard('fa-star', 'si-blue', d.newLeads, 'New Leads (7d)', null, '', null)}
        ${statCard('fa-building', 'si-green', d.totalListings, 'Active Listings', null, '', "navigateFromStat('listings')")}
        ${statCard('fa-eye', 'si-orange', (d.totalViews||0).toLocaleString(), 'Total Views', c?.changes?.views, '%', "navigateFromStat('analytics')")}
        ${statCard('fa-calendar-check', 'si-purple', d.totalBookings ?? '-', 'Total Bookings', c?.changes?.bookings, '%', "navigateFromStat('bookings')")}
        ${statCard('fa-whatsapp', 'si-green', d.whatsappBookings ?? '-', 'WhatsApp Bookings', null, '', "showSection('bookings');setBookingSourceFilter('whatsapp')")}
        ${statCard('fa-comments', 'si-gold', d.totalChats ?? '-', 'Chat Sessions', null, '', "navigateFromStat('chat')")}
      </div>
      <div class="two-col">
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="fas fa-clock"></i> Recent Leads</span>
            <button class="btn btn-ghost btn-sm" onclick="showSection('leads')">View All</button>
          </div>
          <div class="card-body no-pad">
            <table class="data-table">
              <thead><tr><th>Name</th><th>Source</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                ${(d.recentLeads||[]).map(l => `
                  <tr>
                    <td><div class="cell-primary">${l.name}</div><div class="cell-muted">${l.email}</div></td>
                    <td><span style="font-size:0.8rem;color:var(--text-muted);text-transform:capitalize;">${l.source?.replace('_',' ')}</span></td>
                    <td>${statusBadge(l.status)}</td>
                    <td style="color:var(--text-muted);font-size:0.8rem;">${fmtDate(l.createdAt)}</td>
                  </tr>
                `).join('') || '<tr><td colspan="4" class="empty-state"><i class="fas fa-inbox"></i><p>No leads yet</p></td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="fas fa-chart-pie"></i> Lead Sources</span></div>
          <div class="card-body">
            <div class="bar-chart" id="sourceChart">
              ${renderBarChart(d.leadsBySource || [], 'count')}
            </div>
          </div>
        </div>
      </div>
      <div class="two-col">
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="fas fa-calendar-check"></i> Recent Bookings</span>
            <button class="btn btn-ghost btn-sm" onclick="showSection('bookings')">View All</button>
          </div>
          <div class="card-body no-pad">
            <table class="data-table">
              <thead><tr><th>Student</th><th>Property</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody id="dashBookings"><tr><td colspan="4"><div class="loading"><div class="spinner"></div></div></td></tr></tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="fas fa-bell"></i> Recent Activity</span></div>
          <div class="card-body no-pad" id="dashActivity"><div class="loading"><div class="spinner"></div></div></div>
        </div>
      </div>
    `;

    // Load bookings for dashboard
    api('/api/bookings?limit=5').then(r => {
      const tbody = document.getElementById('dashBookings');
      if (!tbody) return;
      tbody.innerHTML = (r.data||[]).map(b => `
        <tr>
          <td><div class="cell-primary">${b.studentName||b.leadId?.name||'-'}</div></td>
          <td style="font-size:0.8rem;color:var(--text-muted);">${b.listingId?.title||'-'}</td>
          <td style="font-family:'DM Mono',monospace;font-size:0.82rem;">RM ${(b.totalAmount||0).toLocaleString()}</td>
          <td>${statusBadge(b.status)}</td>
        </tr>
      `).join('') || '<tr><td colspan="4"><div class="empty-state"><i class="fas fa-calendar"></i><p>No bookings yet</p></div></td></tr>';
    });

    // Load notifications for activity
    api('/api/notifications/recent').then(r => {
      const el = document.getElementById('dashActivity');
      if (!el) return;
      el.innerHTML = (r.data||[]).slice(0,5).map(n => `
        <div class="audit-item">
          <div class="audit-dot" style="background:var(--gold)"></div>
          <div class="audit-content">
            <div class="audit-action">${n.title}</div>
            <div class="audit-detail">${n.message}</div>
          </div>
          <div class="audit-time">${timeAgo(n.createdAt)}</div>
        </div>
      `).join('') || '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>No activity yet</p></div>';
    });

  } catch(e) { sec.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load dashboard</p></div>`; }
  setTimeout(animateDashboardStats, 150);
}

function statCard(icon, iconClass, value, label, change, unit='', onClick=null) {
  let badge = '';
  if (change !== null && change !== undefined) {
    const n = parseFloat(change);
    const dir = n >= 0 ? 'up' : 'down';
    badge = `<span class="stat-badge badge-${dir}"><i class="fas fa-arrow-${dir}"></i> ${Math.abs(n)}${unit}</span>`;
  }
  const clickAttr = onClick ? `onclick="${onClick}"` : '';
  return `
    <div class="stat-card" ${clickAttr}>
      <div class="stat-row">
        <div class="stat-icon ${iconClass}"><i class="fas ${icon}"></i></div>
        ${badge}
      </div>
      <div class="stat-value">${value ?? '-'}</div>
      <div class="stat-label">${label}</div>
    </div>
  `;
}

// Navigate from stat card click with highlight flash
function navigateFromStat(targetSection, highlightId=null) {
  // Switch to target section if different
  if (S.section !== targetSection) {
    showSection(targetSection);
  }
  
  // Wait for section to render then scroll and highlight
  setTimeout(() => {
    const targetEl = highlightId ? document.getElementById(highlightId) : document.getElementById('sec-' + targetSection);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      targetEl.classList.add('highlight-flash');
      setTimeout(() => targetEl.classList.remove('highlight-flash'), 1000);
    }
  }, 100);
}

// ── PROPERTIES ──
let S_properties = [];

async function loadProperties() {
  const sec = document.getElementById('sec-properties');
  sec.innerHTML = `
    <div class="toolbar" style="margin-bottom:1rem;">
      <div class="search-box"><i class="fas fa-search"></i><input placeholder="Search properties..." oninput="filterProperties(this.value)" id="propertySearch"></div>
      <button class="btn btn-gold" onclick="openPropertyModal()"><i class="fas fa-plus"></i> Add Property</button>
    </div>
    <div id="propertiesGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:1.5rem;">
      <div class="loading"><div class="spinner"></div></div>
    </div>
  `;
  const data = await api('/api/properties?isActive=true');
  S_properties = data.data || [];
  renderPropertiesGrid(S_properties);
}

function renderPropertiesGrid(list) {
  const el = document.getElementById('propertiesGrid');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fas fa-city"></i><p>No properties yet. Add one to get started.</p></div>`;
    return;
  }
  el.innerHTML = list.map(p => `
    <div class="card" style="overflow:hidden;">
      ${p.images?.[0] ? `<img src="${p.images[0]}" style="width:100%;height:160px;object-fit:cover;" alt="">` : `<div style="width:100%;height:80px;background:var(--surface-2);display:flex;align-items:center;justify-content:center;color:var(--text-muted);"><i class="fas fa-city fa-2x"></i></div>`}
      <div class="card-body">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem;">
          <h3 style="font-size:1rem;font-weight:700;color:var(--text);">${p.name}</h3>
          <span style="background:var(--gold-muted,rgba(201,168,76,0.15));color:var(--gold);padding:0.25rem 0.6rem;border-radius:20px;font-size:0.72rem;font-weight:600;">${p.totalRooms || 0} rooms</span>
        </div>
        <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.75rem;">
          <i class="fas fa-map-marker-alt" style="color:var(--gold);margin-right:0.3rem;"></i>${p.location?.area || p.location?.city || 'Klang Valley'}
          ${p.location?.university ? `&nbsp;·&nbsp;<i class="fas fa-university" style="color:var(--gold);"></i> ${p.location.university}` : ''}
        </div>
        ${p.roomTypes && Object.keys(p.roomTypes).length ? `
          <div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:1rem;">
            ${Object.entries(p.roomTypes).map(([t,c]) => `<span style="background:var(--surface-2,rgba(0,0,0,0.05));padding:0.2rem 0.6rem;border-radius:8px;font-size:0.72rem;font-weight:600;text-transform:capitalize;">${t.replace('_',' ')} ×${c}</span>`).join('')}
          </div>
        ` : ''}
        <div style="display:flex;gap:0.5rem;">
          <button class="btn btn-gold btn-sm" style="flex:1;" onclick="openAddRoomUnderProperty('${p._id}','${p.name.replace(/'/g,"\\'")}')"><i class="fas fa-plus"></i> Add Room</button>
          <button class="btn btn-ghost btn-sm" style="flex:1;" onclick="viewPropertyRooms('${p._id}','${p.name.replace(/'/g,"\\'")}')"><i class="fas fa-door-open"></i> View Rooms</button>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="editProperty('${p._id}')" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="btn btn-danger-ghost btn-sm btn-icon" onclick="deleteProperty('${p._id}')" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>
  `).join('');
}

function filterProperties(q) {
  const query = (q || '').toLowerCase();
  renderPropertiesGrid(S_properties.filter(p => !query || p.name?.toLowerCase().includes(query) || p.location?.area?.toLowerCase().includes(query)));
}

async function openPropertyModal(p = null) {
  document.getElementById('propertyModalTitle').textContent = p ? 'Edit Property' : 'Add Property';
  document.getElementById('propertyId').value = p?._id || '';
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
  set('pName', p?.name); set('pDesc', p?.description); set('pCity', p?.location?.city || 'Kuala Lumpur');
  set('pArea', p?.location?.area); set('pAddress', p?.location?.address);
  set('pAmenities', (p?.amenities || []).join(', ')); set('pImages', (p?.images || []).join(', '));
  set('pWhatsapp', p?.whatsappNumber); set('pAgent', p?.agentName);
  set('pLat', p?.location?.lat ?? ''); set('pLng', p?.location?.lng ?? '');
  set('pRecommendedUni', p?.recommendedUniversity || '');
  const linkedUniStr = (p?.linkedUniversities || []).map(u => `${u.name}|${u.lat}|${u.lng}`).join('\n');
  set('pLinkedUnis', linkedUniStr);
  document.getElementById('pActive').checked = p ? p.isActive : true;
  await loadUniversitiesFor('pUniversity');
  if (p?.location?.university) document.getElementById('pUniversity').value = p.location.university;
  openModal('propertyModal');
}

function editProperty(id) { openPropertyModal(S_properties.find(p => p._id === id)); }

async function saveProperty() {
  const id = document.getElementById('propertyId').value;
  const body = {
    name: document.getElementById('pName').value,
    description: document.getElementById('pDesc').value,
    location: { city: document.getElementById('pCity').value, area: document.getElementById('pArea').value, university: document.getElementById('pUniversity').value, address: document.getElementById('pAddress').value, lat: parseFloat(document.getElementById('pLat').value) || null, lng: parseFloat(document.getElementById('pLng').value) || null },
    recommendedUniversity: document.getElementById('pRecommendedUni').value.trim(),
    linkedUniversities: document.getElementById('pLinkedUnis').value.split('\n').map(s=>s.trim()).filter(Boolean).map(line => { const [name,lat,lng] = line.split('|'); return { name: name?.trim(), lat: parseFloat(lat), lng: parseFloat(lng) }; }).filter(u => u.name && !isNaN(u.lat) && !isNaN(u.lng)),
    amenities: document.getElementById('pAmenities').value.split(',').map(s=>s.trim()).filter(Boolean),
    images: document.getElementById('pImages').value.split(',').map(s=>s.trim()).filter(Boolean),
    whatsappNumber: document.getElementById('pWhatsapp').value,
    agentName: document.getElementById('pAgent').value,
    isActive: document.getElementById('pActive').checked
  };
  try {
    const r = await api(id ? `/api/properties/${id}` : '/api/properties', { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) });
    if (r.success) { closeModal('propertyModal'); toast('Property saved!'); loadProperties(); }
    else toast(r.error || 'Error saving property', 'error');
  } catch { toast('Error saving property', 'error'); }
}

async function deleteProperty(id) {
  if (!confirm('Delete this property? All linked rooms will be unlinked.')) return;
  const r = await api(`/api/properties/${id}`, { method: 'DELETE' });
  if (r.success) { toast('Property deleted'); loadProperties(); }
  else toast('Error deleting property', 'error');
}

async function openAddRoomUnderProperty(propertyId, propertyName) {
  // Pre-fill property when opening listing modal from Properties section
  await openListingModal();
  await loadPropertiesDropdown();
  const sel = document.getElementById('lProperty');
  if (sel) sel.value = propertyId;
  document.getElementById('listingModalTitle').textContent = `Add Room — ${propertyName}`;
}

async function viewPropertyRooms(propertyId, propertyName) {
  // Switch to All Rooms section filtered by this property
  showSection('listings');
  setTimeout(async () => {
    const data = await api(`/api/properties/${propertyId}/listings`);
    S.listings = data.data || [];
    const sec = document.getElementById('sec-listings');
    const title = sec.querySelector('h2') || sec;
    document.getElementById('listingSearch').value = '';
    renderListingsBody(S.listings);
    // Update section title
    const toolbar = sec.querySelector('.toolbar');
    if (toolbar) {
      const existing = toolbar.querySelector('.prop-context');
      if (existing) existing.remove();
      const ctx = document.createElement('span');
      ctx.className = 'prop-context';
      ctx.style.cssText = 'font-size:0.85rem;color:var(--gold);font-weight:600;padding:0.4rem 0.8rem;background:rgba(201,168,76,0.1);border-radius:8px;';
      ctx.innerHTML = `<i class="fas fa-city"></i> ${propertyName}`;
      toolbar.insertBefore(ctx, toolbar.firstChild);
    }
  }, 100);
}

async function loadPropertiesDropdown() {
  try {
    const r = await api('/api/properties?isActive=true');
    const sel = document.getElementById('lProperty');
    if (!sel) return;
    let opts = '<option value="">— Standalone listing —</option>';
    (r.data || []).forEach(p => { opts += `<option value="${p._id}">${p.name}</option>`; });
    sel.innerHTML = opts;
  } catch(e) { console.error(e); }
}

async function autoFillFromProperty() {
  const pid = document.getElementById('lProperty').value;
  if (!pid) return;
  const prop = S_properties.find(p => p._id === pid);
  if (!prop) return;
  if (prop.location?.university) document.getElementById('lUniversity').value = prop.location.university;
  if (prop.location?.area) document.getElementById('lArea').value = prop.location.area;
  if (prop.location?.city) document.getElementById('lCity').value = prop.location.city;
}

async function loadUniversitiesFor(selectId) {
  try {
    const r = await api('/api/listings/lookup/universities');
    if (r.success && r.data?.universities) {
      universityAreaMap = r.data.map || {};
      const select = document.getElementById(selectId);
      const currentValue = select.value;
      let options = '<option value="">Select University</option>';
      r.data.universities.forEach(uni => { options += `<option value="${uni}">${uni}</option>`; });
      select.innerHTML = options;
      if (currentValue) select.value = currentValue;
    }
  } catch(e) { console.error(e); }
}

function autoPropArea() {
  const university = document.getElementById('pUniversity').value;
  const areaInput = document.getElementById('pArea');
  if (university && universityAreaMap[university]) {
    const areas = universityAreaMap[university];
    if (areas?.length > 0) areaInput.value = areas[0];
  }
}

// ── LISTINGS ──
async function loadListings() {
  const sec = document.getElementById('sec-listings');
  sec.innerHTML = `
    <div class="toolbar" style="margin-bottom:1rem;">
      <div class="search-box"><i class="fas fa-search"></i><input placeholder="Search rooms..." oninput="filterListings(this.value)" id="listingSearch"></div>
      <select class="form-select" style="width:160px;" onchange="filterListings()">
        <option value="">All Types</option>
        <option value="apartment">Apartment</option>
        <option value="studio">Studio</option>
        <option value="shared_room">Shared Room</option>
        <option value="private_room">Private Room</option>
        <option value="house">House</option>
      </select>
      <button class="btn btn-gold" onclick="openListingModal()"><i class="fas fa-plus"></i> Add Room</button>
    </div>
    <div class="card">
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>Title</th><th>Property</th><th>Type</th><th>Price</th><th>Location</th><th>Views</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="listingsBody"><tr><td colspan="8"><div class="loading"><div class="spinner"></div></div></td></tr></tbody>
        </table>
      </div>
    </div>
  `;
  const data = await api('/api/listings?isActive=true&includeAllCities=true');
  S.listings = data.data || [];
  // Load properties for display
  const pd = await api('/api/properties');
  S_properties = pd.data || [];
  renderListingsBody(S.listings);
}

function renderListingsBody(list) {
  const tbody = document.getElementById('listingsBody');
  if (!tbody) return;
  if (!list.length) { tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fas fa-building"></i><p>No listings found</p></div></td></tr>`; return; }
  tbody.innerHTML = list.map(l => {
    const propName = l.property ? (S_properties.find(p => p._id === (l.property._id || l.property))?.name || '—') : '—';
    return `
    <tr>
      <td><div class="cell-primary">${l.title}</div></td>
      <td style="font-size:0.8rem;color:var(--gold);font-weight:600;">${propName}</td>
      <td><span style="text-transform:capitalize;font-size:0.8rem;color:var(--text-dim);">${l.propertyType?.replace('_',' ')}</span></td>
      <td style="font-family:'DM Mono',monospace;font-size:0.82rem;">RM ${l.price}/${l.pricePeriod}</td>
      <td style="font-size:0.82rem;color:var(--text-muted);">${l.location?.area || l.location?.city || '-'}</td>
      <td style="font-family:'DM Mono',monospace;font-size:0.82rem;">${l.views}</td>
      <td>${l.isActive ? '<span class="badge badge-active">Active</span>' : '<span class="badge badge-inactive">Inactive</span>'}</td>
      <td>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-ghost btn-sm btn-icon" onclick="editListing('${l._id}')" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="btn btn-danger-ghost btn-sm btn-icon" onclick="deleteListing('${l._id}')" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function filterListings(search) {
  const q = (search || document.getElementById('listingSearch')?.value || '').toLowerCase();
  renderListingsBody(S.listings.filter(l => !q || l.title?.toLowerCase().includes(q) || l.location?.city?.toLowerCase().includes(q)));
}

async function openListingModal(l = null) {
  document.getElementById('listingModalTitle').textContent = l ? 'Edit Listing' : 'Add Listing';
  document.getElementById('listingId').value = l?._id || '';
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
  set('lTitle', l?.title); set('lDesc', l?.description); set('lPrice', l?.price);
  set('lPeriod', l?.pricePeriod || 'month'); set('lType', l?.propertyType || 'apartment');
  set('lCity', l?.location?.city); set('lArea', l?.location?.area); set('lUniversity', l?.location?.university);
  set('lAddress', l?.location?.address); set('lBedrooms', l?.bedrooms);
  set('lBathrooms', l?.bathrooms); set('lOccupants', l?.maxOccupants);
  set('lWhatsapp', l?.whatsappNumber); set('lWechat', l?.wechatId);
  set('lAmenities', (l?.amenities || []).join(', '));
  set('lImages', (l?.images || []).join(', '));
  set('lFrom', l?.availableFrom?.split('T')[0]); set('lUntil', l?.availableUntil?.split('T')[0]);
  set('lLat', l?.location?.lat ?? ''); set('lLng', l?.location?.lng ?? '');
  set('lRecommendedUni', l?.recommendedUniversity || '');
  const linkedUniStr = (l?.linkedUniversities || []).map(u => `${u.name}|${u.lat}|${u.lng}`).join('\n');
  set('lLinkedUnis', linkedUniStr);
  document.getElementById('lActive').checked = l ? l.isActive : true;
  document.getElementById('lFeatured').checked = l?.isFeatured || false;
  await loadUniversities();
  await loadPropertiesDropdown();
  const propId = l?.property?._id || l?.property || '';
  if (propId) document.getElementById('lProperty').value = propId;
  openModal('listingModal');
}

function editListing(id) { openListingModal(S.listings.find(l => l._id === id)); }

async function saveListing() {
  const id = document.getElementById('listingId').value;
  const body = {
    title: document.getElementById('lTitle').value,
    description: document.getElementById('lDesc').value,
    price: parseInt(document.getElementById('lPrice').value),
    pricePeriod: document.getElementById('lPeriod').value,
    propertyType: document.getElementById('lType').value,
    location: { city: document.getElementById('lCity').value, area: document.getElementById('lArea').value, university: document.getElementById('lUniversity').value, address: document.getElementById('lAddress').value, lat: parseFloat(document.getElementById('lLat').value) || null, lng: parseFloat(document.getElementById('lLng').value) || null },
    bedrooms: parseInt(document.getElementById('lBedrooms').value)||0,
    bathrooms: parseFloat(document.getElementById('lBathrooms').value)||0,
    maxOccupants: parseInt(document.getElementById('lOccupants').value)||1,
    whatsappNumber: document.getElementById('lWhatsapp').value,
    wechatId: document.getElementById('lWechat').value,
    amenities: document.getElementById('lAmenities').value.split(',').map(s=>s.trim()).filter(Boolean),
    images: document.getElementById('lImages').value.split(',').map(s=>s.trim()).filter(Boolean),
    availableFrom: document.getElementById('lFrom').value,
    availableUntil: document.getElementById('lUntil').value,
    isActive: document.getElementById('lActive').checked,
    isFeatured: document.getElementById('lFeatured').checked,
    property: document.getElementById('lProperty').value || null,
    recommendedUniversity: document.getElementById('lRecommendedUni').value.trim(),
    linkedUniversities: document.getElementById('lLinkedUnis').value.split('\n').map(s=>s.trim()).filter(Boolean).map(line => { const [name,lat,lng] = line.split('|'); return { name: name?.trim(), lat: parseFloat(lat), lng: parseFloat(lng) }; }).filter(u => u.name && !isNaN(u.lat) && !isNaN(u.lng))
  };
  try {
    const r = await api(id ? `/api/listings/${id}` : '/api/listings', { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) });
    if (r.success) { closeModal('listingModal'); toast('Listing saved!'); loadListings(); }
    else toast(r.error || 'Error saving listing', 'error');
  } catch { toast('Error saving listing', 'error'); }
}

async function deleteListing(id) {
  if (!confirm('Delete this listing? This cannot be undone.')) return;
  const r = await api(`/api/listings/${id}`, { method: 'DELETE' });
  if (r.success) { toast('Listing deleted'); loadListings(); }
  else toast('Error deleting listing', 'error');
}

// ── UNIVERSITY/AREA HELPERS ──
let universityAreaMap = {}; // Cache for university to area mapping

async function loadUniversities() {
  try {
    const r = await api('/api/listings/lookup/universities');
    if (r.success && r.data?.universities) {
      universityAreaMap = r.data.map || {};
      const select = document.getElementById('lUniversity');
      const currentValue = select.value;
      
      // Build options
      let options = '<option value="">Select University</option>';
      r.data.universities.forEach(uni => {
        options += `<option value="${uni}">${uni}</option>`;
      });
      select.innerHTML = options;
      
      // Restore selection if editing
      if (currentValue) select.value = currentValue;
    }
  } catch (e) {
    console.error('Failed to load universities:', e);
  }
}

function autoPopulateArea() {
  const university = document.getElementById('lUniversity').value;
  const areaInput = document.getElementById('lArea');
  
  if (university && universityAreaMap[university]) {
    const areas = universityAreaMap[university];
    if (areas && areas.length > 0) {
      areaInput.value = areas[0]; // Always update to first area for selected university
    }
  } else if (!university) {
    areaInput.value = ''; // Clear area if no university selected
  }
}

// ── LEADS ──
async function loadLeads() {
  const sec = document.getElementById('sec-leads');
  sec.innerHTML = `
    <div class="tabs" style="margin-bottom:1rem;">
      ${['all','new','contacted','viewing_scheduled','converted','closed'].map(s =>
        `<div class="tab ${S.leadFilter===s?'active':''}" onclick="setLeadFilter('${s}')">${s==='viewing_scheduled'?'Viewing':cap(s)}</div>`
      ).join('')}
    </div>
    <div class="toolbar">
      <div class="search-box"><i class="fas fa-search"></i><input placeholder="Search leads..." oninput="filterLeads(this.value)" id="leadSearch"></div>
    </div>
    <div class="card">
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>Name</th><th>Contact</th><th>Source</th><th>Listing</th><th>Status</th><th>Date</th><th></th></tr></thead>
          <tbody id="leadsBody"><tr><td colspan="7"><div class="loading"><div class="spinner"></div></div></td></tr></tbody>
        </table>
      </div>
    </div>
  `;
  const data = await api('/api/leads');
  S.leads = data.data || [];
  renderLeadsBody();
}

function setLeadFilter(f) { S.leadFilter = f; loadLeads(); }

function renderLeadsBody() {
  const tbody = document.getElementById('leadsBody');
  if (!tbody) return;
  const q = document.getElementById('leadSearch')?.value?.toLowerCase() || '';
  let list = S.leads;
  if (S.leadFilter !== 'all') list = list.filter(l => l.status === S.leadFilter);
  if (q) list = list.filter(l => l.name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q));
  if (!list.length) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fas fa-users"></i><p>No leads found</p></div></td></tr>`; return; }
  tbody.innerHTML = list.map(l => `
    <tr class="lead-swipe-row" id="lead-row-${l._id}" data-id="${l._id}">
      <td class="inline-edit-cell" ondblclick="inlineEditName('${l._id}', this, '${(l.name||'').replace(/'/g,"\\'")}')"><div class="cell-primary">${l.name}</div><div class="cell-muted">${l.email}</div></td>
      <td style="font-size:0.82rem;">${l.phone||'-'}</td>
      <td>${l.source === 'whatsapp' ? '<span style="background:#25d366;color:white;padding:2px 8px;border-radius:100px;font-size:0.7rem;"><i class="fab fa-whatsapp"></i> WhatsApp</span>' : '<span style="font-size:0.78rem;color:var(--text-muted);">Website</span>'}</td>
      <td style="font-size:0.8rem;color:var(--text-muted);">${l.listingTitle||'-'}</td>
      <td><select class="inline-status-select" onchange="inlineUpdateStatus('${l._id}', this.value)" title="Click to change status">
        ${['new','contacted','viewing_scheduled','converted','closed'].map(s=>`<option value="${s}"${l.status===s?' selected':''}>${cap(s)}</option>`).join('')}
      </select></td>
      <td style="font-size:0.78rem;color:var(--text-muted);">${fmtDate(l.createdAt)}<br><span style="font-size:0.72rem;opacity:0.7;">${fmtTime(l.createdAt)}</span></td>
      <td><button class="btn btn-ghost btn-sm btn-icon" onclick="viewLead('${l._id}')" title="View"><i class="fas fa-eye"></i></button></td>
      <div class="lead-swipe-actions">
        <button class="lead-swipe-btn-call" onclick="window.location='tel:${l.phone||''}'"><i class="fas fa-phone"></i><br>Call</button>
        <button class="lead-swipe-btn-wa" onclick="window.open('https://wa.me/${(l.phone||'').replace(/\D/g,'')}')"><i class="fab fa-whatsapp"></i><br>WA</button>
        <button class="lead-swipe-btn-contacted" onclick="inlineUpdateStatus('${l._id}','contacted');document.getElementById('lead-row-${l._id}').classList.remove('swiped')"><i class="fas fa-check"></i><br>Contacted</button>
      </div>
    </tr>
  `).join('');
  // Attach touch swipe handlers
  tbody.querySelectorAll('.lead-swipe-row').forEach(row => attachSwipe(row));
}

function filterLeads() { renderLeadsBody(); }

function viewLead(id) {
  const l = S.leads.find(x => x._id === id);
  if (!l) return;
  
  // Update header
  document.getElementById('leadModalName').textContent = l.name;
  const statusBadge = document.getElementById('leadModalStatus');
  statusBadge.textContent = l.status;
  statusBadge.className = `lead-status-badge ${l.status}`;
  
  // Add WhatsApp badge to header if source is whatsapp
  const headerInfo = document.querySelector('.lead-header-info');
  const existingBadge = headerInfo.querySelector('.whatsapp-badge');
  if (existingBadge) existingBadge.remove();
  if (l.source === 'whatsapp') {
    const waBadge = document.createElement('span');
    waBadge.className = 'whatsapp-badge';
    waBadge.innerHTML = '<i class="fab fa-whatsapp"></i> WhatsApp';
    waBadge.style.cssText = 'background:#25d366;color:white;padding:4px 10px;border-radius:100px;font-size:0.7rem;margin-left:8px;';
    headerInfo.appendChild(waBadge);
  }
  
  // Helper to format value or show "Not provided"
  const val = (v) => v ? `<span class="lead-field-value">${v}</span>` : `<span class="lead-field-value not-provided">Not provided</span>`;
  const valMeta = (v) => v ? `<span class="lead-meta-value">${v}</span>` : `<span class="lead-meta-value not-provided">Not provided</span>`;
  
  // Format date: "23 May 2026"
  const fmtDateLong = (d) => {
    if (!d) return null;
    const date = new Date(d);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  
  // Copy to clipboard function
  const copyBtn = (text) => `<button class="lead-copy-btn" onclick="navigator.clipboard.writeText('${text}');toast('Copied!')" title="Copy"><i class="fas fa-copy"></i></button>`;
  
  // Clean message - remove metadata prefixes like "Enquiry for..." and "Move-in:..."
  const cleanMessage = (msg) => {
    if (!msg) return '';
    // Remove patterns like 'Enquiry for "trial". Move-in: 2026-05-28.'
    let cleaned = msg.replace(/Enquiry for\s+["'][^"']+["']\.?\s*/gi, '');
    cleaned = cleaned.replace(/Move-in:\s*\d{4}-\d{2}-\d{2}\.?\s*/gi, '');
    cleaned = cleaned.trim();
    return cleaned;
  };
  
  document.getElementById('leadModalBody').innerHTML = `
    <!-- Contact Card -->
    <div class="lead-card">
      <div class="lead-card-title"><i class="fas fa-user"></i> Contact Information</div>
      <div class="lead-card-content">
        <div class="lead-field">
          <div class="lead-field-icon"><i class="fas fa-user"></i></div>
          <div class="lead-field-content">
            <div class="lead-field-label">Name</div>
            ${val(l.name)} ${copyBtn(l.name)}
          </div>
        </div>
        <div class="lead-field">
          <div class="lead-field-icon"><i class="fas fa-envelope"></i></div>
          <div class="lead-field-content">
            <div class="lead-field-label">Email</div>
            ${l.email ? `<span class="lead-field-value"><a href="mailto:${l.email}">${l.email}</a></span> ${copyBtn(l.email)}` : val(null)}
          </div>
        </div>
        <div class="lead-field">
          <div class="lead-field-icon"><i class="fas fa-phone"></i></div>
          <div class="lead-field-content">
            <div class="lead-field-label">Phone</div>
            ${l.phone ? `<span class="lead-field-value">${l.phone}</span> ${copyBtn(l.phone)} 
            <a href="https://wa.me/${l.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Hi ${l.name || 'there'}, this is Ten&See regarding your inquiry. How can we help you today?`)}" 
               target="_blank" class="btn btn-sm" style="background:#25d366;color:white;margin-left:0.5rem;padding:0.25rem 0.5rem;font-size:0.75rem;">
              <i class="fab fa-whatsapp"></i> Open WhatsApp
            </a>` : val(null)}
          </div>
        </div>
        <div class="lead-field">
          <div class="lead-field-icon"><i class="fas fa-graduation-cap"></i></div>
          <div class="lead-field-content">
            <div class="lead-field-label">University</div>
            ${val(l.university)}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Property Card (if applicable) -->
    ${l.listingId ? `
    <div class="lead-card">
      <div class="lead-card-title"><i class="fas fa-home"></i> Property Interest</div>
      <a href="/listing.html?id=${l.listingId}" target="_blank" class="lead-property-link">
        <div class="lead-property-icon"><i class="fas fa-building"></i></div>
        <div class="lead-property-info">
          <div class="lead-property-name">${l.listingTitle || 'View Property'}</div>
          <div class="lead-property-meta">Click to view listing details</div>
        </div>
        <div class="lead-property-arrow"><i class="fas fa-chevron-right"></i></div>
      </a>
    </div>
    ` : ''}
    
    <!-- Message Card - Most Prominent -->
    ${l.message && cleanMessage(l.message) ? `
    <div class="lead-message-card">
      <div class="lead-message-label"><i class="fas fa-comment-dots"></i> Visitor's Message</div>
      <div class="lead-message-text">${cleanMessage(l.message)}</div>
    </div>
    ` : ''}
    
    <!-- Dates -->
    <div style="display:flex;gap:1.5rem;justify-content:center;padding:0.5rem 0;font-size:0.75rem;color:var(--text-muted);">
      <span>${fmtDateLong(l.createdAt) || ''}</span>
      ${l.updatedAt && l.updatedAt !== l.createdAt ? `<span>${fmtDateLong(l.updatedAt)}</span>` : ''}
    </div>
    
    <!-- Actions Section -->
    <div class="lead-actions">
      <div class="form-group">
        <label class="form-label">Status</label>
        <div class="status-pills" id="statusPills">
          ${['new','contacted','viewing_scheduled','converted','closed','not_interested'].map(s => `
            <div class="status-pill ${s} ${l.status===s?'selected':''}" 
                 data-status="${s}"
                 onclick="selectLeadStatus('${s}', '${l._id}')">
              ${l.status===s?'<i class="fas fa-check"></i>':''}
              ${cap(s.replace('_',' '))}
            </div>
          `).join('')}
        </div>
        <input type="hidden" id="lStatusSel" value="${l.status}">
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="form-textarea" id="lNotesTa" rows="3">${l.notes||''}</textarea>
      </div>
      <button class="btn btn-gold" style="width:100%;" onclick="updateLead('${l._id}')">
        <i class="fas fa-save"></i> Update Lead
      </button>
    </div>
  `;
  openModal('leadModal');
}

// Original lead status for revert on failure
let originalLeadStatus = null;
let currentLeadId = null;

function selectLeadStatus(status, leadId) {
  // Store original status and lead ID for potential revert
  if (!originalLeadStatus) {
    originalLeadStatus = document.getElementById('lStatusSel').value;
    currentLeadId = leadId;
  }
  
  // Update hidden input
  document.getElementById('lStatusSel').value = status;
  
  // Update pills UI
  document.querySelectorAll('.status-pill').forEach(pill => {
    const pillStatus = pill.dataset.status;
    const isSelected = pillStatus === status;
    pill.classList.toggle('selected', isSelected);
    pill.innerHTML = isSelected ? `<i class="fas fa-check"></i> ${cap(pillStatus.replace('_',' '))}` : cap(pillStatus.replace('_',' '));
  });
  
  // Update header badge instantly
  const headerBadge = document.getElementById('leadModalStatus');
  headerBadge.textContent = status;
  headerBadge.className = `lead-status-badge ${status}`;
  
  // Show updating state on selected pill
  const selectedPill = document.querySelector(`.status-pill[data-status="${status}"]`);
  selectedPill.classList.add('updating');
  
  // Auto-save status immediately
  saveLeadStatus(leadId, status, selectedPill);
}

async function saveLeadStatus(id, status, pillElement) {
  try {
    const r = await api(`/api/leads/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
    
    if (r.success) {
      // Success: remove updating state, show toast, refresh last updated
      pillElement.classList.remove('updating');
      toast('Status updated', 'success');
      
      // Update the lead in S.leads array
      const lead = S.leads.find(l => l._id === id);
      if (lead) {
        lead.status = status;
        lead.updatedAt = new Date().toISOString();
      }
      
      // Reset original status tracker
      originalLeadStatus = null;
      currentLeadId = null;
      
      // Refresh leads list if visible
      if (S.section === 'leads') loadLeads();
    } else {
      throw new Error(r.error || 'Update failed');
    }
  } catch (e) {
    // Failure: revert UI
    pillElement.classList.remove('updating');
    toast('Failed to update status', 'error');
    
    // Revert to original status
    if (originalLeadStatus) {
      document.getElementById('lStatusSel').value = originalLeadStatus;
      
      // Revert pills
      document.querySelectorAll('.status-pill').forEach(pill => {
        const pillStatus = pill.dataset.status;
        const isSelected = pillStatus === originalLeadStatus;
        pill.classList.toggle('selected', isSelected);
        pill.innerHTML = isSelected ? `<i class="fas fa-check"></i> ${cap(pillStatus.replace('_',' '))}` : cap(pillStatus.replace('_',' '));
      });
      
      // Revert header badge
      const headerBadge = document.getElementById('leadModalStatus');
      headerBadge.textContent = originalLeadStatus;
      headerBadge.className = `lead-status-badge ${originalLeadStatus}`;
    }
  }
}

async function updateLead(id) {
  const status = document.getElementById('lStatusSel').value;
  const notes = document.getElementById('lNotesTa').value;
  const r = await api(`/api/leads/${id}`, { method: 'PUT', body: JSON.stringify({ status, notes }) });
  if (r.success) { closeModal('leadModal'); toast('Lead updated'); loadLeads(); }
  else toast('Error updating lead', 'error');
}

// ── BOOKINGS ──
async function loadBookings() {
  const sec = document.getElementById('sec-bookings');
  sec.innerHTML = `
    <div class="tabs" style="margin-bottom:1rem;">
      ${['all','pending','confirmed','deposit_paid','fully_paid','cancelled','completed'].map(s =>
        `<div class="tab ${S.bookingFilter===s?'active':''}" onclick="setBookingFilter('${s}')">${cap(s)}</div>`
      ).join('')}
    </div>
    <div style="display:flex;gap:0.5rem;margin-bottom:1rem;">
      <button class="btn btn-sm ${S.bookingSourceFilter==='all'||!S.bookingSourceFilter?'btn-gold':''}" onclick="setBookingSourceFilter('all')">All Sources</button>
      <button class="btn btn-sm ${S.bookingSourceFilter==='website'?'btn-gold':''}" onclick="setBookingSourceFilter('website')">Website</button>
      <button class="btn btn-sm ${S.bookingSourceFilter==='whatsapp'?'btn-gold':''}" style="background:${S.bookingSourceFilter==='whatsapp'?'#25d366':''}" onclick="setBookingSourceFilter('whatsapp')"><i class="fab fa-whatsapp"></i> WhatsApp</button>
    </div>
    <div class="card">
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>Student</th><th>Property</th><th>Source</th><th>Check-in</th><th>Amount</th><th>Status</th><th></th></tr></thead>
          <tbody id="bookingsBody"><tr><td colspan="7"><div class="loading"><div class="spinner"></div></div></td></tr></tbody>
        </table>
      </div>
    </div>
  `;
  let query = [];
  if (S.bookingFilter !== 'all') query.push(`status=${S.bookingFilter}`);
  if (S.bookingSourceFilter && S.bookingSourceFilter !== 'all') query.push(`source=${S.bookingSourceFilter}`);
  const q = query.length ? `?${query.join('&')}` : '';
  const data = await api(`/api/bookings${q}`);
  S.bookings = data.data || [];
  renderBookingsBody();
}

function setBookingFilter(f) { S.bookingFilter = f; loadBookings(); }

function setBookingSourceFilter(f) { S.bookingSourceFilter = f; loadBookings(); }

function renderBookingsBody() {
  const tbody = document.getElementById('bookingsBody');
  if (!tbody) return;
  if (!S.bookings.length) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fas fa-calendar"></i><p>No bookings found</p></div></td></tr>`; return; }
  tbody.innerHTML = S.bookings.map(b => `
    <tr>
      <td><div class="cell-primary">${b.studentName||'-'}</div><div class="cell-muted">${b.studentEmail||''}</div></td>
      <td style="font-size:0.82rem;color:var(--text-muted);">${b.listingId?.title||'-'}</td>
      <td>${b.source === 'whatsapp' ? '<span style="background:#25d366;color:white;padding:2px 8px;border-radius:100px;font-size:0.7rem;"><i class="fab fa-whatsapp"></i> WhatsApp</span>' : '<span style="font-size:0.78rem;color:var(--text-muted);">Website</span>'}</td>
      <td style="font-size:0.82rem;">${fmtDate(b.checkInDate)}</td>
      <td style="font-family:'DM Mono',monospace;font-size:0.82rem;">RM ${(b.totalAmount||0).toLocaleString()}</td>
      <td>${statusBadge(b.status)}</td>
      <td><button class="btn btn-ghost btn-sm btn-icon" onclick="viewBooking('${b._id}')" title="View"><i class="fas fa-eye"></i></button></td>
    </tr>
  `).join('');
}

function viewBooking(id) {
  const b = S.bookings.find(x => x._id === id);
  if (!b) return;
  const nights = Math.ceil((new Date(b.checkOutDate) - new Date(b.checkInDate)) / 86400000);
  const waLink = b.studentPhone ? `https://wa.me/${b.studentPhone.replace(/\D/g,'')}?text=${encodeURIComponent(`Hi ${b.studentName}, this is Ten&See regarding your booking for ${b.listingId?.title || 'your room'}. How can we help you today?`)}` : '';
  document.getElementById('bookingModalBody').innerHTML = `
    <div class="form-row">
      <div class="booking-row-detail"><div class="label">Student</div><div class="value">${b.studentName}</div></div>
      <div class="booking-row-detail"><div class="label">Email</div><div class="value" style="font-size:0.8rem;">${b.studentEmail}</div></div>
      <div class="booking-row-detail"><div class="label">Phone</div><div class="value">${b.studentPhone || '-'}</div>${b.studentPhone && waLink ? `<a href="${waLink}" target="_blank" style="background:#25d366;color:white;padding:4px 10px;border-radius:6px;font-size:0.75rem;text-decoration:none;display:inline-flex;align-items:center;gap:4px;margin-top:4px;"><i class="fab fa-whatsapp"></i> Open WhatsApp</a>` : ''}</div>
      <div class="booking-row-detail"><div class="label">Source</div><div class="value">${b.source === 'whatsapp' ? '<span style="background:#25d366;color:white;padding:2px 8px;border-radius:100px;font-size:0.7rem;"><i class="fab fa-whatsapp"></i> WhatsApp</span>' : 'Website'}</div></div>
      <div class="booking-row-detail"><div class="label">Property</div><div class="value" style="font-size:0.82rem;">${b.listingId?.title||'-'}</div></div>
      <div class="booking-row-detail"><div class="label">Occupants</div><div class="value">${b.numberOfOccupants}</div></div>
      <div class="booking-row-detail"><div class="label">Check-in</div><div class="value">${fmtDate(b.checkInDate)}</div></div>
      <div class="booking-row-detail"><div class="label">Check-out</div><div class="value">${fmtDate(b.checkOutDate)}</div></div>
      <div class="booking-row-detail"><div class="label">Nights</div><div class="value">${nights}</div></div>
      <div class="booking-row-detail"><div class="label">Total (MYR)</div><div class="value" style="color:var(--gold);">RM ${(b.totalAmount||0).toLocaleString()}</div></div>
      <div class="booking-row-detail"><div class="label">Deposit (30%)</div><div class="value">RM ${(b.depositAmount||0).toLocaleString()}</div></div>
      <div class="booking-row-detail"><div class="label">Remaining</div><div class="value">RM ${(b.remainingAmount||0).toLocaleString()}</div></div>
    </div>
    ${b.adminNotes?`<div style="background:var(--surface2);padding:0.875rem;border-radius:var(--radius);margin:0.75rem 0;font-size:0.85rem;"><strong>Notes:</strong> ${b.adminNotes}</div>`:''}
    <div class="form-group" style="margin-top:1rem;">
      <label class="form-label">Update Status</label>
      <select class="form-select" id="bStatusSel">
        ${['pending','confirmed','deposit_paid','fully_paid','cancelled','completed'].map(s=>`<option value="${s}"${b.status===s?' selected':''}>${cap(s)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Admin Notes</label>
      <textarea class="form-textarea" id="bNotesTa">${b.adminNotes||''}</textarea>
    </div>
    <button class="btn btn-gold" style="width:100%;" onclick="updateBooking('${b._id}')">
      <i class="fas fa-save"></i> Update Booking
    </button>
  `;
  openModal('bookingModal');
}

async function updateBooking(id) {
  const status = document.getElementById('bStatusSel').value;
  const adminNotes = document.getElementById('bNotesTa').value;
  const r = await api(`/api/bookings/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, adminNotes }) });
  if (r.success) { closeModal('bookingModal'); toast('Booking updated'); loadBookings(); }
  else toast('Error updating booking', 'error');
}

// ── QUEUE / LIVE CHAT MANAGEMENT ────────────────────────────────────────────

function playChime() {
  const sound = document.getElementById('notifSound');
  if (sound) { sound.currentTime = 0; sound.play().catch(() => {}); }
}

// Agent chat status (persisted in session)
S.chatStatus = S.chatStatus || 'offline';
S.queueMetrics = S.queueMetrics || null;
S.myChats = S.myChats || [];

// ── Status toggle (shown in the chat section header) ──────────────────────
function renderAgentStatusBar() {
  const statuses = [
    { key: 'online',  label: 'Online',   color: '#22c55e' },
    { key: 'away',    label: 'Away',     color: '#f59e0b' },
    { key: 'offline', label: 'Offline',  color: '#6b7280' }
  ];
  return `
    <div class="agent-status-bar" id="agentStatusBar" style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem 1rem;background:var(--surface);border-bottom:1px solid var(--border);flex-wrap:wrap;">
      <span style="font-size:0.8rem;font-weight:600;color:var(--text-muted);margin-right:0.25rem;">My Status:</span>
      ${statuses.map(s => `
        <button onclick="setMyChatStatus('${s.key}')" id="statusBtn-${s.key}"
          style="padding:0.3rem 0.8rem;border-radius:20px;border:2px solid ${s.color};background:${S.chatStatus===s.key?s.color:'transparent'};
                 color:${S.chatStatus===s.key?'#fff':s.color};font-size:0.75rem;font-weight:600;cursor:pointer;transition:all 0.2s;">
          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${s.color};margin-right:4px;vertical-align:middle;"></span>${s.label}
        </button>
      `).join('')}
      <span style="margin-left:auto;font-size:0.75rem;color:var(--text-muted);" id="myActiveChatCount">
        Active chats: <strong>0</strong>
      </span>
    </div>`;
}

async function setMyChatStatus(status) {
  S.chatStatus = status;
  try {
    await api('/api/queue/status', { method: 'POST', body: JSON.stringify({ status }) });
    if (socket && socket.connected) {
      socket.emit('set_chat_status', { adminId: S.adminId, status });
    }
    // Re-render status buttons
    const statuses = [
      { key: 'online',  color: '#22c55e' },
      { key: 'away',    color: '#f59e0b' },
      { key: 'offline', color: '#6b7280' }
    ];
    statuses.forEach(s => {
      const btn = document.getElementById(`statusBtn-${s.key}`);
      if (btn) {
        btn.style.background = status === s.key ? s.color : 'transparent';
        btn.style.color = status === s.key ? '#fff' : s.color;
      }
    });
    const labels = { online: '🟢 Online', away: '🟡 Away', offline: '⚫ Offline' };
    toast(`Status: ${labels[status] || status}`, 'info');
  } catch (e) {
    toast('Failed to update status', 'error');
  }
}

// ── Queue alert popup (non-blocking, slides in) ──────────────────────────
function showQueueAlert(data) {
  const existing = document.getElementById('queueAlertBanner');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.id = 'queueAlertBanner';
  div.style.cssText = `
    position:fixed;top:1.25rem;right:1.25rem;z-index:99999;
    background:var(--surface);border:2px solid #22c55e;border-radius:12px;
    box-shadow:0 8px 32px rgba(0,0,0,0.18);padding:1rem 1.25rem;min-width:280px;max-width:340px;
    animation:bannerSlideUp 0.3s ease;
  `;
  const waited = data.waitedMs ? `${Math.round(data.waitedMs/1000)}s wait` : '';
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;">
      <div>
        <div style="font-weight:700;font-size:0.95rem;color:var(--text-main);">💬 New Chat Assigned</div>
        <div style="font-size:0.85rem;color:var(--text-muted);margin:0.25rem 0;">
          <strong>${data.visitorName || 'Visitor'}</strong>
          ${data.topic ? `· ${data.topic}` : ''}
          ${waited ? `<span style="color:#22c55e;"> · ${waited}</span>` : ''}
        </div>
      </div>
      <button onclick="document.getElementById('queueAlertBanner').remove()" style="background:none;border:none;font-size:1.1rem;cursor:pointer;color:var(--text-muted);line-height:1;">×</button>
    </div>
    <div style="display:flex;gap:0.5rem;margin-top:0.75rem;">
      <button onclick="acceptAssignedChat('${data.sessionId}');document.getElementById('queueAlertBanner').remove();"
        style="flex:1;background:#22c55e;color:#fff;border:none;padding:0.45rem 0;border-radius:8px;font-weight:600;cursor:pointer;font-size:0.85rem;">
        Accept Chat
      </button>
      <button onclick="rejectAssignedChat('${data.sessionId}');document.getElementById('queueAlertBanner').remove();"
        style="flex:1;background:var(--surface);color:var(--text-muted);border:1px solid var(--border);padding:0.45rem 0;border-radius:8px;cursor:pointer;font-size:0.85rem;">
        Pass
      </button>
    </div>
  `;
  document.body.appendChild(div);
  setTimeout(() => { if (div.parentNode) div.remove(); }, 30000);
}

async function acceptAssignedChat(sessionId) {
  if (!sessionId) return;
  try {
    await api(`/api/queue/accept/${sessionId}`, { method: 'POST' });
    if (socket && socket.connected) {
      socket.emit('accept_chat', { sessionId, adminId: S.adminId });
    }
    showSection('chat');
    setTimeout(() => openSession(sessionId, 'Visitor', false), 400);
  } catch (e) {
    toast('Error accepting chat', 'error');
  }
}

function rejectAssignedChat(sessionId) {
  if (!sessionId || !socket) return;
  socket.emit('reject_chat', { sessionId, adminId: S.adminId });
  toast('Chat passed to next available agent', 'info');
}

// ── My Chats panel ────────────────────────────────────────────────────────
async function refreshMyChats() {
  try {
    const data = await api('/api/queue/mine');
    S.myChats = data.data || [];
    renderMyChatsPanel();
    const el = document.getElementById('myActiveChatCount');
    if (el) el.innerHTML = `Active chats: <strong>${S.myChats.length}</strong>`;
  } catch (e) { /* silent */ }
}

function renderMyChatsPanel() {
  const container = document.getElementById('myChatsPanel');
  if (!container) return;
  if (!S.myChats.length) {
    container.innerHTML = `<div style="padding:1.5rem;text-align:center;color:var(--text-muted);font-size:0.85rem;"><i class="fas fa-inbox" style="font-size:1.5rem;opacity:0.4;display:block;margin-bottom:0.5rem;"></i>No assigned chats</div>`;
    return;
  }
  container.innerHTML = S.myChats.map(s => {
    const unread = s.unreadCount || 0;
    const since = s.lastMessageAt ? fmtTime(s.lastMessageAt) : '';
    return `
      <div class="chat-session-item ${S.currentSession===s.sessionId?'active':''}"
           data-session="${s.sessionId}"
           onclick="openSession('${s.sessionId}','${(s.name||'Visitor').replace(/'/g,"\\'")}', false)"
           style="position:relative;">
        <div class="session-avatar">${(s.name||'V').charAt(0).toUpperCase()}</div>
        <div class="session-info">
          <div class="session-name">${s.name||'Visitor'}</div>
          <div class="session-preview">${s.lastMessage||'...'}</div>
        </div>
        <div class="session-meta">
          <div class="session-time">${since}</div>
          ${unread>0?`<div class="unread-count">${unread}</div>`:''}
        </div>
      </div>`;
  }).join('');
}

// ── Queue panel (queued visitors waiting) ────────────────────────────────
async function refreshQueuePanel() {
  try {
    const data = await api('/api/queue/list');
    const queue = data.data || [];
    const container = document.getElementById('queuePanel');
    if (!container) return;
    if (!queue.length) {
      container.innerHTML = `<div style="padding:1.5rem;text-align:center;color:var(--text-muted);font-size:0.85rem;"><i class="fas fa-check-circle" style="font-size:1.5rem;color:#22c55e;opacity:0.7;display:block;margin-bottom:0.5rem;"></i>Queue is empty</div>`;
      return;
    }
    container.innerHTML = queue.map((s, i) => {
      const waited = s.queueEnteredAt
        ? Math.round((Date.now()-new Date(s.queueEnteredAt).getTime())/1000)
        : 0;
      const waitStr = waited > 60 ? `${Math.floor(waited/60)}m ${waited%60}s` : `${waited}s`;
      return `
        <div style="padding:0.75rem 1rem;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:0.75rem;">
          <div style="width:24px;height:24px;border-radius:50%;background:var(--gold);color:#1C2420;font-size:0.7rem;font-weight:700;display:flex;align-items:center;justify-content:center;">${i+1}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:0.85rem;">${s.name||'Visitor'}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">${s.topic||'General'} · Waited ${waitStr}</div>
          </div>
          <button onclick="manualAcceptQueue('${s.sessionId}')"
            style="background:#22c55e;color:#fff;border:none;padding:0.3rem 0.75rem;border-radius:6px;font-size:0.75rem;font-weight:600;cursor:pointer;">
            Take
          </button>
        </div>`;
    }).join('');
  } catch (e) { /* silent */ }
}

async function manualAcceptQueue(sessionId) {
  try {
    await api(`/api/queue/accept/${sessionId}`, { method: 'POST' });
    if (socket) socket.emit('accept_chat', { sessionId, adminId: S.adminId });
    toast('Chat accepted', 'info');
    await refreshMyChats();
    await refreshQueuePanel();
    setTimeout(() => openSession(sessionId, 'Visitor', false), 300);
  } catch (e) { toast('Error accepting chat', 'error'); }
}

// ── Supervisor metrics bar ────────────────────────────────────────────────
function renderQueueMetricsBar(data) {
  const el = document.getElementById('queueMetricsBar');
  if (!el || !data) return;
  const statusDot = { online: '#22c55e', away: '#f59e0b', offline: '#6b7280', invisible: '#a855f7' };
  const agents = (data.agentStatus || []).map(a => `
    <span id="agentDot-${a.id}" title="${a.name}: ${a.chatStatus}" style="display:inline-flex;align-items:center;gap:4px;margin-right:0.75rem;font-size:0.78rem;">
      <span style="width:8px;height:8px;border-radius:50%;background:${statusDot[a.chatStatus]||'#6b7280'};display:inline-block;"></span>
      ${a.name} <span style="color:var(--text-muted);">${a.activeChats}/${a.maxChats}</span>
    </span>`).join('');
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;padding:0.4rem 1rem;background:var(--bg);border-bottom:1px solid var(--border);font-size:0.78rem;">
      <span style="color:var(--text-muted);">Queue:</span>
      <strong style="color:${data.queueLength>0?'var(--gold)':'#22c55e'}">${data.queueLength}</strong>
      <span style="color:var(--text-muted);">Active:</span>
      <strong>${data.activeChats}</strong>
      <span style="margin-left:auto;">${agents}</span>
    </div>`;
}

function updateAgentStatusDot(adminId, status) {
  const dot = document.getElementById(`agentDot-${adminId}`);
  if (!dot) return;
  const statusDot = { online: '#22c55e', away: '#f59e0b', offline: '#6b7280', invisible: '#a855f7' };
  const span = dot.querySelector('span');
  if (span) span.style.background = statusDot[status] || '#6b7280';
}

function updateQueueBadge() {
  refreshQueuePanel();
}

// ── Push notification registration ───────────────────────────────────────
async function initPushNotifications() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const reg = await navigator.serviceWorker.register('/admin/sw-admin.js');
    const keyRes = await fetch('/api/push/vapid-public-key').then(r => r.json()).catch(() => null);
    if (!keyRes?.key) return;

    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await saveSubscription(existing);
      return;
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyRes.key)
    });
    await saveSubscription(sub);
    console.log('[Push] Subscribed ✓');
  } catch (e) {
    console.warn('[Push] Could not subscribe:', e.message);
  }
}

async function saveSubscription(sub) {
  try {
    await api('/api/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription: sub }) });
  } catch (e) { /* silent */ }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// ── CSS for queue elements (injected once) ────────────────────────────────
(function injectQueueStyles() {
  if (document.getElementById('queueStyles')) return;
  const style = document.createElement('style');
  style.id = 'queueStyles';
  style.textContent = `
    .sla-breach { border-left: 3px solid #ef4444 !important; animation: sla-pulse 1s ease infinite; }
    @keyframes sla-pulse { 0%,100%{background:var(--surface)} 50%{background:#fee2e2} }
    #queueAlertBanner { pointer-events:all; }
    .queue-tab-btn { padding:0.4rem 1rem;border:none;background:transparent;color:var(--text-muted);font-size:0.82rem;font-weight:600;cursor:pointer;border-bottom:2px solid transparent; }
    .queue-tab-btn.active { color:var(--gold);border-bottom-color:var(--gold); }
  `;
  document.head.appendChild(style);
})();

// ── CHAT ──
let chatFilter = 'all'; // 'active', 'closed', 'all' - default 'all' to show closed chats for history
const seenChatSessions = new Set(); // Track sessions we've already notified about to prevent duplicates
const notifiedSessionIds = new Set(); // Track recently notified session IDs with timestamp check

// Track which left-panel tab is active: 'mine' | 'queue' | 'all'
let chatLeftTab = 'mine';

async function loadChat() {
  const sec = document.getElementById('sec-chat');
  sec.innerHTML = `
    ${renderAgentStatusBar()}
    <div id="queueMetricsBar"></div>
    <div class="card" style="height:580px;margin-top:0.75rem;">
      <div class="chat-layout">
        <div class="chat-sessions" id="chatSessions" style="display:flex;flex-direction:column;">
          <div style="display:flex;border-bottom:1px solid var(--border);background:var(--surface);">
            <button class="queue-tab-btn ${chatLeftTab==='mine'?'active':''}" onclick="switchChatTab('mine')">My Chats</button>
            <button class="queue-tab-btn ${chatLeftTab==='queue'?'active':''}" onclick="switchChatTab('queue')">Queue</button>
            <button class="queue-tab-btn ${chatLeftTab==='all'?'active':''}" onclick="switchChatTab('all')">All</button>
          </div>
          <div id="chatLeftPanel" style="flex:1;overflow-y:auto;">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
        <div class="chat-main">
          <div class="card-header" id="chatHeader">
            <span class="card-title"><i class="fas fa-comments"></i> <span id="chatHeaderName">Select a conversation</span></span>
          </div>
          <div id="adminTakeoverBanner" style="display:none;"></div>
          <div class="chat-messages" id="chatMessages">
            <div class="chat-empty">
              <i class="fas fa-comments"></i>
              <span>Select a conversation to begin</span>
            </div>
          </div>
          <div id="typingIndicator" style="display:none;padding:0.5rem 1rem;font-size:0.75rem;color:var(--text-muted);font-style:italic;"><i class="fas fa-ellipsis-h"></i> Visitor is typing...</div>
          <div class="chat-input-area" id="chatInputArea" style="display:none;">
            <input class="form-input" id="chatInput" placeholder="Type a reply..." onkeydown="if(event.key==='Enter')sendReply()" oninput="onAdminTyping()">
            <button class="btn btn-gold" onclick="sendReply()"><i class="fas fa-paper-plane"></i></button>
          </div>
        </div>
      </div>
    </div>
  `;
  // Inject queue panel containers that the helpers reference
  const leftPanel = document.getElementById('chatLeftPanel');
  leftPanel.innerHTML = `
    <div id="myChatsPanel" style="${chatLeftTab==='mine'?'':'display:none'}"></div>
    <div id="queuePanel" style="${chatLeftTab==='queue'?'':'display:none'}"></div>
    <div id="chatSessionsList" style="${chatLeftTab==='all'?'':'display:none'}"><div class="loading"><div class="spinner"></div></div></div>
  `;

  // Load all three in parallel
  await Promise.all([refreshMyChats(), refreshQueuePanel(), loadChatSessions()]);
  // Seed metrics bar
  try {
    const m = await api('/api/queue/metrics');
    if (m.success) renderQueueMetricsBar(m.data);
  } catch(e) {}
}

function switchChatTab(tab) {
  chatLeftTab = tab;
  ['mine','queue','all'].forEach(t => {
    const panel = document.getElementById(t === 'mine' ? 'myChatsPanel' : t === 'queue' ? 'queuePanel' : 'chatSessionsList');
    if (panel) panel.style.display = t === tab ? '' : 'none';
    const btn = document.querySelector(`.queue-tab-btn[onclick*="'${t}'"]`);
    if (btn) btn.classList.toggle('active', t === tab);
  });
  if (tab === 'queue') refreshQueuePanel();
  if (tab === 'mine') refreshMyChats();
  if (tab === 'all') loadChatSessions();
}

function setChatFilter(filter) {
  chatFilter = filter;
  // Update button styles
  ['Active', 'Closed', 'All'].forEach(f => {
    const btn = document.getElementById(`filter${f}`);
    if (btn) btn.className = `btn btn-sm ${chatFilter === f.toLowerCase() ? 'btn-gold' : ''}`;
  });
  loadChatSessions();
}

async function loadChatSessions() {
  const data = await api('/api/chat/admin/sessions');
  let sessions = data.data || [];
  const container = document.getElementById('chatSessionsList');
  if (!container) return;

  // Filter sessions based on current filter
  if (chatFilter === 'active') {
    sessions = sessions.filter(s => s.status !== 'closed');
  } else if (chatFilter === 'closed') {
    sessions = sessions.filter(s => s.status === 'closed');
  }
  // 'all' shows everything

  const totalUnread = sessions.reduce((a, s) => a + (s.unreadCount || 0), 0);
  const badge = document.getElementById('chatBadge');
  if (badge) {
    const prev = parseInt(badge.textContent) || 0;
    badge.textContent = totalUnread;
    badge.style.display = totalUnread > 0 ? '' : 'none';
    if (totalUnread > prev && typeof badgeBounce === 'function') badgeBounce(badge);
  }
  if (typeof updateMobNav === 'function') updateMobNav(S.section);

  if (!sessions.length) { 
    container.innerHTML = `<div class="empty-state" style="padding:2rem;text-align:center;color:var(--text-muted);"><i class="fas fa-comments" style="font-size:2rem;margin-bottom:0.5rem;opacity:0.5;"></i><p>No ${chatFilter === 'all' ? '' : chatFilter} conversations</p></div>`; 
    return; 
  }
  
  container.innerHTML = sessions.map(s => {
    const isClosed = s.status === 'closed';
    const contactInfo = [];
    if (s.phone) contactInfo.push(`📞 ${s.phone}`);
    if (s.email) contactInfo.push(`✉️ ${s.email}`);
    const contactStr = contactInfo.join(' • ');
    
    return `
    <div class="chat-session-item ${S.currentSession===s._id?'active':''} ${isClosed?'closed':''}" 
         onclick="openSession('${s._id}','${(s.name||'Anonymous').replace(/'/g,"\\'")}', ${isClosed})"
         style="${isClosed?'opacity:0.6;background:var(--surface);':''}">
      <div class="session-avatar" style="${isClosed?'background:var(--border);':''}">${(s.name||'A').charAt(0).toUpperCase()}</div>
      <div class="session-info">
        <div class="session-name">${s.name||'Anonymous'} ${isClosed?'<span style="font-size:0.7rem;color:var(--text-muted);margin-left:4px;">(Closed)</span>':''}</div>
        ${contactStr ? `<div class="session-contact" style="font-size:0.7rem;color:var(--gold);margin-bottom:2px;">${contactStr}</div>` : ''}
        <div class="session-preview" style="${isClosed?'color:var(--text-muted);':''}">${s.lastMessage||'...'}</div>
      </div>
      <div class="session-meta">
        <div class="session-time">${fmtTime(s.lastMessageAt)}</div>
        ${!isClosed && s.unreadCount>0?`<div class="unread-count">${s.unreadCount}</div>`:''}
      </div>
    </div>
  `}).join('');
}

let currentAdminSession = null; // Track if admin is actively managing a session
let currentSessionIsClosed = false; // Track if current session is closed

async function openSession(id, name, isClosed = false) {
  // If already in a session, leave it first
  if (currentAdminSession && currentAdminSession !== id) {
    if (socket && socket.connected) {
      socket.emit('admin_leave', currentAdminSession);
    }
  }
  
  S.currentSession = id;
  currentAdminSession = id;
  currentSessionIsClosed = isClosed;

  // Audit: log that this admin joined the session
  if (socket && socket.connected && !isClosed) {
    socket.emit('admin_join_session', { sessionId: id, adminId: S.adminId, adminName: S.adminName || 'Admin' });
  }

  // Fetch session details to get contact info
  const sessionData = await api(`/api/chat/${id}`);
  const msgs = sessionData.data || [];
  const firstMsg = msgs[0] || {};
  
  // Build header with contact info and action buttons
  const contactInfo = [];
  if (firstMsg.phone) contactInfo.push(`📞 ${firstMsg.phone}`);
  if (firstMsg.email) contactInfo.push(`✉️ ${firstMsg.email}`);
  const headerText = contactInfo.length > 0 
    ? `${name} <span style="font-size:0.75rem;color:var(--text-muted);margin-left:8px;">${contactInfo.join(' • ')}</span>`
    : name;
  
  const headerEl = document.getElementById('chatHeader');
  if (headerEl) {
    headerEl.innerHTML = `
      <span class="card-title"><i class="fas fa-comments"></i> <span id="chatHeaderName">${headerText}</span></span>
      <div style="display:flex;gap:0.5rem;">
        ${isClosed 
          ? `<button onclick="reopenChatSession('${id}')" class="btn btn-sm" style="background:var(--success);color:white;border:none;padding:0.4rem 0.75rem;border-radius:6px;cursor:pointer;font-size:0.75rem;"><i class="fas fa-redo"></i> Reopen</button>`
          : `<button onclick="closeChatSession('${id}')" class="btn btn-sm" style="background:var(--danger);color:white;border:none;padding:0.4rem 0.75rem;border-radius:6px;cursor:pointer;font-size:0.75rem;"><i class="fas fa-check"></i> Close Chat</button>`
        }
        <button onclick="leaveChatSession()" class="btn btn-sm" style="background:var(--text-muted);color:white;border:none;padding:0.4rem 0.75rem;border-radius:6px;cursor:pointer;font-size:0.75rem;">
          <i class="fas fa-sign-out-alt"></i> Leave
        </button>
      </div>
    `;
  }
  
  const chatContainer = document.querySelector('.chat-main');
  let banner = document.getElementById('adminTakeoverBanner');
  
  if (isClosed) {
    // Show closed banner
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'adminTakeoverBanner';
      chatContainer.insertBefore(banner, chatContainer.children[1]);
    }
    banner.style.cssText = 'background:linear-gradient(135deg, #fee2e2, #fecaca);border:1px solid #fca5a5;border-radius:8px;padding:1rem;margin:0.75rem 1rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;';
    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.75rem;">
        <div style="width:40px;height:40px;border-radius:50%;background:var(--danger);display:flex;align-items:center;justify-content:center;color:white;font-size:1rem;">
          <i class="fas fa-lock"></i>
        </div>
        <div>
          <div style="font-weight:600;font-size:0.9rem;color:var(--text-main);">This chat is closed</div>
          <div style="font-size:0.8rem;color:var(--text-muted);">No new messages can be sent</div>
        </div>
      </div>
      <button onclick="reopenChatSession('${id}')" class="btn" style="background:var(--success);color:white;border:none;padding:0.5rem 1rem;border-radius:6px;cursor:pointer;font-weight:600;white-space:nowrap;">
        <i class="fas fa-redo"></i> Reopen Chat
      </button>
    `;
    banner.style.display = 'flex';
    document.getElementById('chatInputArea').style.display = 'none';
  } else {
    // Show takeover banner for active chats
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'adminTakeoverBanner';
      chatContainer.insertBefore(banner, chatContainer.children[1]);
    }
    banner.style.cssText = 'background:linear-gradient(135deg, #fef3c7, #fde68a);border:1px solid #f59e0b;border-radius:8px;padding:1rem;margin:0.75rem 1rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;';
    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.75rem;">
        <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--gold),#f59e0b);display:flex;align-items:center;justify-content:center;color:white;font-size:1rem;">
          <i class="fas fa-robot"></i>
        </div>
        <div>
          <div style="font-weight:600;font-size:0.9rem;color:var(--text-main);">AI is currently responding</div>
          <div style="font-size:0.8rem;color:var(--text-muted);">Take over to chat directly with the visitor</div>
        </div>
      </div>
      <button onclick="takeOverSession('${id}', '${name.replace(/'/g,"\\'")}')" class="btn" style="background:var(--success);color:white;border:none;padding:0.5rem 1rem;border-radius:6px;cursor:pointer;font-weight:600;white-space:nowrap;">
        <i class="fas fa-hand-paper"></i> Take Over
      </button>
    `;
    banner.style.display = 'flex';
    document.getElementById('chatInputArea').style.display = 'none';
  }
  
  await loadMessages(id);
  await api(`/api/chat/read/${id}`, { method: 'PUT' });
  loadChatSessions();
}

async function closeChatSession(id) {
  if (!confirm('Close this chat? The visitor will not be able to send new messages.')) {
    return;
  }
  
  try {
    await api(`/api/chat/close/${id}`, { method: 'PUT', body: JSON.stringify({ closedBy: S.user?.name || 'admin' }) });
    toast('Chat closed successfully', 'success');
    currentSessionIsClosed = true;
    loadChatSessions();
    
    // Update UI to show closed state
    const banner = document.getElementById('adminTakeoverBanner');
    if (banner) {
      banner.style.cssText = 'background:linear-gradient(135deg, #fee2e2, #fecaca);border:1px solid #fca5a5;border-radius:8px;padding:1rem;margin:0.75rem 1rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;';
      banner.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <div style="width:40px;height:40px;border-radius:50%;background:var(--danger);display:flex;align-items:center;justify-content:center;color:white;font-size:1rem;">
            <i class="fas fa-lock"></i>
          </div>
          <div>
            <div style="font-weight:600;font-size:0.9rem;color:var(--text-main);">This chat is closed</div>
            <div style="font-size:0.8rem;color:var(--text-muted);">No new messages can be sent</div>
          </div>
        </div>
        <button onclick="reopenChatSession('${id}')" class="btn" style="background:var(--success);color:white;border:none;padding:0.5rem 1rem;border-radius:6px;cursor:pointer;font-weight:600;white-space:nowrap;">
          <i class="fas fa-redo"></i> Reopen Chat
        </button>
      `;
    }
    document.getElementById('chatInputArea').style.display = 'none';
    
    // Update header buttons
    const headerEl = document.getElementById('chatHeader');
    if (headerEl) {
      const name = document.getElementById('chatHeaderName').textContent;
      headerEl.innerHTML = `
        <span class="card-title"><i class="fas fa-comments"></i> <span id="chatHeaderName">${name}</span></span>
        <div style="display:flex;gap:0.5rem;">
          <button onclick="reopenChatSession('${id}')" class="btn btn-sm" style="background:var(--success);color:white;border:none;padding:0.4rem 0.75rem;border-radius:6px;cursor:pointer;font-size:0.75rem;"><i class="fas fa-redo"></i> Reopen</button>
          <button onclick="leaveChatSession()" class="btn btn-sm" style="background:var(--text-muted);color:white;border:none;padding:0.4rem 0.75rem;border-radius:6px;cursor:pointer;font-size:0.75rem;"><i class="fas fa-sign-out-alt"></i> Leave</button>
        </div>
      `;
    }
  } catch (e) {
    console.error('Failed to close chat:', e);
    toast('Failed to close chat', 'error');
  }
}

async function reopenChatSession(id) {
  if (!confirm('Reopen this chat? The visitor will be able to send messages again.')) {
    return;
  }
  
  try {
    await api(`/api/chat/reopen/${id}`, { method: 'PUT' });
    toast('Chat reopened successfully', 'success');
    currentSessionIsClosed = false;
    loadChatSessions();
    
    // Update UI to show active state
    const banner = document.getElementById('adminTakeoverBanner');
    if (banner) {
      banner.style.cssText = 'background:linear-gradient(135deg, #fef3c7, #fde68a);border:1px solid #f59e0b;border-radius:8px;padding:1rem;margin:0.75rem 1rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;';
      banner.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--gold),#f59e0b);display:flex;align-items:center;justify-content:center;color:white;font-size:1rem;">
            <i class="fas fa-robot"></i>
          </div>
          <div>
            <div style="font-weight:600;font-size:0.9rem;color:var(--text-main);">AI is currently responding</div>
            <div style="font-size:0.8rem;color:var(--text-muted);">Take over to chat directly with the visitor</div>
          </div>
        </div>
        <button onclick="takeOverSession('${id}')" class="btn" style="background:var(--success);color:white;border:none;padding:0.5rem 1rem;border-radius:6px;cursor:pointer;font-weight:600;white-space:nowrap;">
          <i class="fas fa-hand-paper"></i> Take Over
        </button>
      `;
    }
    
    // Update header buttons
    const headerEl = document.getElementById('chatHeader');
    if (headerEl) {
      const name = document.getElementById('chatHeaderName').textContent;
      headerEl.innerHTML = `
        <span class="card-title"><i class="fas fa-comments"></i> <span id="chatHeaderName">${name}</span></span>
        <div style="display:flex;gap:0.5rem;">
          <button onclick="closeChatSession('${id}')" class="btn btn-sm" style="background:var(--danger);color:white;border:none;padding:0.4rem 0.75rem;border-radius:6px;cursor:pointer;font-size:0.75rem;"><i class="fas fa-check"></i> Close Chat</button>
          <button onclick="leaveChatSession()" class="btn btn-sm" style="background:var(--text-muted);color:white;border:none;padding:0.4rem 0.75rem;border-radius:6px;cursor:pointer;font-size:0.75rem;"><i class="fas fa-sign-out-alt"></i> Leave</button>
        </div>
      `;
    }
  } catch (e) {
    console.error('Failed to reopen chat:', e);
    toast('Failed to reopen chat', 'error');
  }
}

async function takeOverSession(id, name) {
  // Confirm before taking over
  if (!confirm('Take over this chat? The visitor will be notified that a human agent has connected, and AI will stop responding.')) {
    return;
  }
  
  // Emit takeover event FIRST (before UI changes, so AI stops immediately)
  if (socket && socket.connected) {
    socket.emit('admin_takeover', { sessionId: id, adminName: S.user?.name || 'Agent' });
  }
  
  // Hide banner
  const banner = document.getElementById('adminTakeoverBanner');
  if (banner) banner.style.display = 'none';
  
  // Show input area - force visible with multiple style properties
  const inputArea = document.getElementById('chatInputArea');
  if (inputArea) {
    inputArea.style.display = 'flex';
    inputArea.style.visibility = 'visible';
    inputArea.style.opacity = '1';
    // Focus the input
    setTimeout(() => {
      const input = document.getElementById('chatInput');
      if (input) input.focus();
    }, 100);
  }
  
  // Mark that we have an active admin session (to prevent AI messages)
  currentAdminSession = id;
  
  // Show confirmation toast
  toast('You are now connected to the visitor', 'success');
  
  // Add system message to chat
  const container = document.getElementById('chatMessages');
  if (container) {
    const systemMsg = document.createElement('div');
    systemMsg.style.cssText = 'text-align:center;padding:0.5rem;margin:0.5rem 0;font-size:0.75rem;color:var(--success);font-style:italic;';
    systemMsg.innerHTML = '<i class="fas fa-check-circle"></i> You have taken over this conversation. AI is now disabled.';
    container.appendChild(systemMsg);
    container.scrollTop = container.scrollHeight;
  }
}

function leaveChatSession() {
  if (!currentAdminSession) return;
  
  if (confirm('Leave this chat session? AI will resume responding to the visitor.')) {
    if (socket && socket.connected) {
      socket.emit('admin_leave', currentAdminSession);
    }
    
    // Reset UI
    currentAdminSession = null;
    S.currentSession = null;
    document.getElementById('chatHeaderName').textContent = 'Select a conversation';
    document.getElementById('chatInputArea').style.display = 'none';
    document.getElementById('chatMessages').innerHTML = '<div class="chat-empty"><i class="fas fa-comments"></i><span>Select a conversation to start</span></div>';
    
    // Reset header
    const headerEl = document.getElementById('chatHeader');
    if (headerEl) {
      headerEl.innerHTML = '<span class="card-title"><i class="fas fa-comments"></i> <span id="chatHeaderName">Select a conversation</span></span>';
    }
    
    // Remove banner if exists
    const banner = document.getElementById('adminTakeoverBanner');
    if (banner) banner.remove();
    
    loadChatSessions();
    toast('You have left the chat', 'info');
  }
}

async function loadMessages(sessionId) {
  const data = await api(`/api/chat/${sessionId}`);
  const container = document.getElementById('chatMessages');
  if (!container) return;
  const msgs = data.data || [];
  if (!msgs.length) { container.innerHTML = `<div class="chat-empty"><i class="fas fa-comment-slash"></i><span>No messages yet</span></div>`; return; }
  
  // Get visitor name from first message that has a name (usually system message or first visitor message)
  const firstMsgWithName = msgs.find(m => m.name && m.name !== 'AI Assistant' && m.name !== 'System');
  const visitorName = firstMsgWithName?.name || 'Visitor';
  
  container.innerHTML = msgs.filter(m => m.senderType !== 'system').map(m => {
    const senderType = m.senderType || (m.isAdmin ? 'human' : 'visitor');
    let senderLabel = '';
    
    // Determine sender name based on type
    let senderName;
    if (senderType === 'ai') senderName = 'AI Assistant';
    else if (senderType === 'human') senderName = m.name || 'Agent';
    else senderName = m.name || visitorName; // Use discovered visitor name
    
    if (senderType === 'ai') senderLabel = `<span style="font-size:0.7rem;color:#6366f1;"><i class="fas fa-robot"></i> ${senderName}</span>`;
    else if (senderType === 'human') senderLabel = `<span style="font-size:0.7rem;color:var(--text-muted);"><i class="fas fa-user-headset"></i> ${senderName}</span>`;
    else senderLabel = `<span style="font-size:0.7rem;color:var(--gold);"><i class="fas fa-user"></i> ${senderName}</span>`;
    
    return `
    <div class="msg-bubble ${m.isAdmin?'admin':''}">
      <div style="margin-bottom:2px;">${senderLabel}</div>
      <div class="msg-content">${m.message}</div>
      <div class="msg-time">${fmtTime(m.createdAt)}</div>
    </div>
  `}).join('');
  container.scrollTop = container.scrollHeight;
}

// Admin typing indicator
let adminTypingTimeout = null;

function onAdminTyping() {
  if (socket && socket.connected && S.currentSession) {
    socket.emit('typing', { sessionId: S.currentSession, isAdmin: true });
    clearTimeout(adminTypingTimeout);
    adminTypingTimeout = setTimeout(() => {
      socket.emit('stop_typing', { sessionId: S.currentSession, isAdmin: true });
    }, 2000);
  }
}

async function sendReply() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg || !S.currentSession) return;
  
  // Check if session is closed
  if (currentSessionIsClosed) {
    toast('Cannot send message - this chat is closed. Please reopen it first.', 'error');
    return;
  }
  
  input.value = '';
  clearTimeout(adminTypingTimeout);
  if (socket && socket.connected) {
    socket.emit('stop_typing', { sessionId: S.currentSession, isAdmin: true });
  }
  
  // Optimistically add message to UI
  const container = document.getElementById('chatMessages');
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble msg-admin';
  bubble.innerHTML = `
    <div style="margin-bottom:2px;font-size:0.7rem;color:var(--text-muted);"><i class="fas fa-user-headset"></i> You</div>
    <div class="msg-content">${msg}</div>
    <div class="msg-time">Just now</div>
  `;
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
  
  // Save to database via REST - backend will emit message_received to visitor's room
  // (Single source of truth - prevents duplicates)
  try {
    await api('/api/chat', { method: 'POST', body: JSON.stringify({ 
      sessionId: S.currentSession, 
      message: msg, 
      isAdmin: true, 
      senderType: 'human',
      name: S.user?.name || 'Agent'
    }) });
    console.log('Admin reply saved and broadcast via REST');
    // Notify queue engine of agent reply (SLA tracking) — fire and forget
    if (socket && socket.connected) {
      socket.emit('admin_reply', {
        sessionId: S.currentSession,
        message: msg,
        adminName: S.user?.name || 'Agent',
        adminId: S.adminId
      });
    }
  } catch (e) {
    console.error('Failed to save reply:', e);
    toast('Failed to send message', 'error');
  }
}

// ── ANALYTICS ──
async function loadAnalytics() {
  const sec = document.getElementById('sec-analytics');
  sec.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  try {
    const [dash, trends, geo, peaks] = await Promise.all([
      api('/api/analytics/dashboard'),
      api('/api/analytics/trends'),
      api('/api/reports/geographic'),
      api('/api/reports/peak-times')
    ]);
    const d = dash.data;
    sec.innerHTML = `
      <div class="stats-grid" style="margin-bottom:1.5rem;">
        ${statCard('fa-mouse-pointer','si-gold', d.totalInquiries??'-', 'Total Inquiries', null)}
        ${statCard('fa-calendar-week','si-blue', d.weeklyLeads??'-', 'Leads This Week', null)}
        ${statCard('fa-chart-line','si-green', d.conversionRate??'-', 'Conversion Rate', null)}
        ${statCard('fa-eye','si-orange', (d.totalViews||0).toLocaleString(), 'Total Views', null)}
      </div>
      <div class="two-col">
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="fas fa-chart-area"></i> Lead Trends (30 Days)</span></div>
          <div class="card-body">
            <div id="trendsViz" style="height:180px;display:flex;align-items:flex-end;gap:3px;padding-top:20px;">
              ${renderTrendBars(trends.data||[])}
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="fas fa-map-marker-alt"></i> Leads by City</span></div>
          <div class="card-body">
            <div class="bar-chart">${renderBarChart(geo.data?.leadsByCity||[], 'leadCount')}</div>
          </div>
        </div>
      </div>
      <div class="two-col">
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="fas fa-clock"></i> Peak Days</span></div>
          <div class="card-body">
            <div class="bar-chart">${renderBarChart(peaks.data?.leadsByDay||[], 'count', 'day')}</div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="fas fa-graduation-cap"></i> Leads by University</span></div>
          <div class="card-body">
            <div class="bar-chart">${renderBarChart((geo.data?.leadsByUniversity||[]).slice(0,6), 'leadCount')}</div>
          </div>
        </div>
      </div>
    `;
  } catch { sec.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load analytics</p></div>`; }
}

// ── REPORTS ──
async function loadReports() {
  const sec = document.getElementById('sec-reports');
  sec.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  try {
    const [funnel, rev] = await Promise.all([
      api('/api/reports/funnel'),
      api('/api/reports/revenue')
    ]);
    sec.innerHTML = `
      <div class="two-col">
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="fas fa-filter"></i> Conversion Funnel</span>
          </div>
          <div class="card-body">
            <div class="funnel-list">
              ${(funnel.data||[]).map(f => `
                <div class="funnel-row">
                  <span class="funnel-stage">${f.stage}</span>
                  <span class="funnel-count">${f.count.toLocaleString()}</span>
                  <span class="funnel-rate">${f.conversionRate}%</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="fas fa-coins"></i> Revenue Summary</span>
            <select class="form-select" style="width:120px;" onchange="loadRevenuePeriod(this.value)">
              <option value="monthly">Monthly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div class="card-body" id="revContent">
            ${renderRevenueContent(rev.data)}
          </div>
        </div>
      </div>
      <div class="card" style="margin-bottom:1rem;">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-download"></i> Export Leads</span>
        </div>
        <div class="card-body" style="display:flex;gap:1rem;flex-wrap:wrap;align-items:flex-end;">
          <div class="form-group" style="margin:0;">
            <label class="form-label">From</label>
            <input class="form-input" type="date" id="exportFrom">
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label">To</label>
            <input class="form-input" type="date" id="exportTo">
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label">Status</label>
            <select class="form-select" id="exportStatus">
              <option value="">All</option>
              ${['new','contacted','converted','closed'].map(s=>`<option value="${s}">${cap(s)}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-gold" onclick="exportLeads()"><i class="fas fa-file-csv"></i> Export CSV</button>
        </div>
      </div>
    `;
  } catch { sec.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load reports</p></div>`; }
}

function renderRevenueContent(data) {
  if (!data) return '<div class="empty-state"><p>No revenue data</p></div>';
  return `
    <div class="form-row" style="margin-bottom:1rem;">
      <div class="booking-row-detail"><div class="label">Total Revenue</div><div class="value" style="color:var(--gold);">RM ${(data.summary?.totalRevenue||0).toLocaleString()}</div></div>
      <div class="booking-row-detail"><div class="label">Avg. Booking Value</div><div class="value">RM ${(data.summary?.averageBookingValue||0).toLocaleString()}</div></div>
      <div class="booking-row-detail"><div class="label">Total Bookings</div><div class="value">${data.summary?.totalBookings||0}</div></div>
    </div>
    <div class="bar-chart">${(data.bookingRevenue||[]).slice(-8).map(r => {
      const max = Math.max(...(data.bookingRevenue||[]).map(x=>x.revenue), 1);
      return `<div class="bar-row"><span class="bar-label" style="font-size:0.7rem;">${r._id}</span><div class="bar-track"><div class="bar-fill" style="width:${(r.revenue/max)*100}%"></div></div><span class="bar-count">RM ${r.revenue.toLocaleString()}</span></div>`;
    }).join('')}</div>
  `;
}

async function loadRevenuePeriod(period) {
  const data = await api(`/api/reports/revenue?period=${period}`);
  document.getElementById('revContent').innerHTML = renderRevenueContent(data.data);
}

async function exportLeads() {
  const from = document.getElementById('exportFrom').value;
  const to = document.getElementById('exportTo').value;
  const status = document.getElementById('exportStatus').value;
  let url = '/api/reports/export/leads?';
  if (from) url += `startDate=${from}&`;
  if (to) url += `endDate=${to}&`;
  if (status) url += `status=${status}`;
  const data = await api(url);
  if (!data.data?.length) { toast('No data to export', 'error'); return; }
  const keys = Object.keys(data.data[0]);
  const csv = [keys.join(','), ...data.data.map(r => keys.map(k => JSON.stringify(r[k]??'')).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `leads-export-${Date.now()}.csv`;
  a.click();
  toast(`Exported ${data.count} leads`);
}

// ── AUDIT ──
async function loadAudit() {
  const sec = document.getElementById('sec-audit');
  sec.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  const data = await api('/api/audit?limit=50');
  const logs = data.data || [];
  sec.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-shield-alt"></i> Audit Log</span>
        <span style="font-size:0.8rem;color:var(--text-muted);">${data.total||0} total entries</span>
      </div>
      <div class="card-body no-pad">
        ${logs.length ? logs.map(l => {
          const actionLabel = l.action.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
          const entityLabel = l.target?.entityName ? `<strong>${l.target.entityName}</strong>` : (l.target?.entityType||'');
          const byLabel = `<span style="color:var(--gold);">${l.performedBy?.username||'system'}</span>`;
          const icon = auditIcon(l.action);
          return `
          <div class="audit-item">
            <div class="audit-dot" style="background:${auditColor(l.action)}"><i class="fas fa-${icon}" style="font-size:8px;color:#fff;"></i></div>
            <div class="audit-content">
              <div class="audit-action">${actionLabel}${entityLabel?' — ':''} ${entityLabel}</div>
              <div class="audit-detail">by ${byLabel} · ${fmtDateTime(l.createdAt)}</div>
            </div>
            <div class="audit-time">${timeAgo(l.createdAt)}</div>
          </div>`;
        }).join('') : `<div class="empty-state"><i class="fas fa-shield-alt"></i><p>No audit logs yet</p></div>`}
      </div>
    </div>
  `;
}

// ── NOTIFICATIONS ──
async function pollNotifications() {
  try {
    const data = await api('/api/notifications/recent');
    const newNotifs = data.data || [];
    const unreadCount = data.unreadCount || 0;
    
    // Track previous unread count to detect new notifications
    const prevUnread = S.notifications._unreadCount || 0;
    
    // Play sound if new unread notifications arrived
    if (unreadCount > prevUnread && prevUnread > 0) {
      const sound = document.getElementById('notifSound');
      if (sound) sound.play().catch(() => {});
    }
    
    // Store unread count on the array for next poll
    newNotifs._unreadCount = unreadCount;
    S.notifications = newNotifs;
    
    const dot = document.getElementById('notifDot');
    if (dot) {
      dot.textContent = unreadCount > 99 ? '99+' : unreadCount;
      dot.classList.toggle('visible', unreadCount > 0);
    }
    renderNotifPanel();
  } catch {}
}

function renderNotifPanel() {
  const list = document.getElementById('notifList');
  if (!list) return;
  if (!S.notifications.length) { list.innerHTML = `<div class="empty-state"><i class="fas fa-bell-slash"></i><p>No notifications</p></div>`; return; }
  list.innerHTML = S.notifications.map(n => `
    <div class="notif-item ${!n.isRead?'unread':''}" onclick="handleNotifClick('${n._id}', '${(n.data?.leadId||'').toString().replace(/'/g, "\\'")}')">
      <div class="notif-icon si-gold" style="background:var(--gold-dim);color:var(--gold);width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <i class="fas ${notifIcon(n.type)}" style="font-size:0.75rem;"></i>
      </div>
      <div class="notif-content">
        <div class="notif-title-text">${n.title}</div>
        <div class="notif-msg">${n.message}</div>
      </div>
      <div class="notif-time">${timeAgo(n.createdAt)}</div>
    </div>
  `).join('');
}

async function handleNotifClick(id, leadId) {
  // Mark as read first
  await markRead(id);
  
  // If notification has a leadId in data, navigate to leads section and open that lead
  if (leadId && leadId !== 'undefined' && leadId !== 'null') {
    // Close notification panel
    document.getElementById('notifPanel').classList.remove('active');
    
    // Switch to leads section
    showSection('leads');
    
    // Wait for leads to load, then open the lead modal
    setTimeout(() => {
      viewLead(leadId);
    }, 500);
  }
}

async function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  const willOpen = !panel.classList.contains('active');
  panel.classList.toggle('active');
  if (willOpen) {
    // Refresh data when opening
    await pollNotifications();
  }
}

async function markRead(id) {
  await api(`/api/notifications/${id}/read`, { method: 'PUT' });
  // Only re-poll if panel is not being hovered (avoid conflict with click handler)
  const panel = document.getElementById('notifPanel');
  if (!panel || !panel.matches(':hover')) {
    pollNotifications();
  }
}

async function markAllRead() {
  await api('/api/notifications/read-all', { method: 'PUT' });
  pollNotifications();
}

// ── HELPERS ──
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('active');
  if (!e.target.closest('.notif-panel') && !e.target.closest('.notif-btn')) {
    document.getElementById('notifPanel')?.classList.remove('active');
  }
});

function cap(s) { return s ? s.replace(/_/g,' ').replace(/\b\w/g, c=>c.toUpperCase()) : ''; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-MY', { day:'2-digit', month:'short', year:'numeric' }) : '-'; }
function fmtTime(d) { return d ? new Date(d).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '-'; }
function fmtDateTime(d) { return d ? `${fmtDate(d)} ${fmtTime(d)}` : '-'; }
function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return fmtDate(d);
}

function statusBadge(s) {
  const map = { new:'badge-new', contacted:'badge-contacted', converted:'badge-converted', closed:'badge-closed', viewing_scheduled:'badge-viewing', pending:'badge-pending', confirmed:'badge-confirmed', cancelled:'badge-cancelled', completed:'badge-completed', deposit_paid:'badge-deposit_paid', fully_paid:'badge-fully_paid' };
  return `<span class="badge ${map[s]||'badge-neutral'}">${cap(s)}</span>`;
}

function renderBarChart(items, countKey, labelKey = '_id') {
  if (!items.length) return '<div class="empty-state" style="padding:1rem;"><p>No data</p></div>';
  const max = Math.max(...items.map(i => i[countKey]||0), 1);
  return items.map(i => `
    <div class="bar-row">
      <span class="bar-label">${i[labelKey]||'Unknown'}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${((i[countKey]||0)/max)*100}%"></div></div>
      <span class="bar-count">${i[countKey]||0}</span>
    </div>
  `).join('');
}

function renderTrendBars(trends) {
  if (!trends.length) return '<div style="color:var(--text-muted);font-size:0.85rem;padding:1rem;">No trend data</div>';
  const max = Math.max(...trends.map(t => t.count), 1);
  return trends.map(t => `
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;" title="${t._id}: ${t.count}">
      <div style="font-size:0.6rem;color:var(--text-muted);">${t.count||''}</div>
      <div style="width:100%;background:linear-gradient(180deg,var(--gold-light),var(--gold));border-radius:3px 3px 0 0;height:${Math.max((t.count/max)*140,2)}px;transition:height 0.5s;"></div>
      <div style="font-size:0.55rem;color:var(--text-muted);transform:rotate(-45deg);margin-top:4px;">${(t._id||'').slice(5)}</div>
    </div>
  `).join('');
}

function auditIcon(action) {
  if (action.includes('login')) return 'sign-in-alt';
  if (action.includes('listing')) return 'building';
  if (action.includes('task')) return 'tasks';
  if (action.includes('chat')) return 'comments';
  if (action.includes('admin')) return 'user-shield';
  if (action.includes('delete')) return 'trash';
  return 'circle';
}
function auditColor(action) {
  if (!action) return 'var(--text-muted)';
  if (action.includes('DELETE') || action.includes('delete')) return 'var(--danger)';
  if (action.includes('CREATE') || action.includes('create')) return 'var(--success)';
  if (action.includes('UPDATE') || action.includes('update')) return 'var(--info)';
  return 'var(--gold)';
}

function notifIcon(type) {
  const map = { new_booking:'calendar-plus', lead_status_change:'user-check', booking_status:'calendar-check', system:'cog', new_lead:'user-plus', new_chat:'comment-dots', listing_view_milestone:'eye' };
  return map[type] || 'bell';
}

// ── SOCKET.IO ──
let socket = null;

function initSocket() {
  // Connect to same origin (works on both localhost and production)
  const socketUrl = window.location.origin;
  socket = io(socketUrl, {
    transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
    reconnection: true,
    reconnectionAttempts: 5
  });
  
  // Ensure adminId is valid
  const adminId = S.adminId || localStorage.getItem('adminId');
  if (!adminId) {
    console.error('Socket: No adminId available');
    return;
  }
  S.adminId = adminId;
  
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    socket.emit('join_admin', adminId);
    // Re-join staff chat room so direct messages always route correctly
    socket.emit('join_staff_chat', { adminId });
    // Re-join any active group
    if (selectedGroupId) socket.emit('join_group', { groupId: selectedGroupId });
    console.log('Socket rooms rejoined for adminId:', adminId);
  });
  
  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });
  
  socket.on('task_created', (data) => {
    toast(`New task: ${data.title} by ${data.createdBy.name || data.createdBy.username}`);
    const sound = document.getElementById('notifSound');
    if (sound) sound.play().catch(() => {});
    if (S.section === 'tasks') fetchAndRenderTasks();
  });
  
  socket.on('task_completed', (data) => {
    toast(`Task completed: ${data.title} by ${data.completedBy.name || data.completedBy.username}`);
    const sound = document.getElementById('notifSound');
    if (sound) sound.play().catch(() => {});
    if (S.section === 'tasks') fetchAndRenderTasks();
  });
  
  socket.on('task_updated', () => {
    if (S.section === 'tasks') fetchAndRenderTasks();
  });
  
  socket.on('task_moved', (data) => {
    toast(`Task moved to ${data.to.replace('_', ' ')}: ${data.title}`);
    if (S.section === 'tasks') fetchAndRenderTasks();
  });
  
  socket.on('task_assigned', (data) => {
    const assignee = data.assignedTo?.name || data.assignedTo?.username || 'Unassigned';
    toast(`Task assigned to ${assignee}: ${data.title}`);
    if (S.section === 'tasks') fetchAndRenderTasks();
  });
  
  socket.on('task_undone', (data) => {
    toast(`Task restored to ${data.restoredTo.replace('_', ' ')}: ${data.title}`);
    if (S.section === 'tasks') fetchAndRenderTasks();
  });
  
  // Track visitor name for current session
  let currentVisitorName = 'Visitor';
  
  // Staff chat events
  socket.on('staff_message', (data) => handleStaffMessage(data));
  socket.on('group_message', (data) => handleStaffMessage(data));
  socket.on('group_created', (group) => {
    staffGroups.push(group);
    if (S.section === 'teamchat') renderStaffChatList();
    toast(`New group: ${group.name}`);
  });
  socket.on('staff_message_sent', (data) => {
    console.log('Staff message sent:', data);
  });
  socket.on('group_message_sent', (data) => {
    console.log('Group message sent:', data);
  });

  // Chat events
  socket.on('new_chat_message', (data) => {
    console.log('new_chat_message received:', data);
    
    const senderType = data.senderType || (data.isAdmin ? 'human' : 'visitor');
    
    // Skip AI messages if admin has taken over this session
    if (senderType === 'ai' && currentAdminSession === data.sessionId) {
      console.log('Skipping AI message - admin has taken over this session');
      return;
    }
    
    // DEDUPLICATION: Skip if we've already notified about this session recently (within last 30 seconds)
    const now = Date.now();
    const sessionKey = `${data.sessionId}_${Math.floor(now / 30000)}`; // Bucket in 30-second windows
    if (notifiedSessionIds.has(sessionKey)) {
      console.log('Skipping duplicate notification for session:', data.sessionId);
      return;
    }
    notifiedSessionIds.add(sessionKey);
    // Cleanup old entries after 60 seconds
    setTimeout(() => notifiedSessionIds.delete(sessionKey), 60000);
    
    // Update visitor name if this is a visitor message with a name
    if (senderType === 'visitor' && data.name && data.name !== 'AI Assistant' && data.name !== 'System') {
      currentVisitorName = data.name;
    }
    
    // Update chat badge (only for non-AI messages or if no admin active)
    if (senderType !== 'ai' || !currentAdminSession) {
      const badge = document.getElementById('chatBadge');
      if (badge) {
        const current = parseInt(badge.textContent) || 0;
        badge.textContent = current + 1;
        badge.style.display = '';
      }
    }
    
    // If on chat section, update sessions and messages
    if (S.section === 'chat') {
      const wasCurrentSession = S.currentSession === data.sessionId;
      loadChatSessions();
      
      // If viewing the same session, add message to chat
      if (wasCurrentSession) {
        const container = document.getElementById('chatMessages');
        if (container) {
          // Determine sender name
          let senderName;
          if (senderType === 'ai') senderName = 'AI Assistant';
          else if (senderType === 'human') senderName = data.name || 'Agent';
          else senderName = data.name || currentVisitorName;
          
          let senderLabel = '';
          if (senderType === 'ai') senderLabel = `<span style="font-size:0.7rem;color:#6366f1;"><i class="fas fa-robot"></i> ${senderName}</span>`;
          else if (senderType === 'human') senderLabel = `<span style="font-size:0.7rem;color:var(--text-muted);"><i class="fas fa-user-headset"></i> ${senderName}</span>`;
          else senderLabel = `<span style="font-size:0.7rem;color:var(--gold);"><i class="fas fa-user"></i> ${senderName}</span>`;
          
          const bubble = document.createElement('div');
          bubble.className = 'msg-bubble';
          bubble.innerHTML = `
            <div style="margin-bottom:2px;">${senderLabel}</div>
            <div class="msg-content">${data.message}</div>
            <div class="msg-time">${fmtTime(data.createdAt)}</div>
          `;
          container.appendChild(bubble);
          container.scrollTop = container.scrollHeight;
        }
      }
    }
    
    // Show toast notification (skip for AI if admin is active)
    if (senderType !== 'ai' || !currentAdminSession) {
      toast(`New message from ${data.name || senderType}: ${data.message.substring(0, 40)}${data.message.length > 40 ? '...' : ''}`);
      
      // Play notification sound with debugging
      const sound = document.getElementById('notifSound');
      if (sound) {
        console.log('Playing notification sound...');
        sound.volume = 1.0;
        sound.currentTime = 0;
        const playPromise = sound.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('Notification sound played successfully');
          }).catch(err => {
            console.error('Notification sound failed:', err.message);
            // Try to unblock audio context on user interaction
            document.addEventListener('click', function unblockAudio() {
              sound.play().catch(() => {});
              document.removeEventListener('click', unblockAudio);
            }, { once: true });
          });
        }
      } else {
        console.error('notifSound element not found');
      }
    }
  });
  
  // Visitor typing indicator
  socket.on('typing', (data) => {
    if (!data.isAdmin && data.sessionId === S.currentSession) {
      const indicator = document.getElementById('typingIndicator');
      if (indicator) indicator.style.display = 'block';
    }
  });
  
  socket.on('stop_typing', (data) => {
    if (!data.isAdmin) {
      const indicator = document.getElementById('typingIndicator');
      if (indicator) indicator.style.display = 'none';
    }
  });
  
  // Admin took over a session (another admin)
  socket.on('admin_took_over', (data) => {
    if (data.sessionId === S.currentSession && data.adminSocketId !== socket.id) {
      toast(`Another agent has taken over this conversation`, 'info');
      
      // Disable input
      document.getElementById('chatInputArea').style.display = 'none';
      
      // Show banner
      const banner = document.getElementById('adminTakeoverBanner');
      if (banner) {
        banner.style.cssText = 'background:linear-gradient(135deg, #fee2e2, #fecaca);border:1px solid #fca5a5;border-radius:8px;padding:1rem;margin:0.75rem 1rem;display:flex;align-items:center;gap:1rem;';
        banner.innerHTML = `
          <div style="width:40px;height:40px;border-radius:50%;background:var(--danger);display:flex;align-items:center;justify-content:center;color:white;font-size:1rem;">
            <i class="fas fa-user-slash"></i>
          </div>
          <div>
            <div style="font-weight:600;font-size:0.9rem;color:var(--text-main);">Another agent is handling this</div>
            <div style="font-size:0.8rem;color:var(--text-muted);">You can view but cannot respond</div>
          </div>
        `;
        banner.style.display = 'flex';
      }
    }
  });
  
  // Admin left a session
  socket.on('admin_left', (data) => {
    if (data.sessionId === S.currentSession) {
      toast('Agent has left the conversation', 'info');
      
      // Show takeover banner again
      const banner = document.getElementById('adminTakeoverBanner');
      if (banner && S.currentSession) {
        banner.style.cssText = 'background:linear-gradient(135deg, #fef3c7, #fde68a);border:1px solid #f59e0b;border-radius:8px;padding:1rem;margin:0.75rem 1rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;';
        banner.innerHTML = `
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--gold),#f59e0b);display:flex;align-items:center;justify-content:center;color:white;font-size:1rem;">
              <i class="fas fa-robot"></i>
            </div>
            <div>
              <div style="font-weight:600;font-size:0.9rem;color:var(--text-main);">AI is currently responding</div>
              <div style="font-size:0.8rem;color:var(--text-muted);">Take over to chat directly with the visitor</div>
            </div>
          </div>
          <button onclick="takeOverSession('${data.sessionId}', 'Visitor')" class="btn" style="background:var(--success);color:white;border:none;padding:0.5rem 1rem;border-radius:6px;cursor:pointer;font-weight:600;white-space:nowrap;">
            <i class="fas fa-hand-paper"></i> Take Over
          </button>
        `;
        banner.style.display = 'flex';
      }
    }
  });

  // ── QUEUE EVENTS ────────────────────────────────────────────────────────────

  // A chat has been assigned to ME
  socket.on('chat_assigned', (data) => {
    playChime();
    toast(`💬 New chat: ${data.visitorName || 'Visitor'}`, 'info');
    showQueueAlert(data);
    if (S.section === 'chat') refreshMyChats();
    updateQueueBadge();
  });

  // SLA warning — haven't responded fast enough
  socket.on('sla_warning', (data) => {
    playChime();
    toast(data.message || `⚠️ Visitor ${data.visitorName} is waiting`, 'warning');
    const el = document.querySelector(`[data-session="${data.sessionId}"]`);
    if (el) el.classList.add('sla-breach');
  });

  // Chat was transferred to me after rotation
  socket.on('agent_transferred', (data) => {
    playChime();
    toast(`🔄 Chat transferred: ${data.agentName || 'you'} is now handling it`, 'info');
    if (S.section === 'chat') refreshMyChats();
  });

  // Queue metrics broadcast — update supervisor panel
  socket.on('queue_metrics', (data) => {
    S.queueMetrics = data;
    if (S.section === 'chat') renderQueueMetricsBar(data);
  });

  // Another agent's status changed — update all live indicators
  socket.on('agent_status_changed', (data) => {
    updateAgentStatusDot(data.adminId, data.status);
    if (S.section === 'chat') renderQueueMetricsBar(S.queueMetrics);
    // Update teamchat sidebar dot
    const dot = document.querySelector(`#staffDot-${data.adminId}`);
    if (dot) {
      const colorMap = { online: '#22c55e', away: '#f59e0b', offline: '#6b7280' };
      dot.style.background = colorMap[data.status] || '#6b7280';
      dot.title = data.status;
    }
    // Update admin mgmt online indicator if on that page
    const adminDot = document.querySelector(`#adminOnlineDot-${data.adminId}`);
    if (adminDot) {
      adminDot.style.background = data.status === 'online' ? '#22c55e' : '#6b7280';
      adminDot.title = data.status === 'online' ? 'Online' : (data.lastSeen ? `Last seen ${timeAgo(data.lastSeen)}` : 'Offline');
    }
  });

  // Register service worker + push once socket is up
  initPushNotifications();
}

// ── TASKS ──
// Initialize task-specific state (S is declared globally)
S.taskFilters = { assignee: '', priority: '', dueDateFrom: '', dueDateTo: '' };
S.teamMembers = S.teamMembers || [];
S.allTasks = S.allTasks || [];

// Load team members for assignee dropdown (available to all admins)
async function loadTeamMembers() {
  try {
    const data = await api('/api/admin/list');
    S.teamMembers = data.data || [];
    console.log('[Tasks] Loaded team members:', S.teamMembers.length, S.teamMembers);
    return S.teamMembers;
  } catch (err) {
    console.error('[Tasks] Failed to load team members:', err);
    S.teamMembers = [];
    return [];
  }
}

async function loadTasks() {
  const sec = document.getElementById('sec-tasks');
  sec.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:1rem;">
      <h2 style="font-size:1.1rem;font-weight:600;">Task Board</h2>
      <button class="btn btn-gold" onclick="openTaskModal()"><i class="fas fa-plus"></i> New Task</button>
    </div>
    <div class="task-filters" id="taskFilters">
      <select class="form-select" id="filterAssignee" onchange="applyTaskFilters()">
        <option value="">All Assignees</option>
      </select>
      <select class="form-select" id="filterPriority" onchange="applyTaskFilters()">
        <option value="">All Priorities</option>
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <input type="date" class="form-input" id="filterDueFrom" onchange="applyTaskFilters()" placeholder="Due from">
      <input type="date" class="form-input" id="filterDueTo" onchange="applyTaskFilters()" placeholder="Due to">
      <button class="btn btn-ghost btn-sm" onclick="clearTaskFilters()"><i class="fas fa-times"></i> Clear</button>
    </div>
    <div class="task-board" id="taskBoard"><div class="loading"><div class="spinner"></div></div></div>
  `;
  
  try {
    // Load team members first
    await loadTeamMembers();
    
    // Populate assignee filter
    const assigneeSelect = document.getElementById('filterAssignee');
    S.teamMembers.forEach(m => {
      assigneeSelect.innerHTML += `<option value="${m._id}">${m.name || m.username}</option>`;
    });
    
    // Load tasks
    await fetchAndRenderTasks();
  } catch (e) { 
    console.error(e);
    sec.innerHTML = `<div class="empty-state"><i class="fas fa-tasks"></i><p>Failed to load tasks</p></div>`; 
  }
}

async function fetchAndRenderTasks() {
  try {
    let url = '/api/tasks';
    const params = [];
    if (S.taskFilters.assignee) params.push(`assignedTo=${S.taskFilters.assignee}`);
    if (S.taskFilters.priority) params.push(`priority=${S.taskFilters.priority}`);
    if (S.taskFilters.dueDateFrom) params.push(`dueDateFrom=${S.taskFilters.dueDateFrom}`);
    if (S.taskFilters.dueDateTo) params.push(`dueDateTo=${S.taskFilters.dueDateTo}`);
    if (params.length) url += '?' + params.join('&');
    
    const data = await api(url);
    S.allTasks = data.data || [];
    renderTaskBoard();
  } catch (e) {
    console.error('Failed to fetch tasks', e);
  }
}

function applyTaskFilters() {
  S.taskFilters.assignee = document.getElementById('filterAssignee').value;
  S.taskFilters.priority = document.getElementById('filterPriority').value;
  S.taskFilters.dueDateFrom = document.getElementById('filterDueFrom').value;
  S.taskFilters.dueDateTo = document.getElementById('filterDueTo').value;
  fetchAndRenderTasks();
}

function clearTaskFilters() {
  document.getElementById('filterAssignee').value = '';
  document.getElementById('filterPriority').value = '';
  document.getElementById('filterDueFrom').value = '';
  document.getElementById('filterDueTo').value = '';
  S.taskFilters = { assignee: '', priority: '', dueDateFrom: '', dueDateTo: '' };
  fetchAndRenderTasks();
}

function renderTaskBoard() {
  const tasks = S.allTasks;
  const columns = ['todo', 'in_progress', 'review', 'done'];
  const titles = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
  
  // Helper to check due date status
  const getDueStatus = (dueDate) => {
    if (!dueDate) return null;
    const now = new Date();
    const due = new Date(dueDate);
    const hoursUntil = (due - now) / (1000 * 60 * 60);
    if (hoursUntil < 0) return 'overdue';
    if (hoursUntil <= 24) return 'soon';
    return 'upcoming';
  };
  
  const getDueClass = (status) => {
    if (status === 'overdue') return 'due-overdue';
    if (status === 'soon') return 'due-soon';
    return '';
  };
  
  const formatDueDate = (dueDate) => {
    if (!dueDate) return '';
    const date = new Date(dueDate);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };
  
  document.getElementById('taskBoard').innerHTML = columns.map(col => `
    <div class="task-column" 
         data-status="${col}"
         ondragover="handleTaskDragOver(event)" 
         ondragleave="handleTaskDragLeave(event)"
         ondrop="handleTaskDrop(event, '${col}')">
      <div class="task-column-header">
        <h4>${titles[col]}</h4>
        <span id="count-${col}">${tasks.filter(t => t.status === col).length}</span>
      </div>
      <div class="task-column-content" id="column-${col}">
        ${tasks.filter(t => t.status === col).map(t => {
          const dueStatus = getDueStatus(t.dueDate);
          const dueClass = getDueClass(dueStatus);
          // Handle multi-assignees - can be array or single object
          const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : []);
          const renderAssignees = () => {
            if (assignees.length === 0) return '';
            return `<div class="task-assignees" style="display:flex;gap:0.35rem;margin-top:0.5rem;flex-wrap:wrap;">${assignees.map(a => {
              const initials = a?.name ? a.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : (a?.username?.substring(0, 2).toUpperCase() || '?');
              return `<div class="task-assignee-avatar" title="${a.name || a.username}">${initials}</div>`;
            }).join('')}</div>`;
          };
          
          return `
          <div class="task-card priority-${t.priority} ${dueClass}" 
               draggable="true"
               data-task-id="${t._id}"
               ondragstart="handleTaskDragStart(event, '${t._id}')"
               ondragend="handleTaskDragEnd(event)">
            <div class="task-card-header" style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;">
              <h5 style="flex:1;cursor:pointer;" onclick="editTask('${t._id}')">${t.title}</h5>
              <div style="display:flex;align-items:center;gap:0.5rem;">
                <div class="task-priority-dot ${t.priority}"></div>
                <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();editTask('${t._id}')" title="Edit" style="padding:0.25rem 0.5rem;font-size:0.75rem;"><i class="fas fa-pencil-alt"></i></button>
              </div>
            </div>
            <p style="cursor:pointer;" onclick="editTask('${t._id}')">${t.description?.substring(0, 80) || ''}${t.description?.length > 80 ? '...' : ''}</p>
            
            ${t.dueDate ? `
            <div class="task-due-date ${dueStatus}" style="cursor:pointer;" onclick="editTask('${t._id}')">
              <i class="fas fa-calendar-alt"></i>
              <span>${formatDueDate(t.dueDate)}</span>
              ${dueStatus === 'overdue' ? '<span style="margin-left:0.25rem;">(Overdue)</span>' : ''}
              ${dueStatus === 'soon' ? '<span style="margin-left:0.25rem;">(Due soon)</span>' : ''}
            </div>
            ` : ''}
            
            ${renderAssignees()}
            
            <div class="task-meta" style="cursor:pointer;" onclick="editTask('${t._id}')">
              <span class="creator">By ${t.createdBy?.name || t.createdBy?.username}</span>
              <span style="text-transform:capitalize;">${t.priority}</span>
            </div>
            
            ${t.status === 'done' ? `
              <div style="margin-top:0.5rem;display:flex;justify-content:space-between;align-items:center;">
                <span class="task-completed">
                  <i class="fas fa-check-circle"></i> Completed
                </span>
                <button class="task-undo-btn" onclick="event.stopPropagation();undoCompleteTask('${t._id}')">
                  <i class="fas fa-undo"></i> Undo
                </button>
              </div>
            ` : ''}
          </div>
        `}).join('') || '<p style="color:var(--text-muted);font-size:0.8rem;text-align:center;padding:1rem;">No tasks</p>'}
      </div>
    </div>
  `).join('');
}

// Drag and Drop handlers
let draggedTaskId = null;

function handleTaskDragStart(e, taskId) {
  draggedTaskId = taskId;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', taskId);
}

function handleTaskDragEnd(e) {
  e.target.classList.remove('dragging');
  draggedTaskId = null;
  // Remove all drag-over classes
  document.querySelectorAll('.task-column').forEach(col => col.classList.remove('drag-over'));
}

function handleTaskDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}

function handleTaskDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

async function handleTaskDrop(e, newStatus) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  
  const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
  if (!taskId) return;
  
  const task = S.allTasks.find(t => t._id === taskId);
  if (!task || task.status === newStatus) return;
  
  try {
    const r = await api(`/api/tasks/${taskId}/status`, { 
      method: 'PATCH', 
      body: JSON.stringify({ status: newStatus }) 
    });
    if (r.success) {
      toast(`Task moved to ${newStatus.replace('_', ' ')}`);
      fetchAndRenderTasks();
    }
  } catch { toast('Error moving task', 'error'); }
}

async function openTaskModal() {
  // Ensure team members are loaded first
  if (!S.teamMembers || S.teamMembers.length === 0) {
    await loadTeamMembers();
  }
  
  // Reset form for new task
  document.getElementById('taskId').value = '';
  document.getElementById('taskModalTitle').textContent = 'New Task';
  document.getElementById('taskSaveBtnText').textContent = 'Save Task';
  document.getElementById('taskTitle').value = '';
  document.getElementById('taskDesc').value = '';
  document.getElementById('taskPriority').value = 'medium';
  document.getElementById('taskStatus').value = 'todo';
  document.getElementById('taskCategory').value = 'general';
  document.getElementById('taskDueDate').value = '';
  
  // Populate assignee dropdown with multi-select
  const assigneeSelect = document.getElementById('taskAssignedTo');
  assigneeSelect.innerHTML = '<option value="">Unassigned</option>';
  if (S.teamMembers && S.teamMembers.length > 0) {
    S.teamMembers.forEach(m => {
      assigneeSelect.innerHTML += `<option value="${m._id}" data-name="${m.name || ''}" data-username="${m.username}">${m.name || m.username}</option>`;
    });
  }
  assigneeSelect.value = '';
  
  openModal('taskModal');
}

// Helper to get selected assignees as array
function getSelectedAssignees() {
  const select = document.getElementById('taskAssignedTo');
  const selected = Array.from(select.selectedOptions).filter(o => o.value);
  return selected.map(o => ({
    userId: o.value,
    name: o.dataset.name || '',
    username: o.dataset.username
  }));
}

async function editTask(id) {
  const task = S.allTasks.find(t => t._id === id);
  if (!task) return;
  
  // Ensure team members are loaded
  if (!S.teamMembers || S.teamMembers.length === 0) {
    await loadTeamMembers();
  }
  
  // Populate form for edit
  document.getElementById('taskId').value = task._id;
  document.getElementById('taskModalTitle').textContent = 'Edit Task';
  document.getElementById('taskSaveBtnText').textContent = 'Update Task';
  document.getElementById('taskTitle').value = task.title;
  document.getElementById('taskDesc').value = task.description || '';
  document.getElementById('taskPriority').value = task.priority;
  document.getElementById('taskStatus').value = task.status;
  document.getElementById('taskCategory').value = task.category;
  document.getElementById('taskDueDate').value = task.dueDate ? task.dueDate.split('T')[0] : '';
  
  // Populate assignee dropdown with multi-select
  const assigneeSelect = document.getElementById('taskAssignedTo');
  assigneeSelect.innerHTML = '<option value="">Unassigned</option>';
  if (S.teamMembers && S.teamMembers.length > 0) {
    S.teamMembers.forEach(m => {
      assigneeSelect.innerHTML += `<option value="${m._id}" data-name="${m.name || ''}" data-username="${m.username}">${m.name || m.username}</option>`;
    });
  }
  
  // Handle multi-assignees - can be array or single object for backward compatibility
  const assignedTo = task.assignedTo;
  if (Array.isArray(assignedTo) && assignedTo.length > 0) {
    const selectedIds = assignedTo.map(a => a.userId);
    Array.from(assigneeSelect.options).forEach(opt => {
      opt.selected = selectedIds.includes(opt.value);
    });
  } else if (assignedTo?.userId) {
    assigneeSelect.value = assignedTo.userId;
  } else {
    assigneeSelect.value = '';
  }
  
  openModal('taskModal');
}

async function saveTask() {
  const taskId = document.getElementById('taskId').value;
  const isEdit = !!taskId;
  
  const assignedTo = getSelectedAssignees();
  
  const body = {
    title: document.getElementById('taskTitle').value,
    description: document.getElementById('taskDesc').value,
    priority: document.getElementById('taskPriority').value,
    status: document.getElementById('taskStatus').value,
    category: document.getElementById('taskCategory').value,
    dueDate: document.getElementById('taskDueDate').value || undefined,
    assignedTo
  };
  
  if (!body.title) { toast('Title is required', 'error'); return; }
  
  try {
    let r;
    if (isEdit) {
      r = await api(`/api/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      r = await api('/api/tasks', { method: 'POST', body: JSON.stringify(body) });
    }
    
    if (r.success) { 
      closeModal('taskModal'); 
      toast(isEdit ? 'Task updated' : 'Task created'); 
      fetchAndRenderTasks(); 
    }
    else toast(r.error || 'Error', 'error');
  } catch { toast(isEdit ? 'Error updating task' : 'Error creating task', 'error'); }
}

async function undoCompleteTask(id) {
  try {
    const r = await api(`/api/tasks/${id}/undo`, { method: 'POST' });
    if (r.success) { 
      toast('Task restored to previous status'); 
      fetchAndRenderTasks(); 
    }
    else toast(r.error || 'Error', 'error');
  } catch { toast('Error undoing completion', 'error'); }
}

function viewTask(id) {
  editTask(id);
}

// ── TEAM ──
async function loadTeam() {
  const sec = document.getElementById('sec-team');
  sec.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
      <h2 style="font-size:1.1rem;font-weight:600;">Team Management</h2>
      ${S.adminRole === 'superadmin' ? `<button class="btn btn-gold" onclick="openModal('teamModal')"><i class="fas fa-user-plus"></i> Add Member</button>` : ''}
    </div>
    <div class="card">
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>User</th><th>Username</th><th>Email</th><th>Role</th><th>Last Login</th><th>Status</th><th></th></tr></thead>
          <tbody id="teamBody"><tr><td colspan="7"><div class="loading"><div class="spinner"></div></div></td></tr></tbody>
        </table>
      </div>
    </div>
  `;
  try {
    const data = await api('/api/admin/');
    const admins = data.data || [];
    const tbody = document.getElementById('teamBody');
    if (!admins.length) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fas fa-users"></i><p>No team members</p></div></td></tr>`; return; }
    tbody.innerHTML = admins.map(a => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <div class="team-avatar">${(a.name || a.username).charAt(0).toUpperCase()}</div>
            <div><div class="cell-primary">${a.name || '-'}</div></div>
          </div>
        </td>
        <td style="font-size:0.85rem;">${a.username}</td>
        <td style="font-size:0.82rem;color:var(--text-muted);">${a.email || '-'}</td>
        <td>${statusBadge(a.role)}</td>
        <td style="font-size:0.78rem;color:var(--text-muted);">${a.lastLogin ? timeAgo(a.lastLogin) : 'Never'}</td>
        <td>${a.isActive ? '<span class="badge badge-active">Active</span>' : '<span class="badge badge-inactive">Inactive</span>'}</td>
        <td style="text-align:center;">
          <span id="adminOnlineDot-${a._id}" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${a.isOnline?'#22c55e':'#6b7280'};" title="${a.isOnline?'Online':(a.lastSeen?'Last seen '+timeAgo(a.lastSeen):'Offline')}"></span>
          <span style="font-size:0.7rem;color:var(--text-muted);margin-left:4px;">${a.isOnline?'Online':(a.lastSeen?timeAgo(a.lastSeen):'Never')}</span>
        </td>
        <td>
          ${a._id !== S.adminId ? `<button class="btn btn-danger-ghost btn-sm btn-icon" onclick="deactivateAdmin('${a._id}')" title="Deactivate"><i class="fas fa-user-slash"></i></button>` : '<em style="font-size:0.75rem;color:var(--text-muted);">You</em>'}
        </td>
      </tr>
    `).join('');
  } catch { sec.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><p>Failed to load team</p></div>`; }
}

async function saveTeamMember() {
  const body = {
    username: document.getElementById('teamUsername').value,
    password: document.getElementById('teamPassword').value,
    name: document.getElementById('teamName').value,
    email: document.getElementById('teamEmail').value,
    role: document.getElementById('teamRole').value
  };
  if (!body.username || !body.password) { toast('Username and password required', 'error'); return; }
  try {
    const r = await api('/api/admin/create', { method: 'POST', body: JSON.stringify(body) });
    if (r.success) { closeModal('teamModal'); toast('Team member created'); loadTeam(); }
    else toast(r.error || 'Error', 'error');
  } catch { toast('Error creating member', 'error'); }
}

async function deactivateAdmin(id) {
  if (!confirm('Deactivate this admin?')) return;
  const r = await api(`/api/admin/${id}`, { method: 'DELETE' });
  if (r.success) { toast('Admin deactivated'); loadTeam(); }
  else toast('Error', 'error');
}

// ── ADMIN MANAGEMENT (SUPERADMIN ONLY) ──
async function loadAdminManagement() {
  const sec = document.getElementById('sec-adminmgmt');
  sec.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
      <h2 style="font-size:1.1rem;font-weight:600;">Admin Management</h2>
      <button class="btn btn-gold" onclick="openModal('addAdminModal')"><i class="fas fa-user-plus"></i> Add Admin</button>
    </div>
    <div class="card">
      <div class="card-body no-pad">
        <table class="data-table">
          <thead><tr><th>User</th><th>Username</th><th>Email</th><th>Role</th><th>Created By</th><th>Created At</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="adminMgmtBody"><tr><td colspan="8"><div class="loading"><div class="spinner"></div></div></td></tr></tbody>
        </table>
      </div>
    </div>
  `;
  try {
    const data = await api('/api/admin/');
    const admins = data.data || [];
    const tbody = document.getElementById('adminMgmtBody');
    if (!admins.length) { tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fas fa-users"></i><p>No admins found</p></div></td></tr>`; return; }
    tbody.innerHTML = admins.map(a => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <div class="team-avatar">${(a.name || a.username).charAt(0).toUpperCase()}</div>
            <div><div class="cell-primary">${a.name || '-'}</div></div>
          </div>
        </td>
        <td style="font-size:0.85rem;">${a.username}</td>
        <td style="font-size:0.82rem;color:var(--text-muted);">${a.email || '-'}</td>
        <td>${statusBadge(a.role)}</td>
        <td style="font-size:0.78rem;color:var(--text-muted);">${a.createdBy?.name || a.createdBy?.username || 'System'}</td>
        <td style="font-size:0.78rem;color:var(--text-muted);">${a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '-'}</td>
        <td>${a.isActive ? '<span class="badge badge-active">Active</span>' : '<span class="badge badge-inactive">Inactive</span>'}</td>
        <td style="text-align:center;">
          <span id="adminOnlineDot-${a._id}" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${a.isOnline?'#22c55e':'#6b7280'};" title="${a.isOnline?'Online':(a.lastSeen?'Last seen '+timeAgo(a.lastSeen):'Offline')}"></span>
          <span style="font-size:0.7rem;color:var(--text-muted);margin-left:4px;">${a.isOnline?'<span style=color:#22c55e>Online</span>':(a.lastSeen?timeAgo(a.lastSeen):'Never')}</span>
        </td>
        <td>
          <div style="display:flex;gap:0.5rem;">
            ${a._id !== S.adminId ? `
              <select onchange="changeAdminRole('${a._id}', this.value)" style="font-size:0.75rem;padding:0.25rem;border-radius:6px;background:var(--surface);border:1px solid var(--border);color:var(--text);">
                <option value="admin" ${a.role === 'admin' ? 'selected' : ''}>Admin</option>
                <option value="superadmin" ${a.role === 'superadmin' ? 'selected' : ''}>Superadmin</option>
              </select>
              <button class="btn btn-danger-ghost btn-sm btn-icon" onclick="deleteAdmin('${a._id}')" title="Delete"><i class="fas fa-trash"></i></button>
            ` : '<em style="font-size:0.75rem;color:var(--text-muted);">You</em>'}
          </div>
        </td>
      </tr>
    `).join('');
  } catch { sec.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><p>Failed to load admins</p></div>`; }
}

async function saveNewAdmin() {
  const body = {
    username: document.getElementById('newAdminUsername').value,
    password: document.getElementById('newAdminPassword').value,
    name: document.getElementById('newAdminName').value,
    email: document.getElementById('newAdminEmail').value,
    role: document.getElementById('newAdminRole').value
  };
  if (!body.username || !body.password) { toast('Username and password required', 'error'); return; }
  try {
    const r = await api('/api/admin/create', { method: 'POST', body: JSON.stringify(body) });
    if (r.success) { closeModal('addAdminModal'); toast('Admin created successfully'); loadAdminManagement(); }
    else toast(r.error || 'Error creating admin', 'error');
  } catch { toast('Error creating admin', 'error'); }
}

async function deleteAdmin(id) {
  if (!confirm('Permanently delete this admin? This action cannot be undone.')) return;
  const r = await api(`/api/admin/${id}`, { method: 'DELETE' });
  if (r.success) { toast('Admin deleted'); loadAdminManagement(); }
  else toast('Error deleting admin', 'error');
}

async function changeAdminRole(id, newRole) {
  if (!confirm(`Change role to ${newRole}?`)) return;
  try {
    const r = await api(`/api/admin/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role: newRole }) });
    if (r.success) { toast('Role updated'); loadAdminManagement(); }
    else toast(r.error || 'Error updating role', 'error');
  } catch { toast('Error updating role', 'error'); }
}

// ── TEAM CHAT ──
let staffChatTab = 'direct'; // 'direct' or 'groups'
let selectedStaffId = null;
let selectedGroupId = null;
let staffGroups = [];
let onlineStaff = [];
let staffChatMessages = [];
let chatUnreadCounts = {}; // { adminId: count }
let chatLastMessages = {}; // { adminId: { text, timestamp, fromName } }
let activeChatBanner = null;

// Internal chime via AudioContext — no external files needed
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const times = [0, 0.18, 0.34];
    const freqs = [880, 1108, 1320];
    times.forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqs[i], ctx.currentTime + t);
      gain.gain.setValueAtTime(0.18, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.35);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.38);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch(e) {}
}

// Rich chat notification banner (bottom-right, slides up)
function showChatBanner(data) {
  // Remove existing banner
  if (activeChatBanner) { activeChatBanner.remove(); activeChatBanner = null; }

  const avatar = data.fromAvatar;
  const avatarHtml = avatar?.emoji
    ? `<div class="chat-banner-avatar" style="background:${avatar.bg||'#c9a84c'}">${avatar.emoji}</div>`
    : `<div class="chat-banner-avatar" style="background:var(--gold)">${(data.fromName||'?').charAt(0).toUpperCase()}</div>`;

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const preview = (data.message||'').length > 60 ? data.message.substring(0,60)+'…' : data.message;

  const banner = document.createElement('div');
  banner.className = 'chat-banner';
  banner.innerHTML = `
    ${avatarHtml}
    <div class="chat-banner-body">
      <div class="chat-banner-icon"><i class="fas fa-comment-dots"></i> Team Chat</div>
      <div class="chat-banner-name">${data.fromName || 'Admin'}</div>
      <div class="chat-banner-msg">${preview}</div>
      <div class="chat-banner-time">${timeStr}</div>
    </div>
    <button class="chat-banner-close" onclick="event.stopPropagation();this.closest('.chat-banner').remove();">&times;</button>
  `;
  banner.addEventListener('click', () => {
    banner.remove();
    showSection('teamchat');
    if (data.fromId) setTimeout(() => selectStaff(data.fromId, data.fromName, data.fromRole||'Admin'), 200);
  });
  document.body.appendChild(banner);
  activeChatBanner = banner;

  // Auto-dismiss after 6 seconds
  setTimeout(() => {
    if (banner.parentNode) {
      banner.style.animation = 'bannerSlideDown 0.3s ease forwards';
      setTimeout(() => banner.remove(), 300);
    }
    if (activeChatBanner === banner) activeChatBanner = null;
  }, 6000);
}

async function loadTeamChat() {
  const sec = document.getElementById('sec-teamchat');
  sec.innerHTML = `
    <div class="card" style="padding:0;">
      <div class="teamchat-layout">
        <div class="teamchat-sidebar">
          <div class="teamchat-tabs">
            <div class="teamchat-tab ${staffChatTab === 'direct' ? 'active' : ''}" onclick="switchStaffTab('direct')">Direct</div>
            <div class="teamchat-tab ${staffChatTab === 'groups' ? 'active' : ''}" onclick="switchStaffTab('groups')">Groups</div>
          </div>
          <div class="teamchat-list" id="staffChatList">
            <div class="loading" style="padding:2rem;"><div class="spinner"></div></div>
          </div>
          ${staffChatTab === 'groups' ? `<div class="teamchat-create-btn" onclick="createGroupModal()"><i class="fas fa-plus"></i> New Group</div>` : ''}
        </div>
        <div class="teamchat-main" id="staffChatMain">
          <div class="chat-empty">
            <i class="fas fa-user-friends"></i>
            <p>Select a conversation to start messaging</p>
          </div>
        </div>
      </div>
    </div>
  `;
  await renderStaffChatList();
}

async function renderStaffChatList() {
  const list = document.getElementById('staffChatList');
  if (!list) return;
  
  if (staffChatTab === 'direct') {
    // Fetch online staff (using list endpoint available to all admins)
    try {
      const data = await api('/api/admin/list');
      onlineStaff = data.data || [];
      console.log('[TeamChat] Loaded staff:', onlineStaff.length, onlineStaff);
    } catch (err) {
      console.error('[TeamChat] Failed to load staff:', err);
      onlineStaff = [];
    }
    
    // Sort by latest message timestamp (most recent first)
    const sorted = [...onlineStaff].sort((a, b) => {
      const ta = chatLastMessages[a._id]?.timestamp || 0;
      const tb = chatLastMessages[b._id]?.timestamp || 0;
      return new Date(tb) - new Date(ta);
    });

    list.innerHTML = sorted.map(s => {
      const last = chatLastMessages[s._id];
      const unread = chatUnreadCounts[s._id] || 0;
      const lastText = last ? `<div class="teamchat-meta" style="font-size:0.72rem;">${last.text.length > 28 ? last.text.substring(0,28)+'…' : last.text}</div>` : `<div class="teamchat-meta">${s.role || 'Admin'}</div>`;
      return `
        <div class="teamchat-item ${selectedStaffId === s._id ? 'active' : ''}" onclick="selectStaff('${s._id}', '${s.name || s.username}', '${s.role || 'admin'}');chatUnreadCounts['${s._id}']=0;renderStaffChatList();">
          <div class="teamchat-avatar" style="${s.avatar?.emoji ? `background:${s.avatar.bg||'#c9a84c'};font-size:1.1rem;` : ''}">${s.avatar?.emoji || (s.name || s.username).charAt(0).toUpperCase()}</div>
          <div class="teamchat-info" style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div class="teamchat-name" style="${unread > 0 ? 'font-weight:700;' : ''}">${s.name || s.username} ${s._id === S.adminId ? '<span style="font-size:0.7rem;opacity:0.6">(You)</span>' : ''}</div>
              ${last ? `<div style="font-size:0.7rem;color:var(--text-muted);">${new Date(last.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>` : ''}
            </div>
            ${lastText}
          </div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:0.3rem;">
            ${unread > 0 ? `<span style="background:var(--gold);color:#000;border-radius:50%;width:18px;height:18px;font-size:0.68rem;font-weight:700;display:flex;align-items:center;justify-content:center;">${unread}</span>` : `<span id="staffDot-${s._id}" style="width:8px;height:8px;border-radius:50%;background:${s.isOnline?'#22c55e':'#6b7280'};display:inline-block;" title="${s.isOnline?'Online':'Offline'}"></span>`}
          </div>
        </div>
      `;
    }).join('') || `<div style="padding:1.5rem;text-align:center;color:var(--text-muted);">
      <i class="fas fa-users-slash" style="font-size:1.5rem;margin-bottom:0.5rem;display:block;opacity:0.5;"></i>
      <div style="font-size:0.85rem;margin-bottom:0.75rem;">No team members found</div>
      <button onclick="renderStaffChatList()" class="btn btn-sm btn-ghost" style="font-size:0.75rem;"><i class="fas fa-sync"></i> Reload</button>
    </div>`;
  } else {
    // Groups
    list.innerHTML = staffGroups.map(g => `
      <div class="teamchat-item ${selectedGroupId === g.id ? 'active' : ''}" onclick="selectGroup('${g.id}', '${g.name}')">
        <div class="teamchat-avatar group">#</div>
        <div class="teamchat-info">
          <div class="teamchat-name">${g.name}</div>
          <div class="teamchat-meta">${g.members?.length || 0} members</div>
        </div>
      </div>
    `).join('') || '<div style="padding:1rem;text-align:center;color:var(--text-muted);">No groups yet</div>';
  }
}

function switchStaffTab(tab) {
  staffChatTab = tab;
  selectedStaffId = null;
  selectedGroupId = null;
  loadTeamChat();
  if (socket) {
    socket.emit('join_staff_chat', { adminId: S.adminId });
  }
}

function selectStaff(id, name, role) {
  selectedStaffId = id;
  selectedGroupId = null;
  renderStaffChatList();
  renderStaffChatWindow(name, role);
  loadStaffMessages(id, 'direct');
}

function selectGroup(id, name) {
  selectedGroupId = id;
  selectedStaffId = null;
  renderStaffChatList();
  renderStaffChatWindow(name, 'Group');
  loadStaffMessages(id, 'group');
  if (socket) {
    socket.emit('join_group', { groupId: id });
  }
}

function renderStaffChatWindow(title, subtitle) {
  const main = document.getElementById('staffChatMain');
  if (!main) return;
  main.innerHTML = `
    <div class="teamchat-header">
      <div class="teamchat-avatar ${selectedGroupId ? 'group' : ''}">${title.charAt(0).toUpperCase()}</div>
      <div>
        <div style="font-weight:600;font-size:0.95rem;">${title}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);">${subtitle}</div>
      </div>
    </div>
    <div class="teamchat-messages" id="staffChatMessages"></div>
    <div class="teamchat-input">
      <input type="text" id="staffChatInput" placeholder="Type a message..." onkeypress="if(event.key==='Enter')sendStaffMessage()">
      <button onclick="sendStaffMessage()"><i class="fas fa-paper-plane"></i></button>
    </div>
  `;
  setTimeout(() => document.getElementById('staffChatInput')?.focus(), 50);
}

function loadStaffMessages(targetId, type) {
  const key = `staffchat_${type}_${targetId}`;
  const stored = localStorage.getItem(key);
  staffChatMessages = stored ? JSON.parse(stored) : [];
  // Seed last message tracker from history
  if (staffChatMessages.length > 0) {
    const last = staffChatMessages[staffChatMessages.length - 1];
    chatLastMessages[targetId] = { text: last.text, timestamp: last.timestamp, fromName: last.fromName };
  }
  renderStaffMessages();
}

function getAvatarForMessage(msg) {
  // Check if message has avatar info
  if (msg.fromAvatar?.emoji) {
    return `<div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.1rem;background:${msg.fromAvatar.bg || '#c9a84c'};">${msg.fromAvatar.emoji}</div>`;
  }
  // Check if we have this admin in onlineStaff with avatar
  const staff = onlineStaff.find(s => s._id === msg.fromId);
  if (staff?.avatar?.emoji) {
    return `<div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.1rem;background:${staff.avatar.bg || '#c9a84c'};">${staff.avatar.emoji}</div>`;
  }
  // Fallback to initial
  return `<div class="staff-msg-avatar">${msg.fromName?.charAt(0).toUpperCase() || '?'}</div>`;
}

// Helper to format date for chat
function fmtChatDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function renderStaffMessages() {
  const container = document.getElementById('staffChatMessages');
  if (!container) return;
  
  let lastDate = null;
  
  container.innerHTML = staffChatMessages.map(m => {
    const isOwn = m.fromId === S.adminId;
    const msgDate = new Date(m.timestamp).toDateString();
    let dateSeparator = '';
    
    if (msgDate !== lastDate) {
      dateSeparator = `<div class="chat-date-separator"><span>${fmtChatDate(m.timestamp)}</span></div>`;
      lastDate = msgDate;
    }
    
    return dateSeparator + `
      <div class="staff-msg ${isOwn ? 'own' : ''}">
        ${getAvatarForMessage(m)}
        <div class="staff-msg-content">
          <div class="staff-msg-header">
            <span>${m.fromName}</span>
            ${m.fromRole ? `<span class="staff-msg-role">${m.fromRole}</span>` : ''}
            <span>${new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
          <div class="staff-msg-text">${escapeHtml(m.text)}</div>
        </div>
      </div>
    `;
  }).join('');
  container.scrollTop = container.scrollHeight;
}

function sendStaffMessage() {
  const input = document.getElementById('staffChatInput');
  const text = input?.value?.trim();
  if (!text) return;
  
  const myName = S.adminName || 'Me';
  const myAvatar = S.adminAvatar || JSON.parse(localStorage.getItem('myAvatar') || '{"emoji":"🦁","bg":"#c9a84c"}');
  const message = {
    fromId: S.adminId,
    fromName: myName,
    fromRole: 'Admin',
    fromAvatar: myAvatar,
    text: text,
    timestamp: new Date().toISOString()
  };
  
  staffChatMessages.push(message);
  
  // Save to localStorage
  const targetId = selectedStaffId || selectedGroupId;
  const type = selectedStaffId ? 'direct' : 'group';
  localStorage.setItem(`staffchat_${type}_${targetId}`, JSON.stringify(staffChatMessages));
  
  // Emit via socket with avatar
  if (socket) {
    console.log('Sending message via socket:', { selectedStaffId, selectedGroupId });
    if (selectedStaffId) {
      socket.emit('staff_message', { 
        toId: selectedStaffId, 
        message: text, 
        fromId: S.adminId, 
        fromName: myName,
        fromAvatar: myAvatar
      });
    } else if (selectedGroupId) {
      socket.emit('group_message', { 
        groupId: selectedGroupId, 
        message: text, 
        fromId: S.adminId, 
        fromName: myName,
        fromAvatar: myAvatar
      });
    }
  }
  
  input.value = '';
  renderStaffMessages();
}

function createGroupModal() {
  const others = onlineStaff.filter(s => s._id !== S.adminId);
  const memberOptions = others.map(s => `
    <label style="display:flex;align-items:center;gap:0.6rem;padding:0.5rem 0;border-bottom:1px solid var(--border);cursor:pointer;">
      <input type="checkbox" class="grp-member-cb" value="${s._id}" style="width:16px;height:16px;accent-color:var(--gold);">
      <div style="width:28px;height:28px;border-radius:50%;background:${s.avatar?.bg||'var(--gold)'};display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;">${s.avatar?.emoji||(s.name||s.username).charAt(0).toUpperCase()}</div>
      <div>
        <div style="font-size:0.85rem;font-weight:600;">${s.name||s.username}</div>
        <div style="font-size:0.72rem;color:var(--text-muted);">${s.role||'Admin'}</div>
      </div>
    </label>`).join('');

  const overlay = document.createElement('div');
  overlay.id = 'createGroupOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:99999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:var(--surface);border-radius:16px;padding:1.5rem;width:340px;max-width:95vw;box-shadow:0 16px 48px rgba(0,0,0,0.3);">
      <div style="font-weight:700;font-size:1rem;margin-bottom:1rem;">Create Group Chat</div>
      <input id="newGroupName" placeholder="Group name..." style="width:100%;padding:0.6rem 0.8rem;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);margin-bottom:1rem;box-sizing:border-box;">
      <div style="font-size:0.8rem;font-weight:600;color:var(--text-muted);margin-bottom:0.5rem;">Add Members</div>
      <div style="max-height:200px;overflow-y:auto;">${memberOptions||'<div style="color:var(--text-muted);font-size:0.83rem;padding:0.5rem 0;">No other admins available</div>'}</div>
      <div style="display:flex;gap:0.5rem;margin-top:1rem;">
        <button onclick="submitCreateGroup()" style="flex:1;background:var(--gold);color:#1C2420;border:none;padding:0.6rem;border-radius:8px;font-weight:700;cursor:pointer;">Create</button>
        <button onclick="document.getElementById('createGroupOverlay').remove()" style="flex:1;background:var(--surface2);color:var(--text);border:1px solid var(--border);padding:0.6rem;border-radius:8px;cursor:pointer;">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('newGroupName')?.focus(), 50);
}

function submitCreateGroup() {
  const name = document.getElementById('newGroupName')?.value?.trim();
  if (!name) { toast('Enter a group name', 'warn'); return; }
  const checked = [...document.querySelectorAll('.grp-member-cb:checked')].map(cb => cb.value);
  if (!socket) { toast('Not connected', 'error'); return; }
  socket.emit('create_group', { name, members: checked, createdBy: S.adminId });
  document.getElementById('createGroupOverlay')?.remove();
  toast('Group created!');
}

// Handle incoming staff messages
function handleStaffMessage(data) {
  console.log('Received staff message:', data);
  
  // Check if message is for current user (for direct messages)
  if (data.toId && data.toId !== S.adminId) {
    console.log('Message not for me, ignoring');
    return;
  }
  
  const key = data.groupId ? `staffchat_group_${data.groupId}` : `staffchat_direct_${data.fromId}`;
  const stored = localStorage.getItem(key) || '[]';
  const messages = JSON.parse(stored);
  messages.push({
    fromId: data.fromId,
    fromName: data.fromName,
    fromRole: data.fromRole || 'Admin',
    fromAvatar: data.fromAvatar,
    text: data.message,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem(key, JSON.stringify(messages));
  
  // Update last message and unread tracking
  const senderId = data.groupId || data.fromId;
  chatLastMessages[senderId] = { text: data.message, timestamp: new Date().toISOString(), fromName: data.fromName };

  const isActiveChat = (data.fromId && selectedStaffId === data.fromId) || (data.groupId && selectedGroupId === data.groupId);
  const isOnChatPage = S.section === 'teamchat';

  if (!isActiveChat) {
    // Increment unread
    chatUnreadCounts[senderId] = (chatUnreadCounts[senderId] || 0) + 1;

    // Update nav badge (desktop + mobile)
    const total = Object.values(chatUnreadCounts).reduce((a, b) => a + b, 0);
    const badge = document.getElementById('teamChatBadge');
    if (badge) { badge.textContent = total; badge.style.display = 'inline-block'; }
    const mobBadge = document.getElementById('mobTeamChatBadge');
    if (mobBadge) { mobBadge.textContent = total; mobBadge.style.display = total > 0 ? '' : 'none'; }

    // Play chime
    playChime();

    // Show rich banner preview
    showChatBanner(data);

    // Refresh sidebar if on chat page to resort
    if (isOnChatPage) renderStaffChatList();
  }
  
  // Refresh if currently viewing this chat
  if ((data.fromId && selectedStaffId === data.fromId) || (data.groupId && selectedGroupId === data.groupId)) {
    staffChatMessages = messages;
    renderStaffMessages();
  }
}

// ── AVATAR PICKER ──
let selectedEmoji = '🦁';
let selectedBg = '#c9a84c';
const EMOJIS = ['🦁','🐯','🦊','🐺','🐻','🐼','🐨','🐸','🐙','🦉','🦅','🦜','🐉','🦕','🦖','🐳','🐬','🦈','🐊','🐅','🦓','🦒','🦌','🦌','🐘','🦏','🦛','🐪','🦙','🦘','🦡','🦦','🐿️','🦔','🐇','🦫','🦭','🐧','🦆','🦢'];
const COLORS = ['#c9a84c','#e74c3c','#3498db','#2ecc71','#9b59b6','#f39c12','#1abc9c','#34495e'];

function initAvatarModal() {
  const saved = S.adminAvatar || JSON.parse(localStorage.getItem('myAvatar') || '{"emoji":"🦁","bg":"#c9a84c"}');
  selectedEmoji = saved.emoji;
  selectedBg = saved.bg;

  // Build emoji grid
  const emojiGrid = document.getElementById('emojiGrid');
  if (emojiGrid) {
    emojiGrid.innerHTML = EMOJIS.map(e => `
      <div class="emoji-option" data-emoji="${e}" onclick="selectEmoji('${e}')"
        style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:1.4rem;cursor:pointer;border-radius:8px;transition:all 0.15s;background:var(--surface2);border:2px solid ${e === selectedEmoji ? 'var(--gold)' : 'transparent'};">${e}</div>
    `).join('');
  }

  // Build color grid
  const colorGrid = document.getElementById('colorGrid');
  if (colorGrid) {
    colorGrid.innerHTML = COLORS.map(c => `
      <div class="color-option" data-color="${c}" onclick="selectAvatarColor('${c}')"
        style="aspect-ratio:1;border-radius:50%;cursor:pointer;transition:all 0.15s;background:${c};border:3px solid ${c === selectedBg ? '#fff' : 'transparent'};box-shadow:${c === selectedBg ? '0 0 0 2px var(--gold)' : 'none'};"></div>
    `).join('');
  }

  updateAvatarPreview();
}

function selectEmoji(e) {
  selectedEmoji = e;
  updateAvatarPreview();
  highlightSelections();
}

function selectAvatarColor(c) {
  selectedBg = c;
  updateAvatarPreview();
  highlightSelections();
}

function updateAvatarPreview() {
  const preview = document.getElementById('avatarPreview');
  if (preview) {
    preview.textContent = selectedEmoji;
    preview.style.background = selectedBg;
  }
}

function highlightSelections() {
  document.querySelectorAll('.emoji-option').forEach(el => {
    el.style.border = el.dataset.emoji === selectedEmoji ? '2px solid var(--gold)' : '2px solid transparent';
    el.style.background = el.dataset.emoji === selectedEmoji ? 'var(--gold-dim, rgba(201,168,76,0.2))' : 'var(--surface2)';
  });
  document.querySelectorAll('.color-option').forEach(el => {
    el.style.border = el.dataset.color === selectedBg ? '3px solid #fff' : '3px solid transparent';
    el.style.boxShadow = el.dataset.color === selectedBg ? '0 0 0 2px var(--gold)' : 'none';
  });
}

function randomizeAvatar() {
  selectedEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  selectedBg = COLORS[Math.floor(Math.random() * COLORS.length)];
  updateAvatarPreview();
  highlightSelections();
}

async function saveAvatar() {
  const r = await api('/api/admin/avatar', { 
    method: 'PUT', 
    body: JSON.stringify({ emoji: selectedEmoji, bg: selectedBg }) 
  });
  if (r.success) {
    const av = { emoji: selectedEmoji, bg: selectedBg };
    localStorage.setItem('myAvatar', JSON.stringify(av));
    S.adminAvatar = av;
    closeModal('avatarModal');
    toast('Avatar saved! ✨');
    // Update sidebar avatar in place without full re-render
    const el = document.getElementById('sidebarAvatar');
    if (el) {
      el.style.background = av.bg;
      el.style.fontSize = '1.4rem';
      el.childNodes[0].textContent = av.emoji;
    }
  } else {
    toast(r.error || 'Error saving avatar', 'error');
  }
}

// Helper to get avatar display HTML
function getAvatarHTML(avatar, size = 'md') {
  if (!avatar) return '';
  const sizes = { sm: '24px', md: '32px', lg: '40px', xl: '80px' };
  const fontSizes = { sm: '0.8rem', md: '1rem', lg: '1.2rem', xl: '2.5rem' };
  const s = sizes[size] || sizes.md;
  const fs = fontSizes[size] || fontSizes.md;
  return `<div style="width:${s};height:${s};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${fs};background:${avatar.bg || '#c9a84c'};flex-shrink:0;cursor:pointer;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">${avatar.emoji || '👤'}</div>`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ── INIT ──
if (!S.token) {
  renderLogin();
} else {
  renderApp();
}

// ════════════════════════════════════════════
//  PRO FEATURES
// ════════════════════════════════════════════

// ── 1. KEYBOARD SHORTCUTS ──────────────────
const KPAL_COMMANDS = [
  { section: 'Navigate', label: 'Dashboard', icon: 'fa-tachometer-alt', shortcut: 'G D', action: () => showSection('dashboard') },
  { section: 'Navigate', label: 'Leads', icon: 'fa-users', shortcut: 'G L', action: () => showSection('leads') },
  { section: 'Navigate', label: 'Chat', icon: 'fa-comments', shortcut: 'G C', action: () => showSection('chat') },
  { section: 'Navigate', label: 'Bookings', icon: 'fa-calendar-check', shortcut: 'G B', action: () => showSection('bookings') },
  { section: 'Navigate', label: 'Analytics', icon: 'fa-chart-bar', shortcut: 'G A', action: () => showSection('analytics') },
  { section: 'Navigate', label: 'Listings', icon: 'fa-building', shortcut: '', action: () => showSection('listings') },
  { section: 'Navigate', label: 'Tasks', icon: 'fa-tasks', shortcut: '', action: () => showSection('tasks') },
  { section: 'Actions', label: 'New Listing', icon: 'fa-plus', shortcut: 'N L', action: () => { showSection('listings'); setTimeout(() => openListingModal(), 300); } },
  { section: 'Actions', label: 'New Task', icon: 'fa-plus-circle', shortcut: 'N T', action: () => { showSection('tasks'); setTimeout(() => openModal('taskModal'), 300); } },
  { section: 'Actions', label: 'Show Shortcuts', icon: 'fa-keyboard', shortcut: '?', action: () => { closeKpal(); openShortcuts(); } },
  { section: 'Actions', label: 'Logout', icon: 'fa-sign-out-alt', shortcut: '', action: () => logout() },
];

let kpalActive = 0;

function openKpal() {
  document.getElementById('kpalOverlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('kpalInput').focus(), 50);
  renderKpal('');
}

function closeKpal() {
  document.getElementById('kpalOverlay').classList.add('hidden');
  document.getElementById('kpalInput').value = '';
}

function renderKpal(q) {
  const list = document.getElementById('kpalList');
  const filtered = KPAL_COMMANDS.filter(c => !q || c.label.toLowerCase().includes(q.toLowerCase()) || c.section.toLowerCase().includes(q.toLowerCase()));
  kpalActive = 0;
  if (!filtered.length) { list.innerHTML = `<div style="padding:1rem;text-align:center;color:var(--text-muted);font-size:0.85rem;">No commands found</div>`; return; }
  let lastSection = '';
  list.innerHTML = filtered.map((c, i) => {
    let html = '';
    if (c.section !== lastSection) {
      html += `<div class="kpal-section">${c.section}</div>`;
      lastSection = c.section;
    }
    return html + `<div class="kpal-item${i === 0 ? ' kpal-active' : ''}" data-idx="${i}" onclick="kpalRun(${KPAL_COMMANDS.indexOf(c)})">
      <i class="fas ${c.icon}"></i>
      <span class="kpal-item-label">${c.label}</span>
      ${c.shortcut ? `<span class="kpal-item-shortcut">${c.shortcut}</span>` : ''}
    </div>`;
  }).join('');
}

function kpalKeyDown(e) {
  const items = document.querySelectorAll('.kpal-item');
  if (!items.length) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); kpalActive = Math.min(kpalActive + 1, items.length - 1); items.forEach((el, i) => el.classList.toggle('kpal-active', i === kpalActive)); items[kpalActive].scrollIntoView({ block: 'nearest' }); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); kpalActive = Math.max(kpalActive - 1, 0); items.forEach((el, i) => el.classList.toggle('kpal-active', i === kpalActive)); items[kpalActive].scrollIntoView({ block: 'nearest' }); }
  else if (e.key === 'Enter') { e.preventDefault(); const active = document.querySelector('.kpal-item.kpal-active'); if (active) { const idx = parseInt(active.dataset.idx); kpalRun(idx); } }
  else if (e.key === 'Escape') closeKpal();
}

function kpalRun(idx) {
  closeKpal();
  KPAL_COMMANDS[idx]?.action();
}

function openShortcuts() { document.getElementById('shortcutsModal').classList.remove('hidden'); }
function closeShortcuts() { document.getElementById('shortcutsModal').classList.add('hidden'); }

function initKeyboardShortcuts() {
  let seqBuffer = '';
  let seqTimer = null;

  document.addEventListener('keydown', (e) => {
    // Skip if typing in an input
    if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) {
      // Only allow Escape in inputs (close modals)
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        closeKpal();
        closeShortcuts();
      }
      return;
    }

    // Ctrl+K: command palette
    if (e.ctrlKey && e.key === 'k') { e.preventDefault(); openKpal(); return; }
    // Ctrl+Enter: save active modal
    if (e.ctrlKey && e.key === 'Enter') {
      const activeModal = document.querySelector('.modal-overlay.active');
      if (activeModal) activeModal.querySelector('.btn-gold')?.click();
      return;
    }
    // Escape: close any open modal/palette/shortcuts
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      closeKpal();
      closeShortcuts();
      return;
    }
    // ? key: show shortcuts
    if (e.key === '?') { openShortcuts(); return; }

    // Two-key sequences (G+x, N+x)
    const key = e.key.toLowerCase();
    seqBuffer += key;
    clearTimeout(seqTimer);
    seqTimer = setTimeout(() => { seqBuffer = ''; }, 800);

    const sequences = {
      'gd': () => showSection('dashboard'),
      'gl': () => showSection('leads'),
      'gc': () => showSection('chat'),
      'gb': () => showSection('bookings'),
      'ga': () => showSection('analytics'),
      'nl': () => { showSection('listings'); setTimeout(() => openListingModal(), 300); },
      'nt': () => { showSection('tasks'); setTimeout(() => openModal('taskModal'), 300); },
    };

    if (sequences[seqBuffer]) {
      sequences[seqBuffer]();
      seqBuffer = '';
      clearTimeout(seqTimer);
    }
  });
}

// ── 2. INLINE LEAD EDITING ─────────────────
async function inlineUpdateStatus(id, newStatus) {
  try {
    const r = await api(`/api/leads/${id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
    if (r.success) {
      const lead = S.leads.find(l => l._id === id);
      if (lead) lead.status = newStatus;
      const row = document.getElementById(`lead-row-${id}`);
      if (row) { row.classList.add('lead-row-new'); setTimeout(() => row.classList.remove('lead-row-new'), 1200); }
      toast(`Status → ${cap(newStatus)}`, 'success');
    } else toast(r.error || 'Failed to update', 'error');
  } catch { toast('Error updating status', 'error'); }
}

function inlineEditName(id, cell, currentName) {
  const input = document.createElement('input');
  input.className = 'inline-edit-input';
  input.value = currentName;
  const original = cell.innerHTML;
  cell.innerHTML = '';
  cell.appendChild(input);
  input.focus();
  input.select();

  const save = async () => {
    const newName = input.value.trim();
    if (!newName || newName === currentName) { cell.innerHTML = original; return; }
    try {
      const r = await api(`/api/leads/${id}`, { method: 'PUT', body: JSON.stringify({ name: newName }) });
      if (r.success) {
        const lead = S.leads.find(l => l._id === id);
        if (lead) lead.name = newName;
        cell.innerHTML = `<div class="cell-primary">${newName}</div><div class="cell-muted">${r.data?.email || ''}</div>`;
        toast('Name updated', 'success');
      } else { cell.innerHTML = original; toast('Failed', 'error'); }
    } catch { cell.innerHTML = original; }
  };

  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } if (e.key === 'Escape') { cell.innerHTML = original; } });
}

// ── 3. COUNT-UP ANIMATION ──────────────────
function animateCountUp(el, target) {
  if (!el || isNaN(target)) return;
  const start = 0;
  const duration = 700;
  const startTime = performance.now();
  el.classList.add('counting');
  const step = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(step);
    else { el.textContent = target; el.classList.remove('counting'); }
  };
  requestAnimationFrame(step);
}

function badgeBounce(el) {
  if (!el) return;
  el.classList.remove('bounce');
  void el.offsetWidth;
  el.classList.add('bounce');
  setTimeout(() => el.classList.remove('bounce'), 500);
}

function animateDashboardStats() {
  document.querySelectorAll('.stat-value').forEach(el => {
    const num = parseInt(el.textContent);
    if (!isNaN(num) && num > 0) animateCountUp(el, num);
  });
}

// ── 4. SMART NOTIFICATIONS ─────────────────
let _smartNotifShown = new Set();

function showSmartNotif(msg, type = 'info-notif', icon = 'fa-bell', onClick = null) {
  const container = document.getElementById('smartNotifContainer');
  if (!container) return;
  const key = msg.substring(0, 40);
  if (_smartNotifShown.has(key)) return;
  _smartNotifShown.add(key);
  setTimeout(() => _smartNotifShown.delete(key), 60000);

  const el = document.createElement('div');
  el.className = `smart-notif-item ${type}`;
  el.innerHTML = `<i class="fas ${icon}"></i><span>${msg}</span><i class="fas fa-times" style="margin-left:auto;opacity:0.5;font-size:0.75rem;" onclick="this.parentElement.remove()"></i>`;
  if (onClick) el.addEventListener('click', (e) => { if (!e.target.classList.contains('fa-times')) { onClick(); el.remove(); } });
  container.appendChild(el);
  setTimeout(() => { if (el.parentElement) el.remove(); }, 8000);
}

async function initSmartNotifPoller() {
  await runSmartNotifCheck();
  setInterval(runSmartNotifCheck, 120000);
}

async function runSmartNotifCheck() {
  if (!S.token) return;
  try {
    // Check leads for hot leads
    const leadsData = await api('/api/leads?limit=20');
    const leads = leadsData.data || [];
    leads.forEach(l => {
      if (l.status === 'new' && l.budget && l.preferredMoveIn && l.location?.area) {
        showSmartNotif(`New lead from ${l.location.area} — Hot 🔥 (budget + date + area)`, 'hot', 'fa-fire', () => { showSection('leads'); setTimeout(() => viewLead(l._id), 400); });
      }
    });

    // Check chat sessions for high unread count
    const chatData = await api('/api/chat/admin/sessions');
    const sessions = chatData.data || [];
    sessions.forEach(s => {
      if ((s.unreadCount || 0) >= 3) {
        showSmartNotif(`${s.visitorName || 'Visitor'} sent ${s.unreadCount} messages — respond now`, 'warm', 'fa-comment-dots', () => showSection('chat'));
      }
    });

    // Check pending bookings
    const bookData = await api('/api/bookings?status=pending&limit=10');
    const bookings = bookData.data || [];
    bookings.forEach(b => {
      const age = (Date.now() - new Date(b.createdAt).getTime()) / 3600000;
      if (age >= 24) {
        showSmartNotif(`Booking pending 24h — follow up with ${b.name || 'client'}`, 'cold', 'fa-clock', () => showSection('bookings'));
      }
    });
  } catch {}
}

// ── 5. MOBILE FEATURES ─────────────────────

function updateMobNav(sec) {
  const keys = ['dashboard', 'leads', 'chat', 'bookings', 'teamchat'];
  keys.forEach(k => {
    const btn = document.getElementById(`mobnav-${k}`);
    if (btn) btn.classList.toggle('active', k === sec);
  });
  // Sync chat badge
  const mobBadge = document.getElementById('mobChatBadge');
  const desktopBadge = document.getElementById('chatBadge');
  if (mobBadge && desktopBadge) {
    const count = desktopBadge.textContent;
    mobBadge.textContent = count;
    mobBadge.style.display = parseInt(count) > 0 ? '' : 'none';
  }
}

function attachSwipe(row) {
  let startX = 0;
  row.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  row.addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (diff > 60) row.classList.add('swiped');
    else if (diff < -30) row.classList.remove('swiped');
  }, { passive: true });
}

function initPullToRefresh() {
  let startY = 0;
  let pulling = false;
  const indicator = document.getElementById('ptrIndicator');

  document.addEventListener('touchstart', e => {
    if (window.scrollY === 0) startY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!startY) return;
    const diff = e.touches[0].clientY - startY;
    if (diff > 60 && !pulling) {
      pulling = true;
      indicator.classList.add('visible');
    }
  }, { passive: true });

  document.addEventListener('touchend', () => {
    if (pulling) {
      pulling = false;
      const loaders = { dashboard: loadDashboard, leads: loadLeads, bookings: loadBookings, chat: loadChatSessions, analytics: loadAnalytics };
      loaders[S.section]?.();
      setTimeout(() => indicator.classList.remove('visible'), 1200);
    }
    startY = 0;
  }, { passive: true });
}

// ── VAULT GRAPH ──
let vaultGraphSim = null;

async function loadVaultGraph() {
  const sec = document.getElementById('sec-vaultgraph');
  if (typeof d3 === 'undefined') {
    sec.innerHTML = '<div class="empty-state">D3.js failed to load. Check your network connection.</div>';
    return;
  }
  sec.innerHTML = `
    <div class="vault-graph-wrap" id="vaultGraphWrap">
      <div class="vault-graph-controls">
        <div class="vg-filters">
          <label class="vg-label">Sections</label>
          <div class="vg-sections" id="vgSections"></div>
        </div>
        <div class="vg-filters">
          <label class="vg-label">Radius</label>
          <div class="vg-radii" id="vgRadii"></div>
        </div>
        <div class="vg-search">
          <input type="text" id="vgSearch" placeholder="Search nodes..." oninput="vgFilterSearch(this.value)">
        </div>
      </div>
      <div class="vault-graph-canvas" id="vgCanvas"></div>
      <div class="vault-graph-tooltip" id="vgTooltip"></div>
      <div class="vault-graph-sidebar" id="vgSidebar">
        <button class="vg-close" onclick="vgCloseSidebar()">&times;</button>
        <h3 id="vgSbTitle"></h3>
        <div class="vg-sb-meta" id="vgSbMeta"></div>
        <div class="vg-sb-tags" id="vgSbTags"></div>
        <div class="vg-sb-links">
          <h4>Connections</h4>
          <ul id="vgSbLinks"></ul>
        </div>
      </div>
    </div>
  `;

  try {
    const res = await api('/api/vault-graph');
    if (!res.success) { sec.innerHTML = '<div class="empty-state">Failed to load graph: ' + (res.error || 'Unknown error') + '</div>'; return; }
    const data = res.data;
    if (!data.nodes || !data.nodes.length) { sec.innerHTML = '<div class="empty-state">No vault nodes found</div>'; return; }
    vgRender(data.nodes, data.edges);
  } catch (e) {
    sec.innerHTML = '<div class="empty-state">Error loading vault graph: ' + e.message + '</div>';
    console.error('Vault graph error:', e);
  }
}

const VG_COLORS = {
  '01-company': '#7ee787',
  '02-product': '#a5d6ff',
  '03-operations': '#d2a8ff',
  '04-team': '#ffca5f',
  '05-roadmap': '#ffab70',
  '06-brand': '#ff7b72',
  '07-competitive': '#79c0ff',
  '08-sops': '#56d4dd',
  'daily': '#8b949e',
  '99-templates': '#6e7681',
  'root': '#58a6ff'
};
const VG_R_SIZES = { 0: 18, 1: 12, 2: 7, 3: 4 };

let vgNodes = [], vgEdges = [], vgActiveSections = new Set(), vgActiveRadii = new Set([0,1,2,3]);

function vgRender(nodes, edges) {
  vgNodes = nodes.map(n => ({...n}));
  // Build immutable edge index with string IDs only
  vgEdgeIndex = new Map();
  edges.forEach(e => {
    const src = e.source;
    const tgt = e.target;
    if (!vgEdgeIndex.has(src)) vgEdgeIndex.set(src, new Set());
    vgEdgeIndex.get(src).add(tgt);
  });
  vgNodes.forEach(n => vgActiveSections.add(n.section));
  vgBuildFilters();
  vgDraw();
}

function vgBuildFilters() {
  const sections = [...new Set(vgNodes.map(n => n.section))].sort();
  const sf = document.getElementById('vgSections');
  sf.innerHTML = '';
  sections.forEach(s => {
    const el = document.createElement('button');
    el.className = 'vg-chip active';
    el.style.setProperty('--c', VG_COLORS[s] || '#58a6ff');
    el.innerHTML = `<span class="vg-dot" style="background:${VG_COLORS[s]||'#58a6ff'}"></span>${vgFmtSec(s)}`;
    el.onclick = () => {
      el.classList.toggle('active');
      if (el.classList.contains('active')) vgActiveSections.add(s); else vgActiveSections.delete(s);
      vgDraw();
    };
    sf.appendChild(el);
  });

  const rf = document.getElementById('vgRadii');
  rf.innerHTML = '';
  [0,1,2,3].forEach(r => {
    const el = document.createElement('button');
    el.className = 'vg-chip active';
    const labels = {0:'Center',1:'Hub',2:'Topic',3:'Detail'};
    el.textContent = labels[r];
    el.onclick = () => {
      el.classList.toggle('active');
      if (el.classList.contains('active')) vgActiveRadii.add(r); else vgActiveRadii.delete(r);
      vgDraw();
    };
    rf.appendChild(el);
  });
}

function vgFmtSec(s) {
  return s.replace(/^\d{2}-/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

let vgSvg, vgSim, vgG, vgZoom;
let vgEdgeIndex = new Map(); // sourceId -> Set(targetIds)

function vgDraw() {
  const container = document.getElementById('vgCanvas');
  const w = container.clientWidth || 800;
  const h = container.clientHeight || 600;
  container.innerHTML = '';

  const fNodes = vgNodes.filter(n => vgActiveSections.has(n.section) && vgActiveRadii.has(n.radius));
  const fIds = new Set(fNodes.map(n => n.id));

  // Build fresh edge array with string IDs (D3 will resolve to objects internally)
  const rawEdges = [];
  vgEdgeIndex.forEach((targets, src) => {
    if (!fIds.has(src)) return;
    targets.forEach(tgt => {
      if (fIds.has(tgt)) rawEdges.push({ source: src, target: tgt });
    });
  });

  vgSvg = d3.select('#vgCanvas').append('svg').attr('width', w).attr('height', h).attr('viewBox', [0,0,w,h]);
  vgG = vgSvg.append('g');
  vgZoom = d3.zoom().scaleExtent([0.1,4]).on('zoom', e => vgG.attr('transform', e.transform));
  vgSvg.call(vgZoom);

  // Stop any previous simulation
  if (vgSim) vgSim.stop();

  vgSim = d3.forceSimulation()
    .force('link', d3.forceLink().id(d => d.id).distance(d =>
      d.source.radius === 0 || d.target.radius === 0 ? 180 :
      d.source.radius === 1 && d.target.radius === 1 ? 260 : 130
    ))
    .force('charge', d3.forceManyBody().strength(d =>
      d.radius === 0 ? -600 : d.radius === 1 ? -400 : -150
    ))
    .force('center', d3.forceCenter(w/2, h/2))
    .force('collide', d3.forceCollide().radius(d => VG_R_SIZES[d.radius] + 8));

  let link = vgG.selectAll('.vgl').data(rawEdges, d => d.source + '-' + d.target);
  link.exit().remove();
  const linkEnter = link.enter().append('line').attr('class','vgl')
    .attr('stroke', 'var(--border)').attr('stroke-width', 1).attr('stroke-opacity', 0.5);
  link = linkEnter.merge(link);

  let node = vgG.selectAll('.vgn').data(fNodes, d => d.id);
  node.exit().transition().duration(150).attr('r',0).remove();

  const nodeEnter = node.enter().append('g').attr('class','vgn')
    .call(d3.drag().on('start', vgDragStart).on('drag', vgDrag).on('end', vgDragEnd));

  nodeEnter.append('circle').attr('r',0)
    .attr('fill', d => VG_COLORS[d.section] || '#58a6ff')
    .attr('stroke', 'var(--bg)').attr('stroke-width', 2)
    .transition().duration(250).attr('r', d => VG_R_SIZES[d.radius] || 6);

  nodeEnter.append('text').attr('class','vgn-label')
    .attr('dy', d => VG_R_SIZES[d.radius] + 11)
    .attr('text-anchor','middle').text(d => d.title)
    .style('opacity', d => d.radius <= 1 ? 1 : 0)
    .transition().duration(250).style('opacity', d => d.radius <= 2 ? 0.85 : 0);

  node = nodeEnter.merge(node);

  node.select('circle')
    .on('mouseover', function(e,d) {
      d3.select(this).transition().duration(120).attr('r', VG_R_SIZES[d.radius]*1.4);
      vgTooltip(e, d);
    })
    .on('mouseout', function(e,d) {
      d3.select(this).transition().duration(120).attr('r', VG_R_SIZES[d.radius]);
      vgHideTooltip();
    })
    .on('click', (e,d) => { e.stopPropagation(); vgSidebar(d); });

  vgSvg.on('click', () => vgCloseSidebar());

  vgSim.nodes(fNodes);
  vgSim.force('link').links(rawEdges);
  vgSim.alpha(1).restart();

  vgSim.on('tick', () => {
    link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    node.attr('transform', d => `translate(${d.x},${d.y})`);
  });
}

function vgDragStart(e,d) { if (!e.active) vgSim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; }
function vgDrag(e,d) { d.fx=e.x; d.fy=e.y; }
function vgDragEnd(e,d) { if (!e.active) vgSim.alphaTarget(0); d.fx=null; d.fy=null; }

function vgTooltip(e,d) {
  const t = document.getElementById('vgTooltip');
  t.innerHTML = `<strong>${d.title}</strong><br><small>${vgFmtSec(d.section)} &middot; ${d.type}</small>`;
  t.classList.add('visible');
  t.style.left = (e.pageX + 10) + 'px';
  t.style.top = (e.pageY + 10) + 'px';
}
function vgHideTooltip() { document.getElementById('vgTooltip').classList.remove('visible'); }

function vgSidebar(d) {
  const sb = document.getElementById('vgSidebar');
  document.getElementById('vgSbTitle').textContent = d.title;
  const meta = document.getElementById('vgSbMeta');
  meta.innerHTML = `<span>Type: ${d.type}</span><span>Radius: ${d.radius}</span><span>Section: ${vgFmtSec(d.section)}</span>`;
  const tags = document.getElementById('vgSbTags');
  tags.innerHTML = (d.tags || []).map(t => `<span class="vg-tag">${t}</span>`).join('');
  const links = document.getElementById('vgSbLinks');
  // Use immutable edge index (string IDs)
  const connected = [];
  vgEdgeIndex.forEach((targets, src) => {
    targets.forEach(tgt => {
      if (src === d.id || tgt === d.id) {
        const otherId = src === d.id ? tgt : src;
        const other = vgNodes.find(n => n.id === otherId);
        if (other) connected.push(other);
      }
    });
  });
  links.innerHTML = connected.length ? connected.map(o =>
    `<li onclick="vgShowNode('${o.id}')">${o.title}</li>`
  ).join('') : '<li style="color:var(--text-muted)">No connections</li>';
  sb.classList.add('open');
}
function vgCloseSidebar() { document.getElementById('vgSidebar').classList.remove('open'); }
function vgShowNode(id) {
  const n = vgNodes.find(x => x.id === id);
  if (n) vgSidebar(n);
}

function vgFilterSearch(q) {
  const val = q.toLowerCase();
  vgG.selectAll('.vgn').each(function(d) {
    const match = !val || d.title.toLowerCase().includes(val) || d.id.toLowerCase().includes(val);
    d3.select(this).style('opacity', match ? 1 : 0.08);
  });
  vgG.selectAll('.vgl').style('opacity', val ? 0.05 : 0.5);
}

// ── INIT ──
// Auto-render app or login on page load
if (S.token) {
  renderApp();
} else {
  renderLogin();
}
