# Claims Portal – Dashboard Field Guide

Every tile, chart, column and filter on `dashboard.html` is defined here, together with
the exact formula behind it and the column of the source export it comes from.

| Item | Value |
|---|---|
| Source | `Claim_202609281521.csv` — 31,235 claims, 2010‑2026, exported 28 Sep 2026 |
| Generated data | `data.js` (2.6 MB, do not hand‑edit) — rebuild with `node build-data.js` |
| UI | `dashboard.html` (this page), `admin-dashboard.html`, `claims.html`, `orders.html`, `claim-detail.html` |
| Shared helpers | `app.js` — session, layout, `num` `usd` `money` `pct`, the pop‑up shell (`openModal` / `closeModal`), collapsible groups |
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
stated in the subtitle line instead (`Jan - Sep 2026`). The subtitle carries the time frame and
nothing else — the claim and credit counts live in the stat line below it, which is where the
same-year comparison can be read against them.

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

| Item | Notes |
|---|---|
| Priority tag | **Do First** (red), **Do Next** (amber), **Review** (purple) |
| Source tag | **AI Insight** (purple) or **Metric** (gray) |
| Headline number | large, bold, tabular — a claim count |
| Label | short name of the item |
| Context line | one line of supporting detail |
| Verb | a verb, not "See" — it opens the card's **detail pop‑up**, so it names what you will be shown |
| Table link | *View in table* — leaves the dashboard for `claims.html` with the card's scenario already applied. Absent where that page cannot express the scenario, and the pop‑up then says why |

Cards are flat: thin border, a 4px left accent in the priority colour, no gradient, no shadow.
The grid is three across on desktop, two under 900px, one under 600px. Buttons sit on a common
baseline in every row (flex column + `margin-top:auto`).

**The whole card opens the pop‑up.** It is a `div` rather than an anchor because it carries a
second control, and a control inside an anchor is invalid HTML and not reliably clickable. The
stretched `::after` on `.ac-jump` makes the card behave like a link; `.ac-act` sits above it on
its own `z-index` and passes pointer events through except on the table link itself.

**Sorting is by priority, and only by priority** — `prio` ascending, then `w` (weight) to break
ties inside a tier. The source is a label, never a sort key. 2026, admin view, renders as:

| # | Priority | Source | Card | n | Verb opens | Table link goes to |
|---|---|---|---|---|---|---|
| 1 | Do First | AI Insight | Recurring issue | 845 | Investigate pattern | `claims.html?ty=Sales+Tax` |
| 2 | Do First | Metric | Awaiting action | 819 | Review entries | none — see below |
| 3 | Do Next | AI Insight | High‑value impact | 377 | Investigate pattern | `claims.html?ty=Wrong+Price` |
| 4 | Do Next | AI Insight | Potential CAPA | 701 | Start CAPA review | `claims.html?ty=(Unclassified)` |
| 5 | Do Next | Metric | Repeat‑claim orders | 404 | Review orders | `orders.html` |
| 6 | Review | AI Insight | Emerging trend | 55 | Investigate pattern | `claims.html?ty=Wrong Charges(Did Not Follow Quote)` |

Note the interleave: Do First is AI‑then‑metric, Do Next is AI‑then‑metric, Review is AI. If the
feed were still grouped by origin, rows 1–3 would all be AI cards.

### The detail pop‑up

The verb and the table link do different jobs, and the pop‑up is what makes that worth having
rather than a hassle. A reader who wants to *understand* a number should not have to leave the
page and filter a table to get there; a reader who wants the *rows* should not have to read the
explanation first. So the card explains, and the link is the way out of it.

| Part | Contains |
|---|---|
| Title | the card's label, with its priority and source tags |
| Subtitle | the card's context line, verbatim |
| **Why this number** | one sentence on how the headline was measured — the part a card has no room for. Card number and context line are facts; this is the definition behind them |
| Figures | a two‑column fact list: claims, credit, share of the year, months it appears, how many are still open |
| Composition | top‑5 bar groups, scaled to the largest row rather than to the total — "which one is biggest", not "which fraction" |
| Footer | the table link where one exists, otherwise the sentence explaining why there is not one; plus Close |

Every figure in it is read off the same `stats` block and the same year‑scoped, owner‑scoped
queue the card was built from, so the pop‑up cannot drift from the card that opened it. The
"still open" figures inside are a **subset** of the card's number, not the same thing: the card
counts the whole year, the queue only what still needs work, and the pop‑up states both.

The frame is shared by every pop‑up on the site: `openModal(body)` / `closeModal()` in `app.js`,
one `#modal` host, scrim click, Escape, `body.locked` scroll lock, `role="dialog"`
`aria-modal="true"` `aria-labelledby="mdl-t"`, and an 180ms exit transition before the host is
cleared. The re‑check on close (`if (!el.classList.contains('on'))`) is what makes a
close‑then‑reopen in the same tick land on a still‑open dialog instead of blanking it.

**A department or carrier row opens the same pop‑up.** Both tables used to hand off to the
open‑claims table, which no longer lives on this page, so a row that silently did nothing would
be worse than not offering the interaction at all. Their figures come from the rows the tables
above are built from, so the pop‑up is a re‑reading of the row rather than a second source.

| Row | Offers | Because |
|---|---|---|
| Department | *View in table* → `claims.html?de=…` | `de` is a real claims‑page filter |
| Carrier | none, and says so | the export has no Carrier column, so there is nothing there to filter by |
| **Awaiting action** card | none, and says so | `claims.html` has no entry‑not‑finished column, and status `Open` is a **different** population — a resolved claim can still carry an unfinished entry. A link to the wrong population is worse than no link |
| **Repeat‑claim orders** card | *View orders* → `orders.html` | the population is orders, and it is labelled as orders rather than as "the table" |

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

Only work that is **still outstanding** earns a card. Whole‑year totals used to sit in this group
too, but they carry no action and have nothing to open, so they are absent here and appear once
each in the **stat line** under the page title.

| Card | Priority | Big number is | Counted from | Context line | Opens / links to |
|---|---|---|---|---|---|
| **Awaiting action** | Do First | entry not finished | `ClaimEntryFinished ≠ 1` | % of intake · entry not marked finished | pop‑up only — the claims table cannot express the flag |
| **Repeat‑claim orders** | Do Next | claims on orders that raised more than one | `repeatClaims` | how many orders · credit on them | pop‑up, plus *View orders* → `orders.html` |

**There is no "Open claims" card.** It was removed: the same figure is already stated as
**Still open** in the stat line directly above, so the feed card repeated a number the reader
had just read and gave it a second, more urgent‑looking home. The open‑claim table that used to
sit below the feed was removed for the same reason — see [§8](#8-the-open-claims-table-was-removed).

**There is no "Under investigation" card, because this data has no such state.** The
`ClaimStatus` column is a numeric code (1, 2, 3, 4) populated on only 145 of 31,235 rows, and
"investigat…" appears solely inside free‑text `ClaimDescription` (45 rows) and
`NoteForCustomer` (2). There is no status to count, so the card was left out rather than
filled with a proxy. **Awaiting action** is the honest stand‑in for outstanding work: it is
literally an entry someone has not finished.

**The two card kinds count different things, even though they share one queue.** Metric cards
are volume and status for the year. The AI cards count *all* claims of a type in the year —
including closed ones — so Recurring issue's 845 is larger than Awaiting action's 819 even
though both are tagged Do First. That is why the source tag is on the card: the number alone
cannot tell you whether you are looking at the open queue or at the whole year. The pop‑up
states both populations side by side rather than leaving the reader to reconcile them.

The panel is scoped to the selected year and to the signed‑in user's caseload.

## 2. The Stat Line

Three numbers in a single horizontal row, **directly under the page title and year picker** and
above the Needs Attention feed. It is the first content block on the page.

| Number | Value | Formula | Comparison line | 2026 (admin) |
|---|---|---|---|---|
| Claims raised | count | all claims in the selected year and scope | `↑ 9.0% from last year` | 4,254 |
| Credit given | $ | `sum(CreditAmount)` | `↑ 33.0% from last year` | $566K |
| Still open | count | `ClaimResolved = 0` | `17.7% of claims raised this year` | 751 |

**No cards, no pills, no colour.** Each number is a 13px muted label, a 32px medium‑weight
figure, and one plain sentence beneath it. The only thing separating the numbers is a 0.5px
vertical rule; there is no fill, no border and no shadow on the row or on any number. Under
700px the row becomes a single column and the rules turn horizontal — a 3‑up row with vertical
rules has no useful compressed form.

**The direction glyph is text, not a verdict.** `↑` / `↓` sit inline ahead of the sentence and
nothing is coloured, because "up" is not one thing across these three lines: more claims raised
is neutral, more credit given is bad news, and fewer open claims is good. The previous version
painted these as red/green pills, which quietly asserted a judgement the data does not support.
`delta()` now returns only `{ dir, mag }` and the line builds the sentence.

**Claims and credit compare the same months in both years** (see §3) — nine months of 2026
against nine months of 2025, not against all twelve. **Still open is not compared at all.** The
data exposes `unresolved` as a full‑year block with no monthly series, so a like‑for‑like
comparison is not available; the line states the share of intake instead of printing a number
that would look authoritative and be wrong. Where there is no prior year (2010, the first in the
export) the line reads *No comparable prior period*.

**The old card row is gone**, and with it the *The Three Numbers That Matter* heading. The
`.kpi` card family still exists in `style.css` because `orders.html` and `admin-dashboard.html`
both use it.

**Credit per claim and max single claim were removed earlier.** The average is computed in the
department row's pop‑up (`Credit per claim`) and in `DEPT_FACTS`, and the largest single credit
is already visible in the credit distribution chart further down. Carrying them here as well was
three numbers the reader had to reconcile for no extra information.

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

**The donut's centre is the resolved share, not the total.** It used to print the year's total
claim count, which the stat line four rows above already prints — the same number twice on one
screen. It now prints `resolved / total` as a percentage, labelled `RESOLVED`, and the two totals
underneath it are the resolved count and the number of team areas. The grand total is printed once
per screen, in the stat line.

**The team‑area card carries a breakdown, not just a legend.** It sits in a three‑column grid
row beside two ten‑row bar lists, so a bare donut plus a three‑line legend left most of the card
blank. The card is now a flex column: donut and a three‑fact totals stack on top, a
per‑area breakdown (name, count, share %, share bar) in the middle, and a footer callout
naming the area carrying the most claims. The breakdown list is `flex:1` with
`align-content:space-evenly`, so when a year has only two or three areas the extra height is
shared out between the rows rather than pooling underneath them.

**AI insight cards deep‑link to the claims table.** A card that names a claim type carries a
*View in table* control that leaves the dashboard for `claims.html?ty=…`, with the scenario
already applied and a banner naming it. It used to scroll the Top claim types list and flash
the row instead; that mechanism is gone with the flash highlight, and a link that navigates is
the better of the two — a reader who wants the rows ends up somewhere they can act on them
rather than back at a bar chart with one row circled.

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
| All departments — full league table with credit/median columns | Department Comparison, and the ranked credit bars in Where the Money Goes |

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

**Warehouses are mocked.** The portal reports on **four sites**, named by their code — `8825`,
`1920`, `1780`, `WC`. A code is the whole label: the sites are known by number, so nothing is
appended to it.

The export carries no site feed either. `add-warehouse.js` appends a `Warehouse` column of six
letters (A–F) modelling where the product was sitting when the fault was found, on the same
principle as above: a warehouse holds one kind of stock, so the product family decides the site —
a print fault belongs to the print warehouse, not to the desk that logged it. Those six letters
are folded onto the four real sites in `build-data.js`, keeping the family that drove each letter:

| Export letter | Modelled as | Reported as |
|---|---|---|
| A main store, F order desk | the store a claim came off | `8825` |
| E dispatch & courier | dispatch | `1920` |
| B art & print, C drinkware | printed goods | `1780` |
| D finished goods & overflow | overflow store | `WC` |

This is a **mock**, twice over: replace both the letter column and the fold the moment a real site
feed exists. The fold is fixed rather than hashed, so the same claim lands on the same site in
every build and figures do not move between builds. Because the export has no unit counts, the page
shows each site's **share of all claims**, never a defect rate; inventing a rate per site is the
same mistake as the company-level one in §6.

The four cards are ranked by claims, and the largest is labelled **Most defects**. Ranked by count
because that is what the export supports — a share of claims, not a rate against goods handled.
Each card also carries that site's top fault by credit, its open share, and a meter.

## 5. Department Comparison

One sortable table, `Department | Count | Credit | <rate>`, replacing **three** stacked charts on
the same department axis. The three views were count‑by‑department, credit‑by‑department and a
rate chart; they were three ways of reading three columns of the same rows, stacked one under
another, so comparing a department's volume against its money against its rate meant holding
three lists at once. The row is now the unit of comparison.

| Column | Source |
|---|---|
| Department | `DEPT_FACTS[i][0]`, the export's nine, in reporting order |
| Count | `d[3]`, claims raised |
| Credit | `d[6]`, `sum(CreditAmount)` |
| Rate | the toggle below |

Every column sorts. Clicking the column already sorted on flips the direction; a new column starts
in the useful direction (names A‑Z, measures largest first). The active column is the only one
reporting `aria-sort`, so a screen reader is told which order it is reading.

| Rate toggle | Numerator | Denominator | Reads as |
|---|---|---|---|
| Still open | claims with `ClaimResolved = 0` | claims raised | share of the year still open |
| Repeat orders | orders that raised more than one claim | orders touched | how often a fix did not hold |
| Cost nothing | claims with `CreditAmount = 0` | claims raised | claims closed with no cost |

**A thin base is flagged, not hidden.** The rate chart used to drop any department with a
denominator under 10, because 1 of 1 is 100% and reads as a crisis. A table cannot drop rows
without hiding departments, so instead the figure goes muted, the bar goes flat, and the row's
tooltip names the base it is off. The rate turns red when it is above the average across the
current scope. Clicking a row opens that department's detail pop‑up, whose footer links to
`claims.html?de=…`.

## 6. Carrier Scorecard

The same table shape, for carriers, read from `CARRIER_FACTS`.

| Column | Source |
|---|---|
| Carrier | `UPS`, `FedEx` or `UPS/FedEx` — derived, see below |
| Claims | claims naming that carrier |
| Open | still open, with the open rate beneath it |
| Damage or loss | arrived broken, or went missing in the network |
| Late or not delivered | did not ship, deliver or arrive when it was promised |
| Wrong item or qty | wrong goods, or the wrong quantity of them |
| Shipping account or address | wrong shipping account, method, label or address |
| Freight or packaging | freight or packaging calculated or applied wrongly |
| Not a carrier fault | names a courier, but the stated reason is none of the above |
| Credit | `sum(CreditAmount)` |
| Slowest 10% closed in | `p90Days`, with the median beneath it |

The six reason columns are a **breakdown of Claims, not six extra claims**. `build-data.js`
matches each carrier claim against an ordered list of reasons, first match wins, so a claim is
counted against exactly one reason — or against *not a carrier fault*, which is the remainder and
makes the six add up to `Claims`. The build asserts that (`carrier reason split reconciles?`) so a
retuned regex cannot quietly make the row stop reconciling. Each header carries a tooltip saying
what its reason covers.

Two judgement calls are stated rather than hidden:

- **`late` and `loss` overlap in the source wording.** "never received" is both. The split is made
  once, in the order the reasons are listed, and the order is the argument — not alphabetical, not
  by frequency.
- **`Not a carrier fault` is the largest single reason for `UPS`** — 343 of its 923 claims. Read
  those claims and they are billing and communication disputes (*Wrong Price*, *Customer Denied
  Charges*, *Charged For Service Not Given*), product faults, and claims that name a courier in
  passing. They belong on the scorecard precisely because the courier is named on them and would
  otherwise be scored for a fault that is not its own. The column is printed muted so it does not
  read as a peer of the five real reasons.

### The export has no Carrier column

There is no carrier field in the 58 columns of `Claim_202609281521.csv`. A carrier is named in
three fields that do exist, and `build-data.js` reads all three, most structured first:

| Field | Example | Claims |
|---|---|---|
| `ClaimDept` | `UPS`, `FEDEX` | 11 |
| `ClaimType` | `Fedex/Ups Did Not Ship/Deliver On Time` | 282 |
| `ClaimDescription` | `UPS has not found the packages and has denied the claim` | 1,347 |

That leaves **1,640 of 31,521 claims (5.2%)** naming a carrier. Adding "no carrier named" as a
row would be three‑quarters empty, so the scorecard covers only the 1,640 and the caption prints
the share, so the reader knows the base.

Two corrections the raw text needs, or the counts are wrong:

- **`mock ups` / `set ups` / `re‑set ups` are printing terms in this file, not the courier.** 163
  claims hit that. The UPS pattern refuses them with a negative lookbehind, which is also why the
  per‑field table above sums to 1,640 and not to the raw grep count: one claim can name a carrier
  in more than one field and is counted once.
- **A claim naming two carriers is a real case, not a bad match.** FedEx Ground shipments billed
  to a UPS shipper account, and freight split across a truck and UPS on a single order. Those 353
  claims are a row of their own, `UPS/FedEx`, rather than being filed under whichever pattern ran
  first — which keeps the rows *partitioning* the claims they cover instead of double counting
  them. Filing them under UPS would have reported 1,276 UPS claims against 364 FedEx, and the
  353 shared ones would be counted in both.

### What the scorecard deliberately does not have

**No claim rate.** The requested metric was claims as a % of that carrier's total order volume.
The export contains no order list — it holds only orders that *raised a claim*, 25,485 distinct
`OrderID`s. The denominator would be the numerator, so every carrier would read ~100%. The
substitute printed instead is the **open claim rate** (open ÷ claims), which is a real
measurement of the same population, and it is shown beneath the open count.

**No modelled split.** Nothing here is assigned, sampled or scaled. Every figure is counted out of
the CSV. Compare the warehouse model in [§4.1](#41-departments-and-warehouses), which is
labelled `modelled` on the page.

### Where a carrier surfaces

| Page | Where |
|---|---|
| `dashboard.html` | this scorecard, next to Department Comparison, scoped by year and owner |
| `orders.html` | a `Carrier` column, and a `Carrier` row in the order detail panel |
| `claim-detail.html` | a `Carrier` row in Related Order, whether or not the order is in the embedded set |

An order with no carrier shows a dash titled *No claim on this order names a carrier in its
department, type or description* — a blank means **not stated**, not *shipped in our own van*, and
is never guessed. Of the 400 embedded orders, 48 name a carrier. Two more of the ten worked
examples are forced to name one, so the field is always demonstrable on the detail page rather
than depending on chance.

## 7. Where the Money Goes

| Chart | Measure |
|---|---|
| Credit by department | `sum(CreditAmount)` per department, top 8, with an Amount / Percent toggle over the same bars |
| How big are the claims | Credit per credit band — exactly three: `<$50`, `$50‑$500`, `>$500`. Bar height **and** the figure above the bar both track credit in the band, so the tallest bar is always the largest number. Claim counts are deliberately not drawn here: this card answers "how big", not "how many". The tallest bar is drawn in red (`.vb span.top`), and ties all count as tallest. Heights are a percentage of the chart box, capped at `BAR_MAX = 70`% so the value and band name always fit. **The three bands sum exactly to `credit`**, so the chart always reconciles with the Credit given figure in the stat line at the top of the page. The sub-line replaced a "762 of 4,254 cost nothing" caption, which counted claims (not credit) and near-duplicated the "Still open" stat above; it now names the red band and its share of the year's credit. |

**One credit chart, not two.** The old pair chart drew `sum(CreditAmount)` and
`sum(abs(CreditMemoAmount))` as two bars per department, read off the same `DEPT_FACTS` credit
column, and a separate "Credit by department" chart showed the same credit figure as a ranked bar
list. Three charts, one underlying number. Now one ranked bar list with an Amount / Percent
toggle, and the memo gap survives as a single figure in the card footer — credit promised and
never converted into a credit memo is real information, it just does not need a second set of
bars.

**The footer states the memo gap**, or says every credit has a matching memo. That is the one
figure from the old pair chart that is not derivable from the bar list.

**Why the bands are predicates, not ranges.** 37 claims in the file carry a **negative**
`CreditAmount` — credit reversals, totalling −$7,632 (3 of them, −$177.59, in 2026). A
half‑open range like `lo < amount <= hi` silently drops them, and the chart then fails to add
up to the credit total printed on the same page. So the first band is written as a predicate
(`amount !== 0 && amount <= 50`) and takes any non‑zero credit up to $50, negatives included.
`three.js` asserts the tie across 2026, 2025, 2019, 2013 and all years.

A five‑band split (`$50‑250`, `$250‑1k`, `$1k‑5k`, `$5k‑25k`, `$25k+`) was there until this
revision. It answered no question anyone was asking: it split the small claims four ways
while the money sits in a single band above $500.

## 8. The Open Claims table was removed

The card at the bottom of the page, holding every claim in the selected year that still needs
work, is gone. What replaced it is not a smaller table — it is the pop‑up in
[§1](#the-detail-pop-up) plus a set of deep links into `claims.html`.

**Why.** The page already stated the figure twice — once as the **Still open** stat and once as
the table's own count — and then a third time in a caption explaining that the two numbers were
not the same, because the queue is the wider population (it holds denied, cancelled and
never‑finished entries, all of which are still work somebody has to close out). A table that
needed a paragraph to explain its own total was carrying its weight in prose. Every group of it
(a card filter, a department row, a carrier row) was also a different route to the same place,
and after the pop‑up existed they all had somewhere better to go.

**What the dashboard does now, instead:**

| Reader wants | Do this |
|---|---|
| to understand a card's number | click the card — the pop‑up gives the definition, the figures, and the composition |
| the claims behind a card | click *View in table*, which opens `claims.html` with the scenario applied |
| the claims behind a department | the department row's pop‑up, then its footer link |
| to work the queue | `claims.html`, which is the page that owns a sortable, grouped, paginated claim list |

The flags the queue was grouped by still exist — they are what the pop‑up breaks the open slice
down by, and they are unchanged:

| Flag | Condition |
|---|---|
| Unresolved | `ClaimResolved = 0` |
| Denied | `ClaimDenied = 1` |
| Cancelled | `Canceled = 1` |
| Entry not finished | `ClaimEntryFinished` is not `1` |
| Repeat-claim order | the claim's `OrderID` raised more than one claim **anywhere in the 2010‑2026 file**, not just in the selected year |
| Unassigned Department | `ClaimDept` is blank |

### `claims.html` accepts a scenario on the URL

Six keys, which are exactly the ones its own toolbar writes, so a link and the page cannot
disagree about what a scenario is: `st`, `ty`, `de`, `pr`, `own`, `q`. A key this page does not
filter on is ignored rather than silently applied — a broken link should look broken.

When the page was opened with a scenario it shows a **Scenario from the dashboard** banner: the
active filters, the match count, and a *Clear filters* button. The count is live, so it follows
the reader editing the filters.

**An arriving value the list does not contain is kept in the dropdown and marked selected.**
`claims.html` lists the twelve worked examples; the dashboard counts all 31,517 (`DATA_QUALITY.total`).
A scenario naming a type none of the twelve carry would otherwise drop out of its own `<select>`
and print the placeholder as if nothing were set. Instead the value is injected into the option
list, the table prints an empty state naming both populations, and *Clear filters* is next to it:

> No worked example matches type Sales Tax. The dashboard counts this across all 31,517 claims
> in the export; this table holds the 12 with real narrative content. **Clear the filters**

That is the honest landing for a scenario the sample cannot show, and it is why the table link
is left on every card rather than being hidden whenever the sample has no matching row.

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
| `dist` | `[[band, count, credit], …]` by credit band — three bands, see the note in §7 |
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

### `CARRIER_FACTS[year|all][all|ownerId]` — per carrier

Same shape of key as `DEPT_FACTS`, but the owner slice is built by **re‑aggregating the owner's
claims**, not by filtering rows: a department routes to exactly one owner, whereas a carrier's
claims are spread across all of them, so "this manager's carrier book" has to be cut from the
claims up front. Each entry is a positional array; only carriers named in the slice appear.

| # | Field | Meaning |
|---|---|---|
| 0 | `name` | `UPS`, `FedEx` or `UPS/FedEx` |
| 1 | `claims` | Claims naming this carrier |
| 2 | `orders` | Distinct orders touched |
| 3 | `open` | Claims still open |
| 4 | `openCredit` | Credit on the still‑open claims |
| 5 | `credit` | `sum(CreditAmount)` |
| 6 | `damage` | **Damage or loss** — arrived broken, or went missing. The union of the `damage` and `loss` reasons |
| 7 | `medianDays` | Median days to close |
| 8 | `p90Days` | 90th percentile days to close |
| 9 | `timed` | How many of these claims had both dates, so the percentiles are readable as a base |
| 10 | `late` | **Late or not delivered** |
| 11 | `wrongItem` | **Wrong item or qty** |
| 12 | `account` | **Shipping account or address** |
| 13 | `freight` | **Freight or packaging** |
| 14 | `none` | **Not a carrier fault** — the remainder |

6 + 10 + 11 + 12 + 13 + 14 = `claims`, always; the build fails loudly if it does not.

The reason counts are **appended at 10–14, not inserted at 7.** The scorecard's sort map is a
lookup of hard‑coded indices and seven of them sit at 0, 1, 3, 5, 6 and 8; splicing reasons in at 7
would renumber `p90Days` to 8 and silently sort the timing column by the wrong figure.

A claim is read against its `ClaimType`, never re‑read against the prose — the type is the raiser's
own statement of the reason. Only the 524 carrier claims whose type is blank (a third of the 1,640)
fall back to `ClaimDescription`, because otherwise they would land in the remainder for want of a
typed reason rather than for want of a reason.

Derivation and the 1,640 / 353 counts are in [§6](#6-carrier-scorecard).

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
| `ca` | Carrier name or `""` — see §6. Lets a carrier row in the scorecard narrow the queue with the same filter it uses everywhere else. |

The dashboard filters this queue to the selected year. The card pop‑ups break their slice down
by it, and the *View in table* links hand the equivalent scenario to `claims.html`.

### Supporting tables

| Name | Contents |
|---|---|
| `OWNERS` | The four accounts: `MP` Maya Patel (Admin), `DO` Daniel Ortiz, `LF` Lena Fischer, `TR` Tom Reyes (Inactive) |
| `OWNER_OF_DEPT` | Department → owner routing map |
| `AREA_OF_DEPT` | Department → team area map |
| `OWNER_MATRIX` | Per owner: `total open unresolved unfinished credit queue depts` |
| `DEPT_OWNERS` | Per department: `dept owner n credit queue` |
| `ORDERS` | The top 400 order aggregates — every order with more than one claim or an open claim, sorted by claims then credit: `[id, claims, credit, open, deptCount, firstClaim, lastClaim, orderType, owners, carrier]`. The carrier is the derived `""` / `UPS` / `FedEx` / `UPS/FedEx` of §6, collapsed so an order holding both a UPS claim and a both-named claim reports `UPS/FedEx` rather than `UPS/UPS/FedEx` |
| `CARRIER_FACTS` | Per carrier per year and owner — see [above](#carrier_factsyearallallownerid--per-carrier) |
| `CLAIMS` / `CLAIM_FINANCIALS` | 12 real worked examples (mix of resolved, open, denied, with and without a memo, and at least one naming each of `UPS` and `UPS/FedEx`) used by `claim-detail.html`. `CLAIM_FINANCIALS` is an object keyed by claim id holding the memo and invoice fields |
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
| No carrier column | 29,881 (94.8%) of claims name no carrier | A carrier is **derived** from `ClaimDept`, `ClaimType` and `ClaimDescription`, not read from a field — see §6. 1,640 claims name one, 353 of those name two. The scorecard covers only the 1,640 and says so, and a blank on the order pages means "not stated", never a guess |
| No warehouse column | all 31,521 | `add-warehouse.js` appends a mock A–F `Warehouse` column (where the product sat when the fault was found), which `build-data.js` then folds onto the four real site codes (`8825`, `1920`, `1780`, `WC`) so the department page can rank sites. Mocked, not real: see §4.1 |
| Department columns empty | all 31,521 | `Art`, `Production`, `OrderChange`, `Shipping`, `Invoicing`, `Pricing`, `Overseas`, `CustomerService`, `Quoting` are the literal value `0` on every row. They are placeholders. The only populated department field is `ClaimDept`, 47 spellings, collapsed to the nine by `DEPT_MAP` |
| No `Overseas` claims | 0 rows | Listed in the picker as required, and shown with an empty state rather than dropped |
| Currency blank | 31,235 | No conversion is possible; every figure is as‑exported |
| Near‑duplicate departments | 1,351 claims | `Sample Dept`/`Sample Dep.`, `System`/`System Error`, the four `Drinkware*`, `Courier`/`UPS`/`FEDEX`. The last three are the carrier signal: `ClaimDept` is one of the three places a carrier can be read from |
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
| Next step | None — the report is read‑only | Every finding opens a pop‑up that explains it, and every claim‑type and department finding links to the claims already filtered |
| Root cause / repeat / untyped | Not shown | Ranked, measured, and clickable |
| Closed claims | Mixed in | Excluded everywhere |
| Auditability | Unknown provenance | Every number traceable to a column, regenerated by a script |
