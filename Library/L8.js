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

    /**
     * Buffer for storing all received data, before it is processed.
     *
     *  @type {Object}
     * @private
     */
    this.receiveBuffer_ = {
        buffer: new Buffer(4096),
        length: 0
    };
};

/**
 * Magic byte sequence used to identify any SLCP command or response
 *
 * @type {Buffer}
 * @const
 */
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

    this.receiveBuffer_.length = 0;

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
 * Register a receiver to be called upon the next received data.
 *
 * The receiver will only be called once and deregistered after that automatically.
 *
 * @param {Function} receiver
 * @return {Number} receiverId
 */
L8.prototype.registerReceiverOnce = function(receiver) {
    var receiverId = this.registerReceiver(function(response) {
        this.removeReceiver(receiverId);
        receiver(response);
    }.bind(this));

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
 * Try to parse as many frames out of the given receiveBuffer, as possible.
 *
 * The response is either an array containing a frame definition or `false` if the frame wasn't complete yet.
 *
 * @param {{buffer: Buffer, length: Number}} receiveBuffer
 * @returns {{command: Number, parameters: Buffer, checksum: String, payloadLength: Number, raw: Buffer}}
 * @private
 */
L8.prototype.parseFrames_ = function(receiveBuffer) {
    var frames = [];
    while(receiveBuffer.length > 0) {
        if (receiveBuffer.length < 4) {
            // The minimum message is 4 byte. Therefore we need to wait for more data
            break;
        }

        var data = receiveBuffer.buffer;

        // Validate for magic bytes present
        if (data[0] !== L8.MAGIC_BYTES[0] || data[1] !== L8.MAGIC_BYTES[1]) {
            throw new EvalError("Invalid L8 response. Magic bytes not found: " + data.toString("hex"));
        }

        var payloadLength = data[2];

        if (receiveBuffer.length < 2 /*MAGIC*/ + 1 /*LENGTH*/ + payloadLength + 1 /*CHECKSUM*/) {
            // Not yet complete
            break;
        }

        // We need this buffer later on, after the receive buffer has already changed its state
        // Therefore it is copied
        var payloadBuffer = new Buffer(payloadLength);
        data.copy(payloadBuffer, 0, 2 /*MAGIC*/ + 1 /*LENGTH*/, 3 + payloadLength);

        var checksumPosition = 2 /*MAGIC*/ + 1 /*LENGTH*/ + payloadLength;
        var receivedChecksum = data.slice(checksumPosition, checksumPosition + 1).toString("hex");

        var calculatedChecksum = CRC.crc8(payloadBuffer);

        if (calculatedChecksum !== receivedChecksum) {
            throw new EvalError("Response checksum did not match. Expected " + receivedChecksum + " got " + calculatedChecksum);
        }

        // Yeah! We got a valid response let's decode it ;)
        var command = payloadBuffer[0];
        var parametersSlice = payloadBuffer.slice(1, payloadBuffer.length);

        frames.push({
            command: command,
            parameters: parametersSlice,
            checksum: receivedChecksum,
            payloadLength: payloadLength,
            payload: payloadBuffer
        });

        // Remove the decoded frame from the receiveBuffer
        data.copy(data, 0, 2 + /*MAGIC*/ + 1 /*LENGTH*/ + payloadLength + 1 /*CHECKSUM*/);
        receiveBuffer.length -= 2 + /*MAGIC*/ + 1 /*LENGTH*/ + payloadLength + 1 /*CHECKSUM*/;
    }

    if (frames.length === 0) {
        return false;
    } else {
        return frames;
    }
};

/**
 * Callback executed each time data has been received from the L8.
 *
 * @param data
 * @private
 */
L8.prototype.onResponse_ = function(data) {
    var responses;

    data.copy(this.receiveBuffer_.buffer, this.receiveBuffer_.length);
    this.receiveBuffer_.length += data.length;

    if ((responses = this.parseFrames_(this.receiveBuffer_)) === false) {
        // The response has been incomplete. Therefore we wait until it is complete
        return;
    }

    // Redirect all incoming data to all methods, which wanted to be informed about it
    responses.forEach(function(response) {
        var receiverId;
        for (receiverId in this.receivers_) {
            this.receivers_[receiverId](response);
        }
    }.bind(this));
};

/**
 * Send a raw buffer bytestream to the connected L8
 *
 * If the expectResponse property is set to true the callback will be hold back
 * until a corresponding CMD_OK response from the L8 has been received. This response
 * will be given to the callback then.
 *
 * If the command does not answer with a callback `false` may be given
 *
 * If the command does answer with another then the usual CMD_OK response it's
 * command code needs to be specified.
 *
 * Most commands will want to wait for the response.
 *
 * @param {Buffer} buffer
 * @param {Boolean|Number} expectResponse
 * @param fn
 */
L8.prototype.sendFrame = function(buffer, expectResponse, fn) {
    if (!this.isConnected) {
        throw new Error("L8 is not connected. Can't send data to it.");
    }

    this.serialport_.write(buffer, function(error, writeCount) {
        if (error) {
            fn(error, writeCount);
            return;
        }

        this.serialport_.drain(function(error, drainCount) {
            var monitorId;
            var receiverId;

            if (error) {
                fn(error, writeCount + drainCount);
                return;
            }

            // Inform all monitors
            for (monitorId in this.monitors_) {
                this.monitors_[monitorId](buffer);
            }

            // If a response is expected we need to introduce another indirection.
            // Otherwise we might return immediately
            if (expectResponse === false) {
                // No response expected. We are ready to return
                fn(error, writeCount + drainCount);
            } else {
                receiverId = this.registerReceiverOnce(function(frame) {
                    /* Skip processing if it is not the awaited response */
                    if (expectResponse === true) {
                        if (frame.command !== SLCP.CMD.OK || frame.parameters[0] !== buffer[3]) {
                            // It is not the OK response for the issued command. Skip it.
                            return;
                        }
                    } else {
                        // We are expecting another return command
                        if (frame.command !== expectResponse) {
                            // Not the command/response we waited for
                            // Skip it.
                            return;
                        }
                    }
                    this.removeReceiver(receiverId);
                    fn(error, frame);
                }.bind(this));
            }
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
        true, fn
    );
};

/**
 * Encode a color object to the BGR bytesequence accepted by the L8 as a single color (3-byte)
 *
 * The color needs to be represented as object with `r`, `g` and `b` properties.
 *
 * The color values need to be within the limits [0,15]. Where 0 represents the lightest
 * and 15 the highest value.
 *
 * @param {Object} color
 * @returns {Buffer}
 */
L8.prototype.encodeBGRSingleColor = function(color) {
    if (color.r === undefined || color.r < 0 || color.r > 15
     || color.g === undefined || color.g < 0 || color.g > 15
     || color.b === undefined || color.b < 0 || color.b > 15) {
        throw new RangeError("Invalid color definition provided: " + JSON.stringify(color));
    }

    var colorBuffer = new Buffer(3);
    colorBuffer[0] = color.b;
    colorBuffer[1] = color.g;
    colorBuffer[2] = color.r;

    return colorBuffer;
};

/**
 * Encode a color object to the RGB bytesequence accepted by the L8 as a single color (3-byte)
 *
 * This color is for example used by the text scroller application^^
 *
 * The color needs to be represented as object with `r`, `g` and `b` properties.
 *
 * The color values need to be within the limits [0,15]. Where 0 represents the lightest
 * and 15 the highest value.
 *
 * @param {Object} color
 * @returns {Buffer}
 */
L8.prototype.encodeRGBSingleColor = function(color) {
    if (color.r === undefined || color.r < 0 || color.r > 15
        || color.g === undefined || color.g < 0 || color.g > 15
        || color.b === undefined || color.b < 0 || color.b > 15) {
        throw new RangeError("Invalid color definition provided: " + JSON.stringify(color));
    }

    var colorBuffer = new Buffer(3);
    colorBuffer[0] = color.r;
    colorBuffer[1] = color.g;
    colorBuffer[2] = color.b;

    return colorBuffer;
};

/**
 * Encode a color object to the BGR bytesequence accepted by the L8 as a matrix color (2-byte)
 *
 * The color needs to be represented as object with `r`, `g` and `b` properties.
 *
 * The color values need to be within the limits [0,15]. Where 0 represents the lightest
 * and 15 the highest value.
 *
 * @param {Object} color
 * @returns {Buffer}
 */
L8.prototype.encodeBGRMatrixColor = function(color) {
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
 * and 15 the highest value.
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
        this.encodeBGRSingleColor(color)
    ], 2 + 4);

    this.sendFrame(
        this.buildFrame(SLCP.CMD.L8_LED_SET, parametersBuffer),
        true, fn
    );
};

/**
 * Convenience function to switch of a single LED in the matrix.
 *
 * The same behaviour is archivable by setting all color components of the LED
 * to 0.
 *
 * @param {Number} x
 * @param {Number} y
 * @param {Function} fn
 */
L8.prototype.clearLED = function(x, y, fn) {
    this.setLED(x, y, {r: 0, g: 0, b: 0}, fn);
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
 * lightest and 15 the highest value.
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
        matrix.map(this.encodeBGRMatrixColor.bind(this)),
        8 /*LINES*/ * 8 /*COLUMNS*/ * 2 /*COLOR_LENGTH*/
    );

    this.sendFrame(
        this.buildFrame(SLCP.CMD.L8_MATRIX_SET, parametersBuffer),
        true, fn
    );
};

/**
 * Clear the matrix by switching all its LEDs
 *
 * It is not necessary to execute this command between different `setMatrix` calls
 * Only use it if you explicitly want to turn the matrix off.
 *
 * This command does not affect the Super LED, which needs to be controlled
 * separately.
 *
 * @param fn
 */
L8.prototype.clearMatrix = function(fn) {
    /* According to the documentation of the protocol the CMD_L8_MATRIX_OFF has no
       parameters. Unfortunately this doesn't seem to be true. A zero byte is needed
       as parameter in order for the command to be accepted */
    this.sendFrame(
        this.buildFrame(SLCP.CMD.L8_MATRIX_OFF, "00"),
        true, fn
    );
};

/**
 * Set the SuperLED on the back of the L8 to the given color.
 *
 * The color needs to be represented as object with `r`, `g` and `b` properties.
 *
 * The color values need to be within the limits [0,15]. Where 0 represents the lightest
 * and 15 the highest value.
 *
 * @param {Object} color
 * @param {Function} fn
 */
L8.prototype.setSuperLED = function(color, fn) {
    this.sendFrame(
        this.buildFrame(SLCP.CMD.L8_SUPERLED_SET, this.encodeBGRSingleColor(color)),
        true, fn
    );
};

/**
 * Convenience function to switch off the SuperLED.
 *
 * The same effect may be created by setting all color components of the LED to 0
 *
 * @param {Function} fn
 */
L8.prototype.clearSuperLED = function(fn) {
    this.setSuperLED({r:0, g: 0, b: 0}, fn);
};

/**
 * Stop the currently running L8 application on the device.
 *
 * The L8 has certain predefined "Apps", which can be executed. This method
 * stops the currently running application.
 *
 * @param {Function} fn
 */
L8.prototype.stopApplication = function(fn) {
    this.sendFrame(
        this.buildFrame(SLCP.CMD.L8_APP_STOP, null),
        true, fn
    );
};

/**
 * Start the internal L8 application to scroll text across the device
 *
 * Once the scrolling has been started it needs to be stopped explicitly using
 * `stopApplication` or the convenience method `clearScrollingText`. Simply setting
 * other colors to the LED matrix is not enough to cancel the scrolling text.
 *
 * The `text` is supposed an ascii encoded string
 *
 * Color is specified as object with the usual `r`, `g`, `b` properties ranging
 * from 0-15.
 *
 * `speed` defines the scrolling speed. It is supposed to be one of "slow", "medium"
 * or "fast".
 *
 * `loop` is a boolean value specifiying if the animation is supposed to be looped,
 * after it completed once. If it is set to `false` the scrolling application is
 * exited after the first run through the text.
 *
 * This command is not acquitted by an L8 response. Instead the sent bytes are given to
 * the callback
 *
 * @param {String} text
 * @param {Object} color
 * @param {String} speed
 * @param {Boolean} loop
 * @param {Function} fn
 */
L8.prototype.setScrollingText = function(text, color, speed, loop, fn) {
    var parametersBuffer = new Buffer(1 /*LOOP*/ + 1 /*SPEED*/ + 3 /*COLOR*/ + text.length);

    parametersBuffer[0] = (loop === true) ? 1 : 0;

    switch(speed) {
        case "slow":
            parametersBuffer[1] = 3;
        break;
        case "medium":
            parametersBuffer[1] = 2;
        break;
        case "fast":
            parametersBuffer[1] = 0;
        break;
        default:
            throw RangeError("Invalid speed for scrolling text provided. Expected one of slow, medium or fast, got " + speed);
    }

    var colorBuffer = this.encodeRGBSingleColor(color);
    colorBuffer.copy(parametersBuffer, 2);

    var textBuffer = new Buffer(text, "ascii");
    textBuffer.copy(parametersBuffer, 5);

    this.sendFrame(
        this.buildFrame(SLCP.CMD.L8_SET_TEXT, parametersBuffer),
        false, fn
    );
};

/**
 * Convenience method to stop scrolling text from being displayed.
 *
 * The same behaviour is archivable by calling `stopApplication` as the text
 * scroller is an internal L8 application.
 *
 * @param {Function} fn
 */
L8.prototype.clearScrollingText = function(fn) {
    this.stopApplication(fn);
};

/**
 * Manually set the orientation of the L8
 *
 * The orientation setting determines in which way the pixel matrix is drawn.
 *
 * Valid orientations are:
 *  - up
 *  - down
 *  - left
 *  - right
 *  - auto
 *
 *  The orientation denotes, which side of the L8 is facing upwards. While the side
 *  with the power on switch is considered the Top side, while the one with the usb
 *  port is the Bottom side.
 *
 * This command is not acquitted by an L8 response all cases. Instead the sent
 * bytes are given to the callback in this situations.
 *
 * @param {String} orientation
 * @param {Function} fn
 */
L8.prototype.setOrientation = function(orientation, fn) {
    var parametersBuffer = new Buffer(1);

    if (orientation === "auto") {
        // Enable autoration an exit.
        parametersBuffer[0] = 1;
        this.sendFrame(
            this.buildFrame(SLCP.CMD.L8_SET_AUTOROTATE, parametersBuffer),
            SLCP.CMD.OK, fn
        );
    } else {
        // Disable autoration and set orientation manually.
        parametersBuffer[0] = 0;
        this.sendFrame(
            this.buildFrame(SLCP.CMD.L8_SET_AUTOROTATE, parametersBuffer),
            true, function(error, response) {
                switch(orientation) {
                    case "up":
                        parametersBuffer[0] = 1;
                        break;
                    case "down":
                        parametersBuffer[0] = 2;
                        break;
                    case "left":
                        parametersBuffer[0] = 5;
                        break;
                    case "right":
                        parametersBuffer[0] = 6;
                        break;
                    default:
                        throw new RangeError("Unexpected orientation: " + orientation);
                }

                this.sendFrame(
                    this.buildFrame(SLCP.CMD.L8_SET_ORIENTATION, parametersBuffer),
                    false, fn
                );
            }.bind(this)
        );
    }
};

exports.L8 = L8;