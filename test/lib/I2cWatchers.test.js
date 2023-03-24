/**
 * Tests watcher functionality on an I2C dongle
 *
 * This test requires an actual Dongle to be present.
 * The test runner will have already connected to the dongle and
 * run Dongle.initialize() before we get here
 *
 * @type       {Function}
 */

import chai from 'chai';
const expect = chai.expect;

describe.skip('I2C Tests', function() {

  // runs before any of the tests in this group
  before(async function() {
    //...
  });


  // runs before any of the tests in this group
  after(async function() {
    //...
  });

  describe('Device Interface Configuration', function() {

    it('Accepts the CONFIGURE command', async function() {

      let response = await this.device.configureI2c();

      response = await this.device.readInterface();

      expect(response).to.be.an('object');
      expect(response.mode).to.equal('i2c');
      expect(response.protocol).to.equal('cs1108');
      expect(response.status).to.be.an('object');

      // it isn't really a dongle error if the I2C interface reports as 'down'
      // (no controller attached) but the other tests are gonna fail in that case
      // so we might as well report it now
      expect(response.status.up).to.equal(true)

    });


  });

  describe('Device Memory Read/Write', function() {

    it('Reads several items from memory', async function() {

      let results = await Promise.all([

        // serial number
        this.device.readMemory(0x01, 0x03FB, 4),

        // Product ID
        this.device.readMemory(0x01, 0x03F9, 2),

        // fault code
        this.device.readMemory(0x01, 0x0038, 1),

        // fault log
        this.device.readMemory(0x01, 0x0070, 16),

        // meters
        this.device.readMemory(0x01, 0x01A0, 8),

      ]);

      console.log(results);

      expect(results[0]).to.have.length(4);

    });


    it('Writes several items to memory', async function() {

      let buf = Buffer.alloc(16).fill(0x00);
      let results = await Promise.all([

        // fault log filled
        this.device.writeMemory(0x01, 0x0070, buf),

        // read back
        this.device.readMemory(0x01, 0x0070, 16),

      ]);

      console.log(results);

      expect(results[0]).to.have.length(2);
      expect(results[1]).to.equal(0);
      expect(results[1]).to.deep.equal(buf);

      // clear log

      buf = Buffer.alloc(16).fill(0xFF);

      results = await Promise.all([

        // fault log filled
        this.device.writeMemory(0x01, 0x0070, buf),

        // read back
        this.device.readMemory(0x01, 0x0070, 16),

      ]);

      console.log(results);

      expect(results[0]).to.have.length(2);
      expect(results[1]).to.equal(0);
      expect(results[1]).to.deep.equal(buf);

    })



  });




});
