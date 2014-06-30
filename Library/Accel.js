var util = require('util'),
    SLCP = require('./SLCP'),
    EventEmitter = require('events').EventEmitter;

/**
 * Receiver which listens for accelerometer responses and decode the payload to nice struct
 *
 * @param {L8} l8 instance
 * @param {int?} interval for polling
 */
var Accel = function(l8, interval) {
    this.interval = interval || 500;
    this.l8 = l8;

    this.receiverId = null;

    this.orientationMap_ = {
        1: 'up',
        2: 'down',
        6: 'left',
        5: 'right'
    };
};

util.inherits(Accel, EventEmitter);

/**
 * Starts the polling of accel data
 */
Accel.prototype.startWatch = function(){
    this.receiverId = this.l8.registerReceiver(this.onResponse_.bind(this));
    this.l8.queryAccelerationSensor();
    // setInterval failed and I don't know why
    //this.intervalId = setInterval(this.l8.queryAccelerationSensor, this.interval);
};

/**
 * Stops accel data polling
 */
Accel.prototype.stopWatch = function() {
    if(this.receiverId) {
        this.l8.removeReceiver(this.receiverId);
        clearInterval(this.intervalId);
    }
};

/**
 * Decodes the command payload and transforms it to an object and emit the necessary events
 *
 * @param response
 * @private
 */
Accel.prototype.onResponse_ = function(response) {
    if(response.command === 77) {
        var parameters = response.parameters,
            accelData = {
            'x': parseInt(parameters[0], 16),
            'y': parseInt(parameters[1], 16),
            'z': parseInt(parameters[2], 16),
            'lying':parameters[3] === 02 ? 'up' : 'upside_down',
            'orientation': this.orientationMap_[parameters[4]],
            'tap': (parameters[5] === 01),
            'shake': !(parameters[6] === 00)
        };

        this.emit('accel', accelData);

        if(accelData.tap) {
            // Tap is always 01 :(
            // this.emit('tap');
        }

        if(accelData.shake) {
            this.emit('shake');
        }

        // setInterval failed hard so we do it this way
        var light = this.l8;
        setTimeout(function(){
            light.queryAccelerationSensor()
        }, this.interval);
    }
};

exports.Accel = Accel;