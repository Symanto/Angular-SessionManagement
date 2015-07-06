# Angular-SessionManagement
## Installation
###Bower
The easiest way to install the HttpService is by including the bower package to your solution
```shell
bower install symanto-angular-sessionmanagement --save
```

## Configuration
The SessionManagement module comes fully configured and runnable out of the box. Beside that it beautifully integrates with other Symanto Angular modules like the [LoadingIndicatorService][1].

To add this module load them into your project and inject them into your root module. Here you can configure the SessionManagement by setting the parameters inside the run method.
```javascript
angular.module("Application.Root", [
    "Symanto.SessionManagement",
    "Symanto.LoadingIndicatorService"
]).run(function(sessionManagementOptions, LoadingIndicatorService) {

    // Add the Symanto Loading Indicator Service to the Http Service
    sessionManagementOptions.loadingIndicatorService = LoadingIndicatorService;
});
```

## Usage
