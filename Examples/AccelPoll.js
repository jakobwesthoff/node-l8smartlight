var L8 = require("../index").L8;

var SERIAL_PORT = "/dev/tty.L8-SerialPortServerPort1";

var l8 = new L8();

l8.open(SERIAL_PORT, null, function(error, response) {
    if (error) {
        throw error;
    }

    l8.setOrientation('up');
    l8.clearMatrix();
    l8.setScrollingText('Move me baby!', {r: 0, g: 15, b: 0}, "fast", true);

    setInterval(function() {
        l8.getAcceleration(function(error, data) {
            if (error) {
                process.stderr.write(['Invalid accel response:', error, '\n'].join(' '));
                process.exit(255);
            }
            console.log(data);
        });
    }, 500);
});