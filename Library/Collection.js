var Collection = {};

/**
 * Iteration abstraction for collections.
 *
 * @param {Object} collection
 * @param {Function} fn
 */
Collection.forEach = function(collection, fn) {
    var index, length;
    if (collection.constructor === [].constructor) {
        // Array iteration
        length = collection.length;
        for (index = 0; index < length; ++index) {
            if (fn.apply(this, [collection[index], index]) === false) {
                break;
            }
        }
    } else {
        // Object iteration
        for(index in collection) {
            if (collection.hasOwnProperty(index)) {
                if (fn.apply(this, [collection[index], index]) === false) {
                    break;
                }
            }
        }
    }
};

/**
 * Merge an arbitrary amount of target collections
 *
 * If a `targetCollection` is specified the merge is executed on this object
 * or array directly. If `null` is given a *new* collection instance will be
 * returned, which contains the merged elements.
 *
 * @param {Object|Array?} targetCollection
 * @param {Object|Array} collections...
 */
Collection.merge = function(targetCollection /*, ...collections */) {
    var collections = Array.prototype.slice.apply(arguments, [1]);
    if (collections[0].constructor === [].constructor) {
        // Array collection
        if (targetCollection === null) {
            targetCollection = [];
        }

        Collection.forEach(collections, function(collection) {
            Collection.forEach(collection, function(item) {
               targetCollection.push(item);
            });
        });

        return targetCollection;
    } else {
        // Object collection
        if (targetCollection === null) {
            targetCollection = {};
        }

        Collection.forEach(collections, function(collection) {
            Collection.forEach(collection, function(value, key) {
                targetCollection[key] = value;
            });
        });

        return targetCollection;
    }
};

/**
 * Reverse an array.
 *
 * Instead of reversing the array in place, like `Array.prototype.reverse` does
 * this function creates a new reversed array and returns it.
 *
 * Gaps in the array are not supported and are lost during the reverse process.
 *
 * @param {Array} inputArray
 * @return {Array}
 */
Collection.arrayReverse = function(inputArray) {
    if (inputArray.constructor !== [].constructor) {
        throw new RangeError("Only Arrays may be reversed.");
    }

    var targetArray = [];
    var inputLength = inputArray.length;

    Collection.forEach(inputArray, function(value, index) {
        targetArray[inputLength - index - 1] = value;
    });

    return targetArray;
};

/**
 * Map an input collection to an object instead of an array
 *
 * The callback function is invoked for each element of the collection.
 *
 * The callback to return an Array, which does contain two entries the key and
 * the value to be emitted.
 *
 * Optionally an array of arrays can be returned, if multiple key/value pairs
 * are to be emitted.
 *
 * In each cycle the returned data is merged with everything, which has been
 * there before.
 *
 * In the end the resulting object is returned.
 *
 * @param {Object|Array} collection
 * @param {Function} callback
 * @return {Object}
 */
Collection.mapToObject = function(collection, callback) {
    var result = {};
    Collection.forEach(collection, function(value, index) {
        var emittedObject = {};
        var emittedValues = callback(value, index);

        if (emittedValues[0].constructor !== [].constructor) {
            emittedValues = [emittedValues];
        }

        Collection.forEach(emittedValues, function(emittedValue) {
            emittedObject[emittedValue[0]] = emittedValue[1];
        });

        Collection.merge(result, emittedObject);
    });

    return result;
};

module.exports = Collection;
