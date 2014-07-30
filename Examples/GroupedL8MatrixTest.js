var RSVP = require("rsvp");

var L8 = require("../index").L8;
var MatrixBuilder = require("../index").MatrixBuilder;
var GridDescription = require("../Library/GridDescription").GridDescription;
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
    new GridDescription(l8s[0])
     .right(l8s[1])
     .right(l8s[2])
     .right(l8s[3])
);

var builder;
var x = 0, y = 0;
var back = false;
var next = function() {
    builder = new MatrixBuilder(32, 8);
    builder.column({r: 15, g: 0, b: 0}, x);
    //builder.row({r: 5, g: 0, b: 0}, y);
    l8grid.setMatrix(builder.toMatrix(), function() {});

/*     if (back) { --y; } else { ++y; }
     if (y <= 0 || y >= 7) { back = !back; }
*/
    if (back) { --x; } else { ++x; }
    if (x <= 0 || x >= 31) { back = !back; }

    setTimeout(next, 20);
};

l8grid.open(function(error) {
    l8grid.clearMatrix(function() {
        next();
    });
});
