const SPI = require('pi-spi');
const spi = SPI.initialize("/dev/spidev0.0");

const mpg = require('mpg123');
const path = require('path');

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


class Sensor {
  constructor(ch) {
    this.ch = ch;
    this.on = false;
    this.start = this.start.bind(this);
    this.finish = this.finish.bind(this);
    this.initialize = this.initialize.bind(this);
    this.log = this.log.bind(this);

    this.threshold = undefined;

    this.player = new mpg.MpgPlayer();
    this.track = path.join(__dirname, 'data/set2',(ch+1).toString() + '.mp3');
  }

  log(msg) {
    console.log('Log ch', this.ch, ': ' + msg);
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

    this.listen();
  }

  getCh() {
    return this.ch;
  }

  // fn is fired when input value is greater than threshold
  listen() {
    setInterval(async () => {
      const val = await readVal(this.ch);
      if (this.on && val < this.threshold) {
        // start playing sounds
        this.playSound();
        this.log('start playing sounds');
        this.on = false;
      } else if (!this.on && val >= this.threshold) {
        // stop playing sounds
        this.stopSound();
        this.log('stop playing sounds');
        this.on = true;
      }
    }, 1000)
  }

  async playSound() {
    let vol = 0;
    const player = this.player;
    player.play(this.track);
    player.volume(vol);

    while(vol < 70) {
      await sleep(20);
      vol += 1;
      player.volume(vol)
    }

    player.on('end', () => {
      player.play(this.track);
    })
  }

  async stopSound() {
    let vol = 70;
    const player = this.player;
    player.volume(vol);

    while(vol > 0) {
      await sleep(20);
      vol -= 1;
      player.volume(vol)
    }

    player.pause();
  }

  start(fn, interval) {
    this.timer = setInterval(fn, interval);
  }

  finish() {
    clearInterval(this.timer);
  }
}


const sensors = [new Sensor(0), new Sensor(1), new Sensor(2), new Sensor(3)];

for (let sensor of sensors) {
  sensor.initialize();
}

