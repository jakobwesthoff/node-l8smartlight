# node-l8smartlight

[![node-l8smartlight on npm](http://img.shields.io/npm/v/l8smartlight.svg?0.1.1)](https://www.npmjs.org/package/l8smartlight)

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

The currently implemented methods are the following:

#### `L8#open(port, baudrate, fn)`
Open a connection to the L8

#### `L8#close(fn)`
The the established connection to the L8

#### `L8#ping(fn)`
Send a `ping` to the L8

#### `L8#setLED(x, y, color, fn)`
Set a specific LED to the given color.

The color is specified as object with `r`, `g` and `b` properties, which each house
values between 0-15.

#### `L8#clearLED(x, y, fn)`
Switch of a specific LED.

#### `L8#setMatrix(matrix, fn)`
Set the whole LED matrix at once to the given colors.
The colors are specified as a 64 elements array of colors.

Each color is specified as object with `r`, `g` and `b` properties, which each house
values between 0-15.

#### `L8#clearMatrix(fn)`
Switch of the whole LED matrix.

#### `L8#setSuperLED(color, fn)`
Set the color of the SuperLED on the back.

The color is specified as object with `r`, `g` and `b` properties, which each house
values from 0-15.

#### `L8#clearSuperLED(fn)`
Switch of the SuperLED

#### `L8#stopApplication(fn)`
Stop the integrated application currently running on the L8.

#### `L8#setScrollingText(text, color, speed, loop, fn)`
Set a scrolling text to be displayed on the L8.

#### `L8#clearScrollingText(fn)`
Clear the scrolling text again.

Setting the matrix or disabling it is not enough to stop the text from
scrolling. Call this method or `L8#stopApplication` for that.

#### `L8#setOrientation(orientation, fn)`
Enforce a specific orientation of the L8.

#### `L8#registerReceiver(receiver)`
Register a receiver function, which is given all the frames transmitted by the
L8 to the host

#### `L8#registerReceiverOnce(receiver)`
Register a receiver function, which is given the next frame transmitted by the
L8 to the host.

#### `L8#removeReceiver(receiverId)`
Remote a registered receiver again

#### `L8#registerMonitor(monitor)`
Register a monitor function, which is provided all the raw frames, before they
are sent to the L8

#### `L8#removeMonitor(monitorId)`
Remove a monitor again

#### `L8#sendFrame(buffer, expectResponse, fn)`
Send a raw frame to the L8, optionally awaiting a specific response in return.

#### `L8#buildFrame(command, parametersBuffer)`
Build a frame for the L8 using a specific `command` and list of parameters

#### `L8#encodeBGRSingleColor(color)`
Encode a color in BGR 3-byte format ready to be transmitted to the L8.
This function is only needed in conjunction with the raw `buildFrame` and
`sendFrame` methods.

#### `L8#encodeRGBSingleColor(color)`
Encode a color in RGB 3-byte format ready to be transmitted to the L8.
This function is only needed in conjunction with the raw `buildFrame` and
`sendFrame` methods.

#### `L8#encodeBGRMatrixColor(color)`
Encode a color in BGR 2-byte format ready to be transmitted to the L8.
This function is only needed in conjunction with the raw `buildFrame` and
`sendFrame` methods.

## Further documentation

All methods of the L8 library are extensively documented inside the source
code. Just take a look at `Library/L8.js` for details about arguments and
return values.
