var L8 = require("./Library/L8").L8;

var l8 = new L8();
l8.open("/dev/tty.L8-SerialPortServerPort1", null, function() {
    l8.registerReceiver(function(data) {
        console.log("Received: ", data.toString("hex"));
    });
    l8.registerMonitor(function(data) {
        console.log("Sent:     ", data.toString("hex"));
    });

    var colors = [{r: 0, g: 15, b: 15}, {r: 15, g: 0, b: 15}, {r: 15, g: 15, b: 0}, {r: 0, g: 15, b: 0}, {r: 15, g: 0, b: 0}];
    var currentIndex = 0;
    var next = function() {
        var matrix = Array.apply(null, new Array(8*8)).map(function() {
            return colors[currentIndex];
        });
        l8.setMatrix(matrix, function() {
            if (currentIndex === colors.length - 1) {currentIndex = 0;} else {++currentIndex;}
            setTimeout(next, 400);
        });
    };
    next();
});
