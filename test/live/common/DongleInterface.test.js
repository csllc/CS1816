/**
 * Tests the read/write interface configuration
 *
 * This test requires an actual Dongle to be present.
 * The test runner will have already connected to the dongle and
 * run Dongle.initialize() before we get here
 *
 * @type       {Function}
 */

import chai from 'chai';
const expect = chai.expect;


async function _enableI2C() {

  console.log('ENABLE_I2C');

  let info = await this.device.readDongleInfo();
  console.log(info);

}


describe('Interface Tests', function() {

  let info;

  // runs before any of the tests in this group
  before(async function() {

    // the tests we run will depend on what kind of dongle it is...
    this.info = await this.device.readDongleInfo();
    console.log(this.info);
  });


  // runs before any of the tests in this group
  after(async function() {
    //...
  });

  describe('I2C Tests', function() {

    //    if(this.info.model === 'CS1816') {
    console.log(this.info);

    // Run the tests that apply to a CS1816

    it('Enables an I2C interface', async function() {
      this.skip();
    });



    // }

  });

});
