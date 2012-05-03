window.Router = {};
window.Model = {};
window.Collection = {};
window.View = {};

window.clog = function(){
	if( AG['debugging'] ){
		_(arguments).each(function(e,i){
			if(typeof e === "object"){
				e = JSON.stringify(e);
			}
			console.log(e);
		});
	}
}

App = (function(){
	var Application = {

		container: "#container",

		_isDeviceLoaded: false,
		_isDomReady: false,
		_hasInitialized: false,

		_isTouch: ('ontouchstart' in window),

		_touch_or_click: "click",

		isNative: function(){
			return App.iOS() || App.android();
		},
		iOS: function(){
			return  String(navigator.platform).toLowerCase().match(/iphone|ipod|ipad/) !== null;
		},
		android: function(){
			return String(navigator.platform).toLowerCase().match(/android/) !== null;
		},
		ripple: function(){
			return (window.device !== undefined && device.phonegap !== undefined)
		},
		isSimulator: function(){
			return String(navigator.platform).toLowerCase().match(/simulator/) !== null
		},

		views:{},
		collections:{},
		models:{},

		init: function () {
			App.benchmark('app.init');
			if(!window.isDeviceLoaded || !this._isDomReady) {
				return;
			}
			
			if(this._hasInitialized){
				clog('Already init');
				return;
			}
			this._hasInitialized = true;

			if(AG['production_mode'] && App.iOS() && !App.isSimulator()) {
				
				if( AG['testflight_key'] !== "" ){
					testFlight = window.plugins.testFlight;
					testFlight.takeOff(	function(){}, function() {}, AG['testflight_key'] );
					App._isTrackingTestFlight = true;
				}
				
				if( AG['google_analytics_trackid'] !== "" ){
					googleAnalytics = window.plugins.googleAnalyticsPlugin;
					googleAnalytics.startTrackerWithAccountID( AG['google_analytics_trackid'] );
					App._isTrackingGoogleAnalytics = true;
				}
			}
			
			App.views.main = new View.Main();

			App.Routes = new Router.Main();
			Backbone.history.start({silent:true});
			App.track( "benchmark", "app", "init", App.benchmark( 'app.init' ) );
		},

		onPause: function(){
			App.track( 'app', 'statechange', 'pause');
		},

		onResume: function(){
			App.track( 'app', 'statechange', 'resume');
		},

		confirm: function( message, buttonLabels, callback, title ){
			if( App.isNative() ) {
				navigator.notification.confirm(message, callback, title || App.lang['app_title'], buttonLabels);
			}else{
				callback(confirm(message));
			}
		},

		alert: function( message, buttonName, callback, title ){
			if( App.isNative() ) {
				navigator.notification.alert(message, callback, title || App.lang['app_title'], buttonName);
			}else{
				alert(message);
			}
		},

		track: function(category, action, label, value) {
			clog([category,action,label,value]);
			if(App._isTrackingGoogleAnalytics){
				googleAnalytics.trackEvent(category, action, label||"", value||"");
				if(action == "view"){
					googleAnalytics.trackPageview("/" + category);
				}
			}

			/*
				// If you want to clone Analytics to Testflight
				if( AG['testflight_category_ignores'].indexOf( category ) === -1){
					App.checkpoint ( category + (action?"/"+action:"") + (label?"/"+label:"") + (value?"/"+value:"") );
				}
			*/
		},

		checkpoint: function( key ){
			if(App._isTrackingTestFlight){
				testFlight.passCheckpoint(
					function(){},function() {}, key
				);
			}
		},

		benchmark: function( key, clear_start ){
			var now = new Date();
			if(!window._BENCHMARKS){
				window._BENCHMARKS = {};
			}

			if( clear_start === true ){
				delete _BENCHMARKS[key];
			}
			
			if( _BENCHMARKS[key] ){
				var elapsed = now.getTime() - _BENCHMARKS[key];
				return elapsed;
			}else{
				_BENCHMARKS[key] = new Date().getTime();
				return 0;
			}
		}

	};
		return Application;
})();
