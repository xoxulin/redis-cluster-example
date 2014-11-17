'use strict';

var ns = function() {return this.toString()};
ns.toString = function() {return 'redis-cluster'};
ns.key = function(key) {
	return this + '_' + key;
}
ns.nodeName = function(num) {
	return this.key('node_'+num);
}
ns.filter = function(node) {
	return node.name && node.name.match(this);
}

module.exports = ns;