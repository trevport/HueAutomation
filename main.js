'use strict';

var rainforest = require('./rainforest-eagle')
  , config = require('./config.json')
  , Q = require("q")
  , hue = require("node-hue-api");

var eagleConfig = config.rainforest.eagle;
var hueApi = new hue.HueApi(config.hue.bridge.hostname, config.hue.bridge.user);

var groupId = config.hue.group;

function setGroupLightState(id, lightState) {
	return hueApi.setGroupLightState(id, lightState)
		.delay(2000)
		.then(hueApi.setGroupLightState(id, lightState.bri(5).transition(2000)))
		.delay(2000)
		.then(hueApi.setGroupLightState(id, lightState.bri(100).transition(2000)))
		.delay(2000)
		.then(hueApi.setGroupLightState(id, lightState.bri(5).transition(2000)))
		.delay(2000)
		.then(hueApi.setGroupLightState(id, lightState.bri(100).transition(2000)))
		.delay(2000)
		.then(hueApi.setGroupLightState(id, lightState.bri(0).transition(2000)))
		.delay(2000);
}

function restoreLightState(id, restoreState) {
	if (restoreState.on) {
		return hueApi.setLightState(id, hue.lightState.create().on().transition(1000).bri(restoreState.bri).sat(restoreState.sat).hue(restoreState.hue));
	} else {
		return hueApi.setLightState(id, hue.lightState.create().off().transition(1000));
	}
}

function getLightStateForPowerConsumed(powerConsumed) {
	console.log('consumed ' + powerConsumed + ' kW');
	var lightState = hue.lightState.create().on().transition(1500).bri(100).sat(245);
	
	if (powerConsumed < 12) {
		lightState = lightState.hue(25500);
	} else if (powerConsumed < 16) {
		lightState = lightState.hue(18000);
	} else if (powerConsumed < 20) {
		lightState = lightState.hue(10000);
	} else {
		lightState = lightState.hue(0);
	}
	
	return lightState;
}

function getGroupLightState(lights) {
	var promises = [];
	for (var i = 0; i < lights.length; i++) {
		promises.push(hueApi.lightStatus(lights[i]));
	}
	return Q.allSettled(promises);
}

rainforest.getPowerConsumedToday(eagleConfig)
	.then(getLightStateForPowerConsumed)
	.then(function(lightState) {
		hueApi.getGroup(groupId)
			.then(function(groupDetails) {
				var lights = groupDetails.lights;
				getGroupLightState(lights)
					.then(function(results) {
						setGroupLightState(groupId, lightState)
							.then(function() {
								for (var i = 0; i < lights.length; i++) {
									if (results[i].state === "fulfilled") {
										restoreLightState(lights[i], results[i].value.state);
									}
								}
							})
							.done();
					})
					.done();
			})
			.done();
	})
	.fail(function(error) {
		console.log(error);
	})
	.done();
