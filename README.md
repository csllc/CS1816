# CS1816

This module defines a vanilla Javascript class which interfaces to the 
Control Solutions CS1816 Bluetooth Dongle. (if you are not using a CS1816
dongle, this package will be of no use to you).

The dongle is a small hardware device which acts as a BLE peripheral, and connects
by wire to a local device or system.  It provides access to that device's status and settings
wirelessly via the BLE link.  Several variants of the dongle may be encountered, 
depending on the type of local device being managed.

A BLE Central device connects to the dongle (peripheral) and provides a user
interface.  The central device is typically a mobile phone, tablet, or PC
running a custom application.

This module is intended to run on the central device, as a component between the user interface
and BLE hardware interface. It helps with just 
about everything an app needs when using a dongle:

- Discovering available dongles
- Making a connection to the dongle
- Inspecting the device or system connected to the dongle
- Monitoring the attached device or system
- Sending commands to configure or control the dongle and/or attached system.


The hardware (Bluetooth Low Energy) interface is not a part of this class;
rather it is provided to this class when it is constructed.  The hardware
interface obviously varies depending on whether the application is designed
for a PC, mobile device, etc.
An example of the hardware interface for React Native can be found in the 
@csllc/rn-ble NPM package (https://www.npmjs.com/package/@csllc/rn-mb-ble)

The user interface creates an instance of this class for each connected Dongle,
so it can make requests to the dongle and receive asynchronous event notifications.

The class is intended to be usable with just about any Javascript-based application
framework, such as React Native, Ionic, Electron, NodeJS, etc.
It is likewise agnostic as to the BLE hardware interface; the application may need 
to provide an adapter layer to integrate with the platform BLE services.
Examples of this are the above-mentioned @csllc/rn-ble; in the test/live folder
there is also a BleShim.js that uses the @abandonware/noble package as the BLE Manager.

If it cannot be used directly in an application, it is at least a comprehensive
example of how to interface to a dongle from the BLE central device.

## Installation
`npm i @csllc/CS1816`

## Integration into an Application

### Initialization

An instance of the class should be created for each CS1816 peripheral.
Finding the peripherals and connecting to them is not part of this class;
your platform BLE manager (eg @csllc/rn-ble) can help with that.  Rather, once
you have found and successfully connected to the CS1816, you pass an object reference 
the 'peripheral' to the Dongle class in the initialize() method.  The peripheral object itself
is opaque to the Dongle class; we simply give it back to the hardware interface when we want
to interact with the hardware.  This means we are likely agnostic as to the 
exact BLE library used.

NOTE: platforms differ on their use of UUIDs for services and characterisitics.
This package defines the UUIDS with uppercase letters, and with hyphens (-)
embedded in them.  Depending on your platform, the BLE manager may have to mutate the
UUIDS; for example 
`myuuid = serviceUuid.toLowerCase().replace(/-/g, "")`

Also, this module makes concurrent calls to the BLE manager using Promises.
If the underlying driver (eg Chrome's WebBluetooth) implementation does not
support concurrent calls to BLE functions, you must manage (queue) them in the
platform BLE manager.

```js
import { Dongle, serviceUuid }  from '@csllc/CS1816';
import Ble from '@csllc/rn-ble';

await Ble.initialize();

// find and connect to a devices that is advertising the serviceUuid ...
// This part depends on what BLE manager you are using and how the user
// chooses which dongle they want to use.
// Once you have discovered, selected, and successfully connected to the dongle, 
// ('peripheral', you can initialize the Dongle class, representing your connection to that
// specific dongle.
// The Dongle will give back whatever you supply as the 'peripheral' object
// when it wants to interact with the hardware

let theDongle = new Dongle(Ble);

theDongle.initialize(peripheral);

// now you are ready to use the CS1816

```

### Discovering Dongles

The Dongle hardware, when powered and not connected to anything via BLE, flashes
the blue LED and sends BLE advertisements.  These advertisements include
the serviceUuid that is exported from this module.  It also includes some
'manufacturerData' which is an array of bytes.  
The manufacturerData will be at least 11 bytes in the format:
`[ 41 0c {product:4} {serial:4} {interfaces:1} ]`
* 0x41 and 0x0C are constants (the CompanyId) 
* {product} may indicate the type of local device or system connected to the dongle
* {serial} may indicate the serial number of the connected local device
* {interfaces} indicates which type(s) of hardware the Dongle is capable of interfacing with.
Note that {product} and {serial} may not be available depending on the type of dongle, connected system, or whether the connected device is powered on.  If product or serial information is not available, those bytes will be zero.

You can decode this data using the static Dongle.decodeMfrData() method.  It is provided as part of the advertisement, in case the 
application is able to use it to filter available dongles to show the user, or to aid the user in deciding whether to connect to a particular dongle.  You can also retrieve this information once connected using the mfrData() method.

The Dongle.decodeMfrData() and mfrData() methods return an object:
```js
{
  product: 'CS8100',  // (or '' if not available)
  serial: 'S1234567', // (or '' if not available)
  interfaces: {
    i2c: true,
    serial: false,
    canbus: false,
  }
}
```

### Retrieving Dongle Version Info

Once connected, you can read identifying information about the dongle, such as its software version number.

```js
let info = await theDongle.readDongleInfo();

```

### Dongle Version Information

The dongle's software version information is available in the object returned by readDongleInfo(). After calling this method, the `softwareRevision` property will also contain multiple representations of the version - a string, scalar, and array of bytes.

```js
let info = await theDongle.readDongleInfo();

let versionString = theDongle.softwareRevision.string; // "1.10.0"
let versionScalar = theDongle.softwareRevision.scalar; // 0x010A00
let versionBytes =  theDongle.softwareRevision.bytes;  // {major: 1, minor: 10, patch: 0)
```

### Configuration and Control of the Dongle

The configure methods and keyswitch() method are used to set up the CS1816 and control its keyswitch output.

Configuration is normally the first step performed by the app after connecting and inspecting the dongle version.
Its parameters depend on the type of dongle interface - for example, a dongle using a serial interface might be configured with a baud rate like 9600, or 57600.  A CANBUS interface might be configured with a rate of 500Kbps.

You can only configure the dongle interface if it is advertised as available, and you can only configure one interface at a time.
For example, if the mfrData().interfaces.i2c is true, you can call theDongle.configureI2c().
Otherwise, calling that method will fail.

The 'keyswitch' is simply a discrete logic output available on some dongle variants.  It can be used to control the on/off state of a device or system, but its use is very system-specific and therefore not detailed here.

Example: configure the I2C dongle interface and turn on the keyswitch output
```js
Promise.all([
  theDongle.configureI2c(),   // I2C does not support any optional settings
  theDongle.keyswitch( true ),
  ])
  .then(()=> console.log('configured and keyswitch enabled!'));

```

Example: configure the serial dongle interface 
```js
  await theDongle.configureSerial({ baud: 9600, parity: 'N', bits: 8, stop: 1 });  
  
  console.log('configured for serial');

```

Example: configure for CANBUS interface 
```js
  await theDongle.configureCanbus({ speed: 250000 });  
  
  console.log('configured for CANBUS');

```

Once configured, you can monitor the status of the interface using the .onInterfaceUpdate() method.
By giving it a callback, you will be notified of any changes in the interface status.

```js
  await theDongle.onInterfaceUpdate((status) => {
    console.log( 'Status: ', status );
  });  
  
Status: {
  mode: 'i2c',
  protocol: 'cs1108',
  status: { up: true }
}

```

For an i2c type interface, the status: up boolean indicates whether the motor controller device is attached and available (awake).

For a CANBUS interface, the status: up boolean indicates whether the CANBUS is correctly connected (a 'bus on' state, vs 'bus off')

Sending commands to the local device when the interface is not 'up' will fail.



### Watchers

The CS1816 provides a facility to monitor variables on the connected motor controller(s) and asynchronously notify us that they changed.  To set up a watcher, you provide details on what variable you want to watch, and a callback function that is called when a change is detected in a variable's value:

```js
let slot = await theDongle.watch(1, faultCodeAddr, 1, function(data) {
  console.log('The fault code is now', data[0] );
});

```

There is a limit to the number of watchers you can set up; if you exceed that
limit the .watch() function will throw.

To cancel a previously set up watcher, use the slot number returned by the watch() function and call unwatch():

```js
await theDongle.unwatch(slot);

// or you can remove all the watchers without needing a slot number
await theDongle.unwatchAll();
```


### Super Watcher

There is also a super watcher, which works very much like a standard watcher, but allows
a larger number of variables to be monitored.  setting up a super watcher is similar to
watch() but a length = 1 is implied because a super watcher is only 1 byte long.

Also, changes to the super watcher do not take effect until you call the updateSuperWatcher() method.  This helps to minimize the data that needs to be sent over the wireless link.
To avoid confusion, you should clear the super watcher, register all your desired 
watch variables, and then call updateSuperWatcher()

```js

await theDongle.clearSuperWatcher();

theDongle.superWatch(1, 86, function(data) {
  console.log('superwatch address 86 changed:', data );
});

await theDongle.updateSuperWatcher();

```

You can also use a common function as a listener, since the address and unit are provided when the value updates:
```js

await theDongle.clearSuperWatcher();

function processUpdate( data, address, unit ) {
  console.log('superwatch address ' + address + ' on unit ' + unit + ' changed:', data );
}
theDongle.superWatch(1, 86, processUpdate );
theDongle.superWatch(1, 87, processUpdate );
theDongle.superWatch(1, 88, processUpdate );

await theDongle.updateSuperWatcher();

```

### Reading and Writing Memory

Reading and data from the CS1816 uses the readMemory, readObject functions.  The functions return a Promise that resolves when the request is complete, or rejects if the request is unsuccessful.  The rejection includes an error object that describes the type of error. A timeout indicates that no response was received from the dongle within the allowed time.  The rejection may also include an error object indicating an exception code (meaning that the dongle responded with an error message.)  The possible exception codes are listed at the top of the lib/Dongle.js file; the most applicable ones being:
* EXC_ILLEGAL_DATA_ADDRESS(0x02) - indicates you tried to read or write a memory address that doesn't exist
* EXC_SLAVE_FAILURE(0x04) - indicates that the dongle failed to communicate with the connected device (controller).  This can happen, for instance, if the controller goes into a sleep/powersave mode.
* EXC_VERIFY_FAIL(0x80)- indicates that a writeVerify operation failed (verify did not read back the expected values)

```js

let todo = [
  theDongle.readObject(theDongle.ID, 0),
  theDongle.readMemory(1, 0x300, 128, { timeout: 5000 }),
  theDongle.readMemory(1, 0x380, 128, { timeout: 5000 })
];

Promise.all(todo)
.then((results) => {

  console.log( 'Dongle config:', results[0]);
  console.log( 'EEPROM:', results[1]);
  console.log( 'Rest of EEPROM', results[1]);


```

### Miscellaneous

The CS1816 can issue a Modbus reset command to a connected motor controller that supports the command.

```js
theDongle.reset(1);

```

### Logging
For debug purposes, you can pass a winston-style logger to the constructor: `new Dongle(Ble, { logger: myLogger })`.
The logs can be filtered by level (eg 'info' or 'warn') or by component (eg 'Dongle', DongleTransport, etc)


## Development

### Testing

This package incorporates 'offline' tests as well as 'online' tests that require a physical CS1816 device to interact with.
Both types of tests should be updated when changes are made to the code, and confirmed to be passing before publishing a new version.

The offline tests are suitable for automated testing (for instance in a Jenkins CI/CD pipeline) and include linting of the code and verification of the Javascript implementation.  They are initiated using the `npm test` command.
It will be helpful to use an editor that supports eslint, using the rules in the .eslintrc file so you can correct coding issues immediately rather than waiting for the test to fail. 

The online tests assume they run on a Raspberry PI, or at least a platform compatible with the Noble (@abandonware/noble) npm package.
The hardware specific portion is contained in the file `test/live/BleShim.js`, and the BLE scan/connect/disconnect is done in the `test/live/hooks.js` file before and after the test run.  It should be straightforward to modify the tests to run on different underlying hardware, and the developer is urged to avoid embedding hardware-specific details into the test cases themselves (testing of the hardware interface belongs in the platform BLE manager package(s)).

Online tests are run using the `npm run test-live` command.

Note: using a Raspberry PI 3B with Raspbian Stretch (at least), there appears to be a low-level driver or hardware problem that causes conflicts between Wifi and BLE.  In order to get reliable BLE operation, you may need to disable Wifi and use Ethernet as the command interface to the Raspberry PI.
The way I did this was using the command:
`sudo rfkill block wifi`, which is persistent across reboots.  Some of the other methods of disabling Wifi on the Raspberry PI will also disable BLE, since they are closely linked in the hardware.


