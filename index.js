const SPI = require('pi-spi');
const spi = SPI.initialize("/dev/spidev0.0");
const mpg = require('mpg123');
const path = require('path');

const Gpio = require('onoff').Gpio;

const THRESHOLD_RATE = 1.3;

// buffers to send to digital output of spi
const buffers = [0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f]; // parse hex to decimal
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
    this.putoffcallback = undefined;
  }

  log(msg) {
    console.log('Log ch', this.ch, ': ' + msg);
  }

  turnon(callback) {
    this.led.writeSync(0);
    this.putoffcallback = callback;
  }

  turnoff() {
    this.led.writeSync(1);
  }

  putOffTool() {
    this.on = false;
    this.turnoff();
    this.volumeUp();
    if (this.putoffcallback) {
      this.putoffcallback();
      this.putoffcallback = undefined;
    }
  }

  putOnTool() {
    this.turnOff
    this.on = true;
    this.stopSound();
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
        this.log('Put off');
        this.putOffTool();
      } else if (!this.on && val >= this.threshold) {
        this.log('Put on');
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

  async stopSound() {
    this.player.volume(0)
  }

  start() {
    this.playSound();
    this.listen();
  }
}

class PressureSensor {
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

    this.putoffcallback = undefined;
  }

  log(msg) {
    console.log('Log ch', this.ch, ': ' + msg);
  }

  turnon(callback) {
    this.led.writeSync(0);
    this.putoffcallback = callback;
  }

  turnoff() {
    this.led.writeSync(1);
  }

  putOffTool() {
    this.on = false;
    this.turnoff();
    this.volumeUp();
    if (this.putoffcallback) {
      this.putoffcallback();
      this.putoffcallback = undefined;
    }
  }

  putOnTool() {
    this.on = true;
    this.stopSound();
  }

  async initialize() {
    this.log('Initializing...')
    let val = 0, count = 0;
    val = await readVal(this.ch);
    this.threshold = val - 1;

    this.log('Threshold set: ' + this.threshold.toString());
    this.initialized = true;
  }

  // fn is fired when input value is greater than threshold
  listen() {
    setInterval(async () => {
      const val = await readVal(this.ch, true);

      this.log(val);

      if (this.on && val > this.threshold) {
        this.log('Put off');
        this.putOffTool();
      } else if (!this.on && val <= this.threshold) {
        this.log('Put on');
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
    this.player.volume(40);
  }

  async stopSound() {
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

const { exec } = require('child_process');

const openImage = (file) => {
  exec('fbi -T 1 ' + file, (err, stdout, stderr) => {
    if (err) {
      console.log(err);
      return;
    }

    console.log('stdout: ', stdout);
    console.log('stderr: ', stderr);

  });
}

async function main() {
  const sensors = [
    /*
     * sensor
     * 0, 1 for light sensors
     * 5, 6, 7 for pressure sensor
     *
     * LED
     * whisk, spatula 2LEDs: 5, 3
     * spices 4LEDs: 2, 4, 21
     * */
    new LightSensor(0, 3, path.join(__dirname, 'data/clash/extra.mp3')), // whisk
    new LightSensor(1, 5, path.join(__dirname, 'data/clash/voix.mp3')),  // spatula
    new PressureSensor(5, 2, path.join(__dirname, 'data/clash/basse.mp3')),    // salt
    new PressureSensor(6, 4, path.join(__dirname, 'data/clash/guitare2.mp3')), // pepper
    new PressureSensor(7, 21, path.join(__dirname, 'data/clash/guitare.mp3')), // basil
  ];


  openImage('./images/0.png');
  await sleep(7000);

  const drums = new mpg.MpgPlayer();
  drums.play(path.join(__dirname, 'data/clash/batterie.mp3'));

  sensors.forEach(sensor => sensor.start());

  drums.volume(40);
  openImage('./images/1.png');

  // for reciepe
  // salt
  setTimeout(() => {
    sensors[2].turnon(
      () => openImage('./images/2.png')
    );
  }, 12000);

  // pepper
  setTimeout(() => {
    sensors[3].turnon(
      () => openImage('./images/3.png')
    );
  }, 18000);

  // whisk
  setTimeout(() => {
    sensors[0].turnon(
      () => openImage('./images/4.png')
    );
  }, 24000);

  // spatula
  setTimeout(() => {
    sensors[1].turnon(
      () => openImage('./images/5.png')
    );
  }, 60000);

  // basil
  setTimeout(() => {
    sensors[4].turnon(
      () => openImage('./images/6.png')
    );
  }, 90000);
}

main();
