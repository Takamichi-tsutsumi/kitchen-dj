const SPI = require('pi-spi');
const spi = SPI.initialize("/dev/spidev0.0");

const mpg = require('mpg123');
const path = require('path');

const Gpio = require('onoff').Gpio;

const THRESHOLD_RATE = 1.3;

// buffers to send to digital output of spi
const buffers = [0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f];

// parse hex to decimal
const hex2decimal = (hex) => (parseInt(hex.toString(), 16));

// read value from sensor
const readVal = (ch) => {
  const buf = new Buffer([buffers[ch]]);
  return new Promise((resolve, reject) => {
    spi.transfer(buf, 4, (e, d) => {
      if (e) {
        reject(e);
        return;
      }

      resolve(hex2decimal(d[1]));
    })
  });
}


// sleep
const sleep = (msec) => new Promise(resolve => setTimeout(resolve, msec));


class LightSensor {
  constructor(ch, pin, track) {
    this.ch = ch;
    this.on = false;
    this.threshold = undefined;
    this.player = new mpg.MpgPlayer();
    this.track = track;
    this.led = new Gpio(pin, 'out');
    this.initialized = false;

    this.turnoff();

    this.initialize = this.initialize.bind(this);
    this.log = this.log.bind(this);
    this.putOnTool = this.putOnTool.bind(this);
    this.putOffTool = this.putOffTool.bind(this);

    this.initialize();
  }

  log(msg) {
    console.log('Log ch', this.ch, ': ' + msg);
  }

  turnon() {
    this.led.writeSync(0);
  }

  turnoff() {
    this.led.writeSync(1);
  }

  putOffTool() {
    this.on = false;
    this.turnoff();
    this.volumeUp();
  }

  putOnTool() {
    this.on = true;
  }

  async initialize() {
    this.log('Initializing...')
    let val = 0, count = 0;

    while (count < 5) {
      await sleep(500);
      val += await readVal(this.ch);
      count++;
    }

    this.threshold = val / 5 * THRESHOLD_RATE;
    this.log('Threshold set: ' + this.threshold.toString());
    this.initialized = true;
  }

  // fn is fired when input value is greater than threshold
  listen() {
    setInterval(async () => {
      const val = await readVal(this.ch);

      if (this.on && val < this.threshold) {
        this.putOffTool();
      } else if (!this.on && val >= this.threshold) {
        this.putOnTool();
      }
    }, 1000)
  }

  playSound() {
    const player = this.player;
    player.play(this.track);
    player.volume(0);
  }

  async volumeUp() {
    this.player.volume(70);
    // let vol = 0;
    //
    //
    // while(vol < 70) {
    //   await sleep(20);
    //   vol += 2;
    //   player.volume(vol)
    // }
  }

  async stopSound() {
    this.player.volume(0)
    // let vol = 70;
    // const player = this.player;
    // player.volume(vol);
    //
    // while(vol > 0) {
    //   await sleep(20);
    //   vol -= 1;
    //   player.volume(vol)
    // }

  }

  start() {
    this.playSound();
    this.listen();
  }
}

class PressureLightSensor {
  constructor(ch, pin, track) {
    this.ch = ch;
    this.on = false;
    this.threshold = undefined;
    this.player = new mpg.MpgPlayer();
    this.track = track;
    this.led = new Gpio(pin, 'out');
    this.initialized = false;

    this.initialize = this.initialize.bind(this);
    this.log = this.log.bind(this);
    this.putOnTool = this.putOnTool.bind(this);
    this.putOffTool = this.putOffTool.bind(this);

    this.turnoff();

    this.initialize();
  }

  log(msg) {
    console.log('Log ch', this.ch, ': ' + msg);
  }

  turnon() {
    this.led.writeSync(0);
  }

  turnoff() {
    this.led.writeSync(1);
  }

  putOffTool() {
    this.on = false;
    this.turnoff();
    this.volumeUp();
  }

  putOnTool() {
    this.on = true;
  }

  async initialize() {
    this.log('Initializing...')
    let val = await readVal(this.ch);

    this.threshold = val * 0.75;
    this.log('Threshold set: ' + this.threshold.toString());
    this.initialized = true;
  }

  // fn is fired when input value is greater than threshold
  listen() {
    setInterval(async () => {
      const val = await readVal(this.ch);

      if (this.on && val >= this.threshold) {
        this.putOffTool();
      } else if (!this.on && val < this.threshold) {
        this.putOnTool();
      }
    }, 1000)
  }

  playSound() {
    const player = this.player;
    player.play(this.track);
    player.volume(0);
  }

  async volumeUp() {
    this.player.volume(70);
  }

  async stopsound() {
    this.player.volume(0);
  }

  start() {
    this.playSound();
    this.listen();
  }
}



const areSensorsReady = (sensors) => {
  return sensors.every((sensor) => (sensor.initialized && sensor.on));
}


const sensors = [
  new LightSensor(0, 21, path.join(__dirname, 'data/clash/extra.mp3')),
  new LightSensor(2, 26, path.join(__dirname, 'data/clash/basse.mp3')),
  new PressureSensor(3, 16,path.join(__dirname, 'data/clash/voix.mp3'), true),
  new PressureSensor(4, 19,path.join(__dirname, 'data/clash/guitare2.mp3'), true),
  new PressureSensor(5, 13,path.join(__dirname, 'data/clash/guitare.mp3'), true),
];

while (!areSensorsReady(sensors)) {
  await sleep(1000);
}


const drums = new mpg.MpgPlayer();
drums.play(path.join(__dirname, 'data/clash/batterie.mp3'));
drums.volume(70);

sensors.forEach(sensor => sensor.start());

// for reciepe
setTimeout(() => {
  sensors[4].turnon();
}, 8000);

setTimeout(() => {
  sensors[3].turnon();
}, 10000);

setTimeout(() => {
  sensors[0].turnon();
}, 20000);

setTimeout(() => {
  sensors[1].turnon();
}, 30000);

setTimeout(() => {
  sensors[2].turnon();
}, 40000);

