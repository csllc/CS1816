/**
 * Defines before/after hooks for the whole test run
 *
 * Before any tests, we scan for and connect to a BLE dongle.
 * After all tests are over, we clean up and disconnect
 *
 * The 'device' object is stored in the test instance (this) so it can be
 * accessed by the future tests.
 */


// Use BleMock for offline tests, you could use noble for live tests with real hardware
import Ble from './BleMock.js'
//import Ble from '@csllc/noble-ble'

import { Dongle, serviceUuid } from '../index.js'

import { createLogger, format, transports } from 'winston';


// filter log messages from certain components:
const ignoreComponents = format((info) => {
  if([undefined, 'Dongle', 'DongleTransport', 'DongleTransaction', 'Ble'].includes(info.component)) { return info; }
  return false;
});

const textFormat = format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${metadata.component || metadata.service}] [${level}] : ${message} `
  return msg
});

const logger = createLogger({

  defaultMeta: { service: 'testRunner' },
  transports: [
    new transports.File({
      filename: 'test.log',
      level: 'silly',
      format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.splat(),
        textFormat,
      ),
    }),

    new transports.Console({

      level: 'error',

      format: format.combine(
        ignoreComponents(),
        format.colorize(),
        format.splat(),
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        textFormat,

      ),
    })
  ]
});

before(function(done) {

  let me = this;
  me.timeout(30000);

  this.logger = logger;

  me.device = new Dongle(Ble, { logger: logger });

  function onDiscover(peripheral) {
    logger.log('info', "controller: discovered %s", peripheral.advertisement.localName);

    Ble.stopScan()
    .then(() => {
      return Ble.connect(peripheral);
    })
    .then(() => {
      return me.device.initialize(peripheral);
    })
    .then(() => {
      done();
    });
  }


  Ble.initialize({ logger: logger })
  .then(() => {
    logger.log('debug', 'starting scan');
    return Ble.startScan([serviceUuid], onDiscover);
  })
  .catch((err) => {
    throw err
  });


  // a handy delay function for use in tests
  this.delayMs = function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
});

after(async function() {

  this.timeout(10000);


  if(this.device && this.device.peripheral) {

    // one-time final cleanup
    await Ble.disconnect(this.device.peripheral);

  }

});
