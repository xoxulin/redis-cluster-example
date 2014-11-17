'use strict';

var _ = require('lodash');
var redis = require('redis');

var ns = require('../utils/namespace');
var logger = require('../utils/logger').getLogger();

var ErrorCollector = function() {}

_.extend(ErrorCollector.prototype, (function() {

	var _client;
	var _exit

	function start() {

		_client = redis.createClient();

		_client.llen(ns.key("error_message_queue"), function(err, count) {		
			_client.lrange(ns.key("error_message_queue"), 0, count, function(err, messages) {
				_client.del(ns.key("error_message_queue"), function(err, ok) {
					listMessages(messages);
				});
			});
		});
	}

	function stop() {
		_client.end();
		_client = null;
		setTimeout(function() {
			_exit()
		}, 0);
	}

	function listMessages(messages) {
		_.each(messages, function(msg) {logger.log('error message', msg)});
		stop();
	}

	return {
		start: function(exit) {
			_exit = exit;
			start();
		},

		stop: function() {}
	};

})())

module.exports = ErrorCollector;