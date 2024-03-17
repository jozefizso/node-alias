const util = require('util')
const assert = require('assert')
const values = require('./values')

const appleEpoch = Date.UTC(1904, 0, 1)
const appleDate = function (value) {
  if (util.isDate(value) === false) {
    // value = new Date(value);
    throw new TypeError('Not a date: ' + value)
  }

  return Math.round((value.getTime() - appleEpoch) / 1000)
}

module.exports = exports = function (info) {
  assert.equal(info.version, 2)

  const baseLength = 150
  const extraLength = (info.extra || []).reduce(function (p, c) {
    assert.equal(c.data.length, c.length)
    const padding = (c.length % 2)
    return p + 4 + c.length + padding
  }, 0)
  const trailerLength = 4

  const buf = new Buffer(baseLength + extraLength + trailerLength)

  buf.writeUInt32BE(0, 0)

  buf.writeUInt16BE(buf.length, 4)
  buf.writeUInt16BE(info.version, 6)

  const type = values.type.indexOf(info.target.type)
  assert(type === 0 || type === 1, 'Type is valid')
  buf.writeUInt16BE(type, 8)

  const volNameLength = info.volume.name.length
  assert(volNameLength <= 27, 'Volume name is not longer than 27 chars')
  buf.writeUInt8(volNameLength, 10)
  buf.fill(0, 11, 11 + 27)
  buf.write(info.volume.name, 11, 'utf8')

  const volCreateDate = appleDate(info.volume.created)
  buf.writeUInt32BE(volCreateDate, 38)

  const volSig = info.volume.signature
  assert(volSig === 'BD' || volSig === 'H+' || volSig === 'HX', 'Volume signature is valid')
  buf.write(volSig, 42, 'ascii')

  const volType = values.volumeType.indexOf(info.volume.type)
  assert(volType >= 0 && volType <= 5, 'Volume type is valid')
  buf.writeUInt16BE(volType, 44)

  buf.writeUInt32BE(info.parent.id, 46)

  const fileNameLength = info.target.filename.length
  assert(fileNameLength <= 63, 'File name is not longer than 63 chars')
  buf.writeUInt8(fileNameLength, 50)
  buf.fill(0, 51, 51 + 63)
  buf.write(info.target.filename, 51, 'utf8')

  buf.writeUInt32BE(info.target.id, 114)

  const fileCreateDate = appleDate(info.target.created)
  buf.writeUInt32BE(fileCreateDate, 118)

  const fileTypeName = '\0\0\0\0'
  const fileCreatorName = '\0\0\0\0'
  // I have only encountered 00 00 00 00
  buf.write(fileTypeName, 122, 'binary')
  buf.write(fileCreatorName, 126, 'binary')

  const nlvlFrom = -1
  const nlvlTo = -1
  // I have only encountered -1
  buf.writeInt16BE(nlvlFrom, 130)
  buf.writeInt16BE(nlvlTo, 132)

  const volAttributes = 0x00000D02
  // I have only encountered 00 00 0D 02
  buf.writeUInt32BE(volAttributes, 134)

  const volFSId = 0x0000
  // I have only encountered 00 00
  buf.writeUInt16BE(volFSId, 138)

  // Reserved space
  buf.fill(0, 140, 150)

  let pos = 150

  for (let i = 0; i < info.extra.length; i++) {
    const e = info.extra[i]
    assert(e.type >= 0, 'Type is valid')

    buf.writeInt16BE(e.type, pos)
    buf.writeUInt16BE(e.length, pos + 2)
    e.data.copy(buf, pos + 4)
    pos += 4 + e.length

    if (e.length % 2 === 1) {
      buf.writeUInt8(0, pos)
      pos += 1
    }
  }

  buf.writeInt16BE(-1, pos)
  buf.writeUInt16BE(0, pos + 2)
  pos += 4

  assert.equal(pos, buf.length)

  return buf
}
