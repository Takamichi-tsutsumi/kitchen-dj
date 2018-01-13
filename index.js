const SPI = require('pi-spi');
const spi = SPI.initialize("/dev/spidev0.0");

const buffers = [0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f];

const readVal = (ch) => {
  const buf = Buffer([buffers[ch], 0]);
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


setInterval(() => {
  readVal(0)
    .then((d) => {
      console.log(d)
    })
    .catch((e) => {
      console.error(e)
    })
}, 1000);
