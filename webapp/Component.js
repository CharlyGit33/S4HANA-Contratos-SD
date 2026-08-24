sap.ui.define([
        "sap/ui/core/UIComponent",
        "sap/ui/Device",
        "com/nespola/contratoswf/model/models"
    ],
    function (UIComponent, Device, models) {
        "use strict";

        return UIComponent.extend("com.nespola.contratoswf.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);
    
                // enable routing
                this.getRouter().initialize();
    
                // set the device model
                this.setModel(models.createDeviceModel(), "device");
                $.Component=this;
              
                 $.getComponentDataMyInbox = this.getComponentData();
                var appId = this.getManifestEntry("/sap.app/id");
                var appPath = appId.replaceAll(".", "/");
                $.appModulePath  = jQuery.sap.getModulePath(appPath);
            }
        });
    }
);