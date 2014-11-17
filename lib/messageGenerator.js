'use strict';

var _ = require('lodash');
var redis = require('redis');

var ns = require('../utils/namespace');
var logger = require('../utils/logger').getLogger();
var channels = require('../constant/channels');

var MessageGenerator = function() {}

_.extend(MessageGenerator.prototype, (function() {

	var _self;
	var _count = 0;
	var _client = null;
	var _timer = null;

	function start() {
		_client = redis.createClient();
		action();
	}

	function stop() {
		clearTimeout(_timer);
		_timer = null;
		_client.end();
		_client = null;
	}

	function getMessage(){
		return _count++;
	}

	function generateMessage() {

		var message = getMessage();

		_client.multi().rpush(ns.key("message_queue"), message, function(err, count) {
			logger.info('Generator send message:', message, ', queue: ', count);
		}).publish(channels.GENERATOR_MESSAGE, message).exec();
	}

	function action() {
		generateMessage();
		_timer = setTimeout(action, 500);
	}

	return {
		//public methods
		start: function() {
			_self = this;
			start();
		},
		stop: function() {
			stop();
			_self = null;
		}
	};

})());

module.exports = MessageGenerator;