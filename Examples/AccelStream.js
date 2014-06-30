var L8 = require("../index").L8;

var SERIAL_PORT = "/dev/tty.L8-SerialPortServerPort1";

var l8 = new L8();


l8.on("frameReceived", function(frame) {
    console.log("RECEIVED: ", frame.payload.toString("hex"));
});
l8.on("frameSent", function(frame) {
    console.log("SENT: ", frame.toString("hex"));
});

l8.open(SERIAL_PORT, null, function(error, response) {
    if (error) {
        throw new Error(error);
    }

    l8.setOrientation('up');
    l8.clearMatrix();
    //l8.setScrollingText('Move me baby!', {r: 0, g: 15, b: 0}, "fast", true);

    var stream = l8.getAccelerationStream(100);

    stream.on('data', function(data) {
        console.log(data);
    });


});