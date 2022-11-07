import Ble from './Ble.js'
import Dongle from '../lib/Dongle.js'
import { DONGLE_UUIDS } from '../lib/DongleUuids.js'

let ble = new Ble();
let dongle = new Dongle(ble);

ble.once('discover', (peripheral) => {
  console.log("controller: discovered", peripheral.advertisement.localName);

  ble.stopScan()
  .then(() => {
    return ble.connect(peripheral);
  })
  .then(() => {
    return dongle.initialize(peripheral);
  })
  .then(() => {
    return dongle.readDongleInfo()
    .then((info) => {
      console.log("controller: Dongle info", info);
      console.log("controller: Dongle software revision:", dongle.softwareRevision);
    });
  })
  .then(() => {
    // Test configuration

    return dongle.configure({});
  })
  .then(() => {
    // Test watchers

    let todo = [];
    todo.push(dongle.watch(0x01, 0x038, 0x01, (data) => {
      console.log("0x038 (Fault):", data);
    }));

    todo.push(dongle.watch(0x01, 0x064, 0x02, (data) => {
      console.log("0x064 (Battery Voltage):", data);
    }));

    todo.push(dongle.watch(0x01, 0x05F, 0x01, (data) => {
      console.log("0x05F (Charge State):", data);
    }));

    todo.push(dongle.watch(0x01, 0x110, 0x02, (data) => {
      console.log("0x110 (Voltage):", data);
    }));

    todo.push(dongle.watch(0x01, 0x113, 0x01, (data) => {
      console.log("0x113 (PWM):", data);
    }));

    todo.push(dongle.watch(0x01, 0x111, 0x01, (data) => {
      console.log("0x111 (Board Temperature):", data);
    }));

    todo.push(dongle.watch(0x01, 0x112, 0x02, (data) => {
      console.log("0x112 (Current):", data);
    }));

    todo.push(dongle.watch(0x01, 0x114, 0x01, (data) => {
      console.log("0x114 (Scaled Throttle):", data);
    }));

    todo.push(dongle.watch(0x01, 0x118, 0x02, (data) => {
      console.log("0x118 (System State):", data);
    }));

    todo.push(dongle.watch(0x01, 0x119, 0x02, (data) => {
      console.log("0x119 (Motor State):", data);
    }));

    todo.push(dongle.watch(0x01, 0x060, 0x02, (data) => {
      console.log("0x060 (Analog Throttle):", data);
    }));

    return Promise.all(todo);
  })
  .then(() => {
    // Test super-watcher
    return dongle.clearSuperWatcher();
  })
  .then(() => {
    for (let i = 0; i < 25; i++) {
      dongle.superWatch(1, i, (data) => {
        console.log(`Superwatcher ${i.toString(16)}:`, data);
      });
    }

    return dongle.updateSuperWatcher();
  })
  .then(() => {
    return new Promise((resolve) => {
      setTimeout(resolve, 5000);
    });
  })
  .then(() => {
    return dongle.destroy();
  })
  .then(() => {
    return ble.disconnect(peripheral);
  })
  .catch((e) => {
    console.error(e);
  });
});

ble.initialize()
.then(() => {
  console.log("controller: BLE initialized");

  ble.startScan([DONGLE_UUIDS.uuidControllerService], { allowDuplicates: false });
});


