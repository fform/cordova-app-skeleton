
define([
	'jquery', 'underscore', 'backbone', 'Router', 'views/mainView', "local/en", 
	'libs/tappable'
], function($, _, Backbone, Router, MainView, Local){

	var App = {
		_isDeviceLoaded: false,
		_isDomReady: false,

		_isTouch: ('ontouchstart' in window),

		_touch_or_click: "click",

		isNative: function(){
			return (window.device !== undefined && 'phonegap' in window === false);
		},
		iOS: function(){
			return  App.isNative() && String(device.platform).toLowerCase().match(/iphone|ipod|ipad/) !== null;
		},
		android: function(){
			return App.isNative() && String(device.platform).toLowerCase().match(/android/) !== null;
		},
		ripple: function(){
			return (window.device !== undefined && device.phonegap !== undefined)
		},
		isSimulator: function(){
			return window.device !== undefined && String(device.platform).toLowerCase().match(/simulator/) !== null
		},

		views:{},
		collections:{},
		models:{},

		init: function () {
			if(!this._isDeviceLoaded || !this._isDomReady) {
				return;
			}

			if(App.iOS() && !App.isSimulator()) {
				window.plugins.TestFlight.takeOff(
					function(){},function() {}, AG['testflight_key']
				);
			}

			
			App.touch_or_click = App._isTouch ? "touchstart" : "click";
			App.views.main = new MainView();
			App.lang = Local;
			
			/* App.loadCollection('Stories'); */

			
		},

		confirm: function(message, callback, title, buttonLabels){
			if(App._isTouch) {
				navigator.notification.confirm(message, callback, title || AG['app_title'], buttonLabels);
			}else{
				callback(confirm(message));
			}
		},

		alert: function(message, callback, title, buttonName){
			if(App._isTouch) {
				navigator.notification.alert(message, callback, title || AG['app_title'], buttonName);
			}else{
				alert(message);
			}
		},

		binds_and_ui: function(){

			

		},

		setupCollections: function(){

		},

		setupRouters: function(){

		}

	}

	return App;

});
