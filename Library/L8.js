var SerialPort = require("serialport").SerialPort;
var CRC = require("crc");
var SLCP = require("./SLCP");

/**
 * Main API entry point providing all the public API in order to Control
 * an L8 Smartlight
 *
 * @constructor
 */
var L8 = function() {
    /**
     * Indicator whether a connection is established or not.
     * @type {boolean}
     */
    this.isConnected = false;

    /**
     * SerialPort connection used for communication
     * @type {SerialPort}
     * @private
     */
    this.serialport_ = null;

    /**
     * List of functions, which are informed upon incoming data
     *
     * @type {Dictionary}
     * @private
     */
    this.receivers_ = Object.create(null, {
        nextId: {
            value: 0,
            writable: true,
            readable: true,
            enumerable: false,
            configurable: false
        }
    });

    /**
     * List of functions, which are informed upon sent data
     *
     * @type {Dictionary}
     * @private
     */
    this.monitors_ = Object.create(null, {
        nextId: {
            value: 0,
            writable: true,
            readable: true,
            enumerable: false,
            configurable: false
        }
    });
};

L8.MAGIC_BYTES = new Buffer("AA55", "hex");

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

    this.serialport_.on("data", this.onResponse_.bind(this));

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
 * Register a new receiver called once new data has arrived
 *
 * The call returns a unique id which may be used to deregister the receiver at
 * any time.
 *
 * @param {Function} receiver
 * @returns {number}
 */
L8.prototype.registerReceiver = function(receiver) {
    var receiverId = this.receivers_.nextId++;
    this.receivers_[receiverId] = receiver;
    return receiverId;
};

/**
 * Remove a registered receiver based on the id provided during registration.
 *
 * @param {Number} receiverId
 */
L8.prototype.removeReceiver = function(receiverId) {
    if (this.receivers_[receiverId] !== undefined) {
        delete this.receivers_[receiverId];
    }
};

/**
 * Register a new monitor called every time data is sent out
 *
 * The call returns a unique id which may be used to deregister the monitor at
 * any time.
 *
 * @param {Function} monitor
 * @returns {number}
 */
L8.prototype.registerMonitor = function(monitor) {
    var monitorId = this.monitors_.nextId++;
    this.monitors_[monitorId] = monitor;
    return monitorId;
};

/**
 * Remove a registered monitor based on the id provided during registration.
 *
 * @param {Number} montorId
 */
L8.prototype.removeMonitor = function(monitorId) {
    if (this.monitors_[monitorId] !== undefined) {
        delete this.monitors_[monitorId];
    }
};

/**
 * Callback executed each time data has been received from the L8.
 *
 * @param data
 * @private
 */
L8.prototype.onResponse_ = function(data) {
    // Redirect all incoming data to all methods, which wanted to be informed about it
    var receiverId;
    for (receiverId in this.receivers_) {
        this.receivers_[receiverId](data);
    }
};

/**
 * Send a raw buffer bytestream to the connected L8
 *
 * @param {Buffer} buffer
 * @param fn
 */
L8.prototype.sendFrame = function(buffer, fn) {
    if (!this.isConnected) {
        throw new Error("L8 is not connected. Can't send data to it.");
    }

    this.serialport_.write(buffer, function(error, writeCount) {
        if (error) {
            fn(error, writeCount);
            return;
        }
        this.serialport_.drain(function(error, drainCount) {
            // Inform all montors
            var monitorId;
            for (monitorId in this.monitors_) {
                this.monitors_[monitorId](buffer);
            }

            // Finish by executing user callback
            fn(error, drainCount + writeCount);
        }.bind(this));
    }.bind(this));
};

/**
 * Build a frame in order to be sent to the L8
 *
 * An L8 frame has the following structure:
 *
 * `MAGIC_BYTES|PayloadLength|Payload|PayloadCRC8`
 *
 * The Payload consists of a command as well as optional arguments
 *
 * The command is an interger, as documented here:
 * http://www.l8smartlight.com/dev/slcp/1.0/
 *
 * The parameters are documented there as well. If a command does not have a
 * parameter (eg. CMD_PING). The parametersBuffer argument to this function may
 * be omitted.
 *
 * The parameters may be provided as a hex string or a Buffer object for convenience.
 *
 * The return value of this method is a ready to be sent Buffer, which can be
 * given to `L8#sendFrame` for transmission.
 *
 * @param {Number} command
 * @param {Buffer|String?} parametersBuffer
 * @returns {Buffer}
 */
L8.prototype.buildFrame = function(command, parametersBuffer) {
    // Allow parameters to be buffer or hex string for convenience
    if (typeof parametersBuffer === "string") {
        parametersBuffer = new Buffer(parametersBuffer, "hex");
    }

    var commandBuffer = new Buffer(1);
    commandBuffer[0] = command;

    var fullPayloadBuffer;
    // There are commands without parameters
    if (parametersBuffer === null || parametersBuffer === undefined) {
        fullPayloadBuffer = commandBuffer;
    } else {
        fullPayloadBuffer = Buffer.concat([
            commandBuffer,
            parametersBuffer
        ], 1 + parametersBuffer.length);
    }

    var contentLengthBuffer = new Buffer(1);
    contentLengthBuffer[0] = fullPayloadBuffer.length;

    var frameLength = 2 /*MAGIC_BYTES*/ + 1 /*LENGTH*/ + fullPayloadBuffer.length + 1 /*CHECKSUM*/;

    var checksumBuffer = new Buffer(
        CRC.crc8(fullPayloadBuffer),
        "hex"
    );

    return Buffer.concat([
        L8.MAGIC_BYTES,
        contentLengthBuffer,
        fullPayloadBuffer,
        checksumBuffer
    ], frameLength);
};

/**
 * Ping the L8 in order to check if it is there.
 *
 * The response is currently not handled automatically. If you want to check if
 * a pong reply has been sent back use `registerReceiver`.
 *
 * @param {Function} fn
 */
L8.prototype.ping = function(fn) {
    this.sendFrame(
        this.buildFrame(SLCP.CMD.PING, null),
        function(error, count) {
            fn(error, !error);
        }.bind(this)
    );
};

/**
 * Encode a color object to the BGR bytesequence accepted by the L8 as a single color (3-byte)
 *
 * The color needs to be represented as object with `r`, `g` and `b` properties.
 *
 * The color values need to be within the limits [0,15]. Where 0 represents the lightest
 * and 15 the hightest value.
 *
 * @param {Object} color
 * @returns {Buffer}
 */
L8.prototype.encodeSingleColor = function(color) {
    if (color.r === undefined || color.r < 0 || color.r > 15
     || color.g === undefined || color.g < 0 || color.g > 15
     || color.b === undefined || color.b < 0 || color.b > 15) {
        throw new RangeError("Invalid color definiiton provided: " + JSON.stringify(color));
    }

    var colorBuffer = new Buffer(3);
    colorBuffer[0] = color.b;
    colorBuffer[1] = color.g;
    colorBuffer[2] = color.r;

    return colorBuffer;
};

/**
 * Encode a color object to the BGR bytesequence accepted by the L8 as a matrix color (2-byte)
 *
 * The color needs to be represented as object with `r`, `g` and `b` properties.
 *
 * The color values need to be within the limits [0,15]. Where 0 represents the lightest
 * and 15 the hightest value.
 *
 * @param {Object} color
 * @returns {Buffer}
 */
L8.prototype.encodeMatrixColor = function(color) {
    if (color.r === undefined || color.r < 0 || color.r > 15
        || color.g === undefined || color.g < 0 || color.g > 15
        || color.b === undefined || color.b < 0 || color.b > 15) {
        throw new RangeError("Invalid color definiiton provided: " + JSON.stringify(color));
    }

    var colorBuffer = new Buffer(2);
    colorBuffer[0] = color.b;
    colorBuffer[1] = color.g << 4 | color.r;

    return colorBuffer;
};

/**
 * Set a specific LED inside the 8x8 L8 grid to a given color
 *
 * The color needs to be represented as object with `r`, `g` and `b` properties.
 *
 * The color values need to be within the limits [0,15]. Where 0 represents the lightest
 * and 15 the hightest value.
 *
 * @param {Number} x
 * @param {Number} y
 * @param {Object} color
 * @param {Function} fn
 */
L8.prototype.setLED = function(x, y, color, fn) {
    if (x < 0 || x > 7 || y < 0 || y > 7) {
        throw new RangeError("x and y led coordinates are out of bounds: (" + x + " x " + y + ")");
    }

    var coordinateBuffer = new Buffer(2);
    coordinateBuffer[0] = x;
    coordinateBuffer[1] = y;

    var parametersBuffer = Buffer.concat([
        coordinateBuffer,
        this.encodeSingleColor(color)
    ], 2 + 4);

    this.sendFrame(
        this.buildFrame(SLCP.CMD.L8_LED_SET, parametersBuffer),
        function(error) {
            fn(error, !error);
        }.bind(this)
    );
};

/**
 * Set the complete matrix of LEDs with one command
 *
 * This method should be used if you want display an "image" of sorts
 *
 * The provided matrix needs to be a 64 elements long array of color objects.
 *
 * Each of the color objects needs to provide an `r`, `g` and `b` property.
 *
 * The color values need to be within the limits [0,15]. Where 0 represents the
 * lightest and 15 the hightest value.
 *
 * The matrix is provided line by line. Starting in the upper left corner, while
 * ending in the lower right.
 *
 * @param {Array} matrix
 * @param fn
 */
L8.prototype.setMatrix = function(matrix, fn) {
    if (matrix.length != 64) {
        throw new RangeError("Given matrix has the wrong length. Expected 64, got " + matrix.length);
    }

    var parametersBuffer = Buffer.concat(
        matrix.map(this.encodeMatrixColor.bind(this)),
        8 /*LINES*/ * 8 /*COLUMNS*/ * 2 /*COLOR_LENGTH*/
    );

    this.sendFrame(
        this.buildFrame(SLCP.CMD.L8_MATRIX_SET, parametersBuffer),
        function(error) {
            fn(error, !error);
        }.bind(this)
    );
};

exports.L8 = L8;