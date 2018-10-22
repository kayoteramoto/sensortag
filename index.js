const SensorTag = require('sensortag');

// 98:07:2D:26:F9:82

SensorTag.discover(tag => {
  console.log('Discovered new SensorTag!');

  tag.on('disconnect', () => {
    console.log('Disconnected!');
    process.exit(0);
  });  

  tag.connectAndSetUp(() => {
    console.log('Connected!');
    tag.enableAccelerometer(() => {
      tag.notifyAccelerometer(() => {
        tag.on('accelerometerChange', (x, y, z) => {
          console.log('Accelerometer reading: x = %d, y = %d, z = %d',
            x.toFixed(1),
            y.toFixed(1),
            z.toFixed(1));
        });
      });
    });
  });
});