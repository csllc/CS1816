/**
 * Example that finds, connects to, and interacts with the first available dongle.
 *
 * To run this example, you have to have the @csllc/noble-ble package installled,
 * and be running on hardware that supports the @abandonware/noble package that
 * noble-ble depends on
 *
 * Note: the execution flow is basically upward from the bottom of the file,
 * so scroll all the way to the bottom to see how things start.
 */


import Ble from '@csllc/noble-ble';
import { Dongle, serviceUuid } from '../index.js';


// The connected dongle instance
let theDongle = null;



//  ┌─┐┌─┐┌┬┐┬ ┬┌─┐  ┬ ┬┌─┐┌┬┐┌─┐┬ ┬┌─┐┬─┐┌─┐
//  └─┐├┤  │ │ │├─┘  │││├─┤ │ │  ├─┤├┤ ├┬┘└─┐
//  └─┘└─┘ ┴ └─┘┴    └┴┘┴ ┴ ┴ └─┘┴ ┴└─┘┴└─└─┘
async function initWatchers(id) {

  console.log('info', `Initializing watchers for ${id}`);

  let todo = [
    // watchers get cleared when the BLE connection is established so
    // it is not necessary to do the next 2 lines after the dongle connection is
    // made.  However this shows a complete sequence of 'clear-old-watchers,
    // start-new-watchers'
    theDongle.unwatchAll(),
    theDongle.clearSuperWatcher(),


    theDongle.watch(id, 0x038, 0x01, (data) => {
      console.log("0x038 (Fault):", data);
    }),

    theDongle.watch(id, 0x064, 0x02, (data) => {
      console.log("0x064 (Battery Voltage):", data);
    }),

    theDongle.watch(id, 0x05F, 0x01, (data) => {
      console.log("0x05F (Charge State):", data);
    }),

    theDongle.watch(id, 0x110, 0x02, (data) => {
      console.log("0x110 (Voltage):", data);
    }),

    theDongle.watch(id, 0x113, 0x01, (data) => {
      console.log("0x113 (PWM):", data);
    }),


    theDongle.watch(id, 0x111, 0x01, (data) => {
      console.log("0x111 (Board Temperature):", data);
    }),


    theDongle.watch(id, 0x112, 0x02, (data) => {
      console.log("0x112 (Current):", data);
    }),


    theDongle.watch(id, 0x114, 0x01, (data) => {
      console.log("0x114 (Scaled Throttle):", data);
    }),


    theDongle.watch(id, 0x060, 0x01, (data) => {
      console.log("0x060 (Analog Throttle):", `Throttle: ${(data[0]*5/256).toFixed(2)} V`);
    }),


    // the superwatcher bytes we care about
    theDongle.superWatch(1, 0x61, function onSuperwatcherUpdate(value, address, id) {
      console.log(`Super: id ${id}, addr ${address}, val ${value}`);
    }),

    theDongle.superWatch(1, 0x60, function onSuperwatcherUpdate(value, address, id) {
      console.log(`Super: id ${id}, addr ${address}, val ${value}`);
    }),

    theDongle.superWatch(1, 0x62, function onSuperwatcherUpdate(value, address, id) {
      console.log(`Super: id ${id}, addr ${address}, val ${value}`);
    }),

    theDongle.updateSuperWatcher({ packed: true })
  ];

  await Promise.all(todo);
}

//  ┬┌┐┌┌─┐┌─┐┌─┐┌─┐┌┬┐  ┌┬┐┌─┐┬  ┬┬┌─┐┌─┐
//  ││││└─┐├─┘├┤ │   │    ││├┤ └┐┌┘││  ├┤
//  ┴┘└┘└─┘┴  └─┘└─┘ ┴   ─┴┘└─┘ └┘ ┴└─┘└─┘
async function inspectDevice(id) {

  console.log(`Inspecting device ${id}`);

  let results = await Promise.all([
    theDongle.readMemory(id, 0x0300, 128),
    theDongle.readMemory(id, 0x0380, 128),

  ])

  // contents of eeprom in results[0] and [1]

  //  do something with that info...
  let serialnum = results[1][0xFC - 0x80] * 65536 + results[1][0xFD - 0x80] * 256 + results[1][0xFE - 0x80];
  let serial = String.fromCharCode(results[1][0xFB - 0x80]) + serialnum.toString().padStart(7, '0');

  console.log(`Found SN ${serial}`);

  await initWatchers(id);

}



//  ┌┬┐┬┌─┐┌─┐┌─┐┬  ┬┌─┐┬─┐  ┌┬┐┌─┐┬  ┬┬┌─┐┌─┐┌─┐
//   │││└─┐│  │ │└┐┌┘├┤ ├┬┘   ││├┤ └┐┌┘││  ├┤ └─┐
//  ─┴┘┴└─┘└─┘└─┘ └┘ └─┘┴└─  ─┴┘└─┘ └┘ ┴└─┘└─┘└─┘
async function discoverDevices(iface) {

  console.log(`Device Discovery ${iface.mode}`);


  // for I2C, if the interface is UP, there is one device and its id is 1
  // other interface types need a different discovery mechanism
  if(iface.mode === 'i2c') {

    await inspectDevice(1);

  } else {
    throw new Error(`Don't know how to discover ${iface.mode} devices`);
  }

}

// Device(s) not available, dongle interface down; clean anything up
// that needs cleaning up
function clearDevices() {

  console.log('Interface is down');
  theDongle.cancelTransactions();

}

//  ┬ ┬┌─┐┌┐┌┌┬┐┬  ┌─┐  ┬┌┐┌┌┬┐┌─┐┬─┐┌─┐┌─┐┌─┐┌─┐  ┌─┐┬ ┬┌─┐┌┐┌┌─┐┌─┐
//  ├─┤├─┤│││ │││  ├┤   ││││ │ ├┤ ├┬┘├┤ ├─┤│  ├┤   │  ├─┤├─┤││││ ┬├┤
//  ┴ ┴┴ ┴┘└┘─┴┘┴─┘└─┘  ┴┘└┘ ┴ └─┘┴└─└  ┴ ┴└─┘└─┘  └─┘┴ ┴┴ ┴┘└┘└─┘└─┘
function updateInterface(value) {
  console.log('Interface', value);

  if(value.mode === 'i2c' && value.protocol === 'cs1108') {
    if(value.status.up) {

      discoverDevices(value)
      .catch((err) => {
        console.error('Error discovering devices');
        stop(err);
      });

    } else {
      clearDevices();
    }
  } else {
    console.error('Dongle Interface is not compatible with this example');
  }
}


//  ┌─┐┌─┐┌┐┌┌┐┌┌─┐┌─┐┌┬┐  ┌┬┐┌─┐  ┌┬┐┬ ┬┌─┐  ┌┬┐┌─┐┌┐┌┌─┐┬  ┌─┐
//  │  │ │││││││├┤ │   │    │ │ │   │ ├─┤├┤    │││ │││││ ┬│  ├┤
//  └─┘└─┘┘└┘┘└┘└─┘└─┘ ┴    ┴ └─┘   ┴ ┴ ┴└─┘  ─┴┘└─┘┘└┘└─┘┴─┘└─┘
async function connect(peripheral) {

  console.log('Connecting to Dongle...');

  // initialize here so we don't try to connect multiple times before we succeed
  theDongle = new Dongle(Ble);

  // Make the BLE connection
  await Ble.connect(peripheral);

  // Associate our dongle instance with the peripheral
  await theDongle.initialize(peripheral);

  // Catch any disconnect events that might occur
  await theDongle.onDisconnect(onDisconnect);

  // Get info about the dongle (version, etc)
  await theDongle.readDongleInfo();

  // Get notified if the dongle's device interface status changes
  await theDongle.onInterfaceUpdate(updateInterface)

  console.log('Dongle initialized; monitoring device interface');

}

// If the dongle disconnects, end.
function onDisconnect(dongle) {

  console.log(`Disconnected ${dongle.peripheral.id}`);

  stop();
}


//  ┌─┐┬┌┐┌┌┬┐  ┌─┐  ┌┬┐┌─┐┌┐┌┌─┐┬  ┌─┐
//  ├┤ ││││ ││  ├─┤   │││ │││││ ┬│  ├┤
//  └  ┴┘└┘─┴┘  ┴ ┴  ─┴┘└─┘┘└┘└─┘┴─┘└─┘
async function run() {

  if(!Ble.isSupported()) {
    throw new Error('Noble library could not be initialized.  Check that this platform is supported, and that you installed and run the application using the same version of NodeJS');
  }

  console.log('Initializing BLE');

  await Ble.initialize();

  await Ble.startScan([serviceUuid], (peripheral) => {

    // found a peripheral; stop scanning and connect to it
    Ble.stopScan()
    .then(() => connect(peripheral))
    .catch((err) => stop(err));

  }, { duplicates: false });
}



//  ┬┌┬┐  ┌─┐┬  ┬    ┌─┐┌┬┐┌─┐┬─┐┌┬┐┌─┐  ┬ ┬┌─┐┬─┐┌─┐
//  │ │   ├─┤│  │    └─┐ │ ├─┤├┬┘ │ └─┐  ├─┤├┤ ├┬┘├┤
//  ┴ ┴   ┴ ┴┴─┘┴─┘  └─┘ ┴ ┴ ┴┴└─ ┴ └─┘  ┴ ┴└─┘┴└─└─┘
run()
.catch((err) => {
  console.error(err);
  stop();
})

// shut down and exit the application
function stop(err) {

  console.log('Stopping');
  if(err) {
    console.error(err);
  }
  if(theDongle) {
    theDongle.destroy();
  }

  process.exit(err ? 1 : 0);

}
