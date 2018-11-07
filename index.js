const SensorTag = require('sensortag');
const fs = require('fs');
const Gpio = require('onoff').Gpio; //include onoff to interact with the GPIO
const onLED = new Gpio(27, 'out'); //use GPIO pin 27 as output
const LED = new Gpio(4, 'out'); //use GPIO pin 4 as output
const pushButton = new Gpio(17, 'in', 'both'); //use GPIO pin 17 as input, and 'both' button presses, and releases should be handled

onLED.writeSync(1); //turn onLED on

// MAC Address for our sensor tag: 98:07:2D:26:F9:82

const noOp = () => {};
const originalPBValue = pushButton.readSync();
var connectedTag;
var ledTimeout;

function indicateSearchingLED(ledState) {
  LED.writeSync(ledState);
  ledTimeout = setTimeout(() => indicateSearchingLED(ledState == 0 ? 1 : 0), 500);
}

function discoverSensorTag(tag) {
  console.log('Discovered new SensorTag!');
  connectedTag = tag;

  fs.open(`./data-${new Date().toLocaleString()}.csv`, 'a', (err, fd) => {
    tag.on('disconnect', () => {
      console.log('Disconnected from SensorTag!');
      LED.writeSync(0); // Turn LED off
      fs.close(fd, noOp);
    });

    tag.connectAndSetUp(() => {
      console.log('Connected!');
      if (ledTimeout) {
        clearTimeout(ledTimeout);
      }
      LED.writeSync(1); //turn LED on

      tag.enableAccelerometer(() => {
        tag.setAccelerometerPeriod(100, () => {
          tag.notifyAccelerometer(() => {
            tag.on('accelerometerChange', (x, y, z) => {
              const timestamp = new Date().valueOf();
              fs.write(fd, x + ", " + timestamp + ", accelerometer-x\n", noOp);
              fs.write(fd, y + ", " + timestamp + ", accelerometer-y\n", noOp);
              fs.write(fd, z + ", " + timestamp + ", accelerometer-z\n", noOp);
            });
          });
        });
      });

      tag.enableGyroscope(() => {
        tag.setGyroscopePeriod(100, () => {
          tag.notifyGyroscope(() => {
            tag.on('gyroscopeChange', (x, y, z) => {
              const timestamp = new Date().valueOf();
              fs.write(fd, x + ", " + timestamp + ", gyroscope-x\n", noOp);
              fs.write(fd, y + ", " + timestamp + ", gyroscope-y\n", noOp);
              fs.write(fd, z + ", " + timestamp + ", gyroscope-z\n", noOp);
            });
          });
        });
      });
    });
  });
}

pushButton.watch(function (err, pbValue) { //Watch for hardware interrupts on pushButton GPIO, specify callback function
  if (err) { //if an error
    console.error('There was an error', err); //output error message to console
    return;
  }

  if (pbValue != originalPBValue) {
    console.log("Attempt SensorTag Discovery");
    ledTimeout = setTimeout(() => indicateSearchingLED(1), 500);
    SensorTag.discover(discoverSensorTag);
  } else {
    console.log("Stop SensorTag Discovery");
    if (connectedTag != null) {
      connectedTag.disconnect();
    }
    SensorTag.stopDiscoverAll(discoverSensorTag);
  }
});

function unexportOnClose() { //function to run when exiting program
  LED.writeSync(0); // Turn LED off
  onLED.writeSync(0);
  LED.unexport(); // Unexport LED GPIO to free resources
  onLED.unexport();
  if (connectedTag != null) {
    connectedTag.disconnect();
  }
  pushButton.unexport(); // Unexport Button GPIO to free resources
};

process.on('exit', unexportOnClose);
process.on('SIGUSR1', unexportOnClose);
process.on('SIGUSR2', unexportOnClose);
process.on('SIGINT', unexportOnClose); //function to run when user closes using ctrl+c
