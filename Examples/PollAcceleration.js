var L8 = require("../index").L8;

var SERIAL_PORT = "/dev/tty.L8-SerialPortServerPort1";

var l8 = new L8();

l8.open(SERIAL_PORT, null).then(function() {
    return l8.setOrientation('up');
}).then(function() {
    l8.clearMatrix();
}).then(function() {
    l8.setScrollingText('Move me!', {r: 0, g: 15, b: 0}, "fast", true);
}).then(function() {
    setInterval(function() {
        l8.getAcceleration(function(error, data) {
            if (error) {
                console.error("Invalid acceleration response: ", error);
                process.exit(255);
            }

            console.log(data);
        });
    }, 500);
}).catch(function(error) {
    console.error(error);
});
