export default class Watcher {

  constructor(unit, address, length, mask, cb) {
    this.unit = unit || -1;
    this.address = address;
    this.length = length;

    // if mask was omitted, we have to adjust the arguments
    this.hasMask = !(typeof mask === 'function');

    if(this.hasMask) {

      // is mask valid
      if(mask && (!Array.isArray(mask) || mask.length !== length)) {
        throw new Error('A watcher mask must have the same number of bytes as the watcher');
      }
      this.cb = cb;
      // if mask is undefined, initialize it to exact match
      this.mask = (mask) ? mask : new Array(length).fill(0xFF);

    } else {
      this.cb = mask;
      this.mask = [];
    }

    // if(typeof mask === 'function') {
    //   cb = mask;
    //   mask = undefined;
    // }

    if(cb && 'function' !== typeof this.cb) {
      throw new Error('Callback must be a function');
    }

  }

  toArray() {
    return [this.unit, (this.address >> 8) & 0xFF, this.address & 0xFF, this.length, ...this.mask];
  }

  isEmpty() {
    return this.unit < 0;
  }

  handleUpdate(data) {

    if(this.cb && data && data.value) {
      if(data.value.length === this.length) {
        this.cb(data.value, this.address, this.unit);
      } else {
        //... ignore this; would be nice to be able to log an error message somehow
        //logger.log('error','Watcher update with incorrect length!', data.value.length, this.length);
      }
    }
  }

}
