const { readFileSync, writeFileSync } = require('fs')

const fixWindowError = () => {
  const file = './node_modules/bitcore-lib/lib/crypto/random.js'
  let fileData = readFileSync(file).toString()
  fileData = fileData.replace('process.browser', 'false')
  writeFileSync(file, fileData)
}

const fixBufferError = () => {
  const file = './node_modules/bitcore-lib/lib/crypto/signature.js'
  let fileData = fs.readFileSync(file).toString()
  fileData = fileData.replace(
    `var Signature = function Signature(r, s) {
  if (!(this instanceof Signature)) {
    return new Signature(r, s);
  }
  if (r instanceof BN) {
    this.set({
      r: r,
      s: s
    });
  } else if (r) {
    var obj = r;
    this.set(obj);
  }
};`,
    `var Signature = function Signature(r, s) {
  if (!(this instanceof Signature)) {
    return new Signature(r, s);
  }
  if (r instanceof BN) {
    this.set({
      r: r,
      s: s
    });
  } else if (r) {
    var obj = r;
    this.set(obj);
  }
  this.r = BN.fromString(this.r.toString(16), 16)
  this.s = BN.fromString(this.s.toString(16),16)
};`
  )
  fs.writeFileSync(file, fileData)
}

const run = async () => {
  let success = true
  try {
    fixWindowError()
    fixBufferError()
  } catch {
    success = false
  } finally {
    console.log('Fix modules result:', success ? 'success' : 'failed')
  }
}

run()
