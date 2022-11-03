# CS1816

This module defines a vanilla Javascript class which interfaces to the 
Control Solutions CS1816 Bluetooth Dongle. (if you are not using a CS1816
device, this package will be of no use to you).

The hardware (Bluetooth Low Energy) interface is not a part of this class;
rather it is provided to this class when it is constructed.  The hardware
interface obviously varies depending on whether the application is designed
for a PC, mobile device, etc.
An example of the hardware interface for React Native can be found in the 
@csllc/rn-ble NPM package (https://www.npmjs.com/package/@csllc/rn-mb-ble)

The user interface is Promise-based, and uses simple callbacks for asynchronous events.

## Installation
`npm i @csllc/CS1816`

## Initialization

An instance of the class should be created for each CS1816 peripheral.
Finding the peripherals and connecting to them is not part of this class;
your platform BLE manager (eg @csllc/rn-ble) can help with that.  Rather, once
you have found and successfully connected to the CS1816, you pass the 'peripheral'
object to this class in the initialize() method.  The peripheral object itself
is opaque to us; we simply give it back to the hardware interface when we want
to interact with the hardware.  This means we are likely agnostic as to the 
exact BLE library used.

```js
import Dongle from '@csllc/CS1816';
import Ble from '@csllc/rn-ble';

await Ble.initialize();
let theDongle = new Dongle(Ble);

// find and connect to a CS1816 ...

theDongle.initialize(peripheral);

// now you are ready to use the CS1816

```

## Reading Characteristics

You can read characteristics individually with the readCharacteristic() or 
readStringCharacteristic() methods, but it may be simpler to use the readDongleInfo() function to return all the identifying information:

```js
let info = await theDongle.readDongleInfo();

```

## Dongle Version Information

The dongle's software version information is available in the object returned by readDongleInfo(). After calling this method, the `softwareRevision` property will also contain multiple representations of the version - a string, scalar, and array of bytes.

```js
let info = await theDongle.readDongleInfo();

let versionString = theDongle.softwareRevision.string; // "1.10.0"
let versionScalar = theDongle.softwareRevision.scalar; // 0x010A00
let versionBytes =  theDongle.softwareRevision.bytes;  // [1, 10, 0] (major, minor, patch)
```

## Configuration and Control of the Dongle

The configure() method and keyswitch() method are used to set up the CS1816 and control its keyswitch output:

```js
Promise.all([
  theDongle.configure(),
  theDongle.keyswitch( true ),
  ])
  .then(()=> console.log('configured and keyswitch enabled!'));


```

## Watchers

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


## Super Watcher

There is also a super watcher, which works very much like a standard watcher, but allows
a larger number of variables to be monitored.  setting up a super watcher is similar to
watch() but a length = 1 is implied because a super watcher is only 1 byte long.

Also, changes to the super watcher do not take effect until you call the updateSuperWatcher() method.  This helps to minimize the data that needs to be sent over the wireless link.
To avoid confusion, you should clear the super watcher, register all your desired 
watch variables, and then call updateSuperWatcher()

```js

await theDongle.clearSuperwatcher();

theDongle.superWatch(1, 86, function(data) {
  console.log('superwatch address 86 changed:', data );
});

await theDongle.updateSuperWatcher();

```

You can also use a common function as a listener, since the address and unit are provided when the value updates:
```js

await theDongle.clearSuperwatcher();

function processUpdate( data, address, unit ) {
  console.log('superwatch address ' + address + ' on unit ' + unit + ' changed:', data );
}
theDongle.superWatch(1, 86, processUpdate );
theDongle.superWatch(1, 87, processUpdate );
theDongle.superWatch(1, 88, processUpdate );

await theDongle.updateSuperWatcher();

```

## Reading and Writing Memory

Reading and data from the CS1816 uses the readMemory, readObject:

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
