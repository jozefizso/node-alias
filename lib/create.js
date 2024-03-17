const fs = require('fs')
const path = require('path')
const assert = require('assert')
const encode = require('./encode')

const addon = require('../build/Release/volume.node')

const findVolume = function (startPath, startStat) {
  let lastDev = startStat.dev
  let lastIno = startStat.ino
  let lastPath = startPath

  while (1) {
    const parentPath = path.resolve(lastPath, '..')
    const parentStat = fs.statSync(parentPath)

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

const utf16be = function (str) {
  const b = new Buffer(str, 'ucs2')
  for (let i = 0; i < b.length; i += 2) {
    const a = b[i]
    b[i] = b[i + 1]
    b[i + 1] = a
  }
  return b
}

module.exports = exports = function (targetPath) {
  const info = { version: 2, extra: [] }

  const parentPath = path.resolve(targetPath, '..')
  const targetStat = fs.statSync(targetPath)
  const parentStat = fs.statSync(parentPath)
  const volumePath = findVolume(targetPath, targetStat)
  const volumeStat = fs.statSync(volumePath)

  assert(targetStat.isFile() || targetStat.isDirectory(), 'Target is a file or directory')

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
    name: addon.getVolumeName(volumePath),
    created: volumeStat.ctime,
    signature: 'H+',
    type: (volumePath === '/' ? 'local' : 'other')
  };

  (function addType0 () {
    const b = new Buffer(info.parent.name, 'utf8')

    info.extra.push({
      type: 0,
      length: b.length,
      data: b
    })
  }());

  (function addType1 () {
    const b = new Buffer(4)

    b.writeUInt32BE(info.parent.id, 0)

    info.extra.push({
      type: 1,
      length: b.length,
      data: b
    })
  }());

  (function addType14 () {
    const l = info.target.filename.length
    const b = new Buffer(2 + (l * 2))

    b.writeUInt16BE(l, 0)
    utf16be(info.target.filename).copy(b, 2)

    info.extra.push({
      type: 14,
      length: b.length,
      data: b
    })
  }());

  (function addType15 () {
    const l = info.volume.name.length
    const b = new Buffer(2 + (l * 2))

    b.writeUInt16BE(l, 0)
    utf16be(info.volume.name).copy(b, 2)

    info.extra.push({
      type: 15,
      length: b.length,
      data: b
    })
  }());

  (function addType18 () {
    const vl = volumePath.length
    assert.equal(targetPath.slice(0, vl), volumePath)
    const lp = targetPath.slice(vl)
    const b = new Buffer(lp, 'utf8')

    info.extra.push({
      type: 18,
      length: b.length,
      data: b
    })
  }());

  (function addType19 () {
    const b = new Buffer(volumePath, 'utf8')

    info.extra.push({
      type: 19,
      length: b.length,
      data: b
    })
  }())

  return encode(info)
}
