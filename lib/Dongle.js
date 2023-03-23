/**
 * Exports a class definition that manages a CS181x BLE Peripheral
 *
 * Currently this module exports a single class instance; though it should
 * be relatively easy to export the class definition and instatiate it when
 * the peripheral is detected (I guess that would need to be done if a single
 * app wanted to connect to multiple dongles).
 *
 * When the react-native-ble-manager has connected to a suitable peripheral,
 * you call .initialize() once.
 *
 * Call .destroy() when you are done with the dongle.
 *
 * In between .initialize() and .destroy(),
 * you can register for asynchronous watcher updates, or send messages.
 *
 * Sending a message is best done through one of the convenience functions like
 * .command().  The send functions return a Promise which resolves when the
 * request is complete, or rejects on a failure.  The send functions accept
 * an options parameter which allows you to modify the behavior of the
 * transaction
 *
 * Each send request results in a 'Transaction' that manages the lifecyle
 * of the request.
 *
 * @type       {Class}
 */


import DongleTransport from './DongleTransport.js';
import DeviceInterface from './DeviceInterface.js';
import DongleTransaction from './DongleTransaction.js';
import { DONGLE_UUIDS } from './DongleUUIDs.js';
import Watcher from './Watcher.js';

// if no logger specified, stub out logging functions
var logger = {
  log() {}
};

// Function codes for messages to Dongle
//const FN_REPORT_SLAVE_ID = 0x11;

const FN_READ_OBJECT = 0x43;
const FN_WRITE_OBJECT = 0x44;
const FN_READ_MEMORY = 0x45;
const FN_WRITE_MEMORY = 0x46;
const FN_COMMAND = 0x47;
const FN_WRITE_VERIFY_MEMORY = 0x64;

// Op codes (sub-commands) for the FN_COMMAND function code
const COMMAND_OP_CONFIG = 0x0;
const COMMAND_OP_KEY_SWITCH = 0x1;
const COMMAND_OP_SET_WATCHER = 0x2;
const COMMAND_OP_UNWATCH = 0x3;
const COMMAND_OP_UNWATCH_ALL = 0x4;
const COMMAND_OP_SET_SUPERWATCHER = 0x5;
const COMMAND_OP_GET_WATCHER = 0x6;
const COMMAND_OP_SUPERWATCH_PACKED = 0x07;
const COMMAND_OP_WATCH_MASKED = 0x08;



// Exception codes; these might come back from the dongle indicating a
// non-success result
// We don't interpret most of these, but they are left as a reference
// const EXC_ILLEGAL_FUNCTION = 0x01;
// const EXC_ILLEGAL_DATA_ADDRESS = 0x02;
// const EXC_ILLEGAL_DATA_VALUE = 0x03;
const EXC_SLAVE_FAILURE = 0x04;
// const EXC_ACKNOWLEDGE = 0x05;
const EXC_SLAVE_BUSY = 0x06;
// const EXC_NAK = 0x07;
// const EXC_MEMORY_PARITY_ERROR = 0x08;
const EXC_GATEWAY_NO_PATH = 0x0A;
const EXC_GATEWAY_NO_RESPONSE = 0x0B;
// const EXC_VERIFY_FAIL = 0x80;

const MAX_WATCHERS = 10;
const MAX_SUPERWATCHERS = 25;

const UART_CHARS_OF_INTEREST = [{
    name: 'rx',
    characteristic: DONGLE_UUIDS.uuidRx,
    required: true,
  },
  {
    name: 'tx',
    characteristic: DONGLE_UUIDS.uuidTx,
    required: true,
  }
];


const CONTROLLER_CHARS_OF_INTEREST = [{
    name: 'product',
    characteristic: DONGLE_UUIDS.uuidProduct,
  },
  {
    name: 'serial',
    characteristic: DONGLE_UUIDS.uuidSerial,
  },
  {
    name: 'fault',
    characteristic: DONGLE_UUIDS.uuidFault,
  },
  {
    name: 'status0',
    characteristic: DONGLE_UUIDS.uuidStatus[0],
  },
  {
    name: 'status1',
    characteristic: DONGLE_UUIDS.uuidStatus[1],
  },
  {
    name: 'status2',
    characteristic: DONGLE_UUIDS.uuidStatus[2],
  },
  {
    name: 'status3',
    characteristic: DONGLE_UUIDS.uuidStatus[3],
  },
  {
    name: 'status4',
    characteristic: DONGLE_UUIDS.uuidStatus[4],
  },
  {
    name: 'status5',
    characteristic: DONGLE_UUIDS.uuidStatus[5],
  },
  {
    name: 'status6',
    characteristic: DONGLE_UUIDS.uuidStatus[6],
  },
  {
    name: 'status7',
    characteristic: DONGLE_UUIDS.uuidStatus[7],
  },
  {
    name: 'status8',
    characteristic: DONGLE_UUIDS.uuidStatus[8],
  },
  {
    name: 'status9',
    characteristic: DONGLE_UUIDS.uuidStatus[9],
  },
  {
    name: 'status10',
    characteristic: DONGLE_UUIDS.uuidStatus[10],
  },
  {
    name: 'status11',
    characteristic: DONGLE_UUIDS.uuidStatus[11],
  },
  {
    name: 'status12',
    characteristic: DONGLE_UUIDS.uuidStatus[12],
  },
  {
    name: 'status13',
    characteristic: DONGLE_UUIDS.uuidStatus[13],
  },
  {
    name: 'status14',
    characteristic: DONGLE_UUIDS.uuidStatus[14],
  },
  {
    name: 'superwatcher',
    characteristic: DONGLE_UUIDS.uuidSuperWatcher,
  }, {
    name: 'interface',
    characteristic: DONGLE_UUIDS.uuidInterface,
  }
];




const DEVICE_CHARS_OF_INTEREST = [{
  name: 'modelNumber',
  characteristic: DONGLE_UUIDS.uuidModelNumber,
}, {
  name: 'serialNumber',
  characteristic: DONGLE_UUIDS.uuidDongleSerialNumber,
}, {
  name: 'hardwareRevision',
  characteristic: DONGLE_UUIDS.uuidHardwareRevision,
}, {
  name: 'firmwareRevision',
  characteristic: DONGLE_UUIDS.uuidFirmwareRevision,
}, {
  name: 'softwareRevision',
  characteristic: DONGLE_UUIDS.uuidSoftwareRevision,
}, {
  name: 'manufacturer',
  characteristic: DONGLE_UUIDS.uuidManufacturerName,
}, ];

/**
 * Unless otherwise specified when Dongle is constructed, we use these settings...
 *
 * @type       {<type>}
 */
const DEFAULT_OPTIONS = {
  // The number of transactions that can be in progress at the same time.
  // This number needs to match the capabilities of the device at the other
  // end of the connection (eg. Dongle)
  maxConcurrentRequests: 2,

  // How many retries if there is no response from the slave?
  // Can be overridden on a per-message basis by including the 'maxRetries' key
  defaultMaxRetries: 2,

  // How many ms to wait before declaring a timeout when waiting for a response?
  // Can be overridden on a per-message by including the 'timeout' key
  defaultTimeout: 6500,

  // if we get one of these exceptions, we will retry (up to maxRetries)
  // These are likely 'temporary' conditions and we figure the message might
  // succeed if we try again
  retryOnException: [EXC_SLAVE_FAILURE, EXC_SLAVE_BUSY, EXC_GATEWAY_NO_PATH, EXC_GATEWAY_NO_RESPONSE],
};


export default class Dongle {

  constructor(ble, options) {

    // use caller's logging interface if specified
    logger = (options && options.logger) || logger;

    // If logger supports children, use one
    if('function' === typeof(logger.child)) {
      logger = logger.child({ component: 'Dongle' });
    }

    this.ble = ble;

    // all current and pending 'UART' message transactions
    this.transactionQueue = [];

    // how many requests are currently executing
    this.executingRequests = 0;

    this.options = Object.assign({}, DEFAULT_OPTIONS, options);

    logger.log('info', 'Options:', this.options);

    // The message address of the dongle is always the same
    this.ID = 0xFE;

    // callback for dongle device interface changes
    this.interfaceChangeCb = null;
    this.transport = null;

    this._initWatchers();
    this._initSuperWatchers();
  }

  // clean up when object is destroyed
  destroy() {

    logger.log('debug', 'destroy');

    this.options = null;

    if(this.transport !== null) {
      this.transport.destroy();
      this.transport = null;
    }

    if(this.transactionQueue !== null) {
      this.transactionQueue.forEach(function(transaction) {
        transaction.destroy();
      });
      this.transactionQueue = null;
    }

    this._initWatchers();
    this._initSuperWatchers();
  }


  async initialize(peripheral) {

    logger.log('debug', 'initialize');

    // Create the message transport and let it use 'this' to write to the
    // BLE stack
    this.transport = new DongleTransport(this, { logger: logger });
    this.peripheral = peripheral;

    // Retrieve the characteristic objects we care about for future use
    this.uart = await this.ble.findCharacteristics(peripheral, DONGLE_UUIDS.uuidUartService, UART_CHARS_OF_INTEREST);
    this.controller = await this.ble.findCharacteristics(peripheral, DONGLE_UUIDS.uuidControllerService, CONTROLLER_CHARS_OF_INTEREST);
    this.device = await this.ble.findCharacteristics(peripheral, DONGLE_UUIDS.uuidDeviceInformation, DEVICE_CHARS_OF_INTEREST);

    // console.log(this.controller.interface);
    // hook the incoming uart data event to call this.onData()
    await this.ble.subscribe(peripheral, this.uart.rx, this.onData.bind(this));

    // await this.ble.subscribe(peripheral, this.controller.interface, this.onInterfaceChange.bind(this));

    // await this.ble.subscribe(peripheral, this.controller.fault, this.onInterfaceChange.bind(this));

    // await this.ble.subscribe(peripheral, this.services.uart.chars.rx DONGLE_UUIDS.uuidUartService, DONGLE_UUIDS.uuidRx, this.onData.bind(this));

    //logger.timeEnd('initialize');
  }

  async disconnect() {
    if(this.peripheral) {
      return this.ble.disconnect(this.peripheral);
    }
  }
  /**
   * Raw write to the BLE transparent uart service
   *
   * @param      {<type>}  bytes   The bytes to be sent
   */
  async write(bytes) {

    logger.log('info', `write ${bytes}`);

    // note the BleManager returns a promise; however I don't think
    // we really need to wait for it to resolve.  The DongleTransport is
    // basically flow controlling the outgoing messages, so let's
    // launch the bytes at the BLE hardware and move on.  I would think we
    // can probably even use writeWithoutResponse, but I didn't go that far
    // without some testing of performance with large messages or dropped bytes.
    //
    this.ble.write(
      this.peripheral,
      this.uart.tx,
      bytes
    );

  }

  /**
   * Reads a characteristic identified by its UUID
   *
   * Personally I would like to hide the service/characteristics inside this
   * class rather than the caller needing to know them.  However rather than
   * refactoring existing code, this function lets you read a characteristic
   * from the dongle as long as you know the service and characteristic UUIDs
   *
   * @param      {string}  service    The service uuid
   * @param      {string}  characteristic    The characteristic uuid
   */
  // async readCharacteristic(service, characteristic) {
  //   logger.info('readCharacteristic', service, characteristic);


  //   return await this.ble.readCharacteristic(this.peripheral, service, characteristic);
  // }

  /**
   * Reads a string characteristic.
   *
   * @param      {string}  service    The service uuid
   * @param      {string}  characteristic    The characteristic uuid
   * @return     {Promise}  { description_of_the_return_value }
   */
  // async readStringCharacteristic(service, characteristic) {
  //   logger.info('readStringCharacteristic', service, characteristic);

  //   let bytes = await this.ble.readCharacteristic(this.peripheral, service, characteristic);
  //   return String.fromCharCode(...bytes);
  // }

  /**
   * Reads a characteristic and converts the result to a string.
   *
   * @param      {string}  characteristic    The characteristic to read
   * @return     {Promise}  resolves with the value of the characteristic
   */
  async readString(characteristic) {
    logger.log('info', 'readStringCharacteristic', characteristic.uuid);

    let bytes = await this.ble.read(this.peripheral, characteristic);

    // if it's empty or has a zero (which is the case today) return empty string
    if(bytes && bytes.length > 0 && bytes[0] >= 0x30) {
      return String.fromCharCode(...bytes);
    } else {
      return '';
    }
  }


  /**
   * Accessors for softwareRevision object, which contains multiple representations
   * of the dongle's software semantic version when set. The setter should be passed
   * the ASCII string value read directly from the dongle's characteristic.
   *
   * this.readDongleInfo() only returns the string representation of this value
   * for backwards compatibility, but this.softwareRevision can be accessed directly
   * for byte and scalar representations.
   */
  set softwareRevision(swRevisionString) {
    this.swRev = stringToSemVer(swRevisionString);
  }

  get softwareRevision() {
    return this.swRev;
  }


  // async setInterface(options) {

  // }

  // async getInterface(options) {
  //   return {
  //     type: 'i2c',
  //     // config:
  //     // isUp: true,
  //     // protocol:
  //     // //Characteristic is Read/Write with Response, containing:
  //     // type]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]
  //     // interfaceType (discovered, conditionally compiled, or conceivably set by the app: I2C, UART, CAN)
  //     // interfaceConfig (eg baud rate, definition specific to interfaceType)
  //     // interfaceStatus (eg up/down - I2C connected, or CANBUS bus off condition)
  //     // interfaceProtocol - eg Bruno, UAB, Modbus, Serial are all protocols that conceivably could be used on UART interface)

  //   }
  // }


  /**
   * Returns all the Dongle device info
   *
   * @return     {Promise}  Resolves with an object containing the requested info
   */
  async readDongleInfo() {
    //logger.time('readDongleInfo');

    let todo = [
      this.readString(this.device.modelNumber),
      this.readString(this.device.serialNumber),
      this.readString(this.device.firmwareRevision),
      this.readString(this.device.hardwareRevision),
      this.readString(this.device.softwareRevision),
      this.readString(this.device.manufacturer),
      this.readString(this.controller.product),
      //   this.ble.read(this.peripheral, this.controller.interface),
    ];

    let results = await Promise.all(todo)

    //logger.timeEnd('readDongleInfo');

    // Set software version
    this.softwareRevision = results[4];
    //   console.log('INTERFACE', results[7]);

    return {
      model: results[0],
      serial: results[1],
      fw: results[2],
      hw: results[3],
      sw: this.softwareRevision.string,
      mfr: results[5],
      product: results[6],
    }
  }

  async readInterface() {

    let result = await this.ble.read(this.peripheral, this.controller.interface);

    logger.log('info', 'readInterface %O', result);

    return new DeviceInterface(result);
  }


  /**
   * Register a callback for updates to the dongle's device interface
   *
   * @param      {Function}  cb   function for receiving updates
   */
  async onInterfaceUpdate(cb) {

    if('function' !== typeof(cb)) {
      throw new Error('Callback must be a function');
    }

    this.interfaceChangeCb = cb;

    // subscribing will cause a notification and onInterfaceChange will eventually get called
    await this.ble.subscribe(this.peripheral, this.controller.interface, this.onInterfaceChange.bind(this));

  }

  async onDisconnect(cb) {
    this.ble.onDisconnect(this.peripheral, cb);
  }

  /**
   * A convenience function for executing an FN_COMMAND
   *
   * @param      {Number}  unit    The slave unit
   * @param      {Number}  opcode  The opcode (subcommand)
   * @param      {Array}  data    Optional additional data
   * @return     {Promise}  resolves or rejects when command is complete
   */
  command(unit, opcode, data) {

    data = data || [];
    return this.execute(unit, [FN_COMMAND, opcode, ...data]);

  }

  /**
   * Configures the dongle
   *
   * @return     {Promise}
   */
  configure(options) {
    // in the future this command will likely incorporate more bytes
    logger.log('debug', 'configure %O', options);
    return this.execute(this.ID, [FN_COMMAND, COMMAND_OP_CONFIG], options);
  }

  configureI2c(options) {
    logger.log('debug', 'configureI2c %O', options);
    return this.execute(this.ID, [FN_COMMAND, COMMAND_OP_CONFIG, 0x04, 0x01, 0x00, 0x00], options);
  }

  /**
   * Tells the dongle to set the state of the keyswitch
   *
   * @return     {Promise}
   */
  keyswitch(isEnabled, options) {
    logger.log('info', 'keyswitch %d %O', isEnabled, options);
    return this.execute(this.ID, [FN_COMMAND, COMMAND_OP_KEY_SWITCH, isEnabled ? 1 : 0], options);
  }

  /**
   * Set up a new watcher
   *
   * Note: legacy users may omit the 'mask' argument ('mask' might actually be
   * the callback function)
   *
   * @param      {<type>}    unit     The unit
   * @param      {<type>}    address  The address
   * @param      {<type>}    length   The length
   * @param      {<type>}    mask     The mask
   * @param      {Function}  cb       { parameter_description }
   * @return     {Promise}   { description_of_the_return_value }
   */
  async watch(unit, address, length, mask, cb) {


    // find a suitable slot
    let slot = this.watchers.findIndex((watcher) => watcher.isEmpty());

    logger.log('debug', 'watch %d %d %d %d', unit, address, length, slot);

    if(slot < 0) {
      throw new Error('Not enough watcher resources');
    }

    let watcher = new Watcher(unit, address, length, mask, cb);

    // opcode depends on if it is a masked watcher or not
    let opcode = (watcher.hasMask) ? COMMAND_OP_WATCH_MASKED : COMMAND_OP_SET_WATCHER;

    // save the watcher definition so nobody else tries to use this slot
    this.watchers[slot] = watcher;

    await this.execute(this.ID, [
      FN_COMMAND,
      opcode,
      slot,
      ...watcher.toArray()
    ]);

    // if we get here, the message was successful, so register the callback

    await this.ble.subscribe(this.peripheral, this.controller['status' + slot], watcher.handleUpdate.bind(watcher));

    return slot;
  }

  unwatch(slot) {
    logger.log('debug', 'unwatch', slot);
    this.watchers[slot] = new Watcher();
    return this.ble.unsubscribe(this.peripheral, this.controller['status' + slot]);

  }

  async superWatch(unit, address, cb) {
    logger.log('debug', `superWatch ${unit}, ${address}`);

    // find a suitable slot
    let slot = this.superWatchers.findIndex((watcher) => watcher.isEmpty());

    if(slot < 0) {
      throw new Error('Not enough superwatcher resources');
    }

    let watcher = new Watcher(unit, address, 1, cb);

    logger.log('silly', `slot ${slot}, ${watcher.address}`);

    // don't send to device now, wait until .updateSuperWatcher()

    // if we get here, the message was successful, so register the callback
    this.superWatchers[slot] = watcher;

    return slot;
  }

  /**
   * Start the superwatcher
   *
   * You should have already registered the watchers you are interested in
   * .superWatch(), and the superwatcher should be shut down (.clearSuperWatcher)
   * to avoid race conditions that involve updates coming from the dongle for
   * old superwatcher before this one starts up
   *
   * @param options {Object}
   * @param options.batch {Boolean} if true, multiple superwatcher updates
   * may be notified in a single BLE notify operation
   * @return     {Promise}  { description_of_the_return_value }
   */
  async updateSuperWatcher(options) {

    let addresses = [];
    let unit;
    options = Object.assign({ multiple: false }, options);

    this.superWatchers.forEach((watcher) => {
      if(!watcher.isEmpty()) {
        addresses.push((watcher.address >> 8) & 0xFF, watcher.address & 0xFF);
        // we can only watch stuff on one unit at a time
        unit = watcher.unit;
      }
    });
    logger.log('debug', `updateSuperWatcher ${addresses}`);

    if(addresses.length > 0) {

      await this.ble.subscribe(this.peripheral, this.controller.superwatcher, this.onSuperWatcherNotify.bind(this));

      let optionByte = (options.multiple) ? 0xFE : 0xFF;

      await this.execute(this.ID, [
        FN_COMMAND,
        COMMAND_OP_SET_SUPERWATCHER,
        optionByte,
        unit,
        ...addresses,
      ]);

    }
  }

  /**
   * Disables & removes all watchers (but not the superwatcher)
   *
   * @return     {Promise}
   */
  unwatchAll(options) {

    let me = this;
    logger.log('debug', 'unwatchAll', options);
    this.watchers.forEach((watcher, index) => {
      if(!watcher.isEmpty()) {
        me.unwatch(index);
      }
    });
    return this.execute(this.ID, [FN_COMMAND, COMMAND_OP_UNWATCH_ALL], options);
  }

  /**
   * Disables the superwatcher
   *
   * @return     {Promise}
   */
  async clearSuperWatcher(options) {
    logger.log('debug', 'clearSuperWatcher', options);
    this._initSuperWatchers();
    await this.ble.unsubscribe(this.peripheral, this.controller.superwatcher);
    return this.execute(this.ID, [FN_COMMAND, COMMAND_OP_UNWATCH, 0xFF], options);
  }


  /**
   * Issue the read memory function to the specified device
   *
   * @param      {Number}   unit     Device which we want to read
   * @param      {Number}   address  The starting memory address
   * @param      {Number}   length   Number of bytes to read
   * @param      {Number}   options  message options
   * @return     {Promise}  { resolves when complete }
   */
  async readMemory(unit, address, length, options) {
    logger.log('debug', 'readMemory', unit, address, length, options);

    let data = await this.execute(unit, [FN_READ_MEMORY, (address >> 8) & 0xFF, address & 0xFF, length], options);

    // remove the function code
    data.shift();
    return data;
  }

  /**
   * Issue the write memory function to the specified device
   *
   * @param      {Number}   unit     Device which we want to write
   * @param      {Number}   address  The starting memory address
   * @param      {Array}   data      Data bytes to write
   * @param      {Number}   options  message options
   * @return     {Promise}  { resolves when complete }
   */
  writeMemory(unit, address, data, options) {
    logger.log('debug', 'writeMemory %O', options);
    data = data || [];
    return this.execute(unit, [FN_WRITE_MEMORY, (address >> 8) & 0xFF, address & 0xFF, ...data], options);
  }

  /**
   * Issue the write memory with verify function to the specified device
   *
   * @param      {Number}   unit     Device which we want to write
   * @param      {Number}   address  The starting memory address
   * @param      {Array}   data      Data bytes to write
   * @param      {Number}   options  message options
   * @return     {Promise}  { resolves when complete }
   */
  writeVerifyMemory(unit, address, data, options) {
    logger.log('debug', 'writeVerifyMemory %O', options);
    data = data || [];
    return this.execute(unit, [FN_WRITE_VERIFY_MEMORY, (address >> 8) & 0xFF, address & 0xFF, ...data], options);
  }

  /**
   * Issue the read object function to the specified device
   *
   * @param      {Number}   unit     Device which we want to write
   * @param      {Number}   objectId  Which object do we want to read?
   * @param      {Number}   options  message options
   * @return     {Promise}  { resolves when complete }
   */
  async readObject(unit, objectId, options) {
    logger.log('debug', 'readObject %d %d %O', unit, objectId, options);

    let data = await this.execute(unit, [FN_READ_OBJECT, objectId], options)

    // remove the header
    data.splice(0, 2);
    return data;
  }

  /**
   * Issue the write object function to the specified device
   *
   * @param      {Number}   unit     Device which we want to write
   * @param      {Number}   objectId  Which object do we want to write?
   * @param      {Array}   data      Data bytes to write
   * @param      {Number}   options  message options
   * @return     {Promise}  { resolves when complete }
   */
  async writeObject(unit, objectId, data, options) {
    logger.log('debug', 'writeObject %d %d %O', unit, objectId, options);
    data = data || [];
    let result = await this.execute(unit, [FN_WRITE_OBJECT, objectId, data.length, ...data], options);

    // return just the result code
    return result[1];
  }

  // Enqueues a new transaction
  execute(unit, pdu, options) {

    return new Promise((resolve, reject) => {

      //let args = Array.prototype.slice.call(arguments);
      //let unit = args.shift();

      logger.log('debug', 'enqueue %d %O', unit, pdu[0]);

      let transaction = new DongleTransaction({
        resolve: resolve,
        reject: reject,
        unit: unit,
        maxRetries: options && options.maxRetries || this.options.defaultMaxRetries,
        timeout: options && options.timeout || this.options.defaultTimeout,
        retryOnException: options && options.retryOnException || this.options.retryOnException,
        pdu: pdu,
        client: this,
      });

      // transaction.on('complete', this.transactionComplete.bind(this));
      // transaction.on('error', this.transactionError.bind(this));
      // transaction.on('timeout', this.transactionTimeout.bind(this));

      this.transactionQueue.push(transaction);
      this.executeQueuedTransactions();
    });
  }

  /**
   * Kick off as many transactions as we can
   * @private
   */
  executeQueuedTransactions() {
    logger.log('debug', 'Dongle::executeQueuedTransactions %d', this.transactionQueue.length);

    while(this.transactionQueue.length > 0 &&
      this.executingRequests < this.options.maxConcurrentRequests) {
      var transaction = this.transactionQueue.shift();

      this.transport.sendRequest(transaction);

      this.executingRequests += 1;
    }
  }

  // Event from react-native-ble-manager containing a characteristic
  // notification
  onData(data) {

    if(data) {
      this.transport.onData(data.value);
    }

    // if(data.peripheral !== this.peripheral.id) {
    //   // early return, this notification was for some other peripheral
    //   // that we don't care about
    // }

    // switch (data.characteristic) {
    //   case DONGLE_UUIDS.uuidFault:
    //     logger.info('Notify fault', data);
    //     break;

    //   case DONGLE_UUIDS.uuidSuperWatcher:
    //     this.onSuperWatcherNotify(data);
    //     break;

    //   case DONGLE_UUIDS.uuidInterface:
    //     this.onInterfaceNotify(data);
    //     break;

    //   case DONGLE_UUIDS.uuidRx:
    //     this.transport.onData(data.value);
    //     break;

    //   default:
    //     logger.info('Notify on unknown characteristic ' + data.characteristic);
    //     break;
    // }
    // }
  }

  // event handler from ble manager when the interface characteristic changes
  onInterfaceChange(data) {

    logger.log('info', `Interface Change:  ${data.value}`);
    if(data && this.interfaceChangeCb) {
      let info = new DeviceInterface(data.value);
      this.interfaceChangeCb(info);
    }
  }

  // Event handler when a notification arrives on the superwatcher characteristic
  onSuperWatcherNotify(data) {
    logger.log('silly', `onSuperWatcherNotify: ${data.value}`);

    if(data.value.length === 3) {
      // a superwatcher reports the 2 address bytes plus one data byte.
      // put data.value in the format that the Watcher class is expecting
      let address = data.value[0] * 256 + data.value[1];
      data.value = [data.value[2]];
      this.superWatchers.forEach((watcher) => {

        if(!watcher.isEmpty() && watcher.address === address) {

          watcher.handleUpdate(data);
        }
      });

    } else {
      logger.log('error', 'Superwatcher with wrong number of bytes %O', data.value);
    }
  }

  // // Event handler when a notification arrives on the interface characteristic
  // onInterfaceNotify(data) {
  //   logger.log('info', 'onInterfaceNotify', data);

  //   // if(data.value.length === 3) {
  //   //   // a superwatcher reports the 2 address bytes plus one data byte.
  //   //   // put data.value in the format that the Watcher class is expecting
  //   //   let address = data.value[0] * 256 + data.value[1];
  //   //   data.value = [data.value[2]];
  //   //   this.superWatchers.forEach((watcher) => {
  //   //     // console.log('watcher', watcher, address);
  //   //     if(!watcher.isEmpty() && watcher.address === address) {
  //   //       watcher.handleUpdate(data);
  //   //     }
  //   //   });

  //   // } else {
  //   //   logger.error('Superwatcher with wrong number of bytes', data.value);
  //   // }
  // }

  _initWatchers() {
    logger.log('debug', '_initWatchers');
    this.watchers = Array.from({ length: MAX_WATCHERS }, () => new Watcher());
  }

  _initSuperWatchers() {
    logger.log('debug', '_initSuperWatchers');
    this.superWatchers = Array.from({ length: MAX_SUPERWATCHERS }, () => new Watcher());
  }

  // onWatcher(data) {
  //   logger.info('onWatcher', data);
  // }

  // onSuperWatcher(data) {
  //   logger.info('onSuperWatcher', data);
  // }

  /**
   * Called when a transaction is complete
   *
   * This is one of 2 possible results reported from a DongleTransaction
   * instance. This indicates that a complete response was received (
   * it could be an exception response but it is an exception nonetheless)
   *
   * @param      {DongleTransaction}  transaction  The transaction
   * @param      {Array}  response     The response bytes
   */
  transactionComplete(transaction, response) {
    logger.log('debug', 'transactionComplete');

    this.executingRequests -= 1;

    // check if the response from the slave was an exception
    if(Array.isArray(response) && response.length > 1 && response[0] & 0x80) {

      let exception = response[1];
      logger.log('warn', 'Exception %O', exception);

      // if it is a 5 or 10, it means somehow we tried to send too many
      // concurrent requests to the dongle.  this can happen if, for example,
      // our timeout is too short, we give up on a message, but the dongle is
      // still working on it.  It would be better to fix the timeouts, but
      // we at least try to recover by putting this transaction back in the
      // queue and putting this.executingRequests back as it was.
      if(exception === 5 || exception === 10) {
        logger.log('warn', 'Gateway overload error!');
        this.executingRequests++; // cuz we decremented it above
        this.transactionQueue.unshift(transaction);
      }

      // If we want to retry, stick it back in the front of the queue
      else if(transaction.shouldRetry() && transaction.retryException(exception)) {
        logger.log('debug', 'Retry transaction %d %d', transaction.failures, transaction.options.maxRetries);
        this.transactionQueue.unshift(transaction);
      } else if(typeof transaction.options.reject === 'function') {
        // exception but we don't want to retry.  Fail the transaction...

        transaction.options.reject(new Error('Exception ' + exception));
      }

    } else if(typeof transaction.options.resolve === 'function') {
      // a response that isn't an exception...we are done!
      transaction.options.resolve(response);
    }

    this.executeQueuedTransactions();
  }


  /**
   * Called on transaction error
   *
   * This is one of 2 possible results reported from a DongleTransaction
   * instance. This indicates a failed transaction (no valid response received)
   *
   * @param      {DongleTransaction}  transaction  The transaction
   * @param      {Error}  error        The error
   */
  transactionError(transaction, error) {
    logger.log('error', 'transactionError', error);

    this.executingRequests -= 1;

    // if transaction is not set, it basically means the transport
    // got a 'response' from the slave device that didn't match any
    // open 'requests' that it knew about.  So we ignore it, and
    // move on
    if(transaction) {
      if(transaction.shouldRetry() && !transaction.isCancelled()) {
        this.transactionQueue.unshift(transaction);
      } else if(typeof transaction.options.reject === 'function') {

        transaction.options.reject(error);
      }
    }

    this.executeQueuedTransactions();
  }


  transactionTimeout() {
    logger.log('warn', 'transactionTimeout');

    // the transport calls transactionError too, so I don't think we need to
    // do any manipulating of the transaction queue
  }

}


/**
 * Helper function to convert a version string to various Semantic Versioning
 * data formats
 *
 * @param  {string}  Software version, read directly from CS1816 dongle's
 *                   Software Revision characteristic
 * @return {Object}  Semantic version, represented as a string, array of bytes,
 *                   and scalar
 */
function stringToSemVer(versionString) {

  let semVerRegex = /([0-9]{1,}).([0-9]{1,}).?([0-9]{1,})?/;
  let matches = versionString.match(semVerRegex);

  let bytes = {
    major: 0,
    minor: 0,
    patch: 0
  };

  if(matches) {
    bytes = {
      major: matches[1] ? parseInt(matches[1]) : 0,
      minor: matches[2] ? parseInt(matches[2]) : 0,
      patch: matches[3] ? parseInt(matches[3]) : 0
    };
  }

  let string = `${bytes.major}.${bytes.minor}.${bytes.patch}`;

  let scalar = bytes.patch + (bytes.minor << 8) + (bytes.major << 16);

  return {
    bytes: bytes,
    string: string,
    scalar: scalar,
  };
}
