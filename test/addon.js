/* eslint-env mocha */

var assert = require('assert')
var addon = require('../build/Release/volume.node')

describe('addon on macOS', function () {
  before(function () {
    if (process.platform !== 'darwin') {
      this.skip()
    }
  })

  it('should find the volume name of /', function () {
    assert.equal(addon.getVolumeName('/'), 'Macintosh HD')
  })
})

describe('addon on Linux', function () {
  before(function () {
    if (process.platform === 'darwin') {
      this.skip()
    }
  })

  it('getVolumeName() native functions return null', function () {
    assert.equal(addon.getVolumeName('/'), null)
  })
})
