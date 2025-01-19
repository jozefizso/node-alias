
var fs = require('fs')
var path = require('path')
var assert = require('assert')
var encode = require('./encode')

var addon = require('../build/Release/volume.node')

var findVolume = function (startPath, startStat) {
  var lastDev = startStat.dev
  var lastIno = startStat.ino
  var lastPath = startPath

  while (1) {
    var parentPath = path.resolve(lastPath, '..')
    var parentStat = fs.statSync(parentPath)

    if (parentStat.dev !== lastDev) {
      return lastPath
    }

    if (parentStat.ino === lastIno) {
      return lastPath
    }

    lastDev = parentStat.dev
    lastIno = parentStat.ino
    lastPath = parentPath
  }
}

var utf16be = function (str) {
  var b = Buffer.from(str, 'ucs2')
  for (var i = 0; i < b.length; i += 2) {
    var a = b[i]
    b[i] = b[i + 1]
    b[i + 1] = a
  }
  return b
}

/**
 * Create an OS X Alias file from a target path.
 * The alias file is returned as a buffer.
 * 
 * In classic Mac OS System 7 and later, and in macOS, an alias is a small file
 * that represents another object in a local, remote, or removable file system
 * and provides a dynamic link to it.
 * 
 * @param {String} targetPath Target path to create alias for.
 * @param {Object} options Optional options with a `volumeName` property to provide volume name on non-Mac platforms.
 * 
 * @returns {Buffer} Alias file in binary format.
 */
module.exports = exports = function (targetPath, options) {
  var info = { version: 2, extra: [] }

  var parentPath = path.resolve(targetPath, '..')
  var targetStat = fs.statSync(targetPath)
  var parentStat = fs.statSync(parentPath)
  var volumePath = findVolume(targetPath, targetStat)
  var volumeStat = fs.statSync(volumePath)

  assert(targetStat.isFile() || targetStat.isDirectory(), 'Target is a file or directory')

  var volumneName = addon.getVolumeName(volumePath) || options.volumeName

  info.target = {
    id: targetStat.ino,
    type: (targetStat.isDirectory() ? 'directory' : 'file'),
    filename: path.basename(targetPath),
    created: targetStat.ctime
  }

  info.parent = {
    id: parentStat.ino,
    name: path.basename(parentPath)
  }

  info.volume = {
    name: volumneName,
    created: volumeStat.ctime,
    signature: 'H+',
    type: (volumePath === '/' ? 'local' : 'other')
  };

  (function addType0 () {
    var b = Buffer.from(info.parent.name, 'utf8')

    info.extra.push({
      type: 0,
      length: b.length,
      data: b
    })
  }());

  (function addType1 () {
    var b = Buffer.alloc(4)

    b.writeUInt32BE(info.parent.id, 0)

    info.extra.push({
      type: 1,
      length: b.length,
      data: b
    })
  }());

  (function addType14 () {
    var l = info.target.filename.length
    var b = Buffer.alloc(2 + (l * 2))

    b.writeUInt16BE(l, 0)
    utf16be(info.target.filename).copy(b, 2)

    info.extra.push({
      type: 14,
      length: b.length,
      data: b
    })
  }());

  (function addType15 () {
    var l = info.volume.name.length
    var b = Buffer.alloc(2 + (l * 2))

    b.writeUInt16BE(l, 0)
    utf16be(info.volume.name).copy(b, 2)

    info.extra.push({
      type: 15,
      length: b.length,
      data: b
    })
  }());

  (function addType18 () {
    var vl = volumePath.length
    assert.equal(targetPath.slice(0, vl), volumePath)
    var lp = targetPath.slice(vl)
    var b = Buffer.from(lp, 'utf8')

    info.extra.push({
      type: 18,
      length: b.length,
      data: b
    })
  }());

  (function addType19 () {
    var b = Buffer.from(volumePath, 'utf8')

    info.extra.push({
      type: 19,
      length: b.length,
      data: b
    })
  }())

  return encode(info)
}
