// ===========================================================================
// SAMPLE PRODUCT DATA - NOT FROM THE CLAIMS EXPORT.
//
// The current claims export (Claim_202609281521.csv) carries an OrderID and
// nothing else about the order: no Product, Customer, Quantity or Price. A
// separate order-system export is expected to carry those and will be joined
// to the claims by OrderID. Until that join exists, everything below is a
// hand-written stand-in so the Problem Products section and the Product Detail
// page can be reviewed. It is NOT measured from the CSV and must not be
// presented as if it were.
//
// Nothing here fakes production fallback. productForOrder() returns null for
// any order the sample set does not cover, and the pages render
// PRODUCT_DATA_MISSING for it. When the real join lands, productById and
// productForOrder are the only functions that change - the pages already
// branch on "no product data" and will keep doing so honestly.
// ===========================================================================

// The rolling twelve-month window the sample trends are read against: the last
// twelve months of the export, ending Sep 2026 (LATEST_YEAR's latest month).
const PRODUCT_TREND_MONTHS = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];

// Shown in place of product figures when an order has no product row. It is a
// plain sentence rather than a zero, because a zero would read as "this product
// caused no claims" when the truth is "this order has no product data yet".
const PRODUCT_DATA_MISSING = 'Product data not available for this order';

// [id, name, totalOrders, totalClaims, trend(12), types([type,count]),
//  suppliers([name, orders, claims]), orderIds(embedded ORDERS ids)]
//
// totalOrders / totalClaims are the full order-system figures for the product.
// orderIds point at orders that are actually embedded in this portal (the 400
// in data.js), so the drill-through table shows real order rows. The join will
// supply the same three fields per order; this is just the sample shape.
const SAMPLE_PRODUCTS = [
  {
    id: 'P-MUG-11',
    name: 'Ceramic Mug 11oz',
    totalOrders: 320,
    totalClaims: 58,
    trend: [2, 3, 2, 4, 3, 5, 4, 5, 4, 6, 7, 8],
    types: [
      ['Product Damage During/After Shipping', 22],
      ['Product Defect', 17],
      ['Wrong Quantity', 11],
      ['Imprint Defect/Smuding/Partial Imprint', 8]
    ],
    suppliers: [
      ['Northwind Ceramics', 210, 44],
      ['Stonebridge Pottery', 110, 14]
    ],
    orderIds: ['5102744', '5007945', '4243541', '5213277']
  },
  {
    id: 'P-TUMBLER-20',
    name: 'Insulated Travel Tumbler 20oz',
    totalOrders: 410,
    totalClaims: 46,
    trend: [1, 2, 1, 3, 2, 3, 2, 4, 3, 4, 5, 6],
    types: [
      ['Product Defect', 16],
      ['Product Damage During/After Shipping', 14],
      ['Imprints Rubbing Off', 9],
      ['Items Missing/Not Shipped', 7]
    ],
    suppliers: [
      ['Coastline Drinkware', 250, 30],
      ['Alpine Metal Works', 160, 16]
    ],
    orderIds: ['4959579', '4912866', '3662470', '5084513']
  },
  {
    id: 'P-TOTE',
    name: 'Canvas Tote Bag',
    totalOrders: 260,
    totalClaims: 30,
    trend: [1, 1, 2, 2, 2, 3, 2, 3, 3, 3, 4, 4],
    types: [
      ['Imprint Defect/Smuding/Partial Imprint', 12],
      ['Product Defect', 9],
      ['Wrong Imprint Color', 5],
      ['Product Damage During/After Shipping', 4]
    ],
    suppliers: [
      ['Greenloom Textiles', 260, 30]
    ],
    orderIds: ['4475496', '3521481', '4942918', '4274218']
  },
  {
    id: 'P-PEN-GEL',
    name: 'Retractable Gel Pen',
    totalOrders: 900,
    totalClaims: 36,
    trend: [2, 3, 3, 4, 2, 3, 3, 4, 3, 3, 3, 3],
    types: [
      ['Product Defect', 14],
      ['Items Missing/Not Shipped', 10],
      ['Wrong Quantity', 7],
      ['Product Damage During/After Shipping', 5]
    ],
    suppliers: [
      ['Meridian Pen Co.', 900, 36]
    ],
    orderIds: ['5102787', '4253968', '3533659', '3155628']
  },
  {
    id: 'P-NOTE-A5',
    name: 'Branded Notebook A5',
    totalOrders: 28,
    totalClaims: 6,
    trend: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    types: [
      ['Imprint Defect/Smuding/Partial Imprint', 3],
      ['Product Defect', 2],
      ['Wrong Imprint Color', 1]
    ],
    suppliers: [
      ['Papertrail Bindery', 28, 6]
    ],
    orderIds: ['5060997', '4369247', '4111925', '3225803']
  },
  {
    id: 'P-POLO',
    name: 'Performance Polo Shirt',
    totalOrders: 180,
    totalClaims: 17,
    trend: [1, 1, 2, 1, 2, 1, 2, 2, 1, 1, 2, 1],
    types: [
      ['Product Defect', 6],
      ['Wrong Item Color', 4],
      ['Imprints Rubbing Off', 4],
      ['Wrong Quantity', 3]
    ],
    suppliers: [
      ['Stitchline Apparel', 110, 8],
      ['Harbor Sportswear', 70, 9]
    ],
    orderIds: ['5252139', '301385', '3982275', '3767147']
  },
  {
    id: 'P-BOTTLE-24',
    name: 'Stainless Water Bottle 24oz',
    totalOrders: 520,
    totalClaims: 34,
    trend: [2, 2, 3, 2, 3, 3, 3, 3, 3, 3, 4, 3],
    types: [
      ['Product Damage During/After Shipping', 12],
      ['Product Defect', 11],
      ['Wrong Quantity', 6],
      ['Customer Has Higher Quality Standard', 5]
    ],
    suppliers: [
      ['Alpine Metal Works', 300, 15],
      ['Coastline Drinkware', 220, 19]
    ],
    orderIds: ['4971374', '3198271', '3984056', '4542751']
  },
  {
    id: 'P-CALENDAR',
    name: 'Desk Calendar',
    totalOrders: 40,
    totalClaims: 2,
    trend: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    types: [
      ['Imprint Defect/Smuding/Partial Imprint', 1],
      ['Product Damage During/After Shipping', 1]
    ],
    suppliers: [
      ['Papertrail Bindery', 40, 2]
    ],
    orderIds: ['345467', '3283814', '4245223', '5129545']
  },
  {
    id: 'P-NOTE-ECO',
    name: 'Eco Recycled Notebook',
    totalOrders: 12,
    totalClaims: 1,
    trend: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    types: [
      ['Product Defect', 1]
    ],
    suppliers: [
      ['Greenloom Textiles', 12, 1]
    ],
    orderIds: ['5116622', '5165355', '3756853', '4090108']
  },
  {
    id: 'P-STRESS',
    name: 'Stress Ball (Round)',
    totalOrders: 75,
    totalClaims: 13,
    trend: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1],
    types: [
      ['Product Defect', 5],
      ['Product Damage During/After Shipping', 4],
      ['Wrong Quantity', 2],
      ['Imprint Defect/Smuding/Partial Imprint', 2]
    ],
    suppliers: [
      ['Softline Promo', 75, 13]
    ],
    orderIds: ['4979728', '4931020', '3188314', '5215619']
  }
];

// ---------------------------------------------------------------------------
// Severity tiers
// ---------------------------------------------------------------------------
// Raw claim rate alone cannot rank these: a product with 5 orders and 1 claim
// (20%) is not a bigger problem than one with 500 orders and 60 claims (12%),
// because the first is one unlucky order and the second is a pattern. The tier
// therefore needs BOTH a rate and a volume floor before it will call anything
// Critical, and treats "high rate, too few orders to trust" as Watch rather
// than Critical. Thresholds live here rather than in the pages so the section
// and the detail page cannot disagree about what a tier means.
const PRODUCT_TIER_RULES = {
  criticalRate: 0.15,     // rate above this ...
  minTrustVolume: 50,     // ... only counts as Critical at/above this many orders
  moderateRate: 0.08,     // a moderate rate ...
  highVolume: 150         // ... at/above this many orders is still worth a Watch
};

function productClaimRate(p) {
  return p && p.totalOrders ? p.totalClaims / p.totalOrders : 0;
}

// Critical / Watch / Normal, in that order of seriousness. See the rules above.
function productTier(p) {
  const rate = productClaimRate(p);
  const orders = p ? p.totalOrders : 0;
  if (rate > PRODUCT_TIER_RULES.criticalRate && orders >= PRODUCT_TIER_RULES.minTrustVolume) return 'Critical';
  if ((rate > PRODUCT_TIER_RULES.criticalRate && orders < PRODUCT_TIER_RULES.minTrustVolume) ||
      (rate > PRODUCT_TIER_RULES.moderateRate && orders >= PRODUCT_TIER_RULES.highVolume)) return 'Watch';
  return 'Normal';
}

// Tier -> existing badge tone, so the pills reuse .b.High / .b.Med / .b.Low
// rather than inventing a fourth set of colours.
const PRODUCT_TIER_CLASS = { Critical: 'High', Watch: 'Med', Normal: 'Low' };

function tierBadge(tier) {
  return `<span class="b ${PRODUCT_TIER_CLASS[tier] || 'Low'}">${esc(tier)}</span>`;
}

// ---------------------------------------------------------------------------
// Lookups - the seam the real join replaces
// ---------------------------------------------------------------------------
// The live version will query the joined order-system export. Every consumer
// goes through these two functions, so that is the only thing to swap.

function productById(id) {
  return SAMPLE_PRODUCTS.find((p) => p.id === id) || null;
}

function productsForOrder(orderId) {
  const key = String(orderId);
  return SAMPLE_PRODUCTS.filter((p) => p.orderIds.includes(key));
}

// One product per order in the sample set; null means no product data exists
// for that order yet. Callers must handle the null and print
// PRODUCT_DATA_MISSING rather than a figure.
function productForOrder(orderId) {
  return productsForOrder(orderId)[0] || null;
}
