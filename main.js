'use strict';

// TODO - handle errors when lights are unavailable

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
		
		Q.all([
		    hueApi.lightStatus(mediaRoom1Id),
		    hueApi.lightStatus(mediaRoom2Id),
		    hueApi.lightStatus(livingRoom1Id),
		    hueApi.lightStatus(livingRoom2Id)])
			.spread(function(mediaRoom1Status, mediaRoom2Status, livingRoom1Status, livingRoom2Status) {
				mediaRoom1RestoreState = mediaRoom1Status.state;
				mediaRoom2RestoreState = mediaRoom2Status.state;
				livingRoom1RestoreState = livingRoom1Status.state;
				livingRoom2RestoreState = livingRoom2Status.state;
			})
			.then(function() {
				changeLightState(mediaRoom1Id, lightState, mediaRoom1RestoreState);
				changeLightState(mediaRoom2Id, lightState, mediaRoom2RestoreState);
				changeLightState(livingRoom1Id, lightState, livingRoom1RestoreState);
				changeLightState(livingRoom2Id, lightState, livingRoom2RestoreState);
			})
			.done();
	})
	.fail(function(error) {
		console.log(error);
	});
