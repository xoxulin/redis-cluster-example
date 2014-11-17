'use strict';

var async = require('async');
var _ = require('lodash');
var redis = require('redis');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

// - - -

var Logger = require('../utils/logger')
var ns = require('../utils/namespace');
var logger = Logger.getLogger();
var nodeListParser = require('../utils/nodeListParser');
var roles = require('../constant/roles');
var channels = require('../constant/channels');

var Supervisor = function() {
	EventEmitter.call(this);
};

util.inherits(Supervisor, EventEmitter);

_.extend(Supervisor.prototype, (function() {

	var _self;

	var _role = roles.NONE;
	
	var _nodeName = "";
	var _generatorName = "";
	var _electionTimer = null;

	var _client = null;
	var _listenClient = null;
	var _nodeList = [];

	function start() {

		logger.info('Redis-Cluster started');

		var argv = Array.prototype.slice.call(process.argv, 2);
		var isGarbageCollector = _.find(argv, function(cmd) {return cmd === 'getError'}) != null;

		if (isGarbageCollector) {
			changeRole(roles.GARBAGE_COLLECTOR)
			Logger.setNodeName(roles.GARBAGE_COLLECTOR);
		} else {			
			_client = redis.createClient();
			listenMessages();
			resolveStartRole();
		}

	}

	function stop() {
		
		if (_client) {
			_client.end();
			_client = null;
		}
		if (_listenClient) {
			_listenClient.end();
			_listenClient = null;
		}

	}

	function listenMessages() {

		_listenClient = redis.createClient();
		_listenClient.on('pmessage', function(pattern, channel, message) {

		logger.info('Message:', channel, message);
		switch (channel) {
			case channels.GENERATOR_ELECTION:
				var generatorName = message;
				resolveNewRole(generatorName);
				break;
			case channels.GENERATOR_MESSAGE:
				restartElectionTimer();
				break;
		}
		});

		_listenClient.psubscribe(channels.COMMON);
	}

	function changeRole(role) {
		_role = role;
		Logger.setRole(role);
		_self.emit('changeRole', _role);
	}

	function resolveStartRole() {

		async.series({
			
			nodeName: createAndSetNodeName,
			nodeList: getNodeList,
			generatorName: getGenerator

		}, function(err, results) {

			_nodeName = results.nodeName;
			Logger.setNodeName(_nodeName);

			var generatorName = results.generatorName;
			_nodeList = results.nodeList;
			var generatorNode = _.find(_nodeList, {name: generatorName});

			if (!generatorName || !generatorNode) {
				
				var candidate = _nodeList[0].name;
				logger.log('No generator, need election', candidate);
				
				publishElectedGenerator(candidate, function(err, generatorName) {
					logger.log('Generator elected', generatorName);
				});

			} else {
				
				logger.info('Generator name is', results.generatorName);
				resolveNewRole(generatorName);

			}
		});
	}

	function resolveNewRole(generatorName) {

		_generatorName = generatorName;
		var newRole = (_nodeName === _generatorName) ? roles.GENERATOR : roles.HANDLER;

		if (newRole !== _role) {
			changeRole(newRole);
		}

		restartElectionTimer();
	}

	function createAndSetNodeName(callback) {
		
		_client.incr(ns.key('nodeCounter'), function(err, value) {
			_nodeName = ns.nodeName(value);
			_client.client('setname', _nodeName, function(err, res) {
				logger.info('Node name set:', _nodeName);
				callback(err, _nodeName);
			});
		});

	}

	function getNodeList(callback) {

		_client.client('list', function(err, response) {
			var nodeList = nodeListParser(response, ns.filter);
			logger.info('Node list loaded, ', _.size(nodeList), ' nodes');
			callback(err, nodeList);
		});
	}

	function getGenerator(callback) {
		_client.get(ns.key("generator"), function(err, generatorName) {
			logger.info('Generator name get', generatorName);
			callback(err, generatorName);
		});
	}

	function publishElectedGenerator(name, callback) {
		_client.multi().set(ns.key("generator"), name, function(err, generatorName) {
			logger.info('Generator name set', generatorName);
			callback(err, generatorName);
		}).publish(channels.GENERATOR_ELECTION, name).exec();
	}

	function restartElectionTimer() {
		if (_electionTimer) clearTimeout(_electionTimer);
		_electionTimer = setTimeout(function() {doElectionGenerator()}, 2000);
	}

	function doElectionGenerator() {

		_electionTimer = null;
		logger.log('No generator, need election');

		getNodeList(function(err, nodeList) {

			logger.log(_.map(nodeList, 'name'));

			_nodeList = nodeList;
			var candidate = _.last(nodeList);

			if (candidate) {
				
				publishElectedGenerator(candidate.name, function(err, generatorName) {
					logger.log('Generator elected', generatorName);
				});

			}
		
		});
	
	}

	return {
		start: function() {
			_self = this;
			start();
		},
		stop: function() {
			_self = null;
			stop();
		}
	};

})());

module.exports = Supervisor;