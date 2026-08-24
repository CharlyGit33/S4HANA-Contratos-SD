sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], function (JSONModel, Device) {
    "use strict";
    var carpetaRaiz = "WFContratos";
    return {

        getRepositories: function () {
            var that = this;
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: "/comsapecmreuse.comsapecmreusedocumentTable/api/browser?",
                    //url:  $.appModulePath+"/cmis/browser/c8becafc-21f9-4b54-8035-0ee460fe691f/root",
                    headers: { 'X-CSRF-Token': "Fetch" },
                    type: 'GET',
                    success: function (resultDocu, r, xhr) {
                        resolve(resultDocu);
                    },
                    error: function (err) {
                        reject(err);
                    }
                });
            });
        },
        getTokenRepositorio: function () {
            var that = this;
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: "/comsapecmreuse.comsapecmreusedocumentTable/api/browser?",
                    //url:  $.appModulePath+"/cmis/browser/c8becafc-21f9-4b54-8035-0ee460fe691f/root",
                    headers: { 'X-CSRF-Token': "Fetch" },
                    type: 'GET',
                    success: function (resultDocu, r, xhr) {
                        
                        var oToken = xhr.getResponseHeader("X-CSRF-Token");
                        var key = Object.keys(resultDocu);
                        var data = {
                            repositorio: key[0],
                            token: oToken
                        }

                        resolve(data);


                    },
                    error: function (err) {
                        reject(err);

                    }
                });
            });
        },
        getDataDocumentService: function () {
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: `/apiCmis`,
                    cache: false,
                    contentType: false,
                    processData: false,
                    type: 'GET',
                    success: function (resultDocu) {
                        var key = Object.keys(resultDocu);
                        resolve(resultDocu[key]);
                    },
                    error: function (err) {
                        reject(err);

                    }
                });
            });
        },

        verifyRoute: function (sUrl, iCont = 0, sUrlPre = "") {
            return new Promise(function (resolve) {
                this.getDataDocumentService().then((documentData) => {
                    var aUrl = sUrl.split("/");
                    var sUrlNew = "";
                    sUrlNew = sUrlPre + aUrl[iCont];
                    if (iCont < aUrl.length) {
                        this.validFolder(documentData, sUrlNew).then((resultValid) => {
                            iCont++;
                            this.verifyRoute(sUrl, iCont, `${sUrlNew}/`).then(() => {
                                resolve();
                            });
                        }).catch((resultError) => {

                            var index = sUrlNew.lastIndexOf("/");
                            var nameFolder = sUrlNew.substr(index + 1, sUrlNew.length);
                            var addUrl = sUrlNew.substr(0, index);

                            this.createFolder(documentData, nameFolder, addUrl).then(() => {
                                iCont++;
                                this.verifyRoute(sUrl, iCont, `${sUrlNew}/`).then(() => {
                                    resolve();
                                });
                            });
                        });
                    } else {
                        resolve();
                    }
                });
            }.bind(this));
        },
        createFolderAndArchivos: function (repositorio, nameFolder, token, archivosList) {

            var that=this;
            return new Promise((resolve, reject) => {

                var url = `/comsapecmreuse.comsapecmreusedocumentTable/api/browser/${repositorio}/root/${carpetaRaiz}`;
                var routeArchivo = `${repositorio}/root/${carpetaRaiz}/${nameFolder}`;
                that.createFolder(repositorio, nameFolder, url, token).then(result => {

                    //Promesa asincrona para agregar todos los archivos en la carpeta de solicitud
                    Promise.all(archivosList.map(function (oFile) {
                        var file = oFile.Data;
                        that.uploadFile(routeArchivo, file,token).then(oResult2 => {
                            console.log("Se agrego archivo " + oResult2);
                        });
                    })).then((sResolve) => {

                        resolve(sResolve);


                    }).catch(function (sError) {
                        
                        sap.ui.core.BusyIndicator.hide();
                        sap.m.MessageBox.error("No se pudo subir el archivo. Error: " + sError.responseJSON.message);
                        reject(sError);
                    });



                }).catch(function (sError) {
                    reject(sError);
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageBox.error("No se pudo subir el archivo. Error: " + sError.responseJSON.message);
                });





            });
        },

        uploadFolderAndArchivos: function (nameFolder, archivosList) {
            var that=this;
            return new Promise((resolve, reject) => {
             that.getTokenRepositorio().then(oResult => {
                    //var url = `/comsapecmreuse.comsapecmreusedocumentTable/api/browser/${oResult.repositorio}/root/${carpetaRaiz}`;                 
                var routeArchivo = `${oResult.repositorio}/root/${carpetaRaiz}/${nameFolder}`;

                    //Promesa asincrona para agregar todos los archivos en la carpeta de solicitud
                    Promise.all(archivosList.map(function (oFile) {
                        var file = oFile.Data;
                        that.uploadFile(routeArchivo, file, oResult.token).then(oResult2 => {
                            console.log("Se agrego archivo " + oResult2);
                        });
                    })).then((sResolve) => {

                        resolve(sResolve);

                    }).catch(function (sError) {
                        
                        sap.ui.core.BusyIndicator.hide();
                        sap.m.MessageBox.error("No se pudo subir el archivo. Error: " + sError.responseJSON.message);
                        reject(sError);
                    });

                }).catch(function (sError) {
                    jQuery.sap.log.error(sError);
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageBox.error("No se pudo subir el archivo. Error: " + sError.message);
                });
            });
        },

        sendFiles: function (nameFolder, dataAdjuntosList) {
            var that = this;
            // var documentData = "c8becafc-21f9-4b54-8035-0ee460fe691f";


            return new Promise((resolve, reject) => {


                that.getTokenRepositorio().then(oResult => {
                    var url = `/comsapecmreuse.comsapecmreusedocumentTable/api/browser/${oResult.repositorio}/root/${carpetaRaiz}`;
                    that.createFolderAndArchivos(oResult.repositorio, nameFolder, oResult.token,dataAdjuntosList).then(result => {
                        resolve(result);
                    }).catch(function (sError) {
                        jQuery.sap.log.error(sError);
                        sap.ui.core.BusyIndicator.hide();
                        sap.m.MessageBox.error("No se pudo subir el archivo. Error: " + sError.message);
                    });

                }).catch(function (sError) {
                    jQuery.sap.log.error(sError);
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageBox.error("No se pudo subir el archivo. Error: " + sError.message);
                });



            });

        },
        createFolder: function (repositorioId, nameFolder, url, oToken) {

            return new Promise((resolve, reject) => {
                var oDocument = {
                    "cmisaction": "createFolder",
                    "propertyId[1]": "cmis:objectTypeId",
                    "propertyValue[1]": "cmis:folder",
                    "propertyId[0]": "cmis:name",
                    "propertyValue[0]": nameFolder,
                    "succinct": true
                };
                //var oToken = 'eyJhbGciOiJSUzI1NiIsImprdSI6Imh0dHBzOi8vbmVzcG9sYWRlcy5hdXRoZW50aWNhdGlvbi5icjEwLmhhbmEub25kZW1hbmQuY29tL3Rva2VuX2tleXMiLCJraWQiOiJkZWZhdWx0LWp3dC1rZXktLTk1OTg4Nzk4MSIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2YjAwMjMwNDhjZTg0M2UzYmEyMjYxMzdlNmY2Yzg2ZCIsImV4dF9hdHRyIjp7ImVuaGFuY2VyIjoiWFNVQUEiLCJzdWJhY2NvdW50aWQiOiIxZjEzZTU4Yy0wNzQzLTRiMjYtYTY3MC1kZTA0ZGYzYzEyYzUiLCJ6ZG4iOiJuZXNwb2xhZGVzIiwic2VydmljZWluc3RhbmNlaWQiOiIwZDE4ZDA0NS1kNTAxLTRkMTktYjU4Yy03NDZiNTQyMWJlMDMifSwic3ViIjoic2ItMGQxOGQwNDUtZDUwMS00ZDE5LWI1OGMtNzQ2YjU0MjFiZTAzIWI0MzJ8c2RtLWRpLURvY3VtZW50TWFuYWdlbWVudC1zZG1faW50ZWdyYXRpb24hYjE4NSIsImF1dGhvcml0aWVzIjpbInNkbS1kaS1Eb2N1bWVudE1hbmFnZW1lbnQtc2RtX2ludGVncmF0aW9uIWIxODUuc2RtdXNlciIsInVhYS5yZXNvdXJjZSIsInNkbS1kaS1Eb2N1bWVudE1hbmFnZW1lbnQtc2RtX2ludGVncmF0aW9uIWIxODUuc2RtYWRtaW4iLCJzZG0tZGktRG9jdW1lbnRNYW5hZ2VtZW50LXNkbV9pbnRlZ3JhdGlvbiFiMTg1LnNkbW1pZ3JhdGlvbmFkbWluIl0sInNjb3BlIjpbInNkbS1kaS1Eb2N1bWVudE1hbmFnZW1lbnQtc2RtX2ludGVncmF0aW9uIWIxODUuc2RtdXNlciIsInVhYS5yZXNvdXJjZSIsInNkbS1kaS1Eb2N1bWVudE1hbmFnZW1lbnQtc2RtX2ludGVncmF0aW9uIWIxODUuc2RtYWRtaW4iLCJzZG0tZGktRG9jdW1lbnRNYW5hZ2VtZW50LXNkbV9pbnRlZ3JhdGlvbiFiMTg1LnNkbW1pZ3JhdGlvbmFkbWluIl0sImNsaWVudF9pZCI6InNiLTBkMThkMDQ1LWQ1MDEtNGQxOS1iNThjLTc0NmI1NDIxYmUwMyFiNDMyfHNkbS1kaS1Eb2N1bWVudE1hbmFnZW1lbnQtc2RtX2ludGVncmF0aW9uIWIxODUiLCJjaWQiOiJzYi0wZDE4ZDA0NS1kNTAxLTRkMTktYjU4Yy03NDZiNTQyMWJlMDMhYjQzMnxzZG0tZGktRG9jdW1lbnRNYW5hZ2VtZW50LXNkbV9pbnRlZ3JhdGlvbiFiMTg1IiwiYXpwIjoic2ItMGQxOGQwNDUtZDUwMS00ZDE5LWI1OGMtNzQ2YjU0MjFiZTAzIWI0MzJ8c2RtLWRpLURvY3VtZW50TWFuYWdlbWVudC1zZG1faW50ZWdyYXRpb24hYjE4NSIsImdyYW50X3R5cGUiOiJjbGllbnRfY3JlZGVudGlhbHMiLCJyZXZfc2lnIjoiY2QyYmJkZTciLCJpYXQiOjE2Mjc1MzYzODgsImV4cCI6MTYyNzU3OTU4OCwiaXNzIjoiaHR0cHM6Ly9uZXNwb2xhZGVzLmF1dGhlbnRpY2F0aW9uLmJyMTAuaGFuYS5vbmRlbWFuZC5jb20vb2F1dGgvdG9rZW4iLCJ6aWQiOiIxZjEzZTU4Yy0wNzQzLTRiMjYtYTY3MC1kZTA0ZGYzYzEyYzUiLCJhdWQiOlsic2RtLWRpLURvY3VtZW50TWFuYWdlbWVudC1zZG1faW50ZWdyYXRpb24hYjE4NSIsInNiLTBkMThkMDQ1LWQ1MDEtNGQxOS1iNThjLTc0NmI1NDIxYmUwMyFiNDMyfHNkbS1kaS1Eb2N1bWVudE1hbmFnZW1lbnQtc2RtX2ludGVncmF0aW9uIWIxODUiLCJ1YWEiXX0.nnPr31U_LIp_m9bk9ocsL41yF-4DVmh27Bp2ucIGz6gcNfvi7xGsjmRKObeknSzoPJvkrQajVfnPpk9gk10YKA1ze1m4lp4EoOBOLicjAbWVl-Z5d3OlLloPwnlCrqL7fqQzEJ-RlIqL1hGy3noHfcC1LHt1wRpr4OtfDRTYKxfbUglBN1EMH3Luv76NTQ48MYL3ECWV6RGWcIgwOXl--RhUSZxZmmsuPXSSGJpzwXl9V6gkUQL0Eo4CTAbSdGoVdfZRFziLPkWMB3ILRAjp5a1z1Z5jUvsRD_N6Q1j5gqYJ3nVYSHm4ap9QrmCGrcINVksbBYt-cUiB4lRMbkPKRg'

                var formData = this.createFormData(oDocument);

                $.ajax({
                    // url: `/comsapecmreuse.comsapecmreusedocumentTable/api/${repositorioId}/root/${carpetaRaiz}`,
                    url: url,
                    type: 'POST',
                    data: formData,
                    cache: false,
                    contentType: false,
                    processData: false,
                    async: false,
                    headers: { 'X-CSRF-Token': oToken },
                    //headers: { 'X-CSRF-Token': "Fetch" },
                    success: function (data) {
                 
                        resolve(data);
                    },
                    error: function (err) {
                        reject(err);
                    }
                });


            });

        },
     
        validFolder: function (documentData, url) {
            return new Promise((resolve, reject) => {

                $.ajax({
                    url: `/cmisproxysap/${documentData.repositoryId}/root/${url}`,
                    cache: false,
                    contentType: false,
                    processData: false,
                    type: 'GET',
                    success: function (data) {
                        resolve(data);
                    },
                    error: function (err) {
                        reject(err);
                    }
                });

            });
        },


        uploadFile: function (sRoute, oFile,oToken) {
            return new Promise((resolve, reject) => {

                var oDocument = {
                    "cmisaction": "createDocument",
                    "propertyId[0]": "cmis:objectTypeId",
                    "propertyValue[0]": "cmis:document",
                    "propertyId[1]": "cmis:name",
                    "propertyValue[1]": oFile.name,
                    "datafile": oFile,
                };

                var formData = this.createFormData(oDocument);

                $.ajax({
                    url: `/comsapecmreuse.comsapecmreusedocumentTable/api/browser/${sRoute}`,
                    data: formData,
                    cache: false,
                    contentType: false,
                    processData: false,
                    headers: { 'X-CSRF-Token': oToken },
                    type: "POST",
                    success: function (oData) {
                        var file = {
                            fileId: oData.properties["cmis:objectId"].value,
                            fileName: oData.properties["cmis:name"].value,
                            mimeType: oData.properties["cmis:contentStreamMimeType"].value
                        };
                        resolve(file);
                    },
                    error: function (error) {
                        reject(error);
                    }
                });


            });
        },

        downloadFile: function (fileId) {

            return new Promise((resolve, reject) => {
                this.getDataDocumentService().then((documentData) => {
                    var relativePath =
                        `/cmisproxysap/${documentData.repositoryId}/root/?cmisselector=content&repositoryId=${documentData.repositoryId}&objectId=${fileId}`;

                    window.open(relativePath, '_blank');
                    console.log(relativePath);
                    resolve(true);
                });
            });
        },

        deleteFile: function (fileId) {
            return new Promise((resolve, reject) => {
                this.getDataDocumentService().then((documentData) => {
                    var oDocument = {
                        "cmisaction": "delete",
                        "repositoryId": documentData.repositoryId,
                        "objectId": fileId
                    };

                    var formData = this.createFormData(oDocument);

                    $.ajax({
                        url: `/cmisproxysap/${documentData.repositoryId}/root/`,
                        data: formData,
                        cache: false,
                        contentType: false,
                        processData: false,
                        type: "POST",
                        success: function (response) {
                            resolve(200);
                        },
                        error: function (error) {
                            reject(error);
                        }
                    });
                });
            });
        },

        createFormData: function (oData) {
            var formData = new FormData();
            $.each(oData, function (key, value) {
                formData.append(key, value);
            });
            return formData;
        },

        getFile: function (nroSolicitud) {
            return new Promise((resolve) => {
                this.getRepositories().then((documentData) => {
                    var key = Object.keys(documentData);
                    this.request("GET", key[0], nroSolicitud).then(oResult => {
                        resolve(oResult);
                    });
                });
            });
        },

        request: function (sRequestType, repositorioId, solicitud) {
            //Make HTTP Request
            return new Promise((resolve, reject) => {
                //Define Path to make request
                //let sRelativePath = `/cmisproxysap/${sPath ? sPath : ""}`;
                var sRelativePath =
                    `/comsapecmreuse.comsapecmreusedocumentTable/api/browser/${repositorioId}/root/${carpetaRaiz}/${solicitud}`;
                //Define AJAX Settings for request
                const ajaxSettings = {
                    url: sRelativePath,
                    cache: false,
                    type: sRequestType,
                    success: function (oData) {
                        oData.url=sRelativePath
                        resolve(oData);
                    },
                    error: function (error) {
                        reject(error);
                    },
                };
                //Settings in case is a POST request
                if (sRequestType === "POST") {
                    ajaxSettings.contentType = false;
                    ajaxSettings.processData = false;
                    ajaxSettings.data = fdData;
                }
                //Execute request
                $.ajax(ajaxSettings);
            });
        },

    };
});