const SensorTag = require('sensortag');
const fs = require('fs');
const Gpio = require('onoff').Gpio; //include onoff to interact with the GPIO
const LED = new Gpio(4, 'out'); //use GPIO pin 4 as output
const pushButton = new Gpio(17, 'in', 'both'); //use GPIO pin 17 as input, and 'both' button presses, and releases should be handled

// 98:07:2D:26:F9:82
const noOp = () => {};
const originalPBValue = pushButton.readSync();
var connectedTag;

fs.open("./data.csv", 'a', (err, fd) => {
  function discoverSensorTag(tag) {
    console.log('Discovered new SensorTag!');
    connectedTag = tag;

    tag.on('disconnect', () => {
      console.log('Disconnected from SensorTag!');
      LED.writeSync(0); // Turn LED off
      fs.close(fd, noOp);
    });

    tag.connectAndSetUp(() => {
      console.log('Connected!');
      LED.writeSync(1); //turn LED on

      tag.enableAccelerometer(() => {
        tag.notifyAccelerometer(() => {
          tag.on('accelerometerChange', (x, y, z) => {
            const timestamp = new Date().valueOf();
            fs.write(fd, x + ", " + timestamp + ", accelerometer-x\n", noOp);
            fs.write(fd, y + ", " + timestamp + ", accelerometer-y\n", noOp);
            fs.write(fd, z + ", " + timestamp + ", accelerometer-z\n", noOp);
          });
        });
      });

      tag.enableGyroscope(() => {
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
  }

  pushButton.watch(function (err, pbValue) { //Watch for hardware interrupts on pushButton GPIO, specify callback function
    if (err) { //if an error
      console.error('There was an error', err); //output error message to console
      return;
    }

    if (pbValue != originalPBValue) {
      console.log("Attempt SensorTag Discovery");
      SensorTag.discover(discoverSensorTag);
    } else {
      console.log("Stop SensorTag Discovery");
      if (connectedTag != null) {
        connectedTag.disconnect();
      }
      SensorTag.stopDiscoverAll(discoverSensorTag);
    }
  });
});

function unexportOnClose() { //function to run when exiting program
  LED.writeSync(0); // Turn LED off
  LED.unexport(); // Unexport LED GPIO to free resources
  if (connectedTag != null) {
    connectedTag.disconnect();
  }
  pushButton.unexport(); // Unexport Button GPIO to free resources
};

process.on('SIGINT', unexportOnClose); //function to run when user closes using ctrl+c
