'use strict';

var request = require('request')
  , urlTempate = require('url-template')
  , xmlBuilder = require('xmlbuilder')
  , Q = require('q');

module.exports.getHistoricalDataForWeek = function(options) {
	var deferred = Q.defer();
	var template = urlTempate.parse('http://{hostname}/cgi-bin/cgi_manager');
	var url = template.expand({
		hostname: options.hostname
	});
	
	var body = xmlBuilder.create('LocalCommand')
		.e('Name', 'get_historical_data')
		.insertAfter('Format', 'JSON')
		.insertAfter('Type', 'summation')
		.insertAfter('Period', 'Week')
		.insertAfter('MacId', options.macId)
		.end();
	
	request({
		method: 'POST',
		uri: url,
		auth: {
			username: options.username,
			password: options.password
		},
		body: body
	}, function(error, response, body) {
		if (error) {
			deferred.reject(error);
		} else {
			var result = JSON.parse(body);
			deferred.resolve(result);
		}
	});
	
	return deferred.promise;
};

