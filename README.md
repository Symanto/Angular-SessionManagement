# Angular-SessionManagement
## Installation
###Bower
The easiest way to install the SessionManagement module is by including the bower package to your solution
```shell
bower install symanto-angular-sessionmanagement --save
```

## Configuration
The SessionManagement module comes fully configured and runnable out of the box. Beside that it beautifully integrates with other Symanto Angular modules like the [LoadingIndicatorService][1].

The Session Management module uses cookies to save the access- and refresh tokens. These cookies are saved inside the browser's local storage. For this, we use the 3rd party [angular-local-storage][2] module

To add this module load them into your project and inject them into your root module. Here you can configure the SessionManagement by setting the parameters inside the run method.
```javascript
angular.module("Application.Root", [
    "LocalStorageModule",
    "Symanto.SessionManagement",
    "Symanto.LoadingIndicatorService"
]).run(function(sessionManagementOptions, LoadingIndicatorService) {

    // REQUIRED CONFIGURATION
    // ----------------------
    // Define the login API endpoint
    sessionManagementOptions.loginEndpoint: "/api/account/login",
    // Define the client id of your application that is needed for the OAuth2.0 Authentication
    sessionManagementOptions.clientId: "oAuthIdTest";

    // OPTIONAL CONFIGURATION
    // ----------------------
    // Add the Symanto Loading Indicator Service to the Session Management
    sessionManagementOptions.loadingIndicatorService = LoadingIndicatorService;
    // Add a prefix to the the access and refresh token cookies
    sessionManagementOptions.tokenPrefix: "my-project_";
    // Set the name of the login state to that the module should navigate after the logout
    sessionManagementOptionsloginStateName: "login"
});
```

## Usage


  [1]: https://github.com/Symanto/Angular-LoadingIndicatorService
  [2]: https://github.com/grevory/angular-local-storage
