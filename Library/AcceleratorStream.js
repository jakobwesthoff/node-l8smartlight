var util = require('util'),
    Stream = require('stream');

/**
 * Readonly stream that handles polling of the l8 accelerometer. Just create a stream and consume tha data
 *
 * @param {Object} options
 * @param {L8} l8
 * @param {int?} interval
 * @constructor
 */
var AcceleratorStream = function(options, l8, interval) {
    options || (options = {});
    options.objectMode = true;
    options.highWaterMark = 0; // We always want to load the newest data so we disable the buffer

    this.interval = interval;
    this.l8 = l8;

    Stream.Readable.call(this, options);

    this.cooldown_ = false;
    this.requested_ = false;
};

util.inherits(AcceleratorStream, Stream.Readable);

/**
 * Handles the data polling and delegates the callback
 * @private
 */
AcceleratorStream.prototype.poll_ = function() {
    this.l8.getAcceleration(this.onResponse_.bind(this));
};

/**
 * Handles the response and ensures it is called again if requests have been done during cooldown
 *
 * @param {String} error
 * @param {Object} data
 * @private
 */
AcceleratorStream.prototype.onResponse_ = function(error, data) {
    this.requested_ = false;
    this.cooldown_ = true;

    if(error) {
        throw new Error('Could not read stream: ' + error);
    }

    setTimeout(function() {
        this.cooldown_ = false;
        if (this.requested_) {
            this.poll_();
        }
    }.bind(this), this.interval);

    this.push(data);
};

/**
 * Triggers read to fill the buffer
 *
 * @private
 */
AcceleratorStream.prototype._read = function() {
    if (this.cooldown_) {
        this.requested_ = true;
        return;
    }

    this.poll_();
};

exports.AccelerometerStream = AcceleratorStream;