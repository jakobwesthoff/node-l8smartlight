var Collection = require("./Collection");

var GridBuilder = function(initialL8) {
    this.grid_ = [];
    this.addToGrid_(initialL8, 0, 0);
};

GridBuilder.prototype.left = function(l8) {
    this.moveGrid_(8, 0);
    this.addToGrid_(l8, 0, 0);
    return this;
};

GridBuilder.prototype.right = function(l8) {
    this.moveGrid_(-8, 0);
    this.addToGrid_(l8, 0, 0);
    return this;
};

GridBuilder.prototype.top = function(l8) {
    this.moveGrid_(0, 8);
    this.addToGrid_(l8, 0, 0);
    return this;
};

GridBuilder.prototype.bottom = function(l8) {
    this.moveGrid_(0, -8);
    this.addToGrid_(l8, 0, 0);
    return this;
};

GridBuilder.prototype.toGrid = function() {
    this.normalize_();
    return this.grid_;
};

GridBuilder.prototype.moveGrid_ = function(x, y) {
    Collection.forEach(this.grid_, function(segment) {
        segment.position.x += x;
        segment.position.y += y;
    });
};

GridBuilder.prototype.addToGrid_ = function(l8, x, y) {
    this.grid_.push({
        position: {x: x, y: y},
        l8: l8
    });
};

GridBuilder.prototype.normalize_ = function() {
    var topLeftSegment = this.grid_[0];
    this.grid_.forEach(function(segment) {
       if (segment.position.x < topLeftSegment.position.x ||
        segment.position.y < topLeftSegment.position.y) {
           topLeftSegment = segment;
       }
    });

    this.moveGrid_(topLeftSegment.position.x * -1, topLeftSegment.position.y * -1);
};

exports.GridBuilder = GridBuilder;