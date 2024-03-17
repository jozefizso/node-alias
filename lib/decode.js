const assert = require('assert')
const values = require('./values')

const appleEpoch = Date.UTC(1904, 0, 1)
const appleDate = function (value) {
  return new Date(appleEpoch + (value * 1000))
}

module.exports = exports = function (buf) {
  const info = { volume: {}, parent: {}, target: {}, extra: [] }

  assert.equal(buf.readUInt16BE(4), buf.length)

  info.version = buf.readUInt16BE(6)
  assert.equal(info.version, 2)

  const type = buf.readUInt16BE(8)
  assert(type === 0 || type === 1, 'Type is valid')
  info.target.type = values.type[type]

  const volNameLength = buf.readUInt8(10)
  assert(volNameLength <= 27, 'Volume name is not longer than 27 chars')
  info.volume.name = buf.toString('utf8', 11, 11 + volNameLength)

  const volCreateDate = buf.readUInt32BE(38)
  info.volume.created = appleDate(volCreateDate)

  const volSig = buf.toString('ascii', 42, 44)
  assert(volSig === 'BD' || volSig === 'H+' || volSig === 'HX', 'Volume signature is valid')
  info.volume.signature = volSig

  const volType = buf.readUInt16BE(44)
  assert(volType >= 0 && volType <= 5, 'Volume type is valid')
  info.volume.type = values.volumeType[volType]

  const dirId = buf.readUInt32BE(46)
  info.parent.id = dirId

  const fileNameLength = buf.readUInt8(50)
  assert(fileNameLength <= 63, 'File name is not longer than 63 chars')
  info.target.filename = buf.toString('utf8', 51, 51 + fileNameLength)

  const fileId = buf.readUInt32BE(114)
  info.target.id = fileId

  const fileCreateDate = buf.readUInt32BE(118)
  info.target.created = appleDate(fileCreateDate)

  // var fileTypeName = buf.toString('ascii', 122, 126)
  // var fileCreatorName = buf.toString('ascii', 126, 130)
  // I have only encountered 00 00 00 00

  // var nlvlFrom = buf.readInt16BE(130)
  // var nlvlTo = buf.readInt16BE(132)
  // I have only encountered -1

  // var volAttributes = buf.readUInt32BE(134)
  // I have only encountered 00 00 0D 02

  // var volFSId = buf.readInt16BE(138)
  // I have only encountered 00 00

  const reserved = buf.slice(140, 150)
  assert(reserved[0] === 0 && reserved[1] === 0, 'Reserved is zero-filled')
  assert(reserved[2] === 0 && reserved[3] === 0, 'Reserved is zero-filled')
  assert(reserved[4] === 0 && reserved[5] === 0, 'Reserved is zero-filled')
  assert(reserved[6] === 0 && reserved[7] === 0, 'Reserved is zero-filled')
  assert(reserved[8] === 0 && reserved[9] === 0, 'Reserved is zero-filled')

  let pos = 150

  while (pos < buf.length) {
    const partType = buf.readInt16BE(pos)
    const length = buf.readUInt16BE(pos + 2)
    const data = buf.slice(pos + 4, pos + 4 + length)
    pos += 4 + length

    if (partType === -1) {
      assert.equal(length, 0)
      break
    }

    if (length % 2 === 1) {
      const padding = buf.readUInt8(pos)
      assert.equal(padding, 0)
      pos += 1
    }

    info.extra.push({ type: partType, length, data })

    switch (partType) {
      case 0:
        info.parent.name = data.toString('utf8')
        break
      case 1:
        assert.equal(info.parent.id, data.readUInt32BE(0))
        break
      case 2:
        var parts = data.toString('utf8').split('\0')
        info.target.path = parts[0]
        assert.equal(info.target.filename, parts[1])
        break
      case 14:
        // FIXME
        // Target: name as (16-bit length), (length char utf16be)
        break
      case 15:
        // FIXME
        // Volume: name as (16-bit length), (length char utf16be)
        break
      case 18:
        info.target.abspath = data.toString('utf8')
        break
      case 19:
        info.volume.abspath = data.toString('utf8')
        break
    }
  }

  return info
}
