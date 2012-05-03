
window.AG = {
	'debugging': false,
	'production_mode': true,
	
	'api_url_prod': "http://change-me/api/",
	'api_url_dev': "http://change-me/api/",

	'testflight_key': "",
	'testflight_category_ignores': [ 'benchmark' ],

	'google_analytics_trackid': "",
	
};

APIURL = ( AG['production_mode'] ? AG['api_url_prod'] : AG['api_url_dev'] );

$(function() {

 		App._isDomReady = true;
		
		if (!App.isNative() ) {

			document.body.appendChild( document.createComment("Not running natively") );
			isDeviceLoaded = true;
		}

		App.init();
		
});