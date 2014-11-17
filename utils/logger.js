'use strict';

var _logger = require('logger').createLogger();
var roles = require('../constant/roles');

var _role = roles.NONE;
var _nodeName = roles.NONE

_logger.format = function(level, date, message) {
	return date.toLocaleTimeString() + " " + _role + ':' + _nodeName + ' |' + message;
};

module.exports = {
	getLogger: function() {
		return _logger;
	},
	setRole: function(role) {
		_role = role;
	},
	setNodeName: function(nodeName) {
		_nodeName = nodeName
	}
}