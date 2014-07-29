var RSVP = require("rsvp");

var L8 = require("../index").L8;
var GridBuilder = require("../Library/GridBuilder").GridBuilder;
var L8Grid = require("../Library/L8Grid").L8Grid;

var SERIAL_PORTS = [
    "/dev/tty.usbmodem1d1131", /* 0 */
    "/dev/tty.usbmodem1d1111", /* 1 */
    "/dev/tty.usbmodem1d11441", /* 2 */
    "/dev/tty.usbmodem1d11421" /* 3 */
];

var l8s = SERIAL_PORTS.map(function (SERIAL_PORT, index) {
    var l8 = new L8(SERIAL_PORT);

    l8.on("frameReceived", function (frame) {
        console.log("[" + index + "] RECEIVED: ", frame.payload.toString("hex"));
    });
    l8.on("frameSent", function (frame) {
        console.log("[" + index + "] SENT: ", frame.toString("hex"));
    });

    return l8;
});

var l8grid = new L8Grid(
    new GridBuilder(l8s[0])
     .right(l8s[1])
     .right(l8s[2])
     .right(l8s[3])
     .toGrid()
);

l8grid.open(function(error) {
    l8grid.clearMatrix(function() {
        var x, y;
        var timeout = 0;
        var colors = [
            {r: 15, g: 15, b: 0},
            {r: 15, g: 0, b: 0},
            {r: 0, g: 0, b: 15},
            {r: 0, g: 15, b: 0},
            {r: 0, g: 15, b: 15},
            {r: 0, g: 0, b: 0}
        ];
        var colorIndex = 0;

        for(colorIndex = 0; colorIndex < colors.length; colorIndex++) {
            for(x=0; x<32; x++) {
                for(y=0; y<8; y++) {
                    (function(x, y, timeout, colorIndex) {
                        setTimeout(function() {
                            l8grid.setLED(x, y, colors[colorIndex], function() {});
                        }, timeout);
                    }(x, y, timeout, colorIndex));
                    timeout += 10;
                }
            }
        }
    });
});
