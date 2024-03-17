/* eslint-env mocha */

const assert = require('assert')
const addon = require('../build/Release/volume.node')

describe('addon', function () {
  it('should find the volume name of /', function () {
    assert.equal(addon.getVolumeName('/'), 'Macintosh HD')
  })
})
