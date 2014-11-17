'use strict';

var _ = require('lodash');
var redis = require('redis');

var ns = require('../utils/namespace');
var logger = require('../utils/logger').getLogger();

var MessageHandler = function() {}

_.extend(MessageHandler.prototype, (function() {

	var _self;
	var _client;
	var _needStopped = false;

	function start() {
		_client = redis.createClient();
		action();
	}

	function stop() {
		_client.end();
		_client = null;
		_self = null;
		_needStopped = false;
	}
	
	function action() {

		if (_needStopped) {
			stop();
			return;
		}
		
		pullMessage(function(err, msg) {
			if (err) {
				logger.info('Error message', msg);
				pushErrorMessage(msg, function() {
					action()
				});
			} else {
				logger.info('Message handled:', msg);
				action();
			}
		});
	}

	function pullMessage(callback) {
		_client.blpop(ns.key("message_queue"), 0, function(err, response) {
			logger.log('Message recieved', response[0], response[1]);
			messageHandler(response[1], callback);
		});
	}

	function pushErrorMessage(message, callback) {
		_client.rpush(ns.key("error_message_queue"), message, callback);
	}



	function messageHandler(message, callback) {
		function onComplete(){
			var error = Math.random() > 0.85;
			callback(error, message);
		}
		setTimeout(onComplete, Math.floor(Math.random()*1000));
	}

	return {
		start: function() {
			_self = this;
			start();
		},
		stop: function() {
			_needStopped = true;
		}

	};

})());

module.exports = MessageHandler;