
var fs = require('fs')


/**
 * Check if a file at path is an OS X alias with a `book\0\0\0\0mark\0\0\0\0` magic header.
 * 
 * In classic Mac OS System 7 and later, and in macOS, an alias is a small file
 * that represents another object in a local, remote, or removable file system
 * and provides a dynamic link to it.
 * 
 * @param {String} path Path to a file to check if it is an alias.
 * 
 * @returns {boolean} Return `true` if the file at path is an alias, otherwise `false`.
 */
module.exports = function isAlias (path) {
  var read
  var fd = fs.openSync(path, 'r')

  try {
    read = Buffer.alloc(16)
    fs.readSync(fd, read, 0, 16, 0)
  } finally {
    fs.closeSync(fd)
  }

  var expected = '626f6f6b000000006d61726b00000000'
  var actual = read.toString('hex')

  return (actual === expected)
}
