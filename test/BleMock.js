/**
 * Mocks up a BLE platform manager, to allow running
 * tests without actual BLE hardware
 *
 */

import { EventEmitter } from 'node:events';
import { DONGLE_UUIDS } from '../lib/DongleUUIDs.js';

// if no logger specified, stub out logging functions
var logger = {
  log() {}
};

// a handy async delay function for use in tests
function _delayMs(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


// mocks a peripheral
class Peripheral {

  // You can pass in a 'p' object to override the default attributes of the peripheral
  constructor(p) {

    Object.assign(this, {
      dongle: new DongleMock,
      id: 'fc0fe7a50925',
      uuid: 'fc0fe7a50925',
      address: 'fc:0f:e7:a5:09:25',
      addressType: 'public',
      connectable: true,
      scannable: false,
      advertisement: {
        localName: 'CS1816',
        txPowerLevel: undefined,
        manufacturerData: Buffer.from([0x41, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x01]),
        serviceData: [],
        serviceUuids: ['6765ed1f4de149e14771a14380c90000'],
        solicitationServiceUuids: [],
        serviceSolicitationUuids: []
      },
      rssi: -65,
      services: null,
      mtu: null,
      state: 'disconnected'
    }, p);
  }

  findChar(service, characteristic) {

    return this.dongle._findChar(service, characteristic);
  }
}

// Mocks a characteristic
class Characteristic extends EventEmitter {

  constructor(serviceUuid, charUuid, options) {

    super();

    Object.assign(this, {
      service: serviceUuid,
      uuid: charUuid,
      readDelay: 2,
      writeDelay: 1,
      notifyDelay: 2,
      value: Buffer.alloc(0),
    }, options);

    this.subscribed = false;
    this.notifycb = null;

  }

  async read() {

    await _delayMs(this.readDelay);
    return this.value;

  }

  async write(data) {

    await _delayMs(this.writeDelay);

    this.value = data;
    this.emit('data', data);
    this.notify(data);
  }

  async subscribe(cb) {
    logger.debug('subscribe %s', this.uuid);
    await _delayMs(this.notifyDelay);

    this.subscribed = true;
    this.notifycb = cb;
  }

  async unsubscribe() {
    logger.debug('unsubscribe %s', this.uuid);

    this.subscribed = false;

  }

  notify(value) {
    let me = this;

    if(me.subscribed && 'function' === typeof me.notifycb) {
      let data = {};
      data.value = value;
      data.characteristic = me.uuid;
      data.service = me.service;
      me.notifycb(data);
    }
    //  }, this.notifyDelay);

  }
}

class IpHeader {
  constructor(buf) {
    this.id = buf && buf[0] * 256 + buf[1];
    this.version = buf && buf[2] * 256 + buf[3];
    this.length = buf && buf[4] * 256 + buf[5] - 1;
    this.unit = buf && buf[6];

  }
  toArray() {
    return [
      (this.id >> 8) & 0xFF, this.id & 0xFF,
      (this.version >> 8) & 0xFF, this.version & 0xFF,
      ((this.length + 1) >> 8) & 0xFF, (this.length + 1) & 0xFF,
      this.unit
    ];
  }
}

class DongleMock {

  constructor() {

    this.chars = [
      new Characteristic(DONGLE_UUIDS.uuidDeviceInformation, DONGLE_UUIDS.uuidSystemId, { value: Buffer.from('') }),
      new Characteristic(DONGLE_UUIDS.uuidDeviceInformation, DONGLE_UUIDS.uuidModelNumber, { value: Buffer.from('CS1816') }),
      new Characteristic(DONGLE_UUIDS.uuidDeviceInformation, DONGLE_UUIDS.uuidDongleSerialNumber, { value: Buffer.from('') }),
      new Characteristic(DONGLE_UUIDS.uuidDeviceInformation, DONGLE_UUIDS.uuidFirmwareRevision, { value: Buffer.from('0.0') }),
      new Characteristic(DONGLE_UUIDS.uuidDeviceInformation, DONGLE_UUIDS.uuidHardwareRevision, { value: Buffer.alloc(0) }),
      new Characteristic(DONGLE_UUIDS.uuidDeviceInformation, DONGLE_UUIDS.uuidSoftwareRevision, { value: Buffer.from('1.11.0') }),
      new Characteristic(DONGLE_UUIDS.uuidDeviceInformation, DONGLE_UUIDS.uuidManufacturerName, { value: Buffer.from('Control Solutions') }),

      new Characteristic(DONGLE_UUIDS.uuidUartService, DONGLE_UUIDS.uuidRx),
      new Characteristic(DONGLE_UUIDS.uuidUartService, DONGLE_UUIDS.uuidTx),
      new Characteristic(DONGLE_UUIDS.uuidUartService, DONGLE_UUIDS.uuidUartControl),

      new Characteristic(DONGLE_UUIDS.uuidControllerService, DONGLE_UUIDS.uuidConfig),
      new Characteristic(DONGLE_UUIDS.uuidControllerService, DONGLE_UUIDS.uuidInterface, { value: Buffer.from([4, 1, 0, 0]) }),
      new Characteristic(DONGLE_UUIDS.uuidControllerService, DONGLE_UUIDS.uuidProduct),
      new Characteristic(DONGLE_UUIDS.uuidControllerService, DONGLE_UUIDS.uuidSerial),
      new Characteristic(DONGLE_UUIDS.uuidControllerService, DONGLE_UUIDS.uuidFault),
      new Characteristic(DONGLE_UUIDS.uuidControllerService, DONGLE_UUIDS.uuidStatus[0]),
      new Characteristic(DONGLE_UUIDS.uuidControllerService, DONGLE_UUIDS.uuidStatus[1]),
      new Characteristic(DONGLE_UUIDS.uuidControllerService, DONGLE_UUIDS.uuidStatus[2]),
      new Characteristic(DONGLE_UUIDS.uuidControllerService, DONGLE_UUIDS.uuidStatus[3]),
      new Characteristic(DONGLE_UUIDS.uuidControllerService, DONGLE_UUIDS.uuidStatus[4]),
      new Characteristic(DONGLE_UUIDS.uuidControllerService, DONGLE_UUIDS.uuidStatus[5]),
      new Characteristic(DONGLE_UUIDS.uuidControllerService, DONGLE_UUIDS.uuidStatus[6]),
      new Characteristic(DONGLE_UUIDS.uuidControllerService, DONGLE_UUIDS.uuidStatus[7]),
      new Characteristic(DONGLE_UUIDS.uuidControllerService, DONGLE_UUIDS.uuidStatus[8]),
      new Characteristic(DONGLE_UUIDS.uuidControllerService, DONGLE_UUIDS.uuidStatus[9]),
      new Characteristic(DONGLE_UUIDS.uuidControllerService, DONGLE_UUIDS.uuidStatus[10]),
      new Characteristic(DONGLE_UUIDS.uuidControllerService, DONGLE_UUIDS.uuidStatus[11]),
      new Characteristic(DONGLE_UUIDS.uuidControllerService, DONGLE_UUIDS.uuidStatus[12]),
      new Characteristic(DONGLE_UUIDS.uuidControllerService, DONGLE_UUIDS.uuidStatus[13]),
      new Characteristic(DONGLE_UUIDS.uuidControllerService, DONGLE_UUIDS.uuidStatus[14]),
      new Characteristic(DONGLE_UUIDS.uuidControllerService, DONGLE_UUIDS.uuidSuperWatcher),
    ];

    this._findChar(DONGLE_UUIDS.uuidUartService, DONGLE_UUIDS.uuidTx).on('data', this._onUart.bind(this));
    this.tx = this._findChar(DONGLE_UUIDS.uuidUartService, DONGLE_UUIDS.uuidRx);

    this.flashBlockSize = 128;
    this.flashBlock = Buffer.alloc(this.flashBlockSize).fill(0xFF);
  }

  _onUart(buf) {

    let header = new IpHeader(buf);

    let pdu = buf.slice(7);

    logger.silly('MBAP %O %O', header, pdu);

    switch (pdu[0]) {
      case 67: //FN_READ_OBJECT,
        this._readObject(header, pdu);
        break;

      case 68: //FN_WRITE_OBJECT,
        this._writeObject(header, pdu);
        break;

      case 69: //FN_READ_MEMORY,
        break;

      case 70: //FN_WRITE_MEMORY,
        break;

      case 71: //FN_COMMAND,
        this._handleCommand(header, pdu);
        break;

      case 0x64: // FN_WRITE_VERIFY_MEMORY
        break;

    }

  }

  _sendCommandError(header, pdu, code) {
    logger.debug('_sendCommandError %u', code);
    pdu = [pdu[0], code];
    header.length = pdu.length;

    this.tx.write([...header.toArray(), ...pdu]);
  }

  _sendCommandResponse(header, pdu, response) {
    logger.debug('_sendCommandResponse');
    pdu = [pdu[0], pdu[1], ...response];
    header.length = pdu.length;

    this.tx.write([...header.toArray(), ...pdu]);
  }

  _readObject(header, pdu) {
    let id = pdu[1];

    if(id === 0) {
      header.length = this.flashBlock.length + 2;

      this.tx.write([...header.toArray(), pdu[0], this.flashBlock.length, ...this.flashBlock]);
    } else {
      pdu = [pdu[0] | 0x80, 4];
      header.length = pdu.length;
      this.tx.write([...header.toArray(), ...pdu]);

    }

  }


  _writeObject(header, pdu) {

    let id = pdu[1];
    logger.debug('_writeObject id %d size %d', id, pdu[2]);

    if(id === 0 && pdu[2] === this.flashBlockSize) {
      this.flashBlock = pdu.slice(3);
      logger.debug('flash %d', this.flashBlock.length);
      pdu = [pdu[0], 0];
      header.length = pdu.length;
      this.tx.write([...header.toArray(), ...pdu]);
    } else {
      pdu = [pdu[0] | 0x80, 4];
      header.length = pdu.length;
      this.tx.write([...header.toArray(), ...pdu]);


    }
  }

  _handleCommand(header, pdu) {

    logger.silly(`_handleCommand ${pdu}`);

    let opcode = pdu[1];

    switch (opcode) {
      case 0: // CONFIGURE
        if(pdu.length === 6) {
          this._sendCommandResponse(header, pdu, [0]);
        } else {
          this._sendCommandError(header, pdu, 4);
        }

        break;

      case 1:
        break;
      case 2:
        break;
      case 3:
        break;
      case 4:
        break;
      case 5:
        break;
      case 6:
        break;
      case 7:
        break;
      case 8:
        break;
      default:
        break;

    }

  }

  // look up the matching characteristic object
  _findChar(service, characteristic) {
    logger.info('find %s %O', service, characteristic);
    return this.chars.find((c) => {
      return c.service === service && c.uuid === characteristic;
    });
  }

}


/**
 * A Shim class to interface with the bluetooth hardware (via Noble in this case)
 *
 * @class      Ble (name)
 */
export default class BleMock {

  static isSupported() {
    true;
  }

  static driver() {
    return null;
  }


  static async initialize(options) {

    // use caller's logging interface if specified
    logger = (options && options.logger) || logger;

    // If logger supports children, use one
    if('function' === typeof(logger.child)) {
      logger = logger.child({ component: 'Ble' });
    }

    logger.debug('initialize');

    BleMock.scanTimer = null;

    BleMock.options = Object.assign({

      // how long to wait after scanStart before reporting a discovered device
      scanDelay: 100,

      // delay while connecting to peripheral
      connectDelay: 100,

      // delay while disconnecting
      disconnectDelay: 20,

    }, options);

  }

  static async startScan(services, cb) {

    logger.debug('startScan %d', BleMock.options.scanDelay);

    await _delayMs(1);

    BleMock.scanTimer = setInterval(() => {
      let peripheral = new Peripheral();

      logger.debug('startScan %d', BleMock.options.scanDelay);

      // tell our user about the peripheral
      if('function' === typeof(cb)) {
        cb(peripheral);
      }
    }, BleMock.options.scanDelay);

  }

  static async stopScan() {

    if(BleMock.scanTimer) {
      clearInterval(BleMock.scanTimer);
      BleMock.scanTimer = null;
    }

    await _delayMs(1);

  }

  static async connect(peripheral) {

    await _delayMs(BleMock.options.connectDelay);
    peripheral.state = 'connected';

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
  static async findCharacteristics(peripheral, service, wanted) {

    let result = {};

    for(const w in wanted) {
      result[wanted[w].name] = peripheral.findChar(service, wanted[w].characteristic);
    }
    logger.debug('result %O', result);
    await _delayMs(1);
    return result;
  }

  static async disconnect(peripheral) {
    await _delayMs(BleMock.options.disconnectDelay);
    peripheral.state = 'disconnected';
    peripheral.dongle = null;
  }


  static async read(peripheral, characteristic) {
    return characteristic.read();
  }

  static async write(peripheral, characteristic, data) {
    return characteristic.write(data);
  }

  static async subscribe(peripheral, characteristic, cb) {
    logger.debug('subscribe', characteristic.uuid);
    return characteristic.subscribe(cb);
  }

  static async unsubscribe(peripheral, characteristic) {

    return characteristic.unsubscribe();
  }



}
