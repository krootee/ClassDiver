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

Provider.prototype.mergeCourses = function(destination, source) {
	for ( var id in source) {
		for ( var prop in source[id]) {
			destination[id][prop] = source[id][prop];
		}
	}
	return destination;
};

exports.Provider = Provider;