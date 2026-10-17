// (S42 E-05) The app reads a reference quote by what the file SAYS, never its name — so a probe that drops "Dyel Sales Contract.pdf" gives it
// the reference's own words (the fixtures made by make-reference-pdfs.mts). Anything else keeps the probe's own body.
const fs = require('fs')
const path = require('path')
const at = (f) => path.join(__dirname, f)
module.exports = function referenceBytes(name) {
  const n = String(name).toLowerCase()
  if (/(?<![a-z])flo(?![a-z])/.test(n) && !/floor/.test(n)) return fs.readFileSync(at('flo-design-quotation.pdf'))
  if (/(?<![a-z])(dyel|sharon)(?![a-z])|sales[\s_-]*contract/.test(n)) return fs.readFileSync(at('dyel-sales-contract.pdf'))
  if (/(?<![a-z])(cove|stanley)(?![a-z])/.test(n)) return fs.readFileSync(at('cove-interior-quotation.pdf'))
  return null
}
