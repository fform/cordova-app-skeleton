window.Router = {};
window.Model = {};
window.Collection = {};
window.View = {};
window.AG = {};

AG = {
	'production_mode': false,
	'testflight_key': "",

	'api_url_prod': "http://willwillwill.local/api",
	'api_url_dev': "http://willwillwill.local/api"
};

if(AG['production_mode']){
	APIURL = AG['api_url_prod'];
}else{
	APIURL = AG['api_url_dev'];
	console.log('Mode::Dev');
}


require.config({
  
  paths: {
    jquery: 'libs/jquery-1.7.1.min',
    underscore: 'libs/underscore-1.3.3',
    backbone: 'libs/backbone-0.9.2',
    text: 'libs/require/text'
  },

  urlArgs: "bust=" +  (new Date()).getTime() // Cache buster

});

require(['jquery','app'], function($,App) {
    $(function() {
		App._isDomReady = true;
		if (!App.isNative()) {
			// Simulate deviceready for browser dev
			App._isDeviceLoaded = true;
		}

		App.init();
		window.App = App;
		
	});
});


/*
<script type="text/javascript" src="assets/js/underscore-1.3.3.js"></script>
		<script type="text/javascript" src="assets/js/underscore-string.js"></script>
		<script type="text/javascript" src="assets/js/backbone-0.9.2.js"></script>
<!-- 
		<script type="text/javascript" src="assets/js/jquery-ui/js/jquery-1.7.1.min.js"></script>
		<script type="text/javascript" src="assets/js/jquery-ui/js/jquery-ui-1.8.17.custom.min.js"></script>
		<script type="text/javascript" src="assets/js/jquery-ui/touch-fix.js"></script>
-->	
		
		<script src="assets/js/iscroll.js" type="text/javascript"></script>
		<script src="assets/js/number.js" type="text/javascript"></script>
		<script src="assets/js/spin.js" type="text/javascript"></script>

		<script type="text/javascript"> var _gaq; </script>

		<script type="text/javascript" src="app/wordswap.js"></script>
		<script type="text/javascript" src="app/app.js"></script>
		<script type="text/javascript" src="app/local.js"></script>
		<script type="text/javascript" src="app/bootstrap.js"></script>
*/