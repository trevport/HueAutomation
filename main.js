'use strict';

var rainforest = require('./rainforest-eagle')
  , config = require('./config.json')
  , Q = require("q")
  , hue = require("node-hue-api");

var eagleConfig = config.rainforest.eagle;
var hueApi = new hue.HueApi(config.hue.bridge.hostname, config.hue.bridge.user);

var mediaRoom1Id = 2
  , mediaRoom2Id = 1
  , livingRoom1Id = 3
  , livingRoom2Id = 5;

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
		
		var mediaRoom1RestoreState
		  , mediaRoom2RestoreState
		  , livingRoom1RestoreState
		  , livingRoom2RestoreState;
		
		Q.allSettled([
		    hueApi.lightStatus(mediaRoom1Id),
		    hueApi.lightStatus(mediaRoom2Id),
		    hueApi.lightStatus(livingRoom1Id),
		    hueApi.lightStatus(livingRoom2Id)])
			.spread(function(mediaRoom1Promise, mediaRoom2Promise, livingRoom1Promise, livingRoom2Promise) {
				mediaRoom1RestoreState = mediaRoom1Promise.state === 'fulfilled' ? mediaRoom1Promise.value.state : undefined;
				mediaRoom2RestoreState = mediaRoom2Promise.state === 'fulfilled' ? mediaRoom2Promise.value.state : undefined;
				livingRoom1RestoreState = livingRoom1Promise.state === 'fulfilled' ? livingRoom1Promise.value.state : undefined;
				livingRoom2RestoreState = livingRoom2Promise.state === 'fulfilled' ? livingRoom2Promise.value.state : undefined;
			})
			.then(function() {
				if (mediaRoom1RestoreState) {
					changeLightState(mediaRoom1Id, lightState, mediaRoom1RestoreState);
				}
				
				if (mediaRoom2RestoreState) {
					changeLightState(mediaRoom2Id, lightState, mediaRoom2RestoreState);
				}
				
				if (livingRoom1RestoreState) {
					changeLightState(livingRoom1Id, lightState, livingRoom1RestoreState);
				}
				
				if (livingRoom2RestoreState) {
					changeLightState(livingRoom2Id, lightState, livingRoom2RestoreState);
				}
			})
			.done();
	})
	.fail(function(error) {
		console.log(error);
	});
