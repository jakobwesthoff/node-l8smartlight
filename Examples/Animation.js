var L8 = require("../index").L8;
var MatrixBuilder = require("../index").MatrixBuilder;

var SERIAL_PORT = "/dev/tty.usbmodem1413411";

var l8 = new L8(SERIAL_PORT);
l8.on("frameReceived", function(frame) {
    console.log("RECEIVED: ", frame.payload.toString("hex"));
});
l8.on("frameSent", function(frame) {
    console.log("SENT: ", frame.toString("hex"));
});

l8.open().then(function(response) {
    return l8.clearUserMemory();
}).then(function(response) {
    var animation = [];
    var builder = new MatrixBuilder();
    builder.rectangle(
        {r: 15, g: 0, b: 0},
        0, 0,
        7, 7,
        false
    );
    animation[0] = animation[7] = builder.toMatrix();

    builder = new MatrixBuilder();
    builder.rectangle(
        {r: 0, g: 15, b: 0},
        1, 1,
        6, 6,
        false
    );
    animation[1] = animation[6] = builder.toMatrix();
    builder = new MatrixBuilder();
    builder.rectangle(
        {r: 15, g: 15, b: 0},
        2, 2,
        5, 5,
        false
    );
    animation[2] = animation[5] = builder.toMatrix();

    builder = new MatrixBuilder();
    builder.rectangle(
        {r: 0, g: 0, b: 15},
        3, 3,
        4, 4,
        false
    );
    animation[3] = animation[4] = builder.toMatrix();
    return l8.prepareAnimation(animation, [100, 100, 100, 100, 100, 100, 100, 100]);
}).then(function(response) {
    var id = response.parameters[0];
    return l8.playAnimation(id, true);
}).then(function() {
    return l8.close();
}).catch(function(error) {
    console.error(error.stack);
});
