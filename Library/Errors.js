var util = require("util");

/**
 * Error thrown if the L8 answers a command with an error response
 *
 * @param {String} message
 * @param {{command: Number, parameters: Buffer, checksum: String, payloadLength: Number, raw: Buffer}} [response]
 * @constructor
 */
var L8Error = function(message, response) {
    Error.call(this, message);

    /**
     * Response object created by the error response
     *
     * @type {{command: Number, parameters: Buffer, checksum: String, payloadLength: Number, raw: Buffer}}
     */
    this.response = response;
};

util.inherits(L8Error, Error);

exports.L8Error = L8Error;