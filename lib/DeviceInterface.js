/**
 * Exports a class definition that represents the Dongle Device Interface
 *
 * The device interface is used for configuring the Dongle's hardware interface,
 * and also monitoring its status.
 *
 * Configuration is sent to the dongle via a COMMAND message, and the Dongle
 * reports its DeviceInterface via a characteristic notification
 *
 * This class can be used to encode and decode those bytes into a more usable
 * form, and error check the values
 *
 * @class      DeviceInterface (name)
 */

const modes = {
  0: 'unknown',
  1: 'bootloader',
  2: 'auto',
  4: 'i2c',
  8: 'uart',
  16: 'canbus',
};


const protocols = {
  0: 'unknown',
  1: 'cs1108',
  2: 'j1939',
  3: 'serial',
};

export default class DeviceInterface {

  constructor(bytes) {

    if(bytes) {
      this.set(bytes);
    } else {
      this.mode = '';
      this.protocol = '';
      this.config = {};
      this.status = {};
    }

  }

  set(bytes) {

    // for backward compatibility, a single byte of '0' means:
    if(bytes.length === 1 && bytes[0] === 0) {
      this.mode = modes[4];
      this.protocol = protocols[1];
      this.status = { up: true };
    } else if(bytes.length !== 4) {
      // invalid set of bytes...
      this.mode = modes[0];
      this.protocol = protocols[0];
      this.status = { up: false };

    } else {

      // these will be undefined if byte values are out of range
      this.mode = modes[bytes[0]];
      this.protocol = protocols[bytes[1]];

      // decode this.config...
      //
      //    //-------- Config for Mode = SYSTEM_MODE_CANBUS
      // 2 LSBs: bit rate
      // #define SYSTEM_CAN_CONFIG_125K 0x00
      // #define SYSTEM_CAN_CONFIG_250K 0x01
      // #define SYSTEM_CAN_CONFIG_500K 0x02
      // #define SYSTEM_CAN_CONFIG_1000K 0x03


      this.status = {
        up: (bytes[2] & 0x01) > 0
      };

    }
  }

}
