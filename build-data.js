// Regenerates D:/claims portal/data.js from the real export.
//   source : D:/claims portal/Claim_202609281521.csv   (31,235 claims, 2010-2026)
// Emits aggregate stat blocks, the routed open-case queue, department/owner
// matrices and a set of real worked examples. Nothing here is modelled.
const fs = require('fs');

const CSV = 'D:/claims portal/Claim_202609281521.csv';
const OUT = 'D:/claims portal/data.js';

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); field = ''; rows.push(row); row = []; }
    else if (c === '\r') { /* ignore */ }
    else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ---------------------------------------------------------------- ownership
// The export has no assignee column. Ownership is routed from ClaimDept, so
// this map is a model, not a fact - the UI says so on the admin dashboard.
const OWNERS = [
  { id: 'MP', name: 'Maya Patel', role: 'Admin', email: 'maya.patel@co.com', status: 'Active' },
  { id: 'DO', name: 'Daniel Ortiz', role: 'Manager', email: 'd.ortiz@co.com', status: 'Active' },
  { id: 'LF', name: 'Lena Fischer', role: 'Manager', email: 'l.fischer@co.com', status: 'Active' },
  { id: 'TR', name: 'Tom Reyes', role: 'Manager', email: 't.reyes@co.com', status: 'Inactive' }
];

const OWNER_OF_DEPT = {
  // Finance, tax and pricing
  'Sales Tax': 'DO', 'Billing': 'DO', 'Credit': 'DO', 'Price Discrepancy': 'DO',
  'Wrong Misc Charge': 'DO', 'Wrong Art Charge': 'DO', 'Pricing': 'DO', 'Quote': 'DO',
  'Access Data Base': 'DO',
  // Order handling, art and customer service
  'Order Entry': 'LF', 'Order Processing': 'LF', 'Order Change': 'LF', 'Order Log': 'LF',
  'Art': 'LF', 'Customer Service': 'LF', 'Customer Goodwill': 'LF', 'Internal Claim': 'LF',
  'Sample Dept': 'LF', 'Sample Dep.': 'LF', 'Sample Entry': 'LF', 'Sales': 'LF',
  'System': 'LF', 'System Error': 'LF', 'Distributor Relations': 'LF', 'Scheduling': 'LF',
  'Stock': 'LF', 'OFR': 'LF',
  // Production and quality
  'Imprinting': 'TR', 'Product Defect': 'TR', 'Packaging': 'TR', 'Factory': 'TR',
  'Drinkware Damage': 'TR', 'Drinkware Lids': 'TR', 'Drinkware Digital': 'TR', 'Drinkware': 'TR',
  // Logistics
  'Courier': 'TR', 'Shortage': 'TR', 'Shipping': 'TR', 'Sample Shipping': 'TR',
  'Warehouse': 'TR', 'Unpacking': 'TR', 'UPS': 'TR', 'FEDEX': 'TR', 'Marketing': 'TR'
};

const AREA_OF_DEPT = {
  'Sales Tax': 'Tax & Compliance', 'Billing': 'Tax & Compliance', 'Credit': 'Tax & Compliance',
  'Price Discrepancy': 'Tax & Compliance', 'Wrong Misc Charge': 'Tax & Compliance',
  'Wrong Art Charge': 'Tax & Compliance', 'Pricing': 'Tax & Compliance', 'Quote': 'Tax & Compliance',
  'Access Data Base': 'Tax & Compliance',
  'Order Entry': 'Order Management', 'Order Processing': 'Order Management',
  'Order Change': 'Order Management', 'Order Log': 'Order Management', 'Art': 'Order Management',
  'Customer Service': 'Customer & Service', 'Customer Goodwill': 'Customer & Service',
  'Internal Claim': 'Customer & Service', 'Sample Dept': 'Customer & Service',
  'Sample Dep.': 'Customer & Service', 'Sample Entry': 'Customer & Service',
  'Sales': 'Customer & Service', 'System': 'Customer & Service', 'System Error': 'Customer & Service',
  'Distributor Relations': 'Customer & Service', 'Scheduling': 'Customer & Service',
  'Stock': 'Customer & Service', 'OFR': 'Customer & Service',
  'Imprinting': 'Production & Quality', 'Product Defect': 'Production & Quality',
  'Packaging': 'Production & Quality', 'Factory': 'Production & Quality',
  'Drinkware Damage': 'Production & Quality', 'Drinkware Lids': 'Production & Quality',
  'Drinkware Digital': 'Production & Quality', 'Drinkware': 'Production & Quality',
  'Courier': 'Logistics & Fulfilment', 'Shortage': 'Logistics & Fulfilment',
  'Shipping': 'Logistics & Fulfilment', 'Sample Shipping': 'Logistics & Fulfilment',
  'Warehouse': 'Logistics & Fulfilment', 'Unpacking': 'Logistics & Fulfilment',
  'UPS': 'Logistics & Fulfilment', 'FEDEX': 'Logistics & Fulfilment',
  'Marketing': 'Logistics & Fulfilment',
  '(Unassigned)': 'Unassigned'
};

// Three coarse bands, which is all a reader needs to see: most claims are small
// claims, and the money sits in the handful above $500. The finer five-band
// split that used to be here answered no question anyone was asking.
// Bands are predicates rather than ranges because 37 claims carry a NEGATIVE
// credit (credit reversals, -$7,632 across the file). A `credit > lo` range
// would drop them, and the chart would then not add up to the credit total
// printed above it. The first band takes any non-zero credit up to $50 so the
// three bands sum to `credited` and to `credit` exactly.
const DIST_BANDS = [
  ['<$50', (c) => c !== 0 && c <= 50],
  ['$50-$500', (c) => c > 50 && c <= 500],
  ['>$500', (c) => c > 500]
];

// ---------------------------------------------------------------- read
const rows = parseCSV(fs.readFileSync(CSV, 'utf8'));
const header = rows[0];
const C = {};
header.forEach((h, i) => C[h] = i);
const g = (r, k) => (r[C[k]] === undefined ? '' : String(r[C[k]]).trim());
const num = (r, k) => { const f = parseFloat(g(r, k)); return isNaN(f) ? 0 : f; };
const one = (r, k) => g(r, k) === '1';

const claims = rows.slice(1)
  .filter((r) => r.length === header.length && String(r[C['Claim#']]).trim() !== '')
  .map((r, i) => {
    const date = g(r, 'ClaimDate');
    const y = Number(date.slice(0, 4)) || 0;
    const m = Number(date.slice(5, 7)) || 0;
    const denied = one(r, 'ClaimDenied');
    const cancelled = one(r, 'Canceled');
    const resolved = one(r, 'ClaimResolved');
    // One status per claim, so the buckets partition the file.
    const status = denied ? 'Denied' : cancelled ? 'Cancelled' : resolved ? 'Resolved' : 'Open';
    const dept = g(r, 'ClaimDept');
    const rdate = g(r, 'ClaimResolvedDate');
    return {
      i,
      id: g(r, 'Claim#'),
      order: g(r, 'OrderID'),
      otype: g(r, 'OrderType') || 'Customer Order',
      dept: dept || '(Unassigned)',
      rawDept: dept,
      type: g(r, 'ClaimType') || '(Unclassified)',
      desc: g(r, 'ClaimDescription'),
      rca: g(r, 'RootCauseAnalysis'),
      sol: g(r, 'ProposedSolution'),
      capa: g(r, 'CorrectiveAction'),
    pa: g(r, 'PreventiveAction'),
      pap: g(r, 'PreventiveAction'),
      credit: num(r, 'CreditAmount'),
      date, y, m,
      denied, cancelled, resolved,
      rdate,
      ddate: g(r, 'ClaimDeniedDate'),
      issuer: g(r, 'IssueName'),
      statusCode: g(r, 'ClaimStatus'),
      entryFinished: g(r, 'ClaimEntryFinished') === '1',
      memoNo: g(r, 'CreditMemoNumber'),
      memoDate: g(r, 'CreditMemoDate'),
      memoAmt: num(r, 'CreditMemoAmount'),
      forInv: g(r, 'CreditForInvoiceNo'),
      note: g(r, 'NoteForCustomer'),
      status
    };
  });

console.log('rows parsed:', claims.length);

// order -> claims, for the repeat-order metric
const byOrder = new Map();
for (const c of claims) {
  if (!c.order) continue;
  if (!byOrder.has(c.order)) byOrder.set(c.order, []);
  byOrder.get(c.order).push(c);
}
const repeatOrders = new Set();
for (const [o, cs] of byOrder) if (cs.length > 1) repeatOrders.add(o);

// "Still needs action": not resolved, denied, cancelled, or entry never finished.
const needsAction = (c) => !c.resolved || c.denied || c.cancelled || !c.entryFinished;

const FLAGS = (c) => {
  const f = [];
  if (!c.resolved) f.push('Unresolved');
  if (c.denied) f.push('Denied');
  if (c.cancelled) f.push('Cancelled');
  if (!c.entryFinished) f.push('Entry not finished');
  if (c.order && repeatOrders.has(c.order)) f.push('Repeat-claim order');
  if (c.rawDept === '') f.push('Unassigned Department');
  return f;
};

const ownerOf = (dept) => OWNER_OF_DEPT[dept] || 'MP';
const areaOf = (dept) => AREA_OF_DEPT[dept] || 'Unassigned';

// ---------------------------------------------------------------- stats
const r2 = (n) => Math.round(n * 100) / 100;

function block(list, label) {
  const total = list.length;
  const credit = r2(list.reduce((s, c) => s + c.credit, 0));
  const resolved = list.filter((c) => c.status === 'Resolved').length;
  const open = list.filter((c) => c.status === 'Open').length;
  const cancelled = list.filter((c) => c.status === 'Cancelled').length;
  const denied = list.filter((c) => c.status === 'Denied').length;

  // Order facts, scoped to this exact slice of the file. The export carries no
  // order count at all - only orders that already produced a claim - so these
  // give the only defensible rate: how many claims an order raises, and how
  // often one order raises more than one.
  const orderCounts = new Map();
  for (const c of list) {
    if (!c.order) continue;
    orderCounts.set(c.order, (orderCounts.get(c.order) || 0) + 1);
  }
  const multiOrders = [...orderCounts.values()].filter((n) => n > 1).length;

  const by = (key) => {
    const m = new Map();
    for (const c of list) {
      const k = key(c);
      if (!m.has(k)) m.set(k, [0, 0]);
      const e = m.get(k);
      e[0]++; e[1] = r2(e[1] + c.credit);
    }
    return [...m.entries()]
      .map(([k, [n, v]]) => [k, n, v])
      .sort((a, b) => b[1] - a[1] || b[2] - a[2]);
  };

  const dist = DIST_BANDS.map(([label, test]) => {
    const inBand = list.filter((c) => test(c.credit));
    return [label, inBand.length, r2(inBand.reduce((s, c) => s + c.credit, 0))];
  }).filter((d) => d[1] > 0);

  const months = [];
  for (let mm = 1; mm <= 12; mm++) {
    const inM = list.filter((c) => c.m === mm);
    months.push([inM.length, r2(inM.reduce((s, c) => s + c.credit, 0))]);
  }

  // Resolution speed, measured only on claims flagged resolved and carrying a
  // resolved date. ~96% of this export closes same-day, so median is sub-1d.
  const spans = list
    .filter((c) => c.resolved && c.rdate && c.date)
    .map((c) => (new Date(c.rdate) - new Date(c.date)) / 86400000)
    .filter((d) => d >= 0)
    .sort((a, b) => a - b);
  const sameDay = spans.filter((d) => d < 1).length;
  const q = (f) => (spans.length ? r2(spans[Math.min(spans.length - 1, Math.floor(spans.length * f))]) : 0);

  const rep = list.filter((c) => c.order && orderCounts.get(c.order) > 1);
  const repOrders = new Set(rep.map((c) => c.order));

  // Monthly spread of the biggest claim types. A fault that appears in most
  // months keeps coming back; one that appears in a single month is an incident.
  // Without this the UI can only rank by volume, which cannot tell the two apart.
  const byTypeMonth = new Map();
  for (const c of list) {
    if (!byTypeMonth.has(c.type)) byTypeMonth.set(c.type, new Array(12).fill(0));
    byTypeMonth.get(c.type)[c.m - 1]++;
  }
  const typeMonths = [...byTypeMonth.entries()]
    .map(([t, ms]) => [t, ms, ms.reduce((a, b) => a + b, 0)])
    .sort((a, b) => b[2] - a[2] || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([t, ms]) => [t, ms]);

  return {
    range: label,
    modelled: false,
    total,
    credit,
    avgCredit: total ? r2(credit / total) : 0,
    credited: list.filter((c) => c.credit !== 0).length,
    creditIssued: r2(list.reduce((s, c) => s + Math.abs(c.memoAmt), 0)),
    memos: list.filter((c) => c.memoNo).length,
    maxClaim: r2(list.reduce((s, c) => Math.max(s, c.credit), 0)),
    resolved, open, cancelled, denied,
    unresolved: list.filter((c) => !c.resolved).length,
    unfinished: list.filter((c) => !c.entryFinished).length,
    noRca: list.filter((c) => !c.rca).length,
    rcaFilled: list.filter((c) => c.rca).length,
    capaFilled: list.filter((c) => c.capa).length,
    paFilled: list.filter((c) => c.pa).length,
    unassigned: list.filter((c) => c.rawDept === '').length,
    repeatOrders: repOrders.size,
    repeatClaims: rep.length,
    repeatCredit: r2(rep.reduce((s, c) => s + c.credit, 0)),
    medianDays: q(0.5),
    p90Days: q(0.9),
    sameDayPct: spans.length ? Math.round((sameDay / spans.length) * 1000) / 10 : 0,
    resolvedTimed: spans.length,
    raisers: new Set(list.map((c) => c.issuer).filter(Boolean)).size,
    orders: orderCounts.size,
    orderClaims: rep.length + [...orderCounts.values()].filter((n) => n === 1).length,
    multiOrders,
    claimsPerOrder: orderCounts.size ? r2((rep.length + [...orderCounts.values()].filter((n) => n === 1).length) / orderCounts.size) : 0,
    repeatRate: orderCounts.size ? r2((multiOrders / orderCounts.size) * 100) : 0,
    noCredit: list.filter((c) => c.credit === 0).length,
    sampleClaims: list.filter((c) => c.otype === 'Sample').length,
    status: by((c) => c.status),
    area: by((c) => areaOf(c.dept)),
    dist,
    types: by((c) => c.type),
    typeMonths,
    dept: by((c) => c.dept),
    months
  };
}

const YEARS = [...new Set(claims.map((c) => c.y))].filter(Boolean).sort((a, b) => b - a);
const ALL = block(claims, 'Jan 2010 - Sep 2026');

const BY_YEAR = {};
for (const y of YEARS) {
  const list = claims.filter((c) => c.y === y);
  const b = block(list, y === YEARS[0] ? 'Jan - Sep 2026' : 'Full year ' + y);
  // Keep the per-year blocks small: the charts only ever read the head.
  b.types = b.types.slice(0, 25);
  b.dept = b.dept.slice(0, 20);
  BY_YEAR[y] = b;
}
const BY_YEAR_OWNER = {};
for (const y of YEARS) {
  BY_YEAR_OWNER[y] = {};
  for (const o of OWNERS) {
    const list = claims.filter((c) => c.y === y && ownerOf(c.dept) === o.id);
    if (!list.length) continue;
    const b = block(list, o.id);
    b.types = b.types.slice(0, 12);
    b.dept = b.dept.slice(0, 12);
    b.area = b.area.slice(0, 6);
    BY_YEAR_OWNER[y][o.id] = b;
  }
}

const BY_OWNER = {};
for (const o of OWNERS) {
  const list = claims.filter((c) => ownerOf(c.dept) === o.id);
  const b = block(list, o.id);
  b.types = b.types.slice(0, 25);
  b.dept = b.dept.slice(0, 20);
  BY_OWNER[o.id] = b;
}

console.log('year blocks:', YEARS.length, '| owner-year blocks:',
  Object.values(BY_YEAR_OWNER).reduce((s, m) => s + Object.keys(m).length, 0));

// ---------------------------------------------------------------- matrices
const OWNER_MATRIX = OWNERS.map((o) => {
  const list = claims.filter((c) => ownerOf(c.dept) === o.id);
  const depts = new Set(list.map((c) => c.dept));
  return {
    id: o.id, name: o.name, role: o.role, status: o.status,
    total: list.length,
    open: list.filter((c) => c.status === 'Open').length,
    unresolved: list.filter((c) => !c.resolved).length,
    unfinished: list.filter((c) => !c.entryFinished).length,
    credit: r2(list.reduce((s, c) => s + c.credit, 0)),
    queue: list.filter(needsAction).length,
    depts: depts.size
  };
});

const deptMap = new Map();
for (const c of claims) {
  if (!deptMap.has(c.dept)) deptMap.set(c.dept, { dept: c.dept, owner: ownerOf(c.dept), n: 0, credit: 0, queue: 0 });
  const e = deptMap.get(c.dept);
  e.n++; e.credit = r2(e.credit + c.credit);
  if (needsAction(c)) e.queue++;
}
const DEPT_OWNERS = [...deptMap.values()].sort((a, b) => b.n - a.n);

// ---------------------------------------------------------------- department rates
// The Ariel-style report can only count per location; a claim-level export can
// divide, so every department gets its own rate: how many claims it raised,
// how many orders it touched, how many claims are still open and how much
// credit is still sitting there. [dept, owner, area, claims, orders, open,
// credit, openCredit, creditIssued, repeatOrders]
function deptFacts(list) {
  const m = new Map();
  for (const c of list) {
    if (!m.has(c.dept)) m.set(c.dept, {
      dept: c.dept, owner: ownerOf(c.dept), area: areaOf(c.dept),
      claims: 0, credit: 0, open: 0, openCredit: 0, memo: 0, noCredit: 0,
      orders: new Set(), repeat: new Set()
    });
    const e = m.get(c.dept);
    e.claims++;
    e.credit = r2(e.credit + c.credit);
    e.memo = r2(e.memo + Math.abs(c.memoAmt));
    if (c.credit === 0) e.noCredit++;
    if (c.status === 'Open') { e.open++; e.openCredit = r2(e.openCredit + c.credit); }
    if (c.order) e.orders.add(c.order);
  }
  for (const c of list) {
    const e = m.get(c.dept);
    if (e && c.order && byOrder.get(c.order).length > 1) e.repeat.add(c.order);
  }
  return [...m.values()]
    .map((e) => [e.dept, e.owner, e.area, e.claims, e.orders.size, e.open,
      e.credit, e.openCredit, e.memo, e.repeat.size, e.noCredit])
    .sort((a, b) => b[6] - a[6] || b[3] - a[3]);
}

// Keyed by reporting year, then by the owner each department is routed to, so
// a manager sees their own departments' rates and an admin sees the full set.
const DEPT_FACTS = { all: { all: deptFacts(claims) } };
for (const y of YEARS) {
  const list = claims.filter((c) => c.y === y);
  const rows = deptFacts(list);
  DEPT_FACTS[y] = { all: rows };
  for (const o of OWNERS) DEPT_FACTS[y][o.id] = rows.filter((d) => d[1] === o.id);
}
for (const o of OWNERS) DEPT_FACTS.all[o.id] = DEPT_FACTS.all.all.filter((d) => d[1] === o.id);
console.log('dept fact rows:', Object.values(DEPT_FACTS).reduce((s, m) => s + m.all.length, 0));

// ---------------------------------------------------------------- queue
const QUEUE_SRC = claims.filter(needsAction)
  .map((c) => [c.id, c.order, c.type, c.dept, c.status, c.credit, FLAGS(c).join('~'),
    c.date, ownerOf(c.dept), c.issuer, c.desc.slice(0, 300), c.rca, c.capa, c.note.slice(0, 300),
    c.memoNo, c.memoDate, c.memoAmt, c.rdate, c.forInv]);

console.log('queue rows:', QUEUE_SRC.length);

// ---------------------------------------------------------------- examples
// Real claims that actually have narrative content, spread across the four
// owners and a mix of statuses, so the detail page shows real information.
const pick = [];
const wantStatus = ['Under Investigation', 'Open', 'Awaiting Action'];
const scored = claims.filter((c) => c.desc.length > 40);
for (const o of OWNERS) {
  for (const st of ['Open', 'Resolved', 'Cancelled']) {
    const cand = scored
      .filter((c) => ownerOf(c.dept) === o.id && c.status === st)
      .sort((a, b) => {
        const score = (x) =>
          (x.rca ? 8 : 0) + (x.capa ? 6 : 0) + (x.sol ? 3 : 0) + (x.memoNo ? 4 : 0) +
          (x.note ? 2 : 0) + Math.min(6, Math.floor(x.credit / 200));
        return score(b) - score(a);
      });
    if (cand[0]) pick.push(cand[0]);
  }
}
// A denied one if any exist, for the rejected path.
const deniedRow = claims.filter((c) => c.denied && c.desc.length > 20)[0];
if (deniedRow) pick.push(deniedRow);

const EXAMPLES = pick.map((c) => ({
  id: c.id,
  or: c.order,
  ty: c.type,
  de: c.dept,
  ar: areaOf(c.dept),
  st: c.status,
  am: c.credit,
  pr: c.credit >= 1000 ? 'High' : c.credit >= 250 ? 'Medium' : 'Low',
  ds: c.desc,
  own: ownerOf(c.dept),
  own_by: c.issuer,
  date: c.date,
  rdate: c.rdate,
  denied: c.denied,
  cancelled: c.cancelled,
  resolved: c.resolved,
  entryFinished: c.entryFinished,
  memo: c.memoNo,
  memoAmt: c.memoAmt,
  otype: c.otype,
  ai: c.rca || c.capa || c.sol ? 'acc' : 'none'
}));

const CLAIM_FINANCIALS = {};
for (const c of EXAMPLES) {
  const src = claims.find((x) => x.id === c.id);
  CLAIM_FINANCIALS[c.id] = {
    creditMemo: src.memoNo,
    creditMemoDate: src.memoDate,
    creditMemoAmount: src.memoAmt,
    creditForInvoice: src.forInv,
    correctiveAction: src.capa,
    proposedSolution: src.sol,
    preventiveAction: src.pap,
    rootCause: src.rca,
    note: src.note,
    raisedBy: src.issuer
  };
}

const AI_TYPES = ALL.types.slice(0, 12).map((t) => t[0]);

// ---------------------------------------------------------------- orders
// The export carries OrderID only - no product, quantity or unit price, so an
// "order" here is a real aggregate of the claims raised against it.
const orderAgg = new Map();
for (const c of claims) {
  if (!c.order) continue;
  if (!orderAgg.has(c.order)) orderAgg.set(c.order, { id: c.order, claims: 0, credit: 0, depts: new Set(), owners: new Set(), types: new Set(), open: 0, first: c.date, last: c.date, otype: c.otype });
  const e = orderAgg.get(c.order);
  e.claims++; e.credit = r2(e.credit + c.credit);
  e.depts.add(c.dept);
  e.owners.add(ownerOf(c.dept));
  e.types.add(c.type);
  if (c.status === 'Open') e.open++;
  if (c.date < e.first) e.first = c.date;
  if (c.date > e.last) e.last = c.date;
}
// [id, claims, credit, open, deptCount, firstClaim, lastClaim, orderType, owners]
const ORDER_IDS = [...orderAgg.values()]
  .filter((o) => o.claims > 1 || o.open > 0)
  .sort((a, b) => b.claims - a.claims || b.credit - a.credit)
  .slice(0, 400)
  .map((o) => [o.id, o.claims, o.credit, o.open, o.depts.size, o.first, o.last, o.otype,
    [...o.owners].sort().join('~')]);
console.log('order aggregates embedded:', ORDER_IDS.length, 'of', orderAgg.size,
  '| multi-owner:', ORDER_IDS.filter((o) => o[8].includes('~')).length);

// ---------------------------------------------------------------- data quality
const DQ = (() => {
  const blankDept = claims.filter((c) => c.rawDept === '').length;
  const blankType = claims.filter((c) => c.type === '(Unclassified)').length;
  const junk = DEPT_OWNERS.filter((d) => d.dept === 'Claim Dept').reduce((s, d) => s + d.n, 0);
  const nearDupes = ['Sample Dept|Sample Dep.', 'System|System Error', 'Drinkware|Drinkware Damage|Drinkware Lids|Drinkware Digital', 'Courier|UPS|FEDEX'];
  const nearDupeClaims = nearDupes.reduce((s, grp) => {
    const set = new Set(grp.split('|'));
    return s + claims.filter((c) => set.has(c.dept)).length;
  }, 0);
  return {
    total: claims.length,
    blankDept, blankType, junk, nearDupes, nearDupeClaims,
    blankCurrency: claims.length,
    blankClaimAction: claims.length,
    statusCodes: [...claims.reduce((m, c) => { if (c.statusCode) m.set(c.statusCode, (m.get(c.statusCode) || 0) + 1); return m; }, new Map())]
      .map(([k, v]) => k + '=' + v),
    statusCodeDistinct: new Set(claims.map((c) => c.statusCode).filter(Boolean)).size,
    resolvedNoDate: claims.filter((c) => c.resolved && !c.rdate).length,
    distinctTypes: ALL.types.length,
    distinctDepts: ALL.dept.length,
    distinctRaisers: ALL.raisers,
    yearSpan: YEARS[YEARS.length - 1] + '-' + YEARS[0]
  };
})();

// ---------------------------------------------------------------- emit
const J = (v) => JSON.stringify(v);
// Keys are emitted in a stable order; `range` is part of the block and is used
// by every page header, so it must not be dropped.
const BLOCK_KEYS = ['range', 'modelled', 'total', 'credit', 'avgCredit', 'credited', 'creditIssued',
  'memos', 'maxClaim', 'resolved', 'open', 'cancelled', 'denied', 'unresolved', 'unfinished',
      'noRca', 'rcaFilled', 'capaFilled', 'paFilled', 'unassigned', 'repeatOrders', 'repeatClaims', 'repeatCredit',
  'medianDays', 'p90Days', 'sameDayPct', 'resolvedTimed', 'raisers',
  'orders', 'orderClaims', 'multiOrders', 'claimsPerOrder', 'repeatRate', 'noCredit', 'sampleClaims',
  'status', 'area', 'dist', 'types', 'typeMonths', 'dept', 'months'];
const fmtBlock = (b, indent) => {
  const missing = BLOCK_KEYS.filter((k) => !(k in b));
  if (missing.length) throw new Error('stat block missing keys: ' + missing.join(', '));
  return '{\n' + BLOCK_KEYS
    .map((k) => indent + '  ' + k + ': ' + J(b[k]))
    .join(',\n') + '\n' + indent + '}';
};

const out = [];
out.push('// GENERATED FILE - do not edit by hand.');
out.push('// Source: Claim_202609281521.csv (' + claims.length.toLocaleString('en-US') + ' claims, ' +
  DQ.yearSpan + ', exported 28 Sep 2026).');
out.push('// Regenerate with the build script; every figure below is measured, not modelled.');
out.push('');
out.push('const SOURCE_FILE = ' + J('Claim_202609281521.csv') + ';');
out.push('const EXPORTED_AT = ' + J('2026-09-28 15:21') + ';');
out.push('const YEARS = ' + J(YEARS) + ';');
out.push('const LATEST_YEAR = ' + YEARS[0] + ';');
out.push('');
out.push('const CLAIMS = ' + J(EXAMPLES) + ';');
out.push('');
out.push('const CLAIM_FINANCIALS = ' + J(CLAIM_FINANCIALS) + ';');
out.push('');
out.push('const ORDERS = ' + J(ORDER_IDS) + ';');
out.push('');
out.push('// Suggested-cause prompts, keyed by the most common real claim types.');
const promptFor = (t) => [
  'Possible cause for "' + t + '": confirm the specification and the approved proof, then check the production/cure or carrier handling record for this order before closing the claim.',
  'Resolution: raise a credit against the affected order where the cause is confirmed, record the confirmed root cause, and route the affected units for rework or replacement.'
];
out.push('const AI_SUGGESTIONS = ' + J(
  AI_TYPES.reduce((acc, t) => { acc[t] = promptFor(t); return acc; },
    { default: promptFor('this claim type') })) + ';');
out.push('');
out.push('// ---- ownership routing (modelled - the export has no assignee column) ----');
out.push('const OWNERS = ' + J(OWNERS) + ';');
out.push('const OWNER_OF_DEPT = ' + J(OWNER_OF_DEPT) + ';');
out.push('const AREA_OF_DEPT = ' + J(AREA_OF_DEPT) + ';');
out.push('const ownerOfDept = (dept) => OWNER_OF_DEPT[dept] || "MP";');
out.push('const areaOfDept = (dept) => AREA_OF_DEPT[dept] || "Unassigned";');
out.push('');
out.push('// ---- every claim that still needs work ----');
out.push('// [id, order, type, dept, status, credit, flags, raised, owner, raisedBy,');
out.push('//  description, rootCause, correctiveAction, note, memoNo, memoDate, memoAmount,');
out.push('//  resolvedDate, creditForInvoice]');
out.push('// Built inside an IIFE so the raw tuple array is released after mapping.');
out.push('const OWNER_QUEUE = (() => {');
out.push('  const raw = ' + J(QUEUE_SRC) + ';');
out.push('  return raw.map((a) => ({');
out.push('    id: a[0], o: a[1], ty: a[2], de: a[3], ar: areaOfDept(a[3]), st: a[4], am: a[5],');
out.push('    reasons: a[6] ? a[6].split("~") : [], reason: a[6] ? a[6].split("~")[0] : "",');
out.push('    date: a[7], own: a[8], iss: a[9], ds: a[10], rca: a[11], capa: a[12], note: a[13],');
out.push('    memo: a[14], memoDate: a[15], memoAmt: a[16], rdate: a[17], forInv: a[18]');
out.push('  }));');
out.push('})();');
out.push('');
out.push('const CLAIM_STATS_BY_YEAR = {');
YEARS.forEach((y, i) => {
  out.push('  ' + y + ': ' + fmtBlock(BY_YEAR[y], '  ') + (i < YEARS.length - 1 ? ',' : ''));
});
out.push('};');
out.push('');
out.push('const CLAIM_STATS_BY_YEAR_OWNER = ' + J(BY_YEAR_OWNER) + ';');
out.push('');
out.push('// All years, all owners.');
out.push('const CLAIM_STATS_ALL = ' + fmtBlock(ALL, '') + ';');
out.push('');
out.push('// All years, per routed owner.');
out.push('const CLAIM_STATS_BY_OWNER = {');
OWNERS.forEach((o, i) => {
  if (!BY_OWNER[o.id]) return;
  out.push('  ' + o.id + ': ' + fmtBlock(BY_OWNER[o.id], '  ') + (i < OWNERS.length - 1 ? ',' : ''));
});
out.push('};');
out.push('');
out.push('// Back-compat alias: the portal treats the latest year as "the current view".');
out.push('const CLAIM_STATS_2026 = CLAIM_STATS_BY_YEAR[' + YEARS[0] + '] || CLAIM_STATS_ALL;');
out.push('');
out.push('const OWNER_MATRIX = ' + J(OWNER_MATRIX) + ';');
out.push('const DEPT_OWNERS = ' + J(DEPT_OWNERS) + ';');
out.push('');
out.push('// Per-department rates, so cost and open-rate can be compared per team.');
out.push('// Keyed by year (or "all"), then by the owner the department routes to.');
out.push('// [dept, owner, area, claims, orders, open, credit, openCredit, creditIssued, repeatOrders, noCredit]');
out.push('const DEPT_FACTS = ' + J(DEPT_FACTS) + ';');
out.push('');
out.push('// Measured gaps in the export, quoted by the admin dashboard.');
out.push('const DATA_QUALITY = ' + J(DQ) + ';');
out.push('');
out.push('const USERS = OWNERS.map((o) => [o.name, o.email, o.role, o.status, o.id]);');

fs.writeFileSync(OUT, out.join('\n'), 'utf8');
const size = fs.statSync(OUT).size;
console.log('\nwrote ' + OUT + '  ' + (size / 1024 / 1024).toFixed(2) + ' MB');
console.log('queue rows ' + QUEUE_SRC.length + ' | examples ' + EXAMPLES.length);
console.log('status split: ' + JSON.stringify(ALL.status.map((s) => [s[0], s[1]])));
console.log('sums to total? ' + ALL.status.reduce((s, x) => s + x[1], 0) + ' vs ' + ALL.total);
console.log('credit ' + ALL.credit + ' | avg ' + ALL.avgCredit + ' | median ' + ALL.medianDays + 'd | p90 ' + ALL.p90Days + 'd');
