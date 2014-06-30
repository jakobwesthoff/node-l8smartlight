# node-l8smartlight

[![node-l8smartlight on npm](http://img.shields.io/npm/v/l8smartlight.svg?0.1.2)](https://www.npmjs.org/package/l8smartlight)

A nodejs library to talk to the [L8 Smartlight](http://www.l8smartlight.com/).

As all of the currently available SDK versions (especially the JavaScript one)
did not work for me. I decided to quickly hack my own implementation based on
[node-serialport](https://github.com/voodootikigod/node-serialport).


## Status

The currently available library is a work in progress. The API is currently
quite fluid. Don't expect it to be stable at at the moment.

## Implemented Functionality

Currently mainly the Command API has been implemented, in order to be able to
control the L8 appearance and functionality.

Especially the Query API has not really been implemented yet. Therefore the
library does currently not allow any of the sensor data to be retrieved. If you
really want to do that at the moment you may use the raw `L8#sendFrame` and
`L8#buildFrame` methods. In the future I plan to support those functionality as
well.

See the [API-Documentation](http://jakobwesthoff.github.io/node-l8smartlight/)
of the library for details about the API. In order to see the library in action
you may take a look at the `Examples` folder of the project, which houses
different kinds of demonstration scripts.

## Working with Promises

Every method, that needs to be called with a callback (`fn`) function, can utilize
Promises as well. Simply omit the callback function, while invoking it. In this case
a [Promise/A+](http://promises-aplus.github.io/promises-spec/) compatible promise
will be returned by the method, which will be resolved once the operation finished,
or rejected should an error occur.

## Further documentation

All methods of the L8 library are extensively documented inside the source
code. Just take a look at the generated
[API-Documentation](http://jakobwesthoff.github.io/node-l8smartlight/) or the
corresponding source files starting with `Library/L8.js` for details about
arguments and return values.

### Generating the documentation

If you want to locally generate the documentation of the package, just run
`grunt documentation` after installing all the dependencies utilizing
`npm install`.
