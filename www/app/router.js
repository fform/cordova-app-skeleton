// Filename: router.js

Router.Main = Backbone.Router.extend({
	routes: {
		"sample_uri_piece" : "sample",
	},

	initialize: function() {
		
	},

	sample: function(){
		//Do Work
		App.Routes.navigate('');
	},

	
});
