const fs = require('fs')

module.exports = function isAlias (path) {
  let read
  const fd = fs.openSync(path, 'r')

  try {
    read = new Buffer(16)
    fs.readSync(fd, read, 0, 16, 0)
  } finally {
    fs.closeSync(fd)
  }

  const expected = '626f6f6b000000006d61726b00000000'
  const actual = read.toString('hex')

  return (actual === expected)
}
