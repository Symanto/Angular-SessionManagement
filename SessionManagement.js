// Define the SessionManagement module
angular.module("Symanto.SessionManagement", [])
    .config(function ($httpProvider) {
        $httpProvider.interceptors.push('SessionTokenInterceptor');
    }
);

// Store the module within a variable
var sessionManagement = angular.module("Symanto.SessionManagement");

// ----------------------------------------------------------------------------------------------------
// Options
// ----------------------------------------------------------------------------------------------------

// Define configuration values for the module
sessionManagement.value('sessionManagementOptions', {
    loginEndpoint: "/api/account/login",
    tokenPrefix: "",
    clientId: "",
    loadingIndicatorService: undefined,
    loginStateName: "login"
});

// ----------------------------------------------------------------------------------------------------
// User factory
// ----------------------------------------------------------------------------------------------------

/**
 * User factory that holds the current user's data
 */
sessionManagement.factory("User", function() {
    var user = undefined;

    function set(data) {
        user = data;
    }

    function get() {
        return user;
    }

    function destroy() {
        user = undefined;
    }

    return {
        "set": set,
        "get": get,
        "destroy": destroy
    };
});

// ----------------------------------------------------------------------------------------------------
// Session Service
// ----------------------------------------------------------------------------------------------------

/**
 * Service that handles log in / out mechanism
 */
sessionManagement.service("SessionService", function ($http, $state, $q, User, localStorageService, sessionManagementOptions) {

    /**
     * Logs the user in
     * @param User's E-Mail address
     * @param User's password
     * @returns A promise of the logged in user
     */
    var login = function(email, password){
        var deferred = $q.defer();
        var loginData = "UserName=" + encodeURIComponent(email) + "&Password=" + encodeURIComponent(password)+"&grant_type=password&client_id=" + sessionManagementOptions.clientId;

        // Start loading indicator if available
        if (sessionManagementOptions.loadingIndicatorService != undefined)
            sessionManagementOptions.loadingIndicatorService.startOperation();

        // In this case the 'x-www-form-urlencoded' type has to be used because of OAuth
        $http({
            url: sessionManagementOptions.loginEndpoint,
            method: "POST",
            data: loginData,
            headers: {'Content-Type' : 'application/x-www-form-urlencoded; charset=utf-8'}
        }).then(
            function (success) {
                localStorageService.set(sessionManagementOptions.tokenPrefix + "access_token", success.data.access_token);
                localStorageService.set(sessionManagementOptions.tokenPrefix + "refresh_token", success.data.refresh_token);

                // Stop loading indicator if available
                if (sessionManagementOptions.loadingIndicatorService != undefined)
                    sessionManagementOptions.loadingIndicatorService.finishOperation();

                deferred.resolve(success.data);
            },
            function (error) {
                // Stop loading indicator if available
                if (sessionManagementOptions.loadingIndicatorService != undefined)
                    sessionManagementOptions.loadingIndicatorService.finishOperation();

                deferred.reject({"loginError":-1})
            }
        );

        return deferred.promise;
    };

    /**
     * Logs a user out and removes the access- and refresh-token cookies
     */
    var logout = function() {
        localStorageService.remove(sessionManagementOptions.tokenPrefix + "access_token", sessionManagementOptions.tokenPrefix + "refresh_token");
        User.destroy();
        $state.go(sessionManagementOptions.loginStateName);
    };

    /**
     * Gets the current user
     * @returns The currently logged in user
     */
    var getUser = function(){

        var deferred = $q.defer();
        var user = User.get();

        if (user != undefined)
            deferred.resolve(user);
        else {
            // Start loading indicator if available
            if (sessionManagementOptions.loadingIndicatorService != undefined)
                sessionManagementOptions.loadingIndicatorService.startOperation();

            $http({
                url: "/api/user/me",
                method: "GET"
            }).then(
                function (success) {
                    // Stop loading indicator if available
                    if (sessionManagementOptions.loadingIndicatorService != undefined)
                        sessionManagementOptions.loadingIndicatorService.finishOperation();

                    User.set(success.data);
                    deferred.resolve(success.data);
                },
                function (error) {
                    // Stop loading indicator if available
                    if (sessionManagementOptions.loadingIndicatorService != undefined)
                        sessionManagementOptions.loadingIndicatorService.finishOperation();

                    deferred.reject({"setUserError": -1})
                }
            );
        }

        return deferred.promise;
    };

    return{
        "login":login,
        "logout": logout,
        "getUser":getUser
    };
});

// ----------------------------------------------------------------------------------------------------
// SessionTokenInterceptor
// ----------------------------------------------------------------------------------------------------

/**
 * Interceptor that adds the access token to every outgoing request and handles the refresh of it
 */
sessionManagement.factory('SessionTokenInterceptor', function ($q, $injector, localStorageService, sessionManagementOptions){

    var requestQueue = [];
    var isRefreshingTheToken = false;

    var retryRequest = function(config) {
        // Start loading indicator if available
        if (sessionManagementOptions.loadingIndicatorService != undefined)
            sessionManagementOptions.loadingIndicatorService.startOperation();

        $injector.get("$http")(config.request.config).then(
            function (resp) {
                // Stop loading indicator if available
                if (sessionManagementOptions.loadingIndicatorService != undefined)
                    sessionManagementOptions.loadingIndicatorService.finishOperation();

                config.deferred.resolve(resp);
            },
            function (err) {
                // Stop loading indicator if available
                if (sessionManagementOptions.loadingIndicatorService != undefined)
                    sessionManagementOptions.loadingIndicatorService.finishOperation();

                config.deferred.reject();
            }
        );
    };

    return {
        request: function (config) {
            // Check if access token has to be added to this request
            if (config.url.indexOf("/api/") != -1 && config.url.indexOf("/login") == -1 && config.url.indexOf("/register") == -1) {
                config.headers["Authorization"] = ('Bearer ' + localStorageService.get(sessionManagementOptions.tokenPrefix + 'access_token'));
            }

            return config;
        },

        // If the refresh token is outdated, the backend will response with an unauthorize error (401).
        // In this case we need to refresh the access token using the refresh token and try to run the request again
        // with the updated access token.
        responseError: function(rejection) {

            // Automatically refresh the access token using the refresh token, when the access token expired
            if (rejection.status === 401) {

                console.log("Unauthorized Error occurred.");
                var deferred = $q.defer();

                // To ensure that the access token is only refreshed once, store all requests in a queue and process them as soon as a new access token has been generated
                requestQueue.push({
                    request: rejection,
                    deferred: deferred
                });

                // If token is already being refreshed, return the promise and process the queue after the token has been refreshed.
                if (isRefreshingTheToken) {
                    console.log("Token is already being refreshed. Request has been put to the request queue.");
                    return deferred.promise;
                }

                // Send the refresh token request
                isRefreshingTheToken = true;
                console.log("Trying to refresh the token...");

                // Start loading indicator if available
                if (sessionManagementOptions.loadingIndicatorService != undefined)
                    sessionManagementOptions.loadingIndicatorService.startOperation();

                $injector.get("$http")({
                    url: "/api/account/login",
                    method: "POST",
                    data: "refresh_token=" + localStorageService.get('refresh_token') + "&grant_type=refresh_token&client_id=testWeb",
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
                }).then(
                    function(success) {
                        // Stop loading indicator if available
                        if (sessionManagementOptions.loadingIndicatorService != undefined)
                            sessionManagementOptions.loadingIndicatorService.finishOperation();

                        // Successfully refreshed the token. Reset the cookies
                        localStorageService.set('access_token', success.data.access_token);
                        localStorageService.set('refresh_token', success.data.refresh_token);
                        isRefreshingTheToken = false;
                        console.log("... success. Refreshed the access token!");

                        // Process the queue with the new tokens
                        for (var i = 0; i < requestQueue.length; i++) {
                            retryRequest(requestQueue[i]);
                        }

                        // Clear the queue
                        requestQueue = [];
                    },
                    function(error) {
                        // Stop loading indicator if available
                        if (sessionManagementOptions.loadingIndicatorService != undefined)
                            sessionManagementOptions.loadingIndicatorService.finishOperation();

                        deferred.reject();
                        isRefreshingTheToken = false;
                        console.log("... failed. Could not refresh the access token!");
                        $injector.get("SessionService").logout();
                    }
                );

                return deferred.promise;
            }

            return $q.reject(rejection);
        }
    }
});