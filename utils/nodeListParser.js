'use strict';

var _ = require('lodash');

function parseValue(key, value) {
	switch (key) {
		case 'addr':
			var address = value.split(':');
			return {ip: address[0], port: parseInt(address)};
		case 'name':
		case 'flags':
		case 'events':
		case 'cmd':
			return value.replace('\n','');
		
		case 'id':
		case 'fd':
		case 'age':
		case 'idle':
		case 'db':
		case 'sub':
		case 'psub':
		case 'multi':
		case 'qbuf':
		case 'qbuf-free':
		case 'obl':
		case 'oll':
		case 'omem':
			return parseInt(value);

	}
}

function parseNode(nodeString) {
	var node = {};
	_.forEach(nodeString.split(' '), function(keyValue) {
		var pair = keyValue.split('=');
		node[pair[0]] = parseValue.apply(this, pair); 
	});
	return node;
}

module.exports = function(response, filterFn) {
	return _.sortBy(_.filter(_.map(response.split('\n'), parseNode), filterFn), 'age');
}