sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"sap/m/MessageToast"
], function (JSONModel, MessageBox, MessageToast) {
    "use strict";
	return {
        
		onGetTaskContextWorkflow: function (oTaskData) {
			return new Promise(function (resolve, reject) {
				$.ajax({
					type: "GET",
					url: $.appModulePath+"/bpmworkflowruntime/v1/task-instances/" + oTaskData.InstanceID + "/context",
					contentType: "application/json",
					dataType: "json",
					async: false,
					success: function (result, xhr, data) {
						resolve(result);
					},
					error: function (errMsg) {
						reject(errMsg.statusText);
					}
				});

			});
        },
        onGetContextWorkflow: function (idInstance) {
			return new Promise(function (resolve, reject) {
				$.ajax({
					type: "GET",
					url: $.appModulePath+"/bpmworkflowruntime/v1/workflow-instances/" + idInstance + "/context",
					contentType: "application/json",
					dataType: "json",
					async: false,
					success: function (result, xhr, data) {
						resolve(result);
					},
					error: function (errMsg) {
						reject(errMsg.statusText);
					}
				});

			});
		},

		// Request Inbox to refresh the control
		// once the task is completed
		onRefreshTask: function () {
            
			var taskId = $.getComponentDataMyInbox.startupParameters.taskModel.getData().InstanceID;
			$.getComponentDataMyInbox.startupParameters.inboxAPI.updateTask("NA", taskId);
		},
		
		getBmpToken: function () {
			return new Promise(function (resolve, reject) {
				$.ajax({
					type: "GET",
					url: $.appModulePath+"/bpmworkflowruntime/v1/xsrf-token",
					headers: {
						"X-CSRF-Token": "Fetch"
					},
					success: function (data, statusText, xhr) {
						resolve(xhr.getResponseHeader("X-CSRF-Token"));
					},
					error: function (errMsg) {
						reject(errMsg.statusText);
					},
					contentType: "application/json"
				});
			});
		},
		
		completeTask: function(oController) {
        
			var oContext = $.Component.getModel("context").getData();
			var _this = this;
			var taskId = $.getComponentDataMyInbox.startupParameters.taskModel.getData().InstanceID;
			this.getBmpToken().then(function (oToken) {
				$.ajax({
					url: $.appModulePath+"/bpmworkflowruntime/v1/task-instances/" + taskId,
					method: "PATCH",
					contentType: "application/json",
					async: false,
					data: JSON.stringify({
						status: "COMPLETED",
						context: oContext
					}),
					headers: {
						"X-CSRF-Token": oToken
					}
				});
				_this.onRefreshTask(taskId);
			}).catch(function (sErrorMsg) {
                
				//reject(sErrorMsg);
			});
		}
	};
});