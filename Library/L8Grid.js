var RSVP = require("rsvp");

var L8 = require("./L8").L8;

/**
 * Wrapper to access and control a grid of multiple connected L8s as it were
 * one big matrix.
 *
 * @constructor
 */
var L8Grid = function(grid) {
    this.grid_ = grid;
};

L8Grid.prototype.mapCoordinates_ = function(x, y) {
    var segment = this.grid_.filter(function(segment) {
        return (
            x >= segment.position.x &&
            x <= segment.position.x + 7 &&
            y >= segment.position.y &&
            y <= segment.position.y + 7
        );
    }).pop();

    if (segment === undefined) {
        throw new RangeError("Grid coordinates can't be mapped to L8 in the grid: " + x + ", " + y);
    }

    var mapped = {
        l8: segment.l8,
        x: x - segment.position.x,
        y: y - segment.position.y
    };

    return mapped;
};

L8Grid.prototype.setLED = function(x, y, color, fn) {
    var mapping = this.mapCoordinates_(x, y);
    mapping.l8.setLED(mapping.x, mapping.y, color, fn);
};

L8Grid.prototype.clearLED = function(x, y, color, fn) {
    var mapping = this.mapCoordinates_(x, y);
    mapping.l8.clearLED(mapping.x, mapping.y, fn);
};

L8Grid.prototype.clearGrid = function() {
    return RSVP.all(this.grid_.map(function(segment) {
        return segment.l8.clearMatrix();
    }));
};

exports.L8Grid = L8Grid;