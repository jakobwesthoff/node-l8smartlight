/**
 * @module Promisify
 */

var Promise = require("rsvp").Promise;

/**
 * Wrap the given function into a promise based version.
 *
 * The promise based version is identical to the one given, it allows non promise
 * calls by supplying all the arguments as usual. But if the callback function
 * is omitted it returns a promise instead.
 *
 * This function assumes that the given function has already been checked to be
 * a valid candidate for promise wrapping (last argument is a callback).
 *
 * @param originalFunction
 */
var wrapInPromise = function(originalFunction) {
    var arity = originalFunction.length;
    return function(/* variable arguments */) {
        var self = this;

        if (arguments.length !== arity - 1) {
            // If any other constelation then not providing the last argument callback
            // is found we simply call through
            return originalFunction.apply(self, arguments);
        }

        var args = Array.prototype.slice.call(arguments);


        // The callback has not been given lets promisify it
        return new Promise(function(resolve, reject) {
            args.push(function(error, value) {
                if (error) {
                    reject(error);
                } else {
                    resolve(value);
                }
            });

            originalFunction.apply(self, args);
        });
    }
};

/**
 * Wrapper to take an arbitrary object and turn all it's callback taking functions
 * into a version which allows to omit the callback and instead receive a promise.
 *
 * This only works if the callback is the last argument in the list. Furthermore
 * it needs to be called `fn`.
 *
 * Currently inheritance through the prototype chain is ignored completely
 *
 * Warning: This operation changes the underlying function replacing it with a
 * wrapped version.
 *
 * @param {Object} target
 */
var Promisify = function(target) {
    var property;
    for(property in target) {
        if (!target.hasOwnProperty(property)) {
            continue;
        }

        if (typeof target[property] !== "function") {
            continue;
        }

        var functionAnalyseRegExp = /\s*function[^(]*\(([^)]*,\s*fn|fn)\)/i;

        if (target[property].toString().match(functionAnalyseRegExp) === null) {
            // No fn argument present
            continue;
        }

        target[property] = wrapInPromise(target[property]);
    }
};

exports.Promisify = Promisify;