var RSVP = require("rsvp");

var L8 = require("../index").L8;
var GridBuilder = require("../Library/GridBuilder").GridBuilder;
var L8Grid = require("../Library/L8Grid").L8Grid;

var SERIAL_PORTS = [
    "/dev/tty.usbmodem1d11421", /* bottom right */
    "/dev/tty.usbmodem1d1111", /* bottom left */
    "/dev/tty.usbmodem1d1131", /* top left */
    "/dev/tty.usbmodem1d11441" /* top right */
];

var connections = SERIAL_PORTS.map(function (SERIAL_PORT, index) {
    var l8 = new L8();

    l8.on("frameReceived", function (frame) {
        console.log("[" + index + "] RECEIVED: ", frame.payload.toString("hex"));
    });
    l8.on("frameSent", function (frame) {
        console.log("[" + index + "] SENT: ", frame.toString("hex"));
    });

    return {
        l8: l8,
        promise: l8.open(SERIAL_PORT, null)
    };
});

var l8grid = null;

RSVP.all(connections.map(function(connection) {
    return connection.promise;
})).then(function() {
    console.log("CONNECTED TO ALL!");

/*    var grid = new GridBuilder(connections[0].l8)
        .left(connections[1].l8)
        .top(connections[2].l8)
        .right(connections[3].l8)
        .toGrid();
*/
    var grid = new GridBuilder(connections[2].l8)
     .right(connections[3].l8)
     .bottom(connections[0].l8)
     .left(connections[1].l8)
     .toGrid();

    l8grid = new L8Grid(grid);
    return l8grid.clearGrid();
}).then(function() {
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
        for(y=0; y<16; y++) {
            for(x=0; x<16; x++) {
                (function(x, y, timeout, colorIndex) {
                    setTimeout(function() {
                        l8grid.setLED(x, y, colors[colorIndex], function() {});
                    }, timeout);
                }(x, y, timeout, colorIndex));
                timeout += 10;
            }
        }
    }
}).catch(function(error) {
   console.error(error);
});

