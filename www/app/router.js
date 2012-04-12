// Filename: router.js
define(['jquery','backbone'], function($, Backbone) {

	var AppRouter = Backbone.Router.extend({
		routes: {

		}
	});

	var initialize = function() {
			var app_router = new AppRouter;
			Backbone.history.start();
		};
	return {
		initialize: initialize
	};
});
