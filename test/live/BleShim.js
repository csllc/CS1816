/**
 * Exports a static class that wraps the 'noble' Bluetooth package
 * This provides a bluetooth hardware interface that works with
 * RaspberryPI model 3 at least.  On other hardware your results may vary.
 *
 */

import { EventEmitter } from 'node:events';
import noble from '@abandonware/noble';

/**
 * Make lower case and remove hyphens from uuid
 *
 * @param      {string}  u       { parameter_description }
 * @return     {string}  { description_of_the_return_value }
 */
function normalizeUuid(u) {
  if(u) {
    return u.toLowerCase().replace(/-/g, '');
  }
}
/**
 * Determine whether two UUID strings are equivalent
 *
 * case-insensitive and ignores hyphens.
 *
 * @param      {string}  u1      The first UUID
 * @param      {string}  u2      The second UUID
 * @return     {Boolean}  True if uuid equal, False otherwise.
 */
function isUuidEqual(u1, u2) {
  return normalizeUuid(u1) === normalizeUuid(u2);
}

/**
 * A Shim class to interface with the bluetooth hardware (via Noble in this case)
 *
 * @class      Ble (name)
 */
export default class Ble extends EventEmitter {

  constructor() {
    super();

    // this.services = [];
    // this.chars = [];
  }

  initialize() {
    console.log("Ble: initialize");

    noble.on('discover', (peripheral) => {
      console.log("Ble: discovered", peripheral, peripheral.advertisement.localName, peripheral.address);
      //if(peripheral.advertisement.localName === 'CS1816') {
      this.emit('discover', peripheral);
      //}
    });

    return new Promise(function(resolve, reject) {
      noble.once('stateChange', function(state) {
        console.log('Ble: stateChange', state);
        switch (state) {
          case 'poweredOn':
            resolve();
            break;
          case 'poweredOff':
            console.error('Ble: Bluetooth must be turned on before you run this example');
            process.exit(1);
            reject();
            break;
          default:
            reject();
        }
      });

    });
  }

  async startScan(services) {
    let s = services.map((item) => normalizeUuid(item));

    // console.log("Ble: startScan", s);
    return noble.startScanningAsync(s, false);

  }

  async stopScan() {
    // console.log("Ble: stopScan");
    return noble.stopScanningAsync();
  }

  async connect(peripheral) {

    await peripheral.connectAsync();

  }

  /**
   * Maps the caller's characteristics to the device characteristics
   *
   * If all services/characteristics cannot be found, it is acceptable for
   * this function to either reject, or return an array shorter than the
   * wanted array.
   *
   * @param      {Object}   peripheral  The peripheral we discover(ed)
   * @param      {Array}    wanted       The characteristics the user is interested in
   * @return     {Promise}  Resolves with an array of corresponding characteristics
   */
  async findCharacteristics(peripheral, service, wanted) {

    let result = {};

    let foundService = await peripheral.discoverServicesAsync(normalizeUuid(service));

    if(foundService && foundService.length > 0) {

      let characteristics = await foundService[0].discoverCharacteristicsAsync([])

      for(const w in wanted) {
        let found = characteristics.find((c) => {
          return isUuidEqual(wanted[w].characteristic, c.uuid);
        });

        if(found) {
          result[wanted[w].name] = found;
        } else if(wanted[w].required) {
          throw new Error('Required Characteristic not found');
        }


      }
    }

    return result;
  }

  async disconnect(peripheral) {
    // console.log("Ble: disconnect");
    await peripheral.disconnect();
  }


  async read(peripheral, characteristic) {
    // let characteristic = this.uuidToCharacteristic(uuidCharacteristic);

    return characteristic.readAsync();
  }

  async write(peripheral, characteristic, data) {
    // console.log("Ble: TX", characteristic, Buffer.from(data));

    // let characteristic = this.uuidToCharacteristic(uuidCharacteristic);
    await characteristic.writeAsync(Buffer.from(data), false);

    // console.log('write complete');
  }

  async subscribe(peripheral, characteristic, cb) {
    // console.log('Ble: subscribe', characteristic.uuid);

    // let characteristic = this.uuidToCharacteristic(uuidCharacteristic);

    return new Promise(function(resolve, reject) {
        characteristic.subscribe(function(err) {
          if(err) {
            reject(new Error('Failed to subscribe to characteristic'));
          } else {
            resolve();
          }
        });
      })
    .then(() => {
      characteristic.on('data', (dataBuffer) => {
        // Create the object the Dongle library is expecting
        let data = {};
        data.value = [...dataBuffer];
        data.characteristic = characteristic.uuid;
        data.service = characteristic._serviceUuid;

        console.log('Ble: RX', dataBuffer);

        cb(data);
      });
    });
  }

  async unsubscribe(peripheral, characteristic) {
    // let characteristic = this.uuidToCharacteristic(uuidCharacteristic);

    return characteristic.unsubscribe();
  }

  // Helper functions

  // uuidToCharacteristic(uuidCharacteristic) {
  //   let characteristic = this.chars.find(characteristic => {
  //     return characteristic.uuid == uuidCharacteristic.replace(/-/g, '').toLowerCase();
  //   });
  //   return characteristic;
  // }

  // uuidToService(uuidService) {
  //   let service = this.services.find(service => {
  //     return service.uuid == uuidService.replace(/-/g, '').toLowerCase();
  //   });
  //   return service;
  // }


}
