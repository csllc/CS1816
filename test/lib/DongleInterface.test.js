/**
 * Tests the read/write interface configuration
 *
 * This test requires an actual Dongle to be present.
 * The test runner will have already connected to the dongle and
 * run Dongle.initialize() before we get here
 *
 * @type       {Function}
 */

//import chai from 'chai';
// const expect = chai.expect;



describe('Interface Tests', function() {

  // runs before any of the tests in this group
  before(async function() {

    // the tests we run will depend on what kind of dongle it is...
    this.info = await this.device.readDongleInfo();

  });


  // runs before any of the tests in this group
  after(async function() {
    //...
  });

  describe('I2C Interface Tests', function() {

    it('Enables an I2C interface', async function() {
      this.skip();
    });

  });

});
