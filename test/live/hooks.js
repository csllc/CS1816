/**
 * Defines before/after hooks for the live tests
 *
 * Before any tests, we scan for and connect to a BLE dongle.
 * After all tests are over, we clean up and disconnect
 *
 * The 'device' object is stored in the test instance (this) so it can be
 * accessed by the future tests.
 */

import Ble from './BleShim.js'
import { Dongle, serviceUuid } from '../../index.js'



before(function(done) {

  let me = this;
  me.timeout(30000);

  me.ble = new Ble();
  me.device = new Dongle(me.ble);

  me.ble.once('discover', (peripheral) => {
    console.log("controller: discovered", peripheral.advertisement.localName);

    me.ble.stopScan()
    .then(() => {
      return me.ble.connect(peripheral);
    })
    .then(() => {
      return me.device.initialize(peripheral);
    })
    .then(() => {
      done();
    });
  });

  me.ble.initialize()
  .then(() => {
    console.log("controller: BLE initialized");

    me.ble.startScan([serviceUuid]);
  });


  // a handy delay function for use in tests
  this.delayMs = function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
});

after(async function() {

  this.timeout(10000);

  console.log('hooks: after');
  if(this.device && this.device.peripheral) {

    // one-time final cleanup
    await this.ble.disconnect(this.device.peripheral);

    console.log('hooks: disconnected');

  }

  // doing this when we are not scanning seems to just hang with Raspberry pi
  // if(this.ble) {
  //   await this.ble.stopScan()


  // }
  console.log('hooks: stopscan');
  // process.exit(0);

});
