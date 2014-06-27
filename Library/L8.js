var SerialPort = require("serialport").SerialPort;

/**
 * Main API entry point providing all the public API in order to Control
 * an L8 Smartlight
 *
 * @constructor
 */
var L8 = function() {
    this.serialport_ = null;
    this.isConnected = false;
};

/**
 * Open a connection to the given port using an optionally provided baudrate
 *
 * If no baudrate is specified a default speed of 115200 will be used.
 *
 * After the port has been successfully opened the given callback will be fired
 *
 * The operation is asynchronous. Further communication with the L8 is only feasible
 * after the "open" callback has been fired.
 *
 * @param {String} port
 * @param {Number?} baudrate
 * @param fn
 */
L8.prototype.open = function(port, baudrate, fn) {
    // Default value for speed argument
    if (baudrate === null || baudrate === undefined) {
        baudrate = 115200;
    }

    this.serialport_ = new SerialPort(port, {
        baudrate: baudrate,
        databits: 8,
        stopbits: 1,
        parity: "none"
    }, false);

    this.serialport_.open(function(error){
        this.isConnected = true;
        fn(error, !error);
    }.bind(this));
};

/**
 * Close an established connection to the L8
 *
 * @param fn
 */
L8.prototype.close = function(fn) {
   if (!this.isConnected) {
       return;
   }

    this.serialport_.close(function(error) {
        this.isConnected = false;
        this.serialport_ = null;
        fn(error, !error);
    }.bind(this));
};

/**
 * Send a raw buffer bytestream to the connected L8
 *
 * @param {Buffer} buffer
 * @param fn
 */
L8.prototype.sendRaw = function(buffer, fn) {
    if (!this.isConnected) {
        throw new Error("L8 is not connected. Can't send data to it.");
    }

    this.serialport_.write(buffer, function(error, writeCount) {
        if (error) {
            fn(error, writeCount);
            return;
        }
        this.serialport_.drain(function(error, drainCount) {
            fn(error, drainCount + writeCount);
        }.bind(this));
    }.bind(this));
};

exports.L8 = L8;