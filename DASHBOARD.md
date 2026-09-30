# Claims Portal – Dashboard Field Guide

Every tile, chart, column and filter on `dashboard.html` is defined here, together with
the exact formula behind it and the column of the source export it comes from.

| Item | Value |
|---|---|
| Source | `Claim_202609281521.csv` — 31,235 claims, 2010‑2026, exported 28 Sep 2026 |
| Generated data | `data.js` (2.6 MB, do not hand‑edit) — rebuild with `node build-data.js` |
| UI | `dashboard.html` (this page), `admin-dashboard.html`, `claims.html`, `orders.html`, `claim-detail.html` |
| Shared helpers | `app.js` — session, layout, `num` `usd` `money` `pct`, collapsible groups |
| Styling | `style.css` |

**Nothing on the dashboard is estimated or modelled** except claim ownership, which is
routed from the claim's department because the export has no assignee column (see
[Ownership model](#ownership-model)). Where a number cannot be measured, the UI says so
rather than filling the gap.

---

## 0. Navigation and controls

### One Dashboard tab, two dashboards

The top bar has a single **Dashboard** tab with a caret, not two separate tabs. The label
itself always goes to `dashboard.html`, so clicking the tab at any time returns you to the
claims view. The caret opens a menu of the dashboards the signed‑in role may use:

| Role | Menu shows |
|---|---|
| Admin | Claims Dashboard, Admin Dashboard |
| Manager | *nothing* — one option is not a menu, so the tab collapses to a plain link with no caret |

Both dashboards stay separate pages. Merging them would mean one file rendering two
unrelated sets of figures behind a toggle, and the admin page's ownership and data‑quality
tables have nothing in common with the claims view. The dropdown is the navigation, not a
rewrite.

The caret button carries `aria-haspopup="true"` and tracks `aria-expanded`. Menu items are
`role="menuitem"`; the current page is marked `.on`. Clicking anywhere outside, or pressing
Escape, closes it. Only one menu is ever open.

### Reporting year

The claims dashboard's year picker is a dropdown, not a strip of seventeen buttons. It is
styled as a nav tab — `.dd-trigger` copies `nav a`'s padding, radius and weight, and takes
the same active background when open — so it reads as part of the header rather than a
foreign control dropped next to the Refresh button.

The trigger shows the selected year and a caret; the menu lists all 17 years in `YEARS`,
newest first, with the current one marked `aria-selected="true"` and labelled *current*.
Choosing one repaints every figure on the page — the year appears nowhere in the `h1`, which
is always **Claims Dashboard**, so switching years does not retitle the page. The year is
stated in the subtitle line instead (`Jan - Sep 2026 · 4,254 claims · $566K`).

Both dropdowns share one reveal rule, `.nav-dd.open .dd-menu, .dropdown.open .dd-menu`.
Scoping that rule to `.nav-dd` alone is what left the year picker stuck shut while its
markup and JavaScript both looked correct — the menu was rendered, the class toggled, and
nothing ever made it visible. `ddopen.js` now asserts the rule covers both shells.

### Removed from this page

The **Admin Dashboard →** button that used to sit in the claims dashboard's chip row, and
the same button on `admin.html`, are gone. The nav dropdown is the only way to reach the
admin dashboard, so there is one route to each page rather than two.

---

## 1. Needs Attention

The first thing on the page: a **single prioritised feed** of cards. AI‑detected patterns and
plain metrics are no longer split into two sections — they sit in one grid, ordered purely by
how urgent each item is, so the two kinds interleave by urgency rather than being filed
separately. The page heading above this is always **Claims Dashboard**; the year lives in the
picker next to it and in the subtitle.

### Card structure

Every card is the same six parts, whatever its origin:

| Part | Notes |
|---|---|
| Priority tag | **Do First** (red), **Do Next** (amber), **Review** (purple) |
| Source tag | **AI Insight** (purple) or **Metric** (gray) |
| Headline number | large, bold, tabular — a claim count |
| Label | short name of the item |
| Context line | one line of supporting detail |
| Action button | a verb, not "See" — the button opens the open‑claims table, so the verb names what you will find there |

Cards are flat: thin border, a 4px left accent in the priority colour, no gradient, no shadow.
The grid is three across on desktop, two under 900px, one under 600px. Buttons sit on a common
baseline in every row (flex column + `margin-top:auto`).

**Sorting is by priority, and only by priority** — `prio` ascending, then `w` (weight) to break
ties inside a tier. The source is a label, never a sort key. 2026, admin view, renders as:

| # | Priority | Source | Card | n | Action |
|---|---|---|---|---|---|
| 1 | Do First | AI Insight | Recurring issue | 845 | Investigate pattern |
| 2 | Do First | Metric | Open claims | 751 | Open queue |
| 3 | Do First | Metric | Awaiting action | 819 | Review entries |
| 4 | Do Next | AI Insight | High‑value impact | 377 | Investigate pattern |
| 5 | Do Next | AI Insight | Potential CAPA | 701 | Start CAPA review |
| 6 | Do Next | Metric | Repeat‑claim orders | 404 | Review orders |
| 7 | Review | AI Insight | Emerging trend | 55 | Investigate pattern |

Note the interleave: Do First is AI‑then‑metric, Do Next is AI‑then‑metric, Review is AI. If the
feed were still grouped by origin, rows 1–4 would all be AI cards.

### AI Insight cards

These are **not** a model. Each is an explicit rule run over the monthly claim‑type series
(`typeMonths` in `data.js`), which is what lets the page separate a standing fault from a
one‑off spike.

| Card | Priority | Fires when | Big number is | Context line |
|---|---|---|---|---|
| **Recurring issue** | Do First | A claim type appears in **every** month of the year (needs ≥ 3 months of data) and is not `(Unclassified)` | claims of that type in the year | `Type in 9 of 9 months · credit` |
| **High‑value impact** | Do Next | Ranked by **credit**, not by count | claims of that type | `Type · credit · % of year credit` |
| **Potential CAPA** | Do Next | Always, when there is any open claim | size of the largest open pile by type | which type that pile is · `0 of 4,254 carry a corrective action` |
| **Emerging trend** | Review | The type's last 3 months average ≥ 1.5× its first 3, on ≥ 40 claims and ≥ 4 a month at the tail | claims of that type in the year | `Type · 3 → 9 a month · credit` |

**Each insight claims a different claim type.** Once Recurring issue has taken Sales Tax,
High‑value impact moves to the next most expensive type, and so on. Without that rule all
four cards describe the same dominant type and tell the reader nothing. The one exception is
Potential CAPA, which is allowed to point at `(Unclassified)` — the claims nobody has
classified are exactly where a corrective action is most overdue.

**The floors are deliberate.** Without them a claim type going 3 → 9 a month on 20 claims
would be reported as a trend, which is noise. Cards are omitted entirely when nothing
qualifies, so a manager with a small caseload sees fewer than four AI cards.

**On "Potential CAPA", read the card literally.** It is a prompt to act, not a finding that a
cause is known. Across the whole 31,235‑row export only 3 claims carry a `RootCauseAnalysis`,
31 a `CorrectiveAction` and 14 a `PreventiveAction`, so the card reports that near‑zero
coverage and names the pile to start with. The word *potential* is doing real work there.

**The 12‑point sparklines were dropped.** They appeared on only two of the four AI cards, which
is exactly the ragged structure the unified feed exists to remove. `spark()` and its CSS remain
in use on `departments.html`, which still renders its own four cards in the older shape.

### Metric cards

Every count here is the exact number of rows the card's filter opens, so the feed and the table
below cannot disagree. Only work that is **still outstanding** earns a card. Whole‑year totals
used to sit in this group too, but they carry no action and have no filter to open, so they are
absent here and appear once each in the **Three Numbers That Matter** tiles.

| Card | Priority | Big number is | Counted from | Context line | Link filters by |
|---|---|---|---|---|---|
| **Open claims** | Do First | still unresolved | `ClaimResolved = 0` | credit on them · % of intake | flag `Unresolved` |
| **Awaiting action** | Do First | entry not finished | `ClaimEntryFinished ≠ 1` | % of intake · entry not marked finished | flag `Entry not finished` |
| **Repeat‑claim orders** | Do Next | claims on orders that raised more than one | `repeatClaims` | how many orders · credit on them | flag `Repeat‑claim order` |

**There is no "Under investigation" card, because this data has no such state.** The
`ClaimStatus` column is a numeric code (1, 2, 3, 4) populated on only 145 of 31,235 rows, and
"investigat…" appears solely inside free‑text `ClaimDescription` (45 rows) and
`NoteForCustomer` (2). There is no status to count, so the card was left out rather than
filled with a proxy. **Awaiting action** is the honest stand‑in for outstanding work: it is
literally an entry someone has not finished.

**The two card kinds count different things, even though they share one queue.** Metric cards
are volume and status for the year, restricted to what is still open. The AI cards count *all*
claims of a type in the year — including closed ones — so Recurring issue's 845 is larger than
Open claims' 751 even though both are tagged Do First. That is why the source tag is on the
card: the number alone cannot tell you whether you are looking at the open queue or at the
whole year. The table at the bottom is the ground truth for anything still open, and clicking
any card filters it.

The panel is scoped to the selected year and to the signed‑in user's caseload.

## 2. The Three Numbers That Matter

| Tile | Value | Formula | 2026 (admin) |
|---|---|---|---|
| Claims raised | count | all claims in the selected year and scope | 4,254 |
| Credit given | $ | `sum(CreditAmount)` | $565,826.03 |
| Still open | count | `ClaimResolved = 0` | 751 = 17.7% of intake |

The ▲ / ▼ chip compares **the same months** in the previous year (see §3).

**Credit per claim and max single claim were removed.** The average is already the value line
on the Total claims card, and the largest single credit is already visible in the credit
distribution chart further down. Carrying them here as well was three numbers the reader had
to reconcile for no extra information.

## 3. This Year vs Last Year

Two month‑by‑month bar charts, claims and credit. Each month has two bars — grey = previous
year, indigo = current year — the current year's value printed above its own bar, and a
signed percentage under the month.

**There is no y-axis and no gridlines.** A scale down the side only repeated what was already
printed on every bar, and the gridlines added a second, competing way of reading the same
value. The bars are still sized against a rounded top (`niceScale`), so heights stay
comparable, and the previous year's figure is on each bar's hover title. The band chart
(§5) is unaffected — it never had an axis.

**Like for like.** 2026 is a part year (Jan–Sep). The dashboard counts how many months have
data in the selected year, then sums *only those months* for the previous year too. So the
comparison is 9 months vs 9 months. The old Ariel report compares 9 months of 2026 against
12 months of 2025, which makes any part year look like a collapse.

The scale is set by the tallest single **month**, not the annual total, and rounded to a
readable step (0 / 200 / 400 / 600 / 800). A totals strip under each chart repeats the two
year figures and the overall change.

There used to be a separate *Month by Month* line‑chart section showing the same two series.
It was removed — it duplicated this chart without adding anything.

## 4. Where the Claims Come From

| Chart | Measure | Toggle |
|---|---|---|
| Claims by team area | claims per business area, donut, plus a per‑area breakdown with share bar and a callout on the dominant area | — |
| Top claim types | claims per `ClaimType`, top 10 with a *+N* expander | Count / Credit |
| Credit by department | `sum(CreditAmount)` per `ClaimDept`, top 10 | Count / Credit |

**The team‑area card carries a breakdown, not just a legend.** It sits in a three‑column grid
row beside two ten‑row bar lists, so a bare donut plus a three‑line legend left most of the card
blank. The card is now a flex column: donut and a three‑fact totals stack on top, a
per‑area breakdown (name, count, share %, share bar) in the middle, and a footer callout
naming the area carrying the most claims. The breakdown list is `flex:1` with
`align-content:space-evenly`, so when a year has only two or three areas the extra height is
shared out between the rows rather than pooling underneath them.

Departments are rolled into six **team areas** so the mix is readable:

| Area | Departments |
|---|---|
| Tax & Compliance | Sales Tax, Price Discrepancy, Billing, Quote, Credit, Wrong Misc Charge, Wrong Art Charge, Access Data Base, Pricing |
| Order Management | Order Processing, Order Entry, Art, Order Log, Order Change |
| Customer & Service | Customer Goodwill, Customer Service, System, Internal Claim, OFR, Sales, Sample Entry, Sample Dept, System Error, Sample Dep., Stock, Scheduling, Distributor Relations |
| Production & Quality | Product Defect, Imprinting, Packaging, Drinkware Damage, Factory, Drinkware Lids, Drinkware Digital, Drinkware |
| Logistics & Fulfilment | Courier, Shortage, Shipping, Warehouse, Marketing, Unpacking, Sample Shipping, UPS, FEDEX |
| Unassigned | (Unassigned), Claim Dept |

### 4.1 Departments and warehouses

`departments.html` is a separate page: the dashboard above is unchanged. Picking a department
re-reads every figure on that page from that department.

**The page is a drill-down, not a second dashboard.** It deliberately does *not* repeat the
measures this dashboard already owns, because showing the same chart twice makes the reader
wonder whether the two copies disagree. Removed from the department page:

| Removed from `departments.html` | Lives on `dashboard.html` as |
|---|---|
| Month by month — claims and credit vs last year | This Year vs Last Year |
| What this year cost — credit given vs memo sent, share of company | Where the Money Goes |
| What the claims are — claim-type donut | Top claim types |
| All departments — full league table with credit/median columns | Credit by department, What Is Still Going Wrong |

The removed league table also duplicated the page's own **All departments side by side**, which
is kept because it is the comparison the page exists to make.

What stays is what the dashboard cannot answer for one department: the warehouse ranking, the
department's own warehouse split, the 17-year trend cut to like-for-like months, the recurring
claim-type read, the rate list against a peer, the side-by-side comparison, and the open-claim
queue for that department. `test-all-pages.js` asserts each removed block stays removed, so a
future edit cannot quietly reintroduce the duplicates.

**The department list is the export's own nine columns, in the order the portal reports them**,
as a flat dropdown — no grouping:

| Department | Source `ClaimDept` spellings | Claims (all years) | Routed to |
|---|---|---|---|
| Art | Art, Imprinting, Wrong Art Charge, Drinkware Digital | 2,316 | TR |
| Production | Product Defect, Factory, Packaging, Drinkware Damage, Drinkware Lids, Drinkware, Shortage, Unpacking, Stock, Warehouse, Internal Claim | 3,774 | TR |
| OrderChange | Order Processing, Order Entry, Order Change, Order Log, Sample Entry, System, System Error, Access Data Base, Scheduling, Marketing, Claim Dept | 14,322 | LF |
| Shipping | Shipping, Courier, UPS, FEDEX, Sample Shipping, Sample Dept, Sample Dep. | 1,640 | TR |
| Invoicing | Billing, Invoicing, Credit, Sales Tax, Sales, Wrong Misc Charge | 3,767 | DO |
| Pricing | Price Discrepancy, Pricing, Distributor Relations | 576 | DO |
| Overseas | Overseas | 0 | — |
| CustomerService | Customer Goodwill, Customer Service, OFR | 5,048 | LF |
| Quoting | Quote, Quoting | 74 | DO |

The nine **cannot be read from the export**: those columns hold `0` on all 31,521 rows.
`ClaimDept` is the only populated field, and it carries 47 spellings, so `DEPT_MAP` in
`add-warehouse.js` collapses them onto the nine. **7,427 rows carry no `ClaimDept` at all** and
go to `OrderChange`, which is why it is 45% of the file. Routing is derived by counting each
export owner's claims inside each department (`OWNER_OF_NINED`), not asserted by hand.

**Warehouses are mocked.** A warehouse is where the product was sitting when the fault was
found, so a warehouse holds one kind of stock and the **product family** decides the site — a
print fault belongs to the print warehouse, not to the desk that logged it. `add-warehouse.js`
assigns one from `ClaimType` (16,018 rows carry one, 110 distinct), falling back to keywords in
`ClaimDescription`, then to a deterministic hash spread within the family.

| Warehouse | Holds |
|---|---|
| A | Main store — general goods |
| B | Art & print |
| C | Drinkware & fragile |
| D | Finished goods & overflow |
| E | Dispatch & courier |
| F | Order desk & service |

This is a **mock**: replace the `Warehouse` column the moment a real site feed exists. It is
deterministic — same input, same output, no randomness — so figures do not move between builds.
Because the export has no unit counts, the page shows each site's **share of all claims**, never
a defect rate; inventing a rate per site is the same mistake as the company-level one in §6.

The six cards are ranked by claims, and the largest is labelled **Most defects**. Ranked by count
because that is what the export supports — a share of claims, not a rate against goods handled.
Each card also carries that site's top fault by credit, its open share, and a meter.

## 5. Where the Money Goes

| Chart | Measure |
|---|---|
| Credit given vs memo sent | Two labelled bars per department: `sum(CreditAmount)` and `sum(abs(CreditMemoAmount))`. The badge in the header is the gap — credit promised that never became a credit memo, i.e. money not yet recovered. |
| How big are the claims | Claims per credit band — exactly three: `<$50`, `$50‑$500`, `>$500`. Bar height = claims, label = credit in the band. **The three bands sum exactly to `credited` and to `credit`**, so the chart always reconciles with the Credit given tile above it. |

**Why the bands are predicates, not ranges.** 37 claims in the file carry a **negative**
`CreditAmount` — credit reversals, totalling −$7,632 (3 of them, −$177.59, in 2026). A
half‑open range like `lo < amount <= hi` silently drops them, and the chart then fails to add
up to the credit total printed on the same page. So the first band is written as a predicate
(`amount !== 0 && amount <= 50`) and takes any non‑zero credit up to $50, negatives included.
`three.js` asserts the tie across 2026, 2025, 2019, 2013 and all years.

A five‑band split (`$50‑250`, `$250‑1k`, `$1k‑5k`, `$5k‑25k`, `$25k+`) was there until this
revision. It answered no question anyone was asking: it split the small claims four ways
while the money sits in a single band above $500.

## 6. What Is Still Going Wrong

One rate per department, top 10, with a three‑way toggle. A rate is what a count‑only report
cannot show, because counts grow with volume and rates do not.

| Toggle | Numerator | Denominator | Reads as |
|---|---|---|---|
| Still open | claims with `ClaimResolved = 0` | claims raised | share of the year that is still open |
| Repeat orders | orders that raised more than one claim | orders touched | how often a fix did not hold |
| Cost nothing | claims with `CreditAmount = 0` | claims raised | claims that were closed with no cost |

Departments with fewer than 10 claims in the denominator are hidden — the rate is not
meaningful at that size. A bar turns red when it is above the average across the current
scope. Clicking a row filters the table to that department.

## 7. Open Claims

Every claim in the selected year that still needs work. Resolved claims are deliberately
excluded from the whole dashboard.

**The year and the open‑claim total are printed exactly once**, in the card title
(`Open Claims — 751 in 2026 · your caseload`). The banner above the table used to repeat both,
and the toolbar then repeated the count a third time as `751 / 751`, so the same figure appeared
four times within one screen. Now:

- **Resting state** — no banner at all. The toolbar's row counter is hidden too.
- **Search or a card filter active** — the banner shows only the active filter and the button
  that clears it, and the toolbar shows `N of 751 shown`.

A claim is in the queue when **any** of these is true — flags therefore overlap, and one
claim can appear under more than one group:

| Flag | Condition |
|---|---|
| Unresolved | `ClaimResolved = 0` |
| Denied | `ClaimDenied = 1` |
| Cancelled | `Canceled = 1` |
| Entry not finished | `ClaimEntryFinished` is not `1` |
| Repeat-claim order | the claim's `OrderID` raised more than one claim **anywhere in the 2010‑2026 file**, not just in the selected year |
| Unassigned Department | `ClaimDept` is blank |

| Column | Field | Source |
|---|---|---|
| Claim | `id` | `Claim#` |
| Order | `o` | `OrderID` |
| Claim Type | `ty` | `ClaimType`, `(Unclassified)` when blank |
| Dept | `de` | `ClaimDept`, `(Unassigned)` when blank |
| Owner | `own` | routed — [see below](#ownership-model). Admin only |
| Status | `st` | derived: denied → `Denied`, else cancelled → `Cancelled`, else resolved → `Resolved`, else `Open` |
| Credit | `am` | `CreditAmount` |
| Root cause | `reasons` | the flags above |
| Raised | `date` | `ClaimDate` |

Grouping (collapsed, loaded on first open): **Flag**, **Department**, **Team area**,
**Claim type**, **Status**. Long tails collapse into an "Other" group; long lists paginate at
200 rows with a *show all* control.

---

## Data structures in `data.js`

### `CLAIM_STATS_BY_YEAR[year]` — one block per year, and `CLAIM_STATS_BY_YEAR_OWNER[year][owner]`

| Field | Meaning |
|---|---|
| `range` | Human label for the period, e.g. `Jan - Sep 2026` |
| `total` | Claims in the slice |
| `credit` | `sum(CreditAmount)` |
| `avgCredit` | `credit / total` |
| `credited` | Claims with a non‑zero credit |
| `noCredit` | Claims with a zero credit |
| `creditIssued` | `sum(abs(CreditMemoAmount))` |
| `memos` | Claims carrying a `CreditMemoNumber` |
| `maxClaim` | Largest single credit |
| `resolved` `open` `cancelled` `denied` | Counts by derived status |
| `unresolved` | Claims with `ClaimResolved = 0` (includes denied/cancelled ones) |
| `unfinished` | Claims with `ClaimEntryFinished ≠ 1` |
| `noRca` / `rcaFilled` | Root cause analysis blank / present — 3 filled in the entire file |
| `capaFilled` / `paFilled` | `CorrectiveAction` / `PreventiveAction` present — 31 and 14 in the entire file, and **0 in 2026**. The Potential CAPA card reads this. |
| `unassigned` | Claims with a blank `ClaimDept` |
| `repeatOrders` | Orders that raised more than one claim **inside this slice** |
| `repeatClaims` | Claims sitting on those orders |
| `repeatCredit` | Credit on those claims |
| `orders` | Distinct `OrderID` values in the slice |
| `orderClaims` | Claims that carry an `OrderID` |
| `multiOrders` | Orders with more than one claim — the numerator of the repeat rate |
| `claimsPerOrder` | `orderClaims / orders` |
| `repeatRate` | `multiOrders / orders` as a % |
| `sampleClaims` | Claims raised on a `Sample` order (`OrderType = Sample`) — 54 across the file |
| `medianDays` `p90Days` `sameDayPct` `resolvedTimed` | Resolution speed, measured only on claims flagged resolved **and** carrying a `ClaimResolvedDate` (2,244 of 4,254 in 2026). `sameDayPct` is the share closing in under 24 hours, not the same calendar day — 2026 closes 98.5% inside a day, so the median is 0.53d. One claim in the file has a resolved date *before* its claim date (2012) and is dropped. |
| `raisers` | Distinct `IssueName` values — 47 in 2026, 148 across the file |
| `status` | `[[name, count, credit], …]` by derived status |
| `area` | `[[name, count, credit], …]` by team area — all 6 |
| `types` | `[[name, count, credit], …]` by claim type, top 25 per year |
| `dept` | `[[name, count, credit], …]` by department, top 20 per year |
| `dist` | `[[band, count, credit], …]` by credit band — three bands, see the note in §5 |
| `months` | 12 × `[claimCount, credit]` for Jan…Dec |
| `typeMonths` | 12 × `[claimType, 12 × monthlyClaimCount]` for the top 12 claim types, largest first. This is what the AI cards read, because a yearly total cannot distinguish a standing fault from a one-off spike. |

Also emitted: `CLAIM_STATS_ALL` (every year, every owner), `CLAIM_STATS_BY_OWNER[id]`, and
`CLAIM_STATS_2026` as an alias of the latest year.

### `DEPT_FACTS[year|all][all|ownerId]` — per department rates

Each entry is a positional array. Only departments that raised at least one claim in the
slice appear — 46 of 46 for `all`, 23 for 2026.

| # | Field | Meaning |
|---|---|---|
| 0 | `dept` | `ClaimDept` |
| 1 | `owner` | Routed owner id |
| 2 | `area` | Team area |
| 3 | `claims` | Claims raised |
| 4 | `orders` | Distinct orders touched |
| 5 | `open` | Claims still open |
| 6 | `credit` | `sum(CreditAmount)` |
| 7 | `openCredit` | Credit on the still‑open claims |
| 8 | `memo` | `sum(abs(CreditMemoAmount))` |
| 9 | `repeatOrders` | Orders that raised more than one claim |
| 10 | `noCredit` | Claims with a zero credit |

### `OWNER_QUEUE` — every claim that still needs work (all years, 10,015 rows)

| Field | Meaning |
|---|---|
| `id` `o` `ty` `de` `ar` `st` `am` | As the table in §7 |
| `reasons` `reason` | Array of flags / the first one |
| `date` | `ClaimDate` |
| `own` | Routed owner id |
| `iss` | `IssueName` — who raised it |
| `ds` `rca` `capa` `note` | `ClaimDescription` and `NoteForCustomer` (truncated to 300 characters), `RootCauseAnalysis`, `CorrectiveAction` (full) |
| `memo` `memoDate` `memoAmt` | Credit memo details |
| `rdate` | `ClaimResolvedDate` |
| `forInv` | `CreditForInvoiceNo` |

The dashboard filters this queue to the selected year, which is why every count on the page
matches the table.

### Supporting tables

| Name | Contents |
|---|---|
| `OWNERS` | The four accounts: `MP` Maya Patel (Admin), `DO` Daniel Ortiz, `LF` Lena Fischer, `TR` Tom Reyes (Inactive) |
| `OWNER_OF_DEPT` | Department → owner routing map |
| `AREA_OF_DEPT` | Department → team area map |
| `OWNER_MATRIX` | Per owner: `total open unresolved unfinished credit queue depts` |
| `DEPT_OWNERS` | Per department: `dept owner n credit queue` |
| `ORDERS` | The top 400 order aggregates — every order with more than one claim or an open claim, sorted by claims then credit: `[id, claims, credit, open, deptCount, firstClaim, lastClaim, orderType, owners]` |
| `CLAIMS` / `CLAIM_FINANCIALS` | 13 real worked examples (mix of resolved, open, denied, with and without a memo) used by `claim-detail.html`. `CLAIM_FINANCIALS` is an object keyed by claim id holding the memo and invoice fields |
| `AI_SUGGESTIONS` | Suggested‑cause prompts keyed by the 12 most common claim types, plus a `default` fallback |
| `SOURCE_FILE` `EXPORTED_AT` `YEARS` `LATEST_YEAR` | Provenance |

---

## Source export: which columns are used

**Used** — `Claim#`, `OrderID`, `OrderType`, `ClaimDept`, `ClaimType`, `ClaimDescription`,
`RootCauseAnalysis`, `ProposedSolution`, `CorrectiveAction`, `PreventiveAction`,
`CreditAmount`, `ClaimDate`, `ClaimDenied`, `ClaimDeniedDate`, `ClaimResolved`,
`ClaimResolvedDate`, `IssueName`, `ClaimEntryFinished`, `CreditMemoNumber`,
`CreditMemoDate`, `CreditMemoAmount`, `CreditForInvoiceNo`, `NoteForCustomer`, `Canceled`.

**Present but unusable** — `Currency` (blank on all 31,235 rows), `ClaimAction` (blank on
all rows, so no task history), `ClaimStatus` (only 145 rows, 4 distinct codes, so status is
derived from the flags instead), the 14 team columns `OrderEntry Art Production
OrderChange Shipping Invoicing Pricing Overseas CustomerService Quoting Inventory Customer
Other Scheduling` (all zero on every row), `Split` (empty), `SyncFlag` (always `0`).

**Never imported** — `OldID`, `OrderSplitID`, `SampleOrderNumber`, `SecondClaimDept`,
`SecondClaimType`, `CreatedDateTime`, `CreatedByUserId`, `ModifiedDateTime`,
`ModifiedByUserID`, `CreditMemoInvoicing`, `CreditMemoInvoiceID`, `EventDate`,
`Responsible`.

---

## Known limits

| Limit | Size | Effect |
|---|---|---|
| No order total | — | **A true defect rate cannot be computed.** The export holds only orders that already produced a claim, so there is no denominator. The dashboard states this in the header instead of inventing a rate. See below. |
| No claim type | 15,217 (48.7%) | The type mix is hidden; the single biggest blind spot |
| No owning department | 7,427 (23.8%) | Nobody is accountable; 99.4% of these are still open |
| Root cause almost never filled | 3 of 31,235 | Cause analysis is impossible. The fields meant to carry it are empty: `RootCauseAnalysis` 3 values, `CorrectiveAction` 31, `PreventiveAction` 14, `ProposedSolution` 1 |
| No assignee column | — | Ownership is modelled, see below |
| No warehouse column | all 31,521 | `add-warehouse.js` appends a mock A–F `Warehouse` column (where the product sat when the fault was found) so the department page can rank sites. Mocked, not real: see §4.1 |
| Department columns empty | all 31,521 | `Art`, `Production`, `OrderChange`, `Shipping`, `Invoicing`, `Pricing`, `Overseas`, `CustomerService`, `Quoting` are the literal value `0` on every row. They are placeholders. The only populated department field is `ClaimDept`, 47 spellings, collapsed to the nine by `DEPT_MAP` |
| No `Overseas` claims | 0 rows | Listed in the picker as required, and shown with an empty state rather than dropped |
| Currency blank | 31,235 | No conversion is possible; every figure is as‑exported |
| Near‑duplicate departments | 1,351 claims | `Sample Dept`/`Sample Dep.`, `System`/`System Error`, the four `Drinkware*`, `Courier`/`UPS`/`FEDEX` |
| Placeholder department | 15 claims | `Claim Dept` is not a real team |
| Resolved with no date | 4,588 | Resolution speed is measured on the remainder only |

### The defect rate, honestly

The old report shows a defective rate of 2.00% — 3,376 defects over 169,009 orders. That
works because it has the order total.

This export does not. It contains 31,235 claims and no count of orders that went through
fine, so the denominator does not exist. Rather than substitute a guess, the dashboard shows
what *is* measurable for the year:

- `orders` — 3,524 orders raised 3,740 claims (2026)
- `claimsPerOrder` — 1.06 claims per order
- `repeatRate` — 5.3% of orders came back more than once

These are measured, not assumed, and they are more actionable than a headline rate because
they say *which* orders failed twice. Connect an order feed and the same tile becomes a true
defect rate with no change to the code — the numerator and denominator are already in the
data model.

## Ownership model

The export has no assignee column, so a claim is routed to a manager through its
`ClaimDept` using the `OWNER_OF_DEPT` map in `data.js`; anything unmapped falls to the admin
account. An admin sees every claim; a manager sees only claims routed to them. This is a
model, not a fact, and the admin dashboard says so. Swap `OWNER_OF_DEPT` for a real
assignment feed when one exists.

## Rebuilding the data

```
node build-data.js
```

Reads `Claim_202609281521.csv`, rewrites `data.js`. Add a field to `block()` in the build
script and to the `BLOCK_KEYS` list in the same file — the script throws if the two drift
apart. Nothing else should write to `data.js`.

---

## Why this is better than the current report

| | Old Ariel report | This dashboard |
|---|---|---|
| Defect rate | 2.00%, no way to check it | Not shown, because it cannot be measured — with the order‑level rate that *can* be |
| Year on year | 9 months of 2026 vs 12 of 2025 | Same months in both years |
| Pie chart | No % or value on slices, one unlabelled legend entry | Every slice labelled with count and share |
| Cost chart | Two bars per location, **no x‑axis labels** | Two labelled bars per department, plus the credited‑but‑not‑memoed gap |
| Rate per location | Count only | Three rates per department, sorted, with a scope average |
| Colours | Red/blue/green mean different things in different charts | One palette, one meaning per chart |
| Next step | None — the report is read‑only | Every finding is a button that opens the exact claims |
| Root cause / repeat / untyped | Not shown | Ranked, measured, and clickable |
| Closed claims | Mixed in | Excluded everywhere |
| Auditability | Unknown provenance | Every number traceable to a column, regenerated by a script |
