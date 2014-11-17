#!/usr/bin/env node

'use strict';

var roles = require('constant/roles');
var Supervisor 	= require('lib/supervisor');

var actions = {};
	actions[roles.GENERATOR] = require('lib/messageGenerator');
	actions[roles.GARBAGE_COLLECTOR] = require('lib/errorCollector');
	actions[roles.HANDLER] = require('lib/messageHandler');

var actor = null;

// - - -

var supervisor = new Supervisor();

supervisor.on('changeRole', function(role) {

	if (actor) actor.stop();
	var Actor = actions[role];

	actor = new Actor();
	actor.start(exit);

});

supervisor.start();

function exit() {
	process.exit();
}