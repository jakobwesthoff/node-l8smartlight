var RSVP = require("rsvp");

var Collection = require("./Collection");
var MatrixBuilder = require("./MatrixBuilder").MatrixBuilder;
var L8 = require("./L8").L8;

/**
 * Wrapper to access and control a grid of multiple connected L8s as it were
 * one big matrix.
 *
 * @constructor
 */
var L8Grid = function(description) {
    this.grid_ = description.toGrid();
};

L8Grid.prototype.$promisify = [
    "open"
];

L8Grid.prototype.mapCoordinates_ = function(x, y) {
    var segmentIndex = null;
    var segment = this.grid_.filter(function(segment, index) {

        if (x >= segment.position.x &&
            x <= segment.position.x + 7 &&
            y >= segment.position.y &&
            y <= segment.position.y + 7
        ) {
            segmentIndex = index;
            return true;
        }
        return false;
    }).pop();

    if (segment === undefined) {
        throw new RangeError("Grid coordinates can't be mapped to L8 in the grid: " + x + ", " + y);
    }

    return {
        gridIndex: segmentIndex,
        l8: segment.l8,
        x: x - segment.position.x,
        y: y - segment.position.y
    };
};

L8Grid.prototype.mapMatrix_ = function(matrix) {
    var mappings = this.grid_.map(function(segment) {
        return {
            matrix: MatrixBuilder.createArrayWithSize(8*8),
            l8: segment.l8
        };
    });

    MatrixBuilder.forEach(matrix, function(value, x, y, index) {
        var pixelMapping = this.mapCoordinates_(x, y);
        mappings[pixelMapping.gridIndex].matrix[pixelMapping.x + (pixelMapping.y * 8)] = value;
    }.bind(this), 32);

    return mappings;
};

var mappingBlacklist = {
};

var coordinateFunctionRegExp = /\s*function[^(]*\(([^)]*,\s*x\s*,\s*y\s*,[^)]*fn|x\s*,\s*y\s*,[^)]*fn)\)/i;
var matrixFunctionRegExp = /\s*function[^(]*\(([^)]*,\s*matrix\s*,[^)]*fn|matrix\s*,[^)]*fn)\)/i;
var callbackFunctionRegExp = /\s*function[^(]*\(([^)]*,\s*fn|fn)\)/i;
var argumentDeclarationRegExp = /\s*function[^(]*\(([^)]+)\)/i;
Collection.forEach(L8.prototype.__promisify, function(method, name) {
    if (mappingBlacklist[name] !== undefined) {
        // Skip all blacklisted methods
        return;
    }

    var methodString = method.toString();
    var functionArguments = methodString
        .match(argumentDeclarationRegExp)[1]
        .replace(/ /g, "")
        .split(",");

    switch(true) {
        case coordinateFunctionRegExp.test(method.toString()):
            L8Grid.prototype[name] = function(/* variable arguments */) {
                var args = Array.prototype.slice.apply(arguments);
                var x, xPos, y, yPos;
                args.forEach(function(argument, index) {
                    if (functionArguments[index] === "x") {
                        xPos = index;
                        x = argument;
                    } else if (functionArguments[index] === "y") {
                        yPos = index;
                        y = argument;
                    }
                });

                var mapping = this.mapCoordinates_(x, y);
                args[xPos] = mapping.x;
                args[yPos] = mapping.y;
                mapping.l8[name].apply(mapping.l8, args);
            };
            L8Grid.prototype.$promisify.push(name);
            break;
        case matrixFunctionRegExp.test(method.toString()):
            L8Grid.prototype[name] = function(/* variable arguments */) {
                var args = Array.prototype.slice.apply(arguments);
                var matrix, matrixPos;
                args.forEach(function(argument, index) {
                    if (functionArguments[index] === "matrix") {
                        matrixPos = index;
                        matrix = argument;
                    }
                });

                var mappings = this.mapMatrix_(matrix);
                mappings.forEach(function(mapping) {
                    args[matrixPos] = mapping.matrix;
                    mapping.l8[name].apply(mapping.l8, args);
                });
            };
            L8Grid.prototype.$promisify.push(name);
            break;
        case callbackFunctionRegExp.test(method.toString()):
            L8Grid.prototype[name] = function(/* variable arguments */) {
                var args = Array.prototype.slice.apply(arguments);
                var fn = args.pop();

                RSVP.all(this.grid_.map(function(segment){
                    return segment.l8[name].apply(segment.l8, args);
                })).then(function(results) {
                    fn(false, results);
                }).catch(function(error) {
                    fn(error, false);
                });
            };
            L8Grid.prototype.$promisify.push(name);
            break;
        default:
            // Skip everything, which does not match
            return;
    }
});

exports.L8Grid = L8Grid;