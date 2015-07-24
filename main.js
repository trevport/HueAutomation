'use strict';

var rainforest = require('./rainforest-eagle')
  , config = require('./config.json')
  , Q = require("q")
  , hue = require("node-hue-api");

var eagleConfig = config.rainforest.eagle;
var hueApi = new hue.HueApi(config.hue.bridge.hostname, config.hue.bridge.user);

var lights = config.hue.lights;
var restoreState = [];

function changeLightState(lightId, newState, restoreState) {
	hueApi.setLightState(lightId, newState)
	.delay(10000)
	.then(function() {
		if (restoreState) {
			if (restoreState.on) {
				hueApi.setLightState(lightId, hue.lightState.create().on().transition(1000).bri(restoreState.bri).sat(restoreState.sat).hue(restoreState.hue)).done();
			} else {
				hueApi.setLightState(lightId, hue.lightState.create().off().transition(1000)).done();
			}
		}
	})
	.done();
}

rainforest.getHistoricalDataForWeek(eagleConfig)
	.then(function(result) {
		var consumedToday = Number(result['value[6]']);
		console.log('consumed ' + consumedToday + ' kW');
		var lightState = hue.lightState.create().on().transition(1000).bri(90).sat(240);
		
		if (consumedToday < 12) {
			lightState = lightState.hue(25500);
		} else if (consumedToday < 16) {
			lightState = lightState.hue(18000);
		} else if (consumedToday < 20) {
			lightState = lightState.hue(10000);
		} else {
			lightState = lightState.hue(0);
		}
		
		var promises = [];
		for (var i = 0; i < lights.length; i++) {
			promises.push(hueApi.lightStatus(lights[i]));
		}
		
		Q.allSettled(promises)
			.then(function(results) {
				for (var i = 0; i < results.length; i++) {
					if (results[i].state === "fulfilled") {
						changeLightState(lights[i], lightState, results[i].value.state);
			        } else {
			        	console.log(results[i].reason);
			        }
			    };
			})
	})
	.fail(function(error) {
		console.log(error);
	});
