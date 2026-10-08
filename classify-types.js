// Classifies claims whose ClaimType column is blank, from the claim's own text.
//   source : D:/claims portal/Claim_202609281521.csv
// A blank ClaimType row is assigned a type in this order:
//   1. its SecondClaimType, if the raiser typed one
//   2. keyword rules over the ClaimDescription (ordered, first match wins)
//   3. a high-confidence ClaimDept default (Sales Tax, Product Defect, ...)
//   4. the type that department's own typed claims use most often - a stand-in
//      for the rows whose description says nothing, so a claim at least lands
//      in its department's bucket instead of (Unclassified)
//   5. otherwise it is left as the residual bucket
// Rows that already carry a ClaimType are never touched.
// `node classify-types.js` rewrites the CSV in place.
// `node classify-types.js --report` only prints coverage/quality, writes nothing.
const fs = require('fs');

const CSV = 'D:/claims portal/Claim_202609281521.csv';

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

// Re-serialise a parsed row back to CSV. A field is quoted exactly when it must
// be, so the whole file round-trips through parseCSV() identically. `\r` in the
// source (none survive parse) is the only reason a field would otherwise split.
function csvField(v) {
  const s = String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

// Preferred (most common) spelling per canonical type, so new rows merge into
// the existing buckets instead of fragmenting into differently-cased ones.
const BEST = {
  'access was not updated': 'Access Was Not Updated',
  'ad was misleading/not enough information': 'Ad Was Misleading/Not Enough Information',
  'art different from what approved': 'Art Different From What Approved',
  'assumed, did not clarify with customer': 'Assumed, Did Not Clarify With Customer',
  'blank order return/restock': 'Blank Order Return/Restock',
  'blank order returned for credit - less restocking': 'Blank Order Returned For Credit - Less Restocking',
  'blank order returned for credit - restock at n/c': 'Blank Order Returned For Credit - Restock At N/C',
  'cancellation due to artist warning': 'Cancellation Due To Artist Warning',
  'cancellation due to lead time (ns or need stock)': 'Cancellation Due To Lead Time (Ns Or Need Stock)',
  'change not completed (paper work not corrected)': 'Change Not Completed (Paper Work Not Corrected)',
  'change was made and did not re-overide pricing': 'Change Was Made And Did Not Re-Overide Pricing',
  'charged for service not given': 'Charged For Service Not Given',
  'client did not notice charge on oc/sdc': 'Client Did Not Notice Charge On Oc/Sdc',
  'client misunderstood the sample policy': 'Client Misunderstood The Sample Policy',
  'coupon mailed but never received/applied to order': 'Coupon Mailed But Never Received/Applied To Order',
  'coupon received after order invoiced': 'Coupon Received After Order Invoiced',
  'customer changed mind': 'Customer Changed Mind',
  'customer denied charges': 'Customer Denied Charges',
  'customer did not understand charges': 'Customer Did Not Understand Charges',
  'customer has higher quality standard': 'Customer Has Higher Quality Standard',
  'customer was not informed of charges': 'Customer Was Not Informed Of Charges',
  'dates or instructions overlooked': 'Dates Or Instructions Overlooked',
  'duplicate order': 'Duplicate Order',
  'factory-overseas order': 'Factory-Overseas Order',
  'fedex/ups did not ship/deliver on time': 'Fedex/Ups Did Not Ship/Deliver On Time',
  'freight miscalcuation/incorrect packaging info': 'Freight Miscalcuation/Incorrect Packaging Info',
  'imprint defect/smuding/partial imprint': 'Imprint Defect/Smuding/Partial Imprint',
  'imprint too small': 'Imprint Too Small',
  'imprinted in wrong loctation/missed location': 'Imprinted In Wrong Loctation/Missed Location',
  'imprints rubbing off': 'Imprints Rubbing Off',
  'ink not dried, smeared/stuck together': 'Ink Not Dried, Smeared/Stuck Together',
  'instructions not followed': 'Instructions Not Followed',
  'item is no longer available': 'Item Is No Longer Available',
  'items missing/not shipped': 'Items Missing/Not Shipped',
  'mis-quote - missing charges': 'Mis-Quote - Missing Charges',
  'net pricing emailed/faxed to end user': 'Net Pricing Emailed/Faxed To End User',
  'no unders/overs requested': 'No Unders/Overs Requested',
  'order did not ship on time (ship date requested)': 'Order Did Not Ship On Time (Ship Date Requested)',
  'order refused by ariel/cancel/restock': 'Order Refused By Ariel/Cancel/Restock',
  'order was lost during shipping': 'Order Was Lost During Shipping',
  'past due accounts': 'Past Due Accounts',
  'poor imprint quality': 'Poor Imprint Quality',
  'prev order cancelled - same/new order submitted': 'Prev Order Cancelled - Same/New Order Submitted',
  'product altered since previous order': 'Product Altered Since Previous Order',
  'product damage during/after shipping': 'Product Damage During/After Shipping',
  'product defect': 'Product Defect',
  'quote expired': 'Quote Expired',
  'sales tax': 'Sales Tax',
  'shipping account not used': 'Shipping Account Not Used',
  'shipping acct # overlooked': 'Shipping Acct # Overlooked',
  'special price not documented': 'Special Price Not Documented',
  'special pricing not noted in access': 'Special Pricing Not Noted In Access',
  'systme did not save': 'Systme Did Not Save',
  'unable to use or invalid shipping account number': 'Unable To Use Or Invalid Shipping Account Number',
  'unders/overs requested': 'Unders/Overs Requested',
  'wrong art - with customer approval': 'Wrong Art - With Customer Approval',
  'wrong art - without customer approval': 'Wrong Art - Without Customer Approval',
  'wrong charges(did not follow quote)': 'Wrong Charges(Did Not Follow Quote)',
  'wrong customer account': 'Wrong Customer Account',
  'wrong imprint color': 'Wrong Imprint Color',
  'wrong item color': 'Wrong Item Color',
  'wrong items': 'Wrong Items',
  'wrong price': 'Wrong Price',
  'wrong price on customer p.o.': 'Wrong Price On Customer P.O.',
  'wrong price on customer po': 'Wrong Price On Customer P.O.',
  'wrong qty': 'Wrong Quantity',
  'wrong quantity': 'Wrong Quantity',
  'wrong shipping account': 'Wrong Shipping Account',
  'wrong shipping address': 'Wrong Shipping Address',
  'wrong shipping labels (orders swapped)': 'Wrong Shipping Labels (Orders Swapped)',
  'wrong shipping method': 'Wrong Shipping Method'
};
const canonLabel = (t) => {
  const k = String(t).toLowerCase().trim();
  return BEST[k] || t;
};

// ---------------------------------------------------------------- rules
// Ordered - the first rule whose pattern matches the description wins, so the
// specific beats the general and every row lands on exactly one type.
const RULES = [
  // ---- order-level ----
  ['Duplicate Order', /\bduplicate\b|double (order|entry)|two (orders|entries)|same order (placed|entered) twice|accident.*(order|entry)|placed (the\s*)?same order/],
  ['Prev Order Cancelled - Same/New Order Submitted', /prev(ious)? ?order (was|is|got)? ?cancell|previous.*cancelled.*(re.?enter|new order)|cancell(ed|ation).*(re.?enter(ed)?|new order).*(same|new)/],
  ['Cancellation Due To Lead Time (Ns Or Need Stock)', /cancell(ed|ation).*(lead ?time|n\.?s\.?|need stock|leadtime)|lead ?time.*(cancell|too long)|need stock/],
  ['Cancellation Due To Artist Warning', /cancell(ed|ation).*artist|artist.*(warning|cancell)/],
  ['Order Refused By Ariel/Cancel/Restock', /refus(ed)?.*(order|shipment)|order (was )?(refused|denied)|cancel.*restock|restock.*cancel/],
  ['Customer Changed Mind', /changed (their|her|his|the|cust)? ?mind|change (their|her|his)?.?mind|no longer (want|wants|need|needs|interested)|decided (they|she|he|the cust).?(don'?t|do not|doesn'?t|does not|didn'?t|did not) (want|need)|(didn'?t|did not) (want|need) (it|them|the product|the order)/],
  ['Item Is No Longer Available', /no longer (available|carried|sold|made|offered)|discontinue(d)?|no longer (in )?(stock|production|catalog|catalogue|catolog)/],
  ['Product Altered Since Previous Order', /product.*(chang(ed|es|ing)|alter(ed|s|ing) since)|alter(ed)?.*(since|from) (previous|prior|last|the last)|since (the )?last (time|order|purchase).*(chang|alter)|(chang|alter).* (from|since) (the )?last order/],
  ['Blank Order Returned For Credit - Restock At N/C', /blank.*return.*restock.*n\/c|restock.*at n\/c|blank order.*n\/c/],
  ['Blank Order Return/Restock', /\bblank order\b|unprinted|unimprinted|blank (pieces|pens|anys|items)|(return(ed|s)?|credit(ed|ing)?|send(ing|s)?( back)?).{0,80}(blank|unprinted|unimprinted|unused|without (imprint|print)|no (imprint|print))|restock(ing)? (fee)?/],
  ['Client Misunderstood The Sample Policy', /sample policy|policy.*(sample|samples)|sample.*policy|misunderstood.*sample/],

  // ---- art ----
  ['Art Different From What Approved', /art (work|work\s)?(is|was|looks)? ?(different|differs|diffrent)|(different|differs?) (than|from|then) .*(approved|art|proof)|proof.*(different|did not match|does not match|not match)|not (match|like|as|what).*(approved|art|proof)|art.*(not|never|wasn'?t|didn'?t).*(approved|as approved|what was approved|as the proof)|(art|artwork).*(off|wrong) vs.*(approved|proof)/],
  ['Art Approve', /customer (approved|approval|ok|agreed|accepted)|approved.*(by|customer)|with customer approv|ok.*(by)?.*customer/],
  ['Wrong Art - Without Customer Approval', /wrong (art|artwork)|art.*wrong|incorrect (art|artwork)|sent (the )?wrong.*(art|artwork|proof)|art(work)?.*(error|mistake)|(art|artwork).*chang(ed|es|ing)?|chang(ed|es|ing).*(art|artwork)|proof.*(wrong|incorrect|error)/],

  // ---- imprint ----
  ['Imprints Rubbing Off', /(imprint|print|ink).*(rubb|rubs|rub|wear|wearing).*off|\brub(bing|s|bed)? ?off|wear(s|ing)? off/],
  ['Ink Not Dried, Smeared/Stuck Together', /ink.*(not (dry|dried)|smear|smud)|smear(ed|s)?|smud(ge|g|ing)?|not (dry|dried)|stuck (together|to (each )?other)/],
  ['Imprint Too Small', /imprint.*(too small|smaller|small size)|(too )?small.*(imprint|print)|print.*too small\b/],
  ['Imprinted In Wrong Loctation/Missed Location', /wrong (location|loctation)|missed (the|a)? ?(location|spot|placement|position|side)|imprint.*(wrong|missed|missing).*(location|place|side|spot)|(imprint|print).*(not|never).*(in the|on the|on).*(right|correct|proper)|only printed (one|1) side|imprint.*(only|on only).*(one|1).*side|missed.*imprint/],
  ['Wrong Imprint Color', /imprint.*color|color.*(imprint|print)|print.*color/],
  ['Wrong Item Color', /wrong (item )?color|wrong (the )?color|color.*(wrong|incorrect|different|not as)|(came|arrived|received).*(in)? ?(the )?wrong color|colour/],
  ['Wrong Items', /wrong items|wrong item\b(?! ?color| ?colour)|wrong (products?|merch(andise)?|th(ing|ings))|(wrong|incorrect).*(items?|products?|merch(andise)?)|sent (her|him|them|the customer|us) (the )?wrong|received (the )?wrong (item|items|product)|wrong thing/],
  ['Imprint Defect/Smuding/Partial Imprint', /imprint.*(defect|smud|partial|blank|missing|incomplete|didn'?t|did not|not|mark|marking)|partial imprint|blank imprint|bad (imprint|print)|imprint.*(didn'?t|did not|not) (take|show|apply|cure)|imprint.*(had|has) (issues|problems)|(imprint|print).*(too light|faint|on back|on wrong)|not printed straight|printed (straight|crooked|wavy)|crooked|wavy|out of line/],
  ['Poor Imprint Quality', /imprint quality|quality.*(imprint|print)|print quality|pressing quality|(imprint|print).*(badly|poorly).*(print|done)/],

  // ---- item quality ----
  ['Customer Has Higher Quality Standard', /higher quality standard|higher.*(quality)?.*standard|quality standard|did not meet .*(expectation|standard|quality)|not (up to|meet(ing)?).*(expectation|standard|quality)|poor quality.*(product|material|items?)|quality.*(issue|problem)|(not|no) confidence.*(product|quality)|not (happy|satisfied|pleased).*(quality|product|items?)|quality.*(was|is)? ?(not acceptable|unacceptable|poor|low)/],
  ['Product Defect', /\bdefect(ive)?\b|does ?n'?t work|do ?n'?t work|did ?n'?t work|not working|stopped? working|stop( ped)? working|malfunction(ed|ing)?|dead (battery|batteries)|batter(y|ies).*dead|won'?t (charge|turn|light|work|power)|not (functioning|operating|functional)|faulty|came (apart|off|loose)|(broke|broke ?apart)|no power|flicker(ing|s)?|\bglitch(es|ing)?|\bburst(ing|s|ed)?|explod(ing|es|ed)?|\bleak(s|ing|ed)?\b/],
  ['Product Damage During/After Shipping', /damage|damaged|scratched|scratch|cracked|cracking|crack|\bchipped\b|\bdented\b|dents?|bent|crush(ed)?|smashed|warped|torn|ripped|broken|\bbroke\b|shattered|caved in/],

  // ---- content / delivery ----
  ['No Unders/Overs Requested', /wanted ?eq\b|exact (qty|quantity)|\beq\b.*(charge|credit|qty|\d)|no unders|unders.?overs|over.?runs? (not|no)? ?(wanted|requested)/],
  ['Fedex/Ups Did Not Ship/Deliver On Time', /(?<!mock )(?<!re-?set )(?<!set )(?<!top )(?<!pick )(?<!clean )(?<!follow )(?<!start )ups\b|fed ?ex|fedEx/],
  ['Order Did Not Ship On Time (Ship Date Requested)', /did not ship on time|ship date requested|requested.*ship date|ship.*(was|is)? ?(delayed|late|not on time)|not shipped on time|missed.*(ship|shipping).*date|ship.*(by|on|for) (the )?requested|needed.*by.*(date|time).*(missed|not|too late)/],
  ['Order Was Lost During Shipping', /(order|package|shipment|parcel|carton|box|goods) (was|is|has|got)? ?lost|lost (in|during|by|at) (shipping|transit|the mail|mail|ups|fedex|courier|freight)|lost.*(package|order|shipment|parcel|box)|(ups|fedex|courier) lost|lost.*(in|during|at).*shipping/],
  ['Wrong Quantity', /wrong (qty|quantity)|wrong (the )?qty|wrong.*(qty|quantity)|short (by )?(\d+|a few|one|two|three|four|five|six|seven|eight|nine|ten)|(\d+|a few|one|two|three|four|five|six|seven|eight|nine|ten) (pcs|pieces?|units?)?\s*short|missing (by )?\d+|(received|got|receiv\w*) (only|just) ?(\d+|half|part)|(received|got) only (\d+|half|part)|did not (receive|get) (all|the (full|complete|rest))|under.?ship(ped|ping)?|\bshort (us|them|you|cust)|(\d+|a couple|a few).{0,20}(instead of|rather than).{0,20}\d+|quantit|qty/],
  ['Items Missing/Not Shipped', /not shipped|items? (was|were|is|are|got)? ?(missing|not (received|shipped))|missing (items?|pieces?|goods|units?|stock|stuff)|(items?|pieces?|goods|units?|stuff) (missing|short)\b|entire (order|shipment).*(missing|not received|not shipped|never sent)|never (received|got) (the|this|our|their)? ?(order|shipment|package)|did not (receive|get) (the|this|their|our)? ?(order|shipment|package)|(the|this|your|our) (order|shipment|package) (was|is|got)? ?(not|never) (received|delivered|shipped|sent)|didn'?t (receive|get) (the|this)? ?(order|shipment|package|items)|something.*(missing|short|didn'?t ship)|(didn'?t|did not|never) (send|ship) (the|this|my|our|their|everything)|missing.*(lot|carton|box|case)|short.?ship(ped|ping)?|(didn'?t|did not) (get|receive) everything/],
  ['Wrong Shipping Labels (Orders Swapped)', /wrong shipping labels|labels? (were|are|got)? ?(swapped|mixed|switched|wrong)|orders? (were|are)? ?(swapped|mixed|switched)|swapped.*(order|label)|mixed.*(order|label)/],
  ['Wrong Shipping Address', /wrong shipping address|wrong address|incorrect address|wrong.*address|ship(ped|ping)? to (the )?wrong (address|place|town|city|location)|(sent|shipped).*to wrong|addressed? to the wrong|deliver(ed)?.*wrong (address|place)/],
  ['Wrong Shipping Method', /wrong shipping method|wrong (ship|shipping|freight|delivery) method|shipping method.*(wrong|incorrect)|wrong (ship )?(method|service|freight|carrier|upgrade)|freight.*(wrong|incorrect).*(method|carrier|service)/],

  // ---- money / pricing ----
  ['Unable To Use Or Invalid Shipping Account Number', /unable to use|invalid (shipping )?account|account.*(invalid|no longer)/],
  ['Shipping Account Not Used', /shipping account not used|account (was|is|got)? not used|did not use .*account|never used.*account|not using.*(account|acct)/],
  ['Shipping Acct # Overlooked', /shipping acct.*overlooked|acct ?#?.*overlooked|overlooked.*(acct|account)|forgot.*(acct|account)|(forgot|missed).*(shipping )?(acct|account)/],
  ['Wrong Customer Account', /wrong customer account|wrong.*customer acct|customer account.*(wrong|incorrect)/],
  ['Wrong Shipping Account', /shipper account|shipper acct|wrong (shipping|shipper|ups|fedex|our|their) account|wrong.*account number|incorrect (shipping|account).*number|wrong.*(acct|account)|(keyed|entered|typed|punch(ed)?|used).*(wrong|incorrect).*(account|acct)|used (the )?incorrect one|(account|acct).*(not (picked|loaded|used|added))|not (picked|entered|used).*(acct|account)|under (their|customer|customers|her|his|our) acct|our acct|their acct|should have (gone|been) (under|on) (their|the|customers) acct/],
  ['Wrong Shipping Method', /wrong (ship|shipping|freight|delivery) method|wrong shipping method|shipping method.*(wrong|incorrect)|wrong (ship )?(method|service|freight|carrier|upgrade)|freight.*(wrong|incorrect).*(method|carrier|service)|shipped (ground|overnight|2nd ?day|3rd ?day|standard).*(should|supposed)|(ground|overnight|2nd ?day).*(should|supposed).*(have|be)|should have (shipped|been shipped|gone) (via|by) (ups )?(next ?day|ground|overnight|2nd ?day)|went (ground|overnight|next ?day).*in error|shipped (ground|overnight|next ?day).*(error|wrong|should not)|shipping charges.*(next ?day|2 ?day)|(next ?day|2 ?day|ground).*(was|were).*(supposed|should)/],
  ['Wrong Shipping Address', /wrong shipping address|wrong address|incorrect address|wrong.*address|ship(ped|ping)? to (the )?wrong (address|place|town|city|location)|(sent|shipped).*to wrong|addressed? to the wrong|deliver(ed)?.*wrong (address|place)/],
  ['Wrong Shipping Labels (Orders Swapped)', /wrong shipping labels|labels? (were|are|got)? ?(swapped|mixed|switched|wrong)|orders? (were|are)? ?(swapped|mixed|switched)|swapped.*(order|label)|mixed.*(order|label)/],
  ['Sales Tax', /sales ?tax|\btax(es)?\b/],
  ['Freight Miscalcuation/Incorrect Packaging Info', /\bfreight\b|\bfrt\b|packaging issue|accessorial|pallet/],
  ['Mis-Quote - Missing Charges', /mis-?quote|missing charges|missed (the|a|some)? ?(charge|charges|set.?up|fee)|quote.*(did not|didn'?t|failed|fail).*(include|cover|have)|(forgot|did not|didn'?t).*(include|add|charge).*(charge|fee|set.?up)|quoted.*(lower|higher).*than|quote (did|was).*(not|wrong|incomplete)|forgot.*set.?up|overlooked.*(set.?up|charge)/],
  ['Wrong Charges(Did Not Follow Quote)', /did not follow|not (follow|following)|fail(ed)? to follow|not (as|per|in line with|according to).*(quote|what was)|per (the|our|their)? ?(quote|quotation|original quote)|quote.*(should|would|said|say|says|shows)|supposed to be (waived|free|no charge)|should (have|of)? ?been waived|waiv(ed|e)?.*(per|agreed|agreement)|agreement.*(waiv|charge)|agreed.*(waiv|no charge|free|not charge)|set.?up (charge|fee).*(waiv|good.?will|should|credit|supposed)|typesett|type.?set (fee|charge).*(waiv|should|credit|supposed)|pms charge.*(waiv|should|credit|after|stock)|re.?set up (fee|charge)|plate.{0,50}(waiv|should|supposed|credit)|(set ?up|setup|plate|sep) (charge|fee) should|(should|supposed).{0,30}waiv.{0,30}(plate|set|sep)/],
  ['Wrong Price On Customer P.O.', /wrong price on|price on (the )?(customer|cust|their|his|her|your)? ?(po|p\.o\.|order)|(customer|cust) (po|p\.o\.) .*price|po.*(price|priced)|(price|priced).*(on the )?(po|p.o\.)/],
  ['Special Pricing Not Noted In Access', /special (pricing|price).*(access|system)|(access|system).*(not|never).*(note|record|update)|not noting.*(access|system)|(note|record|update) (in|on) (the )?access/],
  ['Special Price Not Documented', /special (price|pricing|pric)|(agreed|agreement|deal|quote|promo|sq|eq|co.?op).*(price|pricing|rate)|not (documented|recorded|noted|entered|written)|did not (document|record|note|enter|write).*(price|pricing)|no (documentation|record|note).*(price|quote|pricing)|not in (the )?system|never (noted|entered|documented)/],
  ['Change Was Made And Did Not Re-Overide Pricing', /change( was| has| is| got)? ?(made|done|entered).*(pric)|did not.*(re-?overide|override)|re-?overide.*(pric|not)|overide.?d?.*(not)?|pricing.*(re-?overide|override)|not.*(re-?overide|override)/],
  ['Change Not Completed (Paper Work Not Corrected)', /change (wasn'?t|was not|not|did not|didn'?t) (completed|done|made|entered|processed)|not completed|did not complete.*(change|order)|paper ?work.*(not|incorrect|wrong|correct)|paperwork.*(corrected|not)|(change|order).*(not|never).*(corrected|processed|updated)/],
  ['Assumed, Did Not Clarify With Customer', /\bassum(ed|e)|did not clarify|didn'?t clarify|did not (ask|confirm|check|verify).*(customer|cust|with)/],
  ['Access Was Not Updated', /access.*(not|never|didn'?t|did not).*(updated|changed|saved|entered)|not updated|update(d)?.*(in|on) (the )?access|access (did not|didn'?t) (update|save)|access database|access.*(problem|issue|glitch)/],
  ['Systme Did Not Save', /systme|system (did not|didn'?t|never).*(sav|update)|did not (sav|save)|didn'?t (sav|save)|not (sav|save)(ed)?\b|couldn'?t (sav|save)|(sav|save).*(did not|didn'?t|failed)/],
  ['Wrong Price', /wrong price|priced wrong|incorrect price|price.*(wrong|incorrect|error|mistake|higher|lower|different|off|over)|pricing.*(wrong|incorrect|error|mistake)|over.?charg(e|ed)|charged (the )?wrong|(price|pricing) (should|was supposed|is supposed)|\bprice\b.*(higher|lower|more|less) than|pricing.*(differs|did not match)|transpos|should have been (entered|keyed|priced|at)|quoted|quote ?#|per (the|our)? ?(quote|quotation)|(price|pricing|cost|rate).*(entry|keyed|entered|showing|load(ed|ing)?|did not (match|load|apply)|not (match|load|applied|correct))|(wrong|incorrect|error|mistake) (price|pricing|cost|rate)\b|duty|brokerage|remove (the )?(duty|brokerage|brokerge)|run charge.*(chang|wrong|error)|(item )?cost.*(should (be|have)|supposed|clearance|closeout)|fob pricing|(clearance|closeout).*(price|cost)/],
  ['Quote Expired', /quote.*(expir|expired)|expired.*quote/],
  ['Customer Denied Charges', /\bdenied\b|deny(ing)?|refus(ed|es|ing)? to (pay|accept|cover)|would ?n'?t pay|did not (want|accept|approve|authorize).*(charge|fee)|short[- ]?paid|under[- ]?paid|short ?pay|disput|not (pay|paying|accepting)|won'?t pay|never authori/],
  ['Customer Was Not Informed Of Charges', /not (informed|advised|told)|wasn'?t (informed|told|advised)|never (informed|told|advised|mentioned)|did not (inform|tell|advise)|didn'?t (know|realize).*(charge|fee|price|pricing)|unaware (of|about).*(charge|fee|price|cost)|not aware (of).*(charge|fee|price)|did not know about|never (was|were) (told|advised)/],
  ['Customer Did Not Understand Charges', /did (not|n'?t) understand|didn'?t understand|misunderstood|confused .*(charge|fee|price)|(didn'?t|couldn'?t) understand.*(charge|fee|price)/],
  ['Client Did Not Notice Charge On Oc/Sdc', /did (not|n'?t) notice|notice (on|the)? ?(oc|sdc|order confirmation|invoice)|overlooked.*(charge|fee|oc|sdc)|didn'?t (see|notice).*(charge|fee)|did not (see|notice).*(charge|fee)/],
  ['Charged For Service Not Given', /charge(d|s)? .*(not|never|no|without).*(given|provided|received|rendered|performed)|service.*(not|never).*(given|provided|rendered)|(not|never) (got|received) (the )?(service|service fee)|(charge|charged|bill).*(for|on) (a )?(service|fee|set.?up|setup|typesett)|charged .*in error|in error.*charged|billed in error/],
  ['Dates Or Instructions Overlooked', /dates?.*(overlooked|missed|not)|overlooked.*dates?|instructions?.*(overlooked|missed|not correct)|(overlooked|missed).*(instructions?|info|spec)/],
  ['Instructions Not Followed', /instructions? (not|wasn'?t|weren'?t|did not|didn'?t).*(followed|given|complete)|did not follow .*instructions|not follow(ing|ed).*(instructions?|spec)|(followed|did).*(instructions?|spec).*(wrong|not|incorrect)|didn'?t follow/],
  ['Coupon Received After Order Invoiced', /coupon.*(received|arrived|came) after|coupon.*after.*(invoice|order|shipped)|after.*invoice.*coupon|received.*coupon.*after/],
  ['Coupon Mailed But Never Received/Applied To Order', /coupon.*(not|never).*(received|applied|used)|did not (receive|apply).*coupon|coupon.*mail|never.*coupon/],
  ['Net Pricing Emailed/Faxed To End User', /net pricing|net.*price.*(fax|email|fwd)|(email(ed)?|fax(ed)?).*price|customer.*price.*(email|fax)/],
  ['Past Due Accounts', /past ?due|past-due/],
  ['Factory-Overseas Order', /factory|overseas|over.?seas (order|items?|shipment)/],
  ['Unders/Overs Requested', /unders.?overs (requested|accepted|ok)|over.?runs? (ok|approved|requested)|extra.*(piece|pc|pcs).*(ok|approved|fine)/]
];

// High-confidence ClaimDept -> type defaults, for rows whose description says
// nothing. Only pairs where the department names the claim's own subject.
const DEPT_DEFAULTS = {
  'Sales Tax': 'Sales Tax',
  'Product Defect': 'Product Defect',
  'Factory': 'Product Defect',
  'Stock': 'Product Defect',
  'UPS': 'Fedex/Ups Did Not Ship/Deliver On Time',
  'FEDEX': 'Fedex/Ups Did Not Ship/Deliver On Time',
  'Order Log': 'Duplicate Order',
  'Shortage': 'Items Missing/Not Shipped',
  'Drinkware Damage': 'Product Damage During/After Shipping',
  'Marketing': 'Ad Was Misleading/Not Enough Information',
  'Customer Goodwill': 'Customer Goodwill'
};

// The carrier rule must run as a special case: pattern 15 above is only a
// trigger for "found that UPS/FedEx word", and this helper supplies the reason.
const CARRIER_LATE = /did not (ship|deliver)|(not|never) (shipped|delivered|arriv|received)|deliver(ed)? on time|on time|late|delay(ed|s)?|never (arriv|showed)|tracking|still (missing|pending)|missed (the )?commit|ship date/;
const CARRIER_NEEDS_CONTEXT = RULES[15];

// Step 4: for every ClaimDept, the ClaimType its own typed claims carry most
// often. Counted off the rows the raiser filled in and built before any write
// happens, so the fills can never feed their own map. It is a stand-in, not a
// diagnosis - it exists to keep a claim inside its department's bucket.
function deptModal(rows, header, C) {
  const tally = new Map();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length !== header.length) continue;
    const t = (r[C['ClaimType']] || '').trim();
    const d = (r[C['ClaimDept']] || '').trim();
    if (!t || !d) continue;
    if (!tally.has(d)) tally.set(d, new Map());
    const m = tally.get(d);
    m.set(t, (m.get(t) || 0) + 1);
  }
  const out = {};
  for (const [d, m] of tally) {
    const best = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
    out[d] = canonLabel(best[0]);
  }
  return out;
}

function classify(dept, second, desc, deptType) {
  if (second && String(second).trim()) return canonLabel(second);
  const text = String(desc);
  if (text.trim()) {
    const d = ' ' + text.toLowerCase().replace(/\s+/g, ' ') + ' ';
    for (let i = 0; i < RULES.length; i++) {
      const [label, re] = RULES[i];
      if (label === 'Fedex/Ups Did Not Ship/Deliver On Time') {
        if (re.test(d) && CARRIER_LATE.test(d)) return label;
        continue;
      }
      if (label === 'Art Approve') continue; // split marker, never emits
      if (re.test(d)) return label;
    }
  }
  if (dept && DEPT_DEFAULTS[dept]) return DEPT_DEFAULTS[dept];
  if (dept && deptType && deptType[dept]) return deptType[dept];
  // A discretionary goodwill credit: only used when the raiser's own department
  // says the word, and only after every cause rule above has said nothing.
  if (dept === 'Customer Goodwill') return 'Customer Goodwill';
  return '';
}

// ---------------------------------------------------------------- run
const REPORT = process.argv.includes('--report');

function load() {
  const rows = parseCSV(fs.readFileSync(CSV, 'utf8'));
  const header = rows[0];
  const C = {};
  header.forEach((h, i) => C[h] = i);
  const g = (r, k) => (r[C[k]] === undefined ? '' : String(r[C[k]]).trim());
  return { rows, header, C, g };
}

function run({ report }) {
  const { rows, header, C, g } = load();
  const deptType = deptModal(rows, header, C);
  const perType = new Map();
  const nullRow = [];
  const changed = [];
  const noDesc = [];
  const deptFills = new Map();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length !== header.length) continue;
    if (g(r, 'Claim#') === '') continue;
    if (g(r, 'ClaimType') !== '') continue; // never touch a typed row
    const dept = g(r, 'ClaimDept');
    const label = classify(dept, g(r, 'SecondClaimType'), g(r, 'ClaimDescription'), deptType);
    perType.set(label, (perType.get(label) || 0) + 1);
    // What the text alone could not decide, the department decided for it.
    if (label && label !== classify(dept, g(r, 'SecondClaimType'), g(r, 'ClaimDescription'))) {
      deptFills.set(dept, (deptFills.get(dept) || 0) + 1);
    }
    if (label) changed.push([i, label]);
    else {
      const ds = g(r, 'ClaimDescription');
      nullRow.push([g(r, 'Claim#'), dept, ds]);
      if (!ds.trim()) noDesc.push(nullRow.length - 1);
    }
  }

  const blankTotal = rows.length - 1;
  console.log('blank ClaimType rows:', [...perType.values()].reduce((a, b) => a + b, 0));
  console.log('assigned a type:', changed.length, '| of those from the department stand-in:', [...deptFills.values()].reduce((a, b) => a + b, 0));
  console.log('left unclassified:', nullRow.length, '| of those with no description:', noDesc.length);

  if (report) {
    console.log('\n-- filled from the department stand-in (dept -> type, top 25) --');
    for (const [d, n] of [...deptFills.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
      console.log(String(n).padStart(5), JSON.stringify(d), '->', JSON.stringify(deptType[d]));
    }
    console.log('\n-- per-type assignment --');
    for (const t of [...perType.entries()].filter(([k]) => k).sort((a, b) => b[1] - a[1])) {
      console.log(String(t[1]).padStart(5), JSON.stringify(t[0]));
    }
    console.log('\n-- unclassified WITH description - word frequency (top 60) --');
    const words = new Map();
    const stop = new Set(('the and that this with from - , . , a for was were have had has his her their our your them they his their she he it its or but not no on onto of to in per issue credit credited will would can could should do did does is are i me my as per at be product order customer sample items pieces pcs qty total amt amount rest cause they its due for on').split(' '));
    for (const [id, dept, ds] of nullRow) {
      const t = String(ds).toLowerCase().replace(/[^a-z0-9 .#/&-]+/g, ' ');
      for (const w of t.split(/\s+/)) {
        if (w.length < 3 || /^\d/.test(w) || stop.has(w) || /\b(credit|issue|net|charge)\b/.test(w)) continue;
        words.set(w, (words.get(w) || 0) + 1);
      }
    }
    for (const [w, n] of [...words.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60)) console.log(String(n).padStart(5), w);

    console.log('\n-- unclassified WITH description - samples (up to 50) --');
    let shown = 0;
    for (const [id, dept, ds] of nullRow) {
      if (!String(ds).trim()) continue;
      console.log('#' + id, '| dept=' + JSON.stringify(dept), '|', JSON.stringify(String(ds).slice(0, 130)));
      if (++shown >= 50) break;
    }

    console.log('\n-- precision check: rules vs existing typed rows --');
    const agree = { n: 0, wrong: 0 };
    const conflicts = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (r.length !== header.length) continue;
      const t = g(r, 'ClaimType');
      if (!t) continue;
      const pred = classify(g(r, 'ClaimDept'), '', g(r, 'ClaimDescription')); // rules on desc only
      if (!pred) continue; // rules silent on this desc - no opinion, no risk
      agree.n++;
      if (pred !== canonLabel(t)) {
        agree.wrong++;
        if (conflicts.length < 40) conflicts.push([g(r, 'Claim#'), t, pred, g(r, 'ClaimDescription').slice(0, 90)]);
      }
    }
    const sameDeptDefault = 0;
    console.log("rules fire on " + agree.n + " typed rows | disagree with the raiser's type: " + agree.wrong +
      ' (' + Math.round(agree.wrong / agree.n * 100) + '%)');
    for (const [id, actual, pred, ds] of conflicts) {
      console.log('#' + id, 'typed=' + JSON.stringify(actual), 'rule=' + JSON.stringify(pred), '|', JSON.stringify(ds));
    }
  } else {
    // write back: only the ClaimType column of blank rows changes, and the rest
    // must survive byte-for-byte after a re-parse.
    const filled = new Set(changed.map(([i]) => i));
    for (const [i, label] of changed) rows[i][C['ClaimType']] = label;
    const out = rows.map((r) => r.map(csvField).join(',')).join('\n') + '\n';
    fs.writeFileSync(CSV, out, 'utf8');

    // Round-trip check: re-parse what we wrote and diff every field against the
    // pre-change rows, allowing only the ClaimType cell on rows we filled.
    const after = parseCSV(out);
    if (after.length !== rows.length) throw new Error('row count changed: ' + rows.length + ' -> ' + after.length);
    let bad = 0, checked = 0;
    for (let i = 0; i < rows.length; i++) {
      if (after[i].length !== rows[i].length) { bad++; continue; }
      for (let k = 0; k < rows[i].length; k++) {
        if (k === C['ClaimType'] && filled.has(i)) continue;
        if (after[i][k] !== rows[i][k]) { bad++; if (bad < 6) console.log('DIFF row', i, 'col', k, JSON.stringify(rows[i][k]), '->', JSON.stringify(after[i][k])); }
      }
      checked++;
    }
    console.log('round-trip check: ' + (bad ? 'FAILED (' + bad + ' diffs)' : 'clean') + ' (' + checked + ' rows)');
    console.log('wrote ' + CSV + '  (' + changed.length + ' cells filled)');
  }
}

if (require.main === module) run({ report: REPORT });
module.exports = { parseCSV, classify, canonLabel, run };