var _ = require('underscore');

var Provider = function() {
	var self = this;
	return self;
};

Provider.prototype.load = function() {
};

Provider.prototype.generateId = function(fields, separator) {
	fields = fields || [];
	if (!_.isArray(fields)) {
		fields = [ fields ];
	}
	return Array.prototype.join.call(fields, separator);
};

exports.Provider = Provider;