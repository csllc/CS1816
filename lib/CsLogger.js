export default class CSLogger {

  constructor(name, enabled) {
    this.name = name;
    this.enabled = enabled;
  }

  info() {
    if(this.enabled) {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(this.name + ': ');
      console.log.apply(console, args);
    }
  }

  error() {
    if(this.enabled) {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(this.name + ': ');
      console.error.apply(console, args);
    }
  }

  time(label) {
    if(this.enabled) {
      this.info(label);
      if('function' === typeof(console.time)) {
        console.time(label);
      }
    }
  }

  timeLog(label) {
    if(this.enabled && 'function' === typeof(console.timeLog)) {
      console.timeLog(label);
    }
  }

  timeEnd(label) {
    if(this.enabled && 'function' === typeof(console.timeEnd)) {
      console.timeEnd(label);
    }
  }
}
