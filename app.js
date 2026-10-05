// Shared UI helpers, session and layout used across all pages.

const SESSION_KEY = 'claims_portal_session';

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------
// This is a static prototype with no backend, so "signing in" writes the chosen
// user to localStorage and every page reads it. There is no real credential
// check here: the login page matches the email to a known user and nothing more.
// Replace setSession/getSession with a real token call before this goes live.

function setSession(user) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, name: user.name, role: user.role, email: user.email }));
  } catch (e) {
    /* storage blocked (private mode) - the page still works for this session */
  }
  return user;
}

function getSession() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY));
    // Re-resolve against OWNERS so a stale or hand-edited session can't invent a role.
    if (s && typeof OWNERS !== 'undefined') {
      const real = OWNERS.find((o) => o.id === s.id);
      if (real) return { id: real.id, name: real.name, role: real.role, email: real.email };
    }
  } catch (e) {
    /* corrupt value - treat as signed out */
  }
  return null;
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {}
}

function signOut() {
  clearSession();
  location.href = 'login.html';
}

function isAdmin() {
  const s = getSession();
  return !!s && s.role === 'Admin';
}

// Page guards. Both return null after redirecting, so call them as:
//   if (!requireAuth()) return;
function requireAuth() {
  const s = getSession();
  if (!s) {
    location.replace('login.html');
    return null;
  }
  return s;
}

function requireAdmin() {
  const s = requireAuth();
  if (s && s.role !== 'Admin') {
    location.replace('dashboard.html');
    return null;
  }
  return s;
}

// ---------------------------------------------------------------------------
// Row-level scoping
// ---------------------------------------------------------------------------
// Admin sees every claim. A manager sees only what is routed to them.
function canSee(ownId) {
  const s = getSession();
  if (!s || s.role === 'Admin') return true;
  return ownId === s.id;
}

// The claim rows in scope, from the live export queue.
function scopedQueue() {
  const q = typeof OWNER_QUEUE !== 'undefined' ? OWNER_QUEUE : [];
  const s = getSession();
  return !s || s.role === 'Admin' ? q : q.filter((r) => r.own === s.id);
}

// The six worked examples, filtered to the signed-in manager.
function scopedClaims() {
  return CLAIMS.filter((c) => canSee(c.own));
}

const initials = (n) => String(n || '?').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

// ---------------------------------------------------------------------------
// Collapsible row groups
// ---------------------------------------------------------------------------
// The open-case queues are long (10,015 claims still need work across the
// full export, admin-wide), which makes the page enormous if every row is
// rendered flat. Rows are grouped instead, each group is collapsed by default,
// and a group's rows are only built into the DOM the first time it is opened.

const openGroups = new Set();
let groupKeys = [];
let groupSource = null;

function groupSummary(key, rows, label, note) {
  const open = openGroups.has(key);
  return (
    `<tr class="gh" data-k="${esc(key)}" onclick="toggleGroup(this)" tabindex="0" role="button" aria-expanded="${open}"` +
    ` onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleGroup(this)}">` +
    `<td colspan="${GROUP_COLS}">` +
    `<span class="caret${open ? ' open' : ''}" aria-hidden="true"></span>` +
    `<b>${esc(label)}</b>` +
    `<span class="b">${num(rows.length)} case${rows.length === 1 ? '' : 's'}</span>` +
    `${note ? `<span class="mu">${esc(note)}</span>` : ''}` +
    `</td></tr>`
  );
}

// Column count for the shared table. Every group row spans it, so a group with
// a different idea of how many columns there are cannot desync the grid.
let GROUP_COLS = 9;

// Build the group list from the current rows. sort: 'count' | 'label' | fn.
// Returns rows for a SINGLE table: the caller supplies the <thead>, and each
// group becomes a <tbody>. One table means one column-width calculation, so a
// header label can never end up sitting above a different group's column.
function groupedTable(rows, opts) {
  const buckets = new Map();
  for (const r of rows) {
    for (const k of opts.key(r)) {
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(r);
    }
  }

  GROUP_COLS = opts.cols;
  let entries = [...buckets.entries()];
  if (!entries.length) {
    return `<tr class="gempty"><td colspan="${opts.cols}" class="mu">${esc(opts.empty || 'Nothing to show.')}</td></tr>`;
  }

  const cmp = typeof opts.sort === 'function'
    ? opts.sort
    : opts.sort === 'label'
      ? (a, b) => String(a[0]).localeCompare(String(b[0]))
      : (a, b) => b[1].length - a[1].length || String(a[0]).localeCompare(String(b[0]));
  entries = entries.sort(cmp);

  // Long tails (26 claim types, say) collapse into a single "Other" group.
  const cap = opts.maxGroups || 0;
  let other = null;
  if (cap && entries.length > cap) {
    const head = entries.slice(0, cap - 1);
    const tail = entries.slice(cap - 1);
    other = ['Other (' + tail.length + ' groups)', tail.flatMap((e) => e[1])];
    entries = head.concat([other]);
  }

  groupSource = { rows, opts };
  groupKeys = entries.map((e) => e[0]);

  // With a filter active there is often one group worth showing; open it so
  // the page does not look empty after a jump.
  if (opts.autoOpen && entries.length <= 4) entries.forEach((e) => openGroups.add(e[0]));
  if (opts.onlyKey) {
    openGroups.clear();
    if (buckets.has(opts.onlyKey)) openGroups.add(opts.onlyKey);
  }

  return entries
    .map(([k, rs]) => {
      const open = openGroups.has(k);
      // Rows are plain siblings of the header row inside one <tbody>; a closed
      // group is hidden with a class, not by nesting <tr>s inside a <tr> (which
      // the browser would hoist back out, breaking the grid).
      // A collapsed group ships no data rows at all; the first open builds them.
      const rows = open ? groupRowsHtml(groupList(k), opts) : '';
      return '<tbody data-k="' + esc(k) + '"' + (open ? '' : ' class="closed"') + ' data-filled="' + (open ? '1' : '0') + '">' +
        groupSummary(k, rs, opts.label ? opts.label(k) : k, opts.note ? opts.note(k, rs) : '') +
        rows + '</tbody>';
    })
    .join('');
}

// Rows are built on first open, so the initial DOM stays small. A single group
// can still be very large (the admin pool holds 5,720 open cases), so each open
// renders the first GROUP_PAGE rows plus a "show more" control that appends the
// rest in place. Nothing is dropped - the remaining rows are one click away.
const GROUP_PAGE = 200;

// The rows of one group, in display order. Both the first paint and the
// click-to-open path go through here so the two can never disagree.
function groupList(k) {
  const { rows, opts } = groupSource;
  return rows
    .filter((r) => opts.key(r).includes(k))
    .sort(opts.rowSort || ((a, b) => String(b.date).localeCompare(String(a.date))));
}

function groupRowsHtml(list, opts) {
  if (!list.length) return `<tr class="gempty"><td colspan="${opts.cols}" class="mu">No rows in this group.</td></tr>`;
  const first = list.slice(0, GROUP_PAGE).map(opts.rowHtml).join('');
  if (list.length <= GROUP_PAGE) return first;
  const rest = list.length - GROUP_PAGE;
  return first +
    `<tr class="more"><td colspan="${opts.cols}">` +
    `<button class="btn s" onclick="showMoreGroupRows(this, ${rest})">Show all ${num(list.length)} rows (${num(rest)} more)</button>` +
    `</td></tr>`;
}


function toggleGroup(tr) {
  const k = tr.dataset.k;
  const body = tr.parentNode;
  if (!body || body.tagName !== 'TBODY') return;
  const nowOpen = body.classList.contains('closed');
  body.classList.toggle('closed', !nowOpen);
  tr.querySelector('.caret')?.classList.toggle('open', nowOpen);
  tr.setAttribute('aria-expanded', String(nowOpen));
  if (nowOpen) openGroups.add(k); else openGroups.delete(k);
  if (!nowOpen || body.dataset.filled === '1') return;

  const list = groupList(k);
  tr.insertAdjacentHTML('afterend', groupRowsHtml(list, groupSource.opts));
  body.dataset.filled = '1';
  body.dataset.total = String(list.length);
}

// Appends the hidden remainder of an already-open group.
function showMoreGroupRows(btn, rest) {
  const body = btn.closest('tbody');
  if (!body) return;
  const k = body.dataset.k;
  const { opts } = groupSource;
  const list = groupList(k);
  const shown = body.querySelectorAll('tr:not(.more):not(.gh)').length;
  body.querySelector('.more')?.remove();
  body.insertAdjacentHTML('beforeend', list.slice(shown).map(opts.rowHtml).join(''));
  toast(`Showing all ${num(body.dataset.total)} rows`);
}

function expandAllGroups() {
  groupKeys.forEach((k) => openGroups.add(k));
  render();
}

function collapseAllGroups() {
  openGroups.clear();
  render();
}

function groupSummaryLine(rows, opts) {
  const keys = new Set();
  for (const r of rows) opts.key(r).forEach((k) => keys.add(k));
  return `${keys.size} group${keys.size === 1 ? '' : 's'}`;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
// [key, label, href, requiredRole] - a blank requiredRole means everyone.
// The two dashboards are one tab, not two: Dashboard opens the claims view, and
// its caret picks the admin one. Both live in NAV_DASHBOARDS so the menu and
// the "you are here" highlight can never disagree about what is open.
const NAV_DASHBOARDS = [
  ['dashboard', 'Claims Dashboard', 'dashboard.html', ''],
  ['admin-dash', 'Admin Dashboard', 'admin-dashboard.html', 'Admin']
];

const NAV_ITEMS = [
  ['claims', 'Claims', 'claims.html', ''],
  ['orders', 'Orders', 'orders.html', ''],
  ['admin', 'Settings', 'admin.html', 'Admin']
];

function navFor(role) {
  return NAV_ITEMS.filter(([, , , need]) => !need || need === role);
}

// The Dashboard tab plus whatever the signed-in role may switch to.
function dashChoices(role) {
  return NAV_DASHBOARDS.filter(([, , , need]) => !need || need === role);
}

function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.className = 'on';
  setTimeout(() => (el.className = ''), 2200);
}

const money = (n) => '$' + n.toLocaleString();

const num = (n) => Number(n).toLocaleString();

const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) : '0.0') + '%';

// Compact money for chart axes and stat tiles: $1.2M / $412K / $1.4K / $816
function usd(n) {
  const a = Math.abs(n);
  const t = (v, dp) => '$' + v.toFixed(dp).replace(/\.0$/, '');
  if (a >= 1e6) return t(n / 1e6, 1) + 'M';
  if (a >= 1e5) return '$' + Math.round(n / 1e3) + 'K';
  if (a >= 1e3) return t(n / 1e3, 1) + 'K';
  return '$' + Math.round(n).toLocaleString();
}

const badge = (s) => `<span class="b ${s.split(' ')[0]}">${s}</span>`;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Dates read MM-DD-YYYY. The export stores them as ISO strings, so one prefix
// parser covers every shape in the data: '2014-08-22 00:00:00.000' (claim and
// resolved dates, which carry a time part the pages never show), '2013-12-03'
// (credit memo dates) and '' (claims with no date at all).
//
// Deliberately not toLocaleDateString: that follows the reader's locale, so the
// same claim would print 08-22-2014 for one office and 22-08-2014 for the next.
// The format is fixed here so every page prints a date the same way.
//
// Returns '' for a missing date, which is what the tables want. Pages that show
// an em dash instead add it at the call site.
function fmtDate(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d == null ? '' : d));
  return m ? `${m[2]}-${m[3]}-${m[1]}` : '';
}

function ownerName(id) {
  const o = (typeof OWNERS !== 'undefined' && OWNERS.find((x) => x.id === id)) || null;
  return o ? o.name : 'Unassigned';
}

function header(active, user) {
  const nav = navFor(user.role)
    .map(([key, label, href]) => `<a href="${href}"${key === active ? ' class="on"' : ''}>${label}</a>`)
    .join('');

  // Dashboard is a single tab with a dropdown. Landing on dashboard.html with
  // no hash always shows the claims view, so the tab doubles as a reset.
  const choices = dashChoices(user.role);
  const onDash = choices.some(([key]) => key === active);
  const current = choices.find(([key]) => key === active) || choices[0];
  const only = choices.length < 2;
  const dashTab = only
    ? `<a href="${current[2]}"${onDash ? ' class="on"' : ''}>Dashboard</a>`
    : `<div class="nav-dd${onDash ? ' on' : ''}">
        <a class="dd-label${active === 'dashboard' ? ' on' : ''}" href="dashboard.html">Dashboard</a>
        <button class="dd-caret" type="button" aria-haspopup="true" aria-expanded="false"
          aria-label="Choose a dashboard" onclick="return dashMenu(this)">▾</button>
        <div class="dd-menu" role="menu">
          ${choices.map(([key, label, href]) =>
            `<a role="menuitem" class="${key === active ? 'on' : ''}" href="${href}">${label}</a>`
          ).join('')}
        </div>
      </div>`;

  return (
    `<header><a class="logo" href="dashboard.html"><i></i>Claims Portal</a><nav>${dashTab}${nav}</nav>` +
    `<div class="hright"><span class="role-chip ${user.role === 'Admin' ? 'adm' : 'mgr'}"><i></i>${user.role} · ${esc(user.name)}</span>` +
    `<button class="icon-btn" onclick="toast('No notifications')" title="Notifications">🔔</button>` +
    `<div class="avatar">${initials(user.name)}</div>` +
    `<button class="btn ghost s" onclick="signOut()">Sign out</button></div></header>`
  );
}

// One dropdown open at a time, and a click anywhere else closes it.
function dashMenu(btn) {
  const dd = btn.closest('.nav-dd');
  const open = !dd.classList.contains('open');
  document.querySelectorAll('.nav-dd.open').forEach((o) => {
    o.classList.remove('open');
    o.querySelector('.dd-caret')?.setAttribute('aria-expanded', 'false');
  });
  dd.classList.toggle('open', open);
  btn.setAttribute('aria-expanded', String(open));
  return false;
}

function layout(active) {
  const user = getSession() || { role: 'Guest', name: '', id: null };
  return header(active, user) +
    '<main id="app"></main><div id="toast"></div>' +
    '<script>(function(){var s=".open";function c(){document.querySelectorAll(".nav-dd"+s+",.dropdown"+s)' +
    '.forEach(function(o){o.classList.remove("open")})}' +
    'document.addEventListener("click",function(e){if(!e.target.closest(".nav-dd")&&!e.target.closest(".dropdown"))c()});' +
    'document.addEventListener("keydown",function(e){if(e.key==="Escape")c()});})();<\/script>';
}
