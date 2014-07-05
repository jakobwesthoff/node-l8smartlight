var Promisify = require("./Library/Promisify").Promisify;

// Protocol commands and queries
exports.SLCP = require("./Library/SLCP");

// Helper to build LED matrices
exports.MatrixBuilder = require("./Library/MatrixBuilder").MatrixBuilder;
// Stream to continuously access accelerometer data.
exports.AccelerationStream = require("./Library/AccelerationStream").AccelerationStream;

// Main entry point to control a L8
exports.L8 = require("./Library/L8").L8;
Promisify(exports.L8.prototype);