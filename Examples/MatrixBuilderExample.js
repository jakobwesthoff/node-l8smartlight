var L8 = require("../index").L8;
var MatrixBuilder = require("../index").MatrixBuilder;

var SERIAL_PORT = "/dev/tty.L8-SerialPortServerPort1";

var l8 = new L8();

l8.on("frameReceived", function(frame) {
    console.log("RECEIVED: ", frame.payload.toString("hex"));
});
l8.on("frameSent", function(frame) {
    console.log("SENT: ", frame.toString("hex"));
});

var createRectMatrix = function(frameNumber, color) {
    var builder = new MatrixBuilder();
    return builder.rect(
        color,
        frameNumber, 7 - frameNumber,
        frameNumber, 7 - frameNumber,
        false
    ).toMatrix();
};

var colors = [{r: 15, g: 0, b: 0}, {r: 0, g: 15, b: 0}, {r: 0, g: 0, b: 15}, {r: 15, g: 15, b: 0}];

var currentFrame = 0;
var frameDirection = 1;
var nextFrame = function() {
    l8.setMatrix(createRectMatrix(currentFrame, colors[currentFrame])).then(function(response) {
        currentFrame = (currentFrame + frameDirection);
        frameDirection *= (currentFrame === 0 || currentFrame === 3) ? -1 : 1;
        setTimeout(nextFrame, 100);
    });
};

l8.open(SERIAL_PORT, null).then(function(response) {
    return l8.clearMatrix();
}).then(function(response) {
    nextFrame();
}).catch(function(error) {
    console.error(error.stack);
});

