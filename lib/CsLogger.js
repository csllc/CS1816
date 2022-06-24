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

  time(label) {
    if(this.enabled) {
      this.info(label);
      console.time(label);
    }
  }

  timeLog(label) {
    if(this.enabled) {
      console.timeLog(label);
    }
  }

  timeEnd(label) {
    if(this.enabled) {
      console.timeEnd(label);
    }
  }
}
