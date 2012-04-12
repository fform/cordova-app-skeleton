/*
 TestFlight Plugin for cordova.
 Created by Shazron Abdullah, Nitobi Software Inc.

 1. Include the TestFlight SDK files in Xcode (follow their instructions)
 2. Add PGTestFlight.h and .m in Xcode
 3. Add TestFlight.js to your www folder, and reference it in a script tag after your cordova.js
 4. In cordova.plist, under the 'Plugins' key, add a new row: key is "com.cordova.testflightsdk" and the value is "PGTestFlight"
 5. In cordova.plist, under the 'ExternalHosts' key, add a new value "testflightapp.com"

 The plugin's JavaScript functions are under the global "window.plugins.TestFlight" object. 
 See the functions below (and the TestFlight SDK docs) for usage. Unfortunately all of TestFlight's SDK functions return void,
 and errors can only be gleaned from the run console, so check that for errors.
 */
(function() {

    var cordovaRef = window.PhoneGap || window.Cordova || window.cordova; // old to new fallbacks


    TestFlight = function() {
        this.serviceName = "TestFlightSDK";
    };

    /*
     Add custom environment information
     If you want to track a user name from your application you can add it here

     @param successCallback function
     @param failureCallback function
     @param key string
     @param information string
     */
    TestFlight.prototype.addCustomEnvironmentInformation = function(successCallback, failureCallback, key, information) {
        cordovaRef.exec(successCallback, failureCallback, this.serviceName, "addCustomEnvironmentInformation", [{
            key: key,
            information: information
        }]);
    };

    /*
     Starts a TestFlight session

     @param successCallback function
     @param failureCallback function
     @param teamToken string
     */
    TestFlight.prototype.takeOff = function(successCallback, failureCallback, teamToken) {
        cordovaRef.exec(successCallback, failureCallback, this.serviceName, "takeOff", [{
            teamToken: teamToken
        }]);
    };

    /*
     Sets custom options

     @param successCallback function
     @param failureCallback function
     @param options object i.e { reinstallCrashHandlers : true }
     */
    TestFlight.prototype.setOptions = function(successCallback, failureCallback, options) {
        if (!(null !== options && 'object' == typeof(options))) {
            options = {};
        }
        cordovaRef.exec(successCallback, failureCallback, this.serviceName, "setOptions", [options]);
    };

    /*
     Track when a user has passed a checkpoint after the flight has taken off. Eg. passed level 1, posted high score

     @param successCallback function
     @param failureCallback function
     @param checkpointName string
     */
    TestFlight.prototype.passCheckpoint = function(successCallback, failureCallback, checkpointName) {
        cordovaRef.exec(successCallback, failureCallback, this.serviceName, "passCheckpoint", [{
            checkpointName: checkpointName
        }]);
    };

    /*
     Opens a feeback window that is not attached to a checkpoint

     @param successCallback function
     @param failureCallback function
    */
    TestFlight.prototype.openFeedbackView = function(successCallback, failureCallback) {
        cordovaRef.exec(successCallback, failureCallback, this.serviceName, "openFeedbackView", []);
    };

    TestFlight.install = function(){
        if( !window.plugins){
            window.plugins = {};
        }
        if( !window.plugins.testFlight ){
            window.plugins.testFlight = new TestFlight();
        }
    };


    if (cordovaRef && cordovaRef.addConstructor) {
        cordovaRef.addConstructor(TestFlight.install);
    } else {
        console.log("TestFlight Cordova Plugin could not be installed.");
        return null;
    }
   
})();
