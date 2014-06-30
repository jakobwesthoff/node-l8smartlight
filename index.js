var Promisify = require("./Library/Promisify").Promisify;

exports.SLCP = require("./Library/SLCP");

exports.L8 = require("./Library/L8").L8;
Promisify(exports.L8.prototype);

exports.Accel = require('./Library/Accel').Accel;