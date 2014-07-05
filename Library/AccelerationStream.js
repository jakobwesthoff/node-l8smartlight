var util = require('util');
var Stream = require('stream');

/**
 * Time based stream of acceleration data from the L8.
 *
 * The stream is an object mode stream. It therefore does not return a buffer
 * if read, but one Acceleration data struct at a time. The data structure is
 * identical with the one you would get from the {@link L8#getAcceleration} method.
 *
 * The L8 only provides the Acceleration information if they are polled. This
 * stream takes care of polling the data at a given sampling rate and providing
 * it to you in an easily accessible way.
 *
 * The stream automatically takes care of starting and stopping the data polling
 * once a *listener* is connected or disconnected. Therefore you do not need to
 * take care of this nasty business yourself.
 *
 * The Stream needs an instance of the L8 class to attach to, as well as an optional
 * `samplingRate_`. The sampling rate tells the system which timeframe (in msec) should be
 * waited between two data polls. If none is given `100 msec` is assumed by default.
 *
 * In order to utilize the Stream simply wrap it around an L8 instance and attach to the
 * corresponding [Stream](http://nodejs.org/api/stream.html#stream_class_stream_readable)
 * event handlers:
 *
 * @example ```
 *  var l8 = //...
 *
 *  var acceleration = new AccelerationStream(l8, 200);
 *  acceleration.on("data", function(data) {
 *      // Do something with each part of the acceleration data here.
 *  });
 * ```
 *
 * Alternatively the convenience function {@link L8#createAccelerationStream} can
 * be used to get an already connected stream directly from an L8 instance
 *
 * @example ```
 *  var l8 = //...
 *  var acceleration = l8.createAccelerationStream(200);
 *  acceleration.on("data", function(data) {
 *      // Do something with each part of the acceleration data here.
 *  });
 * ```
 *
 * @param {L8} l8 Instance of the L8 to attach to.
 * @param {int} [samplingRate]
 * @constructor
 */
var AccelerationStream = function(l8, samplingRate) {
    samplingRate = samplingRate || 100;

    /**
     * Instance of the L8 to access for acceleration data
     * @type {L8}
     *
     * @private
     */
    this.l8_ = l8;

    /**
     * Sampling rate which defines in which interval the data is polled from the L8
     *
     * @type {Number}
     * @private
     */
    this.samplingRate_ = samplingRate;

    /**
     * Status flag indicating whether the stream is in cooldown mode, aka. if it is
     * currently waiting for the next sampling interval to occur.
     *
     * @type {boolean}
     * @private
     */
    this.cooldown_ = false;

    /**
     * Status flag indicating whether a request to read a new acceleration data package
     * was issued during the current cooldown mode
     *
     * @type {boolean}
     * @private
     */
    this.requested_ = false;

    /*
     * The underlying stream should operate in Object mode.
     * Furthermore the internal Stream buffer needs to be disabled, as we have
     * a time based stream here, which always should provide the newest data.
     */
    var options = {
        objectMode: true,
        highWaterMark: 0
    };
    // Call super constructor
    Stream.Readable.call(this, options);
};
util.inherits(AccelerationStream, Stream.Readable);

/**
 * Poll the acceleration information from the L8.
 *
 * After the polling is complete the {@link AccelerationStream#onResponse_} method
 * will be invoked as callback.
 *
 * @private
 */
AccelerationStream.prototype.poll_ = function() {
    this.l8_.getAcceleration(this.onResponse_.bind(this));
};

/**
 * Callback invoked each time acceleration data has been read from the L8
 *
 * The information is retrieved directly from the `getAcceleration` method.
 *
 * @param {String?} error
 * @param {Object} data
 * @private
 */
AccelerationStream.prototype.onResponse_ = function(error, data) {
    this.requested_ = false;
    this.cooldown_ = true;

    if(error) {
        throw new Error('An error occured while reading the acceleration information: ' + error);
    }

    setTimeout(function() {
        this.cooldown_ = false;
        if (this.requested_) {
            this.poll_();
        }
    }.bind(this), this.samplingRate_);

    // Push the read information into the Streams read buffer to distribution^^
    this.push(data);
};

/**
 * Triggered by the stream API in case the read buffer needs to be filled with information.
 *
 * @private
 */
AccelerationStream.prototype._read = function() {
    if (this.cooldown_) {
        this.requested_ = true;
        return;
    }

    this.poll_();
};

exports.AccelerationStream = AccelerationStream;