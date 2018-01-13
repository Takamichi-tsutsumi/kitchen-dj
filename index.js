const SPI = require('pi-spi');
const spi = SPI.initialize("/dev/spidev0.0");

// buffers to send to digital output of spi
const buffers = [0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f];

// read value from sensor
const readVal = (ch) => {
  const buf = new Buffer([buffers[ch]]);
  return new Promise((resolve, reject) => {
    spi.transfer(buf, 4, (e, d) => {
      if (e) {
        reject(e);
        return;
      }

      resolve(d);
    })
  });
}


// parse hex to decimal
 //const hex2decimal = (hex) => ();


class Sensor {
  constructor(ch) {
    this.ch = ch;
    this.start = this.start.bind(this);
    this.finish = this.finish.bind(this);
  }

  initialize() {
  }

  getCh() {
    return this.ch;
  }

  start(fn, interval) {
    this.timer = setInterval(fn, interval);
  }

  finish() {
    clearInterval(this.timer);
  }
}

const sensor1 = new Sensor(0);
const sensor2 = new Sensor(1);
const sensor3 = new Sensor(2);
const sensor4 = new Sensor(3);

sensor1.start(() => {
  readVal(sensor1.getCh())
    .then(d => console.log('sensor1: ', d))
    .catch(e => console.error(e))
}, 1000)

sensor2.start(() => {
  readVal(sensor2.getCh())
    .then(d => console.log('sensor2: ', d))
    .catch(e => console.error(e))
}, 1000)

sensor3.start(() => {
  readVal(sensor3.getCh())
    .then(d => console.log('sensor3: ', d))
    .catch(e => console.error(e))
}, 1000)


sensor4.start(() => {
  readVal(sensor4.getCh())
    .then(d => console.log('sensor4: ', d))
    .catch(e => console.error(e))
}, 1000)




// setInterval(() => {
//   readVal(0)
//     .then((d) => {
//       console.log("Sensor0: ", d);
//     })
//     .catch((e) => {
//       console.error(e);
//     })
// }, 1000);
//
// setInterval(() => {
//   readVal(1)
//     .then((d) => {
//       // console.log("Sensor1: ", d);
//     })
//     .catch((e) => {
//       console.error(e);
//     })
// }, 1000);

