/**
 * Runs Live tests on the DongleTransport
 *
 * This test requires an actual Dongle to be present.  It will connect
 * automatically to the
 * Dongle with the highest signal strength prior to the test
 *
 * @type       {Function}
 */

// var BleManager = require('../util/BleShim');


describe('DongleTransport LIVE Tests', function() {

  var device;

  // runs before any of the tests in this group
  before(function(done) {

    BleManager.initialize()
    .then(() => {
      console.log('init complete');
      done();
    });

    // // Wait for the bluetooth hardware to become ready
    // ble.once('stateChange', function(state) {

    //   if(state === 'poweredOff') {
    //     console.error('Bluetooth must be turned on before you run this example');

    //   } else if(state === 'poweredOn') {


    //     ble.on('discover', function(peripheral) {

    //       // stop after the first found
    //       ble.stopScanning();

    //       // Create an object to manage the discovered peripheral
    //       device = new ble.Controller(peripheral);

    //       console.log('Found ' + peripheral.advertisement.localName);

    //       device.connect()
    //       .then(function() {
    //         console.log('Connected to ' + device.deviceType);
    //         console.log('Serial: ' + device.serial);
    //         console.log('Fault: ' + device.fault);


    //         done();
    //       })

    //       .catch(function(err) {
    //         console.error('Error:', err);
    //         done(err);
    //       });
    //     });

    //     // Capture the event that is emitted when bluetooth goes into scanning mode
    //     ble.on('scanStart', function() {
    //       console.log('Scanning...');
    //     });

    //     // Capture the event emitted when scan mode ends
    //     ble.on('scanStop', function() {
    //       console.log('Stopped Scanning...');
    //     });

    //     // Put the bluetooth hardware into scan mode
    //     ble.startScanning();

    //   }

    // });

  });


  // runs before any of the tests in this group
  after(async function() {

    // device.disconnect();

  });


  it('Accepts a basic dongle command', async function() {


  });



});
