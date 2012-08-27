var Provider = function() {
	var self = this;
	return self;
};

Provider.prototype.load = function() {
};

Provider.prototype.generateId = function(fields, separator) {
	fields = [].concat(fields);
	return Array.prototype.join.call(fields, separator);
};

exports.Provider = Provider;