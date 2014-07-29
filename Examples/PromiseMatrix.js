var L8 = require("../index").L8;

var SERIAL_PORT = "/dev/tty.usbmodem1413411";

var l8 = new L8(SERIAL_PORT);

l8.on("frameReceived", function(frame) {
    console.log("RECEIVED: ", frame.payload.toString("hex"));
});
l8.on("frameSent", function(frame) {
    console.log("SENT: ", frame.toString("hex"));
});

var createMatrixLine = function(line, color) {
    return Array.apply(null, new Array(8*8)).map(function(value, index) {
        return (index < line * 8 || index >= (line + 1) * 8) ? {r: 0, b: 0, g: 0} : color;
    });
};

var colors = [{r: 15, g: 0, b: 0}, {r: 0, g: 15, b: 0}, {r: 0, g: 0, b: 15}, {r: 15, g: 15, b: 0}, {r: 15, g: 0, b: 15},
              {r: 0, g: 15, b: 15}, {r: 15, g: 15, b: 15}, {r:2, g: 10, b: 8}];

var currentLine = 0;
var nextFrame = function() {
    l8.setMatrix(createMatrixLine(currentLine, colors[currentLine])).then(function(response) {
        currentLine = (currentLine + 1) % 8;
        setTimeout(nextFrame, 100);
    });
};

l8.open().then(function(response) {
    return l8.clearMatrix();
}).then(function(response) {
    nextFrame();
}).catch(function(error) {
    console.error(error.stack);
});
