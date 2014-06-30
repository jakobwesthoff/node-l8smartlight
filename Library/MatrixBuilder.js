/**
 * The MatrixBuilder eases the creation of LED matrix definitions for your L8
 * Smartlight.
 *
 * It provides a couple of convenience functions to create and manipulate matrix
 * arrays.
 *
 * The constructor either takes a baseColor for the whole matrix, or a complete
 * matrix as a starting point for manipulations.
 *
 * The `baseColorOrMatrix` argument is optional. If none is supplied an LED
 * off-state is chosen as default for every LED in the matrix.
 *
 * @example ```
 *  var l8 = new L8();
 *  //... Initialize L8...
 *
 *  var builder = new MatrixBuilder();
 *  var matrix = builder.rectangle(
 *      {r: 0, g: 0, b: 15},
 *      2, 2,
 *      5, 5,
 *      false
 *  )
 *  .row({r: 15, g: 0, b: 0}, 3)
 *  .row({r: 15, g: 0, b: 0}, 4)
 *  .column({r: 15, g: 0, b: 0}, 3}),
 *  .column({r: 15, g: 0, b: 0}, 4)
 *  .toMatrix();
 *
 *  l8.setMatrix(matrix);
 * ```
 *
 * The given examples draws a blue border with a red crosshair on the L8
 *
 * @param {{r:Number, g:Number, b:Number}|Array} [baseColorOrMatrix]
 * @constructor
 */
var MatrixBuilder = function(baseColorOrMatrix) {
    /**
     * List of all transformation operations to be applied to the initial
     * matrix upon calls to `toMatrix`.
     *
     * @type {Array}
     * @private
     */
    this.operations_ = [];

    /**
     * The initial matrix all operations will be applied against.
     *
     * @type {Array}
     * @private
     */
    this.initialMatrix_ = null;


    if (baseColorOrMatrix === undefined) {
        // By default all LEDs are off
        baseColorOrMatrix = {r: 0, g: 0, b: 0};
    }

    if (baseColorOrMatrix.constructor !== [].constructor) {
        // Assuming it is a base color
        this.validateColors_([baseColorOrMatrix]);
        this.initialMatrix_ = this.createArrayWithSize(8*8).map(function() {
            return baseColorOrMatrix;
        });
    } else {
        // A matrix has been provided. We copy it as we don't want to unintentionally change
        // it during the building process.
        this.initialMatrix_ = this.createArrayWithSize(8*8).map(function(value, index) {
            return baseColorOrMatrix[index];
        });
    }
};

/**
 * Execute a `map` like operation on a matrix taking into account its special nature.
 *
 * The operation is mostly equivalent to a normal `array.map` call. However special
 * considerations about the matrix will be taken into account, like lines and columns.
 *
 * The callback is executed with the following arguments:
 *
 * - color
 * - column (x-coordinate)
 * - row (y-coordinate)
 * - index
 *
 * The matrix will be modified in place
 *
 * The following example will remove the *red* component of any pixel inside the
 * given matrix.
 *
 * @example ```
 *  var matrix = // some matrix
 *  MatrixBuilder.map(matrix, function(originalColor, row, column, index) {
 *      return {r: 0, g: originalColor.g, b: originalColor.b};
 *  });
 *
 *  l8.setMatrix(matrix, ...);
 * ```
 *
 * @param {Array} matrix
 * @param {Function} fn
 * @static
 */
MatrixBuilder.map = function(matrix, fn) {
    matrix.forEach(function(value, index) {
        matrix[index] = fn(value, index % 8, Math.floor(index / 8), index);
    })
};


/**
 * Validate coordinates are valid numbers between 0-7
 *
 * If one of the coordinates is invalid an exception will be thrown.
 *
 * @param {Number[]} coordinates
 * @private
 */
MatrixBuilder.prototype.validateCoordinates_ = function(coordinates) {
    coordinates.forEach(function(coordinate) {
        if (typeof coordinate !== "number" || coordinate < 0 || coordinate > 7) {
            throw new RangeError("Valid LED coordinate (0-7) expected, got " + coordinate);
        }
    });
};

/**
 * Validate colors are valid r, g, b objects
 *
 * If one of the colors is invalid an exception will be thrown.
 *
 * @param {Object[]} colors
 * @param {Number} colors.r
 * @param {Number} colors.g
 * @param {Number} colors.b
 *
 * @private
 */
MatrixBuilder.prototype.validateColors_ = function(colors) {
    colors.forEach(function(color) {
        if (color.r === undefined || color.g === undefined || color.b === undefined) {
            throw new RangeError("Color object with r,g and b properties expected, got: " + JSON.stringify(baseColorOrMatrix));
        }
    });
};

/**
 * Create an Array with a given size and values at every index position.
 *
 * This array may easily be used to execute map/reduce operations to fill/create
 * a new array structure.
 *
 * @param {Number} size
 * @returns {Array}
 */
MatrixBuilder.prototype.createArrayWithSize = function(size) {
    return Array.apply(null, new Array(size));
};

/**
 * Add a transformation operation to the MatrixBuilder
 *
 * Operations are functions, which will be called in order of registration upon
 * the matrix. They are supposed to transform or manipulate it in any way relevant
 * to the creation process.
 *
 * Operations are provided with an optional parameters object, which may be
 * supplied during the call to `toMatrix`, which allows to introduce variables
 * into the building pipeline.
 *
 * @param fn
 * @returns {MatrixBuilder}
 */
MatrixBuilder.prototype.operation = function(fn) {
    this.operations_.push(fn);
    return this;
};

/**
 * Draw pixels inside a certain row of the grid.
 *
 * Optionally a start and end column may be provided. If none are given the start
 * and end of the line are assumed.
 *
 * @param {{r: Number, g: Number, b: Number}} color
 * @param {Number} y
 * @param {Number} x0
 * @param {Number} x1
 * @returns {MatrixBuilder}
 */
MatrixBuilder.prototype.row = function(color, y, x0, x1) {
    x0 = x0 || 0;
    x1 = x1 || 7;

    this.validateColors_([color]);
    this.validateCoordinates_([y, x0, x1]);

    return this.operation(function(matrix, variables){
        MatrixBuilder.map(matrix, function(originalColor, column, row) {
            return (row === y && column >= x0 && column <= x1) ? color : originalColor;
        });
    });
};

/**
 * Draw pixels inside a certain column of the grid.
 *
 * Optionally a start and end row may be provided. If none are given the start
 * and end of the column are assumed.
 *
 * @param {{r: Number, g: Number, b: Number}} color
 * @param {Number} x
 * @param {Number} y0
 * @param {Number} y1
 * @returns {MatrixBuilder}
 */
MatrixBuilder.prototype.column = function(color, x, y0, y1) {
    y0 = y0 || 0;
    y1 = y1 || 7;

    this.validateColors_([color]);
    this.validateCoordinates_([x, y0, y1]);

    return this.operation(function(matrix, variables){
        MatrixBuilder.map(matrix, function(originalColor, column, row) {
            return (column === x && row >= y0 && row <= y1) ? color : originalColor;
        });
    });
};

/**
 * Draw a rectangle to the pixel grid
 *
 * The grid is defined by specifying its upper left and lower right coordinates.
 *
 * Optionally it may be specified if the grid should be filled or not. By
 * default the grid will be filled.
 *
 * @param {{r: Number, g: Number, b: Number}} color
 * @param {Number} x0
 * @param {Number} y0
 * @param {Number} x1
 * @param {Number} y1
 * @param {Boolean} [filled]
 *
 * @returns {MatrixBuilder}
 */
MatrixBuilder.prototype.rectangle = function(color, x0, x1, y0, y1, filled) {
    if (filled === undefined) {filled = true;}

    this.validateColors_([color]);
    this.validateCoordinates_([x0, x1, y0, y1]);

    if (filled === true) {
        return this.operation(function(matrix, variables){
            MatrixBuilder.map(matrix, function(originalColor, column, row) {
                return (column >= x0 && column <= x1 && row >= y0 && row <= y1) ? color : originalColor;
            });
        });
    } else {
        return this.operation(function(matrix, variables){
            MatrixBuilder.map(matrix, function(originalColor, column, row) {
                return (
                    (column >= x0 && column <= x1 && (row === y0 || row === y1))
                    || (row >= y0 && row <= y1 && (column === x0 || column === x1))
                        ? color : originalColor
                );
            });
        });
    }
};

/**
 * Generate the matrix using all defined operations as well as the variables
 *
 * The given variables will be provided to each operation.
 * Operations will be executed in the defined order.
 *
 * @param {Object} [variables]
 * @returns {Array}
 */
MatrixBuilder.prototype.toMatrix = function(variables) {
    variables = variables || {};

    // Start with a copy of the original matrix
    var currentMatrix = this.createArrayWithSize(8*8).map(function(value, index) {
        return this.initialMatrix_[index];
    }.bind(this));

    this.operations_.forEach(function(operation) {
        operation(currentMatrix, variables);
    });

    return currentMatrix;
};

exports.MatrixBuilder = MatrixBuilder;