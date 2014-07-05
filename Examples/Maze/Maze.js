var L8 = require("../../index").L8,
    stdin = process.openStdin();
try {
    var mazeGen = require('simple-maze-generator');
    var keypress = require('keypress');
} catch(e) {
    console.error("This example requires the npm packages simple-maze-generator and keypress");
    console.error("Switch to the 'Examples/Maze' directory and issue a 'npm install' to download them");
    process.exit(255);
}

var empty = {r: 0, b: 0, g: 0},
    player = {r: 15, g: 0, b: 0},
    goal = {r: 0, g: 15, b: 0},
    wall = {r: 0, g: 15, b: 15};

var SERIAL_PORT = "/dev/tty.L8-SerialPortServerPort1";

var l8 = new L8();

/**
 * The main game class
 *
 * @param {L8} l8
 * @constructor
 */
var MazeGame = function(l8) {
    this.l8 = l8;
    this.goal = 0;
    this.currentPos = 0;
    this.running = false;
    this.matrix = [];
};

/**
 * Generates a new maze
 * @returns {maze}
 * @private
 */
MazeGame.prototype.generateMaze_ = function() {
    var maze = mazeGen(8, 8, 0.2);

    this.currentPos = Math.floor(8 * Math.random()) * 8;
    this.goal = Math.ceil(8 * Math.random()) * 8 - 1;

    maze.makeWay(this.currentPos, this.goal);
    return maze;
};

/**
 * Starts the game
 */
MazeGame.prototype.startGame = function() {
    var maze = this.generateMaze_();
    var generatedMaze = maze.toMatriz();

    this.l8.clearMatrix();
    this.matrix = Array.apply(null, new Array(8 * 8)).map((function(value, index) {
        // FIXME this scope
        if (index === this.currentPos) {
            return player;
        }
        if (index === this.goal) {
            return goal;
        }
        return generatedMaze[Math.floor(index / 8)][index % 8] == 1 ? wall : empty;
    }).bind(this));
    this.l8.setMatrix(this.matrix);
    this.running = true;
};

/**
 * Shows winning animation
 */
MazeGame.prototype.win = function() {
    this.running = false;
    this.l8.clearMatrix();
    this.l8.setScrollingText('WON!', goal, "medium", false);
};

/**
 * Moves to the specified position
 *
 * @param {int} nextPos
 * @private
 */
MazeGame.prototype.move_ = function(nextPos) {
    if (this.running !== true) {
        return;
    }

    this.setPixel_(this.currentPos, empty);
    this.setPixel_(nextPos, player);
    this.currentPos = nextPos;

    if (this.currentPos == this.goal) {
        this.win();
    }
};

/**
 * Sets a single pixel in the matrix
 *
 * @param {int} pixelIndex
 * @param {{r:Number, g:Number, b:Number}} color
 * @private
 */
MazeGame.prototype.setPixel_ = function(pixelIndex, color) {
    this.matrix[pixelIndex] = color;
    this.l8.setLED(
        Math.floor(pixelIndex / 8), (pixelIndex % 8),
        color,
        function(error, response) {
        }
    );
};

/**
 * Moves player to the left
 */
MazeGame.prototype.left = function() {
    var target = this.matrix[this.currentPos - 1];
    if ((this.currentPos % 8) > 0
        && (target == empty || target == goal)) {
        this.move_(this.currentPos - 1);
    }
};

/**
 * Moves player to the right
 */
MazeGame.prototype.right = function() {
    var target = this.matrix[this.currentPos + 1];
    if ((this.currentPos % 8) < 7
        && (target == empty || target == goal)) {
        this.move_(this.currentPos + 1);
    }
};

/**
 * Moves player to the up
 */
MazeGame.prototype.up = function() {
    var target = this.matrix[this.currentPos - 8];
    if (this.currentPos > 7
        && (target == empty || target == goal)) {
        this.move_(this.currentPos - 8);
    }
};

/**
 * Moves player to the down
 */
MazeGame.prototype.down = function() {
    var target = this.matrix[this.currentPos + 8];
    if (this.currentPos < 55
        && (target == empty || target == goal)) {
        this.move_(this.currentPos + 8);
    }
};

/**
 * Triggered on return keypress
 */
MazeGame.prototype.onReturn = function() {
    if(!this.running) {
        this.startGame();
    }
};

/**
 * Exit the game
 */
MazeGame.prototype.exit = function() {
    l8.clearMatrix();
    process.exit(0);
};

// create a new game instance
var game = new MazeGame(l8);

// init input
keypress(process.stdin);

process.stdin.setRawMode(true);
process.stdin.resume();

// init l8 connection
l8.open(SERIAL_PORT, null, function(error, response) {
    if (error) {
        throw error;
    }
    // we want to have a fixed orientation
    l8.setOrientation('up');

    game.startGame();

    // bind acceleration controls
    var accelStream = l8.createAccelerationStream(100);
    accelStream.on('data', function(data) {
        if (data.y > 50 && data.y < 95) {
            game.up();
        }
        if (data.y > 5 && data.y < 50) {
            game.down();
        }
        if (data.x > 50 && data.x < 95) {
            game.left();
        }
        if (data.x > 5 && data.x < 50) {
            game.right();
        }
    });

    // bind keyboard controls
    process.stdin.on('keypress', function(ch, key) {
        if (key && key.ctrl && key.name == 'c') {
            game.exit();
        }
        switch (key.name) {
            case 'up':
            case 'down':
            case 'left':
            case 'right':
                game[key.name]();
                break;
            case 'return':
                game.onReturn();
        }
    });
});
