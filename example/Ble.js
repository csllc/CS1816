/**
 * Exports a static class that wraps the 'noble' Bluetooth package
 *
 *
 */

import { EventEmitter } from 'node:events';
import noble from '@abandonware/noble';
//import { DONGLE_UUIDS } from '../lib/DongleUUIDs.js'


export default class Ble extends EventEmitter {

  constructor() {
    super();

    this.services = [];
    this.chars = [];
  }

  initialize() {
    console.log("Ble: initialize");

    noble.on('discover', (peripheral) => {
      // console.log("Ble: discovered", peripheral.advertisement.localName, peripheral.address);
      if(peripheral.advertisement.localName === 'CS1816') {
        console.log("Ble: discovered", peripheral);

        //    this.emit('discover', peripheral);
      }
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
            reject();
            break;
          default:
            reject();
        }
      });

    });
  }

  async startScan(services) {

    return noble.startScanning(services, false);

  }

  async stopScan() {
    console.log("Ble: stopScan");
    return noble.stopScanning();
  }

  async connect(peripheral) {
    console.log("Ble: connect");
    return peripheral.connectAsync()
    .then(() => {
      return new Promise((resolve) => {

        let callback = (error, services, chars) => {
          this.services = services;
          this.chars = chars;
          resolve();
        };

        console.log("Ble: discoverSomeServicesAndCharacteristics");

        peripheral.discoverAllServicesAndCharacteristics(callback);
      });
    });
  }

  async disconnect(peripheral) {
    console.log("Ble: disconnect");
    return peripheral.disconnectAsync();
  }

  async read(peripheral, uuidService, uuidCharacteristic) {
    let characteristic = this.uuidToCharacteristic(uuidCharacteristic);

    return characteristic.readAsync();
  }

  async write(peripheral, uuidService, uuidCharacteristic, data) {
    console.log("Ble: TX", Buffer.from(data));

    let characteristic = this.uuidToCharacteristic(uuidCharacteristic);
    return characteristic.writeAsync(Buffer.from(data), false);
  }

  async subscribe(peripheral, uuidService, uuidCharacteristic, cb) {
    console.log('Ble: subscribe', uuidCharacteristic);

    //let service = this.uuidToService(uuidService);
    let characteristic = this.uuidToCharacteristic(uuidCharacteristic);

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
        data.characteristic = uuidCharacteristic;
        data.service = uuidService;

        console.log('Ble: RX', dataBuffer);

        cb(data);
      });
    });
  }

  async unsubscribe(peripheral, uuidService, uuidCharacteristic) {
    let characteristic = this.uuidToCharacteristic(uuidCharacteristic);

    return characteristic.unsubscribe();
  }

  // Helper functions

  uuidToCharacteristic(uuidCharacteristic) {
    let characteristic = this.chars.find(characteristic => {
      return characteristic.uuid == uuidCharacteristic.replace(/-/g, '').toLowerCase();
    });
    return characteristic;
  }

  uuidToService(uuidService) {
    let service = this.services.find(service => {
      return service.uuid == uuidService.replace(/-/g, '').toLowerCase();
    });
    return service;
  }

}
