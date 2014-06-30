var L8 = require("../index").L8;

var SERIAL_PORT = "/dev/tty.usbmodem1413411";

var l8 = new L8();

l8.on("frameReceived", function(frame) {
    console.log("RECEIVED: ", frame.payload.toString("hex"));
});
l8.on("frameSent", function(frame) {
    console.log("SENT: ", frame.toString("hex"));
});

l8.open(SERIAL_PORT, null, function(error, response) {
    if (error) {
        throw error;
    }

    var colors = [{r: 0, g: 15, b: 15}, {r: 15, g: 0, b: 15}, {r: 15, g: 15, b: 0}, {r: 0, g: 15, b: 0}, {r: 15, g: 0, b: 0}];
    var currentIndex = 0;

    var next = function() {
        var matrix = Array.apply(null, new Array(8*8)).map(function(value, index) {
            return (index > 31) ? {r: 0, b: 0, g: 0} : colors[currentIndex];
        });
        l8.setMatrix(matrix, function(error, response) {
            console.log("RESPONSE:", response);
            if (currentIndex === colors.length - 1) {currentIndex = 0;} else {++currentIndex;}
            setTimeout(next, 200);
        });
    };

    l8.clearMatrix(function(error, response) {
        console.log(response);
        l8.setSuperLED({r: 4, g: 1, b: 10}, function (error, response) {
            console.log(response);
            next();
        });
        l8.setOrientation("auto", function (error, response) {
            console.log(response);
        });
        next();
    });
});
