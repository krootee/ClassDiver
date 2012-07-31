var util = require("util");
var Provider = require('./provider.js').Provider;

var Udacity = function() {
	var self = this;
	Udacity.super_.call(this);
	return self;
};

util.inherits(Udacity, Provider);

Udacity.prototype.load = function(cb) {
	// TODO get courses
	cb({});
};

exports.Udacity = Udacity;
