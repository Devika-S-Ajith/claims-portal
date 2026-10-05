const fs = require('fs');
const str = fs.readFileSync('D:/claims portal/Claim_202609281521.csv', 'utf8');
const parts = str.split('\n');
const cols = parts[0].split(',');
const si = cols.indexOf('ClaimStatus');
const di = cols.indexOf('ClaimDenied');
const ci = cols.indexOf('Canceled');
const ri = cols.indexOf('ClaimResolved');
for (let i = 1; i < parts.length && i < 5; i++) {
  const p = parts[i].split(',');
  console.log(p[si], p[di], p[ci], p[ri]);
}
