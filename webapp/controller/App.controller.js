sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "../model/models",
    "../model/formatter",
    "sap/m/library",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ui/core/BusyIndicator",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/plugins/UploadSetwithTable"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, Fragment, Filter, FilterOperator, models, formatter, sapMLib, ODataModel, BusyIndicator, MessageBox, MessageToast, UploadSetwithTable) {
        "use strict";
        var oThat, sCreatedByUser;
        return Controller.extend("com.nespola.contratoswf.controller.App", {
            formatter: formatter,
            onInit: function () {
                oThat = this;
                this._Bukrs = "";

                oThat._oModelDocument = models.createDocumentModel();
                this.getView().setModel(this._oModelDocument, "document");

                var positionsModel = new JSONModel({
                    posData: [{
                        "kunnr": "",
                        "auart": "",
                        "matnr": "",
                        "itemsDialog": [],
                        "itemMat": []
                    }]
                });

                $.Component.setModel(positionsModel, "contPos");

                var oModelTitle = new JSONModel({
                    "title": ""
                });
                $.Component.setModel(oModelTitle, "oModelTitle");

                oThat.getLoggedUser().then(function (data) {
                    sCreatedByUser = data.Resources[0].userName.toUpperCase();
                    oThat._loggedUser = data.Resources[0].userName.toUpperCase();
                });

                oThat.onGetMyInbox($.getComponentDataMyInbox);

                // Modelo local para los items de la sociedad (COMPANYSet), cargado vía read() explícito
                this._oSociedadModel = new JSONModel({ results: [] });
                this.getView().setModel(this._oSociedadModel, "SociedadModel");
            },

            onTipoActualizacion: function (oEvent) {
                let actualizacion = oEvent.getSource().getSelectedKey();
                if (actualizacion === "2") {
                    this.getOwnerComponent().getModel("VisibleModel").setProperty("/PeriodoAjuste", true);
                } else {
                    this.getOwnerComponent().getModel("VisibleModel").setProperty("/PeriodoAjuste", false);
                }
            },
            OnNavNotion: function (evt) {
                const url = "https://www.notion.so/solnaciente/Seguimiento-de-Convenios-86c39410953c48d0a1ba380a9d2c1d62"/*...*/;
                const { URLHelper } = sapMLib; // sapMLib required from "sap/m/library"
                URLHelper.redirect(url, true);
            },
            onChangeDateInicio: function (oEvent) {
                var fechaDesde = oEvent.getSource().getDateValue();
                var fechaHasta = this.getView().getModel("header").getData().fechaFin;
                if (fechaHasta !== undefined && fechaHasta !== null) {
                    var dia = fechaHasta.getUTCDate();
                    var mes = fechaHasta.getUTCMonth();
                    var anio = fechaHasta.getUTCFullYear();

                    var formatedHasta = new Date(anio, mes, dia);
                    if (fechaDesde > formatedHasta) {
                        sap.m.MessageBox.error("vigencia desde no puede ser mayor a vigencia hasta");
                        this.getView().byId("vigDesde").setValueState("Error");
                    } else {
                        this.getView().byId("vigDesde").setValueState("None");
                        this.getView().byId("vigHasta").setValueState("None");
                    }
                }
            },

            onChangeDateFin: function (oEvent) {
                var fechaHasta = oEvent.getSource().getDateValue();
                var fechaDesde = this.getView().getModel("header").getData().fechaIni;

                if (fechaDesde !== undefined && fechaDesde !== null) {
                    var formatedDesde = this.formatDate(fechaDesde, 0);
                    if (formatedDesde > this.formatDate(fechaHasta, 0)) {
                        sap.m.MessageBox.error("vigencia hasta no puede ser menor a vigencia desde");
                        this.getView().byId("vigHasta").setValueState("Error");
                    } else {
                        this.getView().byId("vigDesde").setValueState("None");
                        this.getView().byId("vigHasta").setValueState("None");
                    }
                }
                if (fechaDesde !== undefined && fechaDesde !== null && fechaHasta !== undefined && fechaHasta !== null) {
                    var tipoContrato = this.getOwnerComponent().getModel("AuxModel").getProperty("/Cotyp");
                    if (tipoContrato !== '1') {
                        var dias = fechaHasta - formatedDesde;
                        var diff_ = dias / (1000 * 60 * 60 * 24);
                        this.getView().getModel("header").setProperty('/duracion', diff_ + "");
                    }
                }
            },

            onChangeDateDialogInicio: function (oEvent) {
                var fechaDesde = oEvent.getSource().getDateValue();
                var fechaHasta = this.getView().getModel("ValorCapita").getData().FechaFin;
                var tableData = this.getOwnerComponent().getModel("ValorCapita").getProperty("/itemsDialog");
                var dataHeader = this.getView().getModel("header").getData();


                if (fechaDesde < dataHeader.fechaIni) {
                    sap.m.MessageBox.error("vigencia desde debe estar en el rango de las vigencias de la solicitud");
                    sap.ui.getCore().byId("vigCapitaHasta").setValueState("Error");
                    return;

                }

                if (fechaHasta !== undefined && fechaHasta !== null) {
                    var dia = fechaHasta.getUTCDate();
                    var mes = fechaHasta.getUTCMonth();
                    var anio = fechaHasta.getUTCFullYear();

                    var formatedHasta = new Date(anio, mes, dia);
                    if (fechaDesde > formatedHasta) {
                        sap.m.MessageBox.error("vigencia desde no puede ser mayor a vigencia hasta");
                        sap.ui.getCore().byId("vigCapitaDesde").setValueState("Error");
                    } else {
                        sap.ui.getCore().byId("vigCapitaDesde").setValueState("None");
                        sap.ui.getCore().byId("vigCapitaHasta").setValueState("None");
                    }

                    ////Validacion de vigencia cabecera
                    if (dataHeader.fechaFin < formatedHasta) {
                        sap.m.MessageBox.error("vigencia hasta debe estar en el rango de las vigencias de la solicitud");
                        sap.ui.getCore().byId("vigCapitaHasta").setValueState("Error");
                        return;
                    }
                }

                if (tableData.length > 0) {
                    tableData.forEach(data => {
                        let formatedFin = new Date(
                            data.FechaFin.getUTCFullYear(),
                            data.FechaFin.getUTCMonth(),
                            data.FechaFin.getUTCDate());

                        if (fechaDesde <= formatedFin) {
                            sap.m.MessageBox.error("vigencia desde no puede ser menor a vigencia hasta de otros periodos");
                            sap.ui.getCore().byId("vigCapitaDesde").setValueState("Error");
                            return;
                        } else {
                            sap.ui.getCore().byId("vigCapitaDesde").setValueState("None");
                            sap.ui.getCore().byId("vigCapitaHasta").setValueState("None");
                        }
                    })
                }
            },

            /*onChangeDateDialogFin: function (oEvent) {
                var fechaHasta = oEvent.getSource().getDateValue();
                var fechaDesde = this.getView().getModel("ValorCapita").getData().FechaIni;
                var dataHeader= this.getView().getModel("header").getData();                
            
                if(fechaDesde < dataHeader.fechaIni){
                    sap.m.MessageBox.error("vigencia desde debe estar en el rango de las vigencias de la solicitud");
                    sap.ui.getCore().byId("vigCapitaHasta").setValueState("Error");
                    return;

                }

                if(dataHeader.fechaFin <= fechaHasta ){
                    sap.m.MessageBox.error("vigencia hasta debe estar en el rango de las vigencias de la solicitud");
                    sap.ui.getCore().byId("vigCapitaHasta").setValueState("Error");
                    return;
                }
            
                if (fechaDesde !== undefined && fechaDesde !== null) {
                    var dia = fechaDesde.getUTCDate();
                    var mes = fechaDesde.getUTCMonth() + 1;
                    var anio = fechaDesde.getUTCFullYear();
                
                    var formatedMonthDesde = new Date(anio, mes - 1, dia);
                    if (formatedMonthDesde > fechaHasta) {
                        sap.m.MessageBox.error("vigencia hasta no puede ser menor a vigencia desde");
                        sap.ui.getCore().byId("vigCapitaHasta").setValueState("Error");
                    } else {
                        sap.ui.getCore().byId("vigCapitaDesde").setValueState("None");
                        sap.ui.getCore().byId("vigCapitaHasta").setValueState("None");
                    }
                }
            },*/

            onChangeDateDialogFin: function (oEvent) {
                var fechaHasta = oEvent.getSource().getDateValue();
                var fechaDesde = this.getView().getModel("ValorCapita").getData().FechaIni;
                var dataHeader = this.getView().getModel("header").getData();
                var headerFechaIni = this.formatDate(dataHeader.fechaIni, 0);
                var headerFechaFin = this.formatDate(dataHeader.fechaFin, 0);
                var fechaDesdeFormat = this.formatDate(fechaDesde, 0);


                if (fechaDesdeFormat < headerFechaIni) {
                    sap.m.MessageBox.error("vigencia desde debe estar en el rango de las vigencias de la solicitud");
                    sap.ui.getCore().byId("vigCapitaHasta").setValueState("Error");
                    return;

                }
                if (headerFechaFin < fechaHasta) {
                    sap.m.MessageBox.error("vigencia hasta debe estar en el rango de las vigencias de la solicitud");
                    sap.ui.getCore().byId("vigCapitaHasta").setValueState("Error");
                    return;
                }

                if (fechaDesdeFormat !== undefined && fechaDesdeFormat !== null) {
                    var dia = fechaDesdeFormat.getUTCDate();
                    var mes = fechaDesdeFormat.getUTCMonth() + 1;
                    var anio = fechaDesdeFormat.getUTCFullYear();

                    var formatedMonthDesde = new Date(anio, mes - 1, dia);
                    if (formatedMonthDesde > fechaHasta) {
                        sap.m.MessageBox.error("vigencia hasta no puede ser menor a vigencia desde");
                        sap.ui.getCore().byId("vigCapitaHasta").setValueState("Error");
                    } else {
                        sap.ui.getCore().byId("vigCapitaDesde").setValueState("None");
                        sap.ui.getCore().byId("vigCapitaHasta").setValueState("None");
                    }
                }
            },

            onMontoTotalChange: function (oEvent) {
                var oCabModel = models.contCabModel();
                var formatted = formatter.formatPrice(oEvent.getSource().getValue());

                //let oTotalFormatted = formatter.formatPrice(totalWrbtr.toFixed(2));
                oCabModel.setProperty("/montoTotal", formatted);
            },

            onMontoInicialChange: function (oEvent) {
                var oCabModel = models.contCabModel();
                var formatted = formatter.formatPrice(oEvent.getSource().getValue());

                //let oTotalFormatted = formatter.formatPrice(totalWrbtr.toFixed(2));
                oCabModel.setProperty("/montoInicial", formatted);
            },

            getLoggedUser: function () {
                return new Promise(function (resolve) {
                    try {
                        var sUser = "";
                        if (sap.ushell !== undefined) {
                            var oUser = sap.ushell.Container.getService("UserInfo").getUser();
                            sUser = oUser.getId() || oUser.getEmail() || "";
                        }
                        resolve({ Resources: [{ userName: sUser || "UNKNOWN" }] });
                    } catch (e) {
                        resolve({ Resources: [{ userName: "UNKNOWN" }] });
                    }
                });
            },

            onGetMyInbox: async function (getComponentDataMyInbox) {
                oThat = this;
                let oEnabledModel = this.getOwnerComponent().getModel("EnabledModel");
                try {
                    sap.ui.core.BusyIndicator.show(0);
                    // En S/4HANA on-premise siempre iniciamos en modo creación standalone
                    this._sTaskSapOrigin = 'LOCAL_TGW';
                    this.oStartupParameters = getComponentDataMyInbox.startupParameters;

                    if (this.oStartupParameters.TASK) { this._sTaskInstanceID = this.oStartupParameters.TASK[0] }
                    if (this.oStartupParameters.Contrato) { this.sContrato = this.oStartupParameters.Contrato[0] }


                    if (this._sTaskInstanceID) { // 

                        try {

                            //General JSON 
                            var oGeneralJsonData = await oThat.readGeneralJson(oThat.sContrato);
                            console.log("GeneralJsonSet:", oGeneralJsonData);
                            let oContextWorkflow = JSON.parse(oGeneralJsonData.JsonFiori);
                            oContextWorkflow = oThat.snakeToCamelKeys(oContextWorkflow);

                            //Agregado
                            oContextWorkflow.client = oContextWorkflow.header.kunnr + ' - ' + oContextWorkflow.header.kunnrTxt;
                            oContextWorkflow.sociedad = oContextWorkflow.header.bukrs + ' - ' + oContextWorkflow.header.butxt;
                            oContextWorkflow.level = 1;

                            var contextModel = new JSONModel(oContextWorkflow);
                            $.Component.setModel(contextModel, "context");
                            var requesterModel = new JSONModel(oContextWorkflow.requester);
                            $.Component.setModel(requesterModel, "requester");
                            var headerModel = new JSONModel(oContextWorkflow.header);
                            oThat.getOwnerComponent().getModel("EnabledModel").setProperty("/cabecera", true);
                            $.Component.getModel("CoberturasRenovModel").setProperty("/coberturas", []);

                            if (oContextWorkflow.header.fechaIni !== null && oContextWorkflow.header.fechaIni !== undefined) {
                                var fechaIni = new Date(oContextWorkflow.header.fechaIni);
                                var fechainicioUTC = oThat.getDatesUTC(fechaIni);
                                oContextWorkflow.header.fechaIni = fechainicioUTC;
                            }

                            if (oContextWorkflow.header.fechaFin !== null && oContextWorkflow.header.fechaFin !== undefined) {
                                var fechaFin = new Date(oContextWorkflow.header.fechaFin);
                                var fechaFinUTC = oThat.getDatesUTC(fechaFin);
                                oContextWorkflow.header.fechaFin = fechaFinUTC;
                            }

                            if (oContextWorkflow.header.fechaFirma !== null && oContextWorkflow.header.fechaFirma !== undefined) {
                                var fechaFirma = new Date(oContextWorkflow.header.fechaFirma);
                                var fechaFirmaUTC = oThat.getDatesUTC(fechaFirma);
                                oContextWorkflow.header.fechaFirma = fechaFirmaUTC;
                            }

                            if (oContextWorkflow.header.periodoAjuste !== undefined) {
                                if (oContextWorkflow.header.periodoAjuste < 10) {
                                    if (oContextWorkflow.header.periodoAjuste.toString().length < 2) {
                                        oContextWorkflow.header.periodoAjuste = "0" + oContextWorkflow.header.periodoAjuste.toString();
                                    } else {
                                        oContextWorkflow.header.periodoAjuste = oContextWorkflow.header.periodoAjuste.toString();
                                    }

                                } else {
                                    oContextWorkflow.header.periodoAjuste = oContextWorkflow.header.periodoAjuste.toString();
                                }
                            } else if (oContextWorkflow.header.perTxt !== undefined) {
                                oContextWorkflow.header.periodoAjuste = "00";
                            }

                            if (oContextWorkflow.header.poseeClausula !== undefined) {
                                if (oContextWorkflow.header.poseeClausula === "X") {
                                    oContextWorkflow.header.poseeClausula = true;
                                } else if (oContextWorkflow.header.poseeClausula) {
                                    oContextWorkflow.header.poseeClausula = true;
                                } else {
                                    oContextWorkflow.header.poseeClausula = false;
                                }
                            }

                            if (oContextWorkflow.header.montoInicial !== null && oContextWorkflow.header.montoInicial !== undefined) {
                                var montoInicial = oContextWorkflow.header.montoInicial
                                var montoInicialFormater = oThat.formatPrice(montoInicial);
                                oContextWorkflow.header.montoInicial = montoInicialFormater;
                            }

                            if (oContextWorkflow.header.rol !== null && oContextWorkflow.header.rol !== undefined) {
                                if (oContextWorkflow.header.rol === "2") {
                                    oContextWorkflow.header.kunnr = oContextWorkflow.header.lifnr;
                                }
                            }

                            if (oContextWorkflow.header.areaResp !== null && oContextWorkflow.header.areaResp !== undefined) {
                                oThat.byId("areaResponsable").setValue(oContextWorkflow.header.areaResp); //Le seteamos el Area Responsable 
                            }

                            oThat._bindItemsComboBoxSociedad(oContextWorkflow.header.cotyp);

                            $.Component.setModel(headerModel, "header");
                            oThat.getOwnerComponent().getModel("AuxModel").setProperty("/Cotyp", oContextWorkflow.header.cotyp);
                            switch (oContextWorkflow.header.optyp) {
                                case "C":
                                    oThat.getOwnerComponent().getModel("AuxModel").setProperty("/creacion", true);
                                    /*oThat.getOwnerComponent().getModel("AuxModel").setProperty("/modificacion", false);
                                    oThat.getOwnerComponent().getModel("AuxModel").setProperty("/renovacion", false);*/
                                    break;
                                case "M":
                                    oThat.getOwnerComponent().getModel("AuxModel").setProperty("/modificacion", true);
                                    /*oThat.getOwnerComponent().getModel("AuxModel").setProperty("/creacion", false);
                                    oThat.getOwnerComponent().getModel("AuxModel").setProperty("/renovacion", false);*/
                                    break;
                                case "R":
                                    oThat.getOwnerComponent().getModel("AuxModel").setProperty("/renovacion", true);
                                    /*oThat.getOwnerComponent().getModel("AuxModel").setProperty("/modificacion", false);
                                    oThat.getOwnerComponent().getModel("AuxModel").setProperty("/creacion", false);*/
                                    break;
                            }

                            if (oThat.getOwnerComponent().getModel("AuxModel").getProperty("/creacion") === true) {

                                if (oContextWorkflow.positions !== undefined) {
                                    if (oContextWorkflow.positions.length > 0 && oContextWorkflow.positions[0].auart !== undefined) {
                                        //valor capita
                                        for (var i = 0; i < oContextWorkflow.positions.length; i++) {
                                            oContextWorkflow.positions[i].itemsDialog = oContextWorkflow.positions[i].subposSop;
                                            for (var j = 0; j < oContextWorkflow.positions[i].itemsDialog.length; j++) {
                                                var oObjectDialogCreation = oContextWorkflow.positions[i].itemsDialog[j];
                                                oContextWorkflow.positions[i].itemsDialog[j].ValorCapita = (oObjectDialogCreation.valorCapita) ? formatter.formatPrice(oObjectDialogCreation.valorCapita) : oObjectDialogCreation.ValorCapita;
                                                oContextWorkflow.positions[i].itemsDialog[j].FechaIni = oThat.getDates((oObjectDialogCreation.fechaIni) ? oObjectDialogCreation.fechaIni : oObjectDialogCreation.FechaIni);
                                                oContextWorkflow.positions[i].itemsDialog[j].FechaFin = oThat.getDates((oObjectDialogCreation.fechaFin) ? oObjectDialogCreation.fechaFin : oObjectDialogCreation.FechaFin);
                                            }
                                        }
                                        //coberturas
                                        for (var i = 0; i < oContextWorkflow.positions.length; i++) {
                                            oContextWorkflow.positions[i].itemMat = oContextWorkflow.positions[i].subposCov;
                                            for (var j = 0; j < oContextWorkflow.positions[i].itemMat.length; j++) {
                                                var oObject = oContextWorkflow.positions[i].itemMat[j];
                                                oContextWorkflow.positions[i].itemMat[j].Item = (oObject.item) ? oObject.item : oObject.Item;
                                                oContextWorkflow.positions[i].itemMat[j].Matnr = (oObject.matnr) ? oObject.matnr : oObject.Matnr;
                                                oContextWorkflow.positions[i].itemMat[j].Description = (oObject.matnrTxt) ? oObject.matnrTxt : oObject.MatnrTxt;
                                                oContextWorkflow.positions[i].itemMat[j].Subitem = (oObject.subitem) ? oObject.subitem : oObject.Subitem;
                                            }
                                        }

                                        $.Component.getModel("contPos").setProperty("/posData", oContextWorkflow.positions);
                                        //$.Component.getModel("contPos").setProperty("/posDataModif", oContextWorkflow.positions);
                                        oThat.getOwnerComponent().getModel("VisibleModel").setProperty("/valorCapitaDialog", false);

                                    }
                                }
                            } else {

                                if (oContextWorkflow.positions !== undefined) {
                                    if (oContextWorkflow.positions.length > 0 && oContextWorkflow.positions[0].auart !== undefined) {
                                        //valor capita
                                        for (var i = 0; i < oContextWorkflow.positions.length; i++) {
                                            var aSubPosSop = oContextWorkflow.positions[i].subposSop;
                                            oContextWorkflow.positions[i].itemsDialog = aSubPosSop;
                                            oContextWorkflow.positions[i].ValorCapita = (aSubPosSop[0].valorCapita) ? formatter.formatPrice(aSubPosSop[0].valorCapita) : formatter.formatPrice(aSubPosSop[0].ValorCapita);
                                            oContextWorkflow.positions[i].primeraFecha = oThat.getDates((aSubPosSop[0].edatu) ? aSubPosSop[0].edatu : aSubPosSop[0].Edatu);

                                            for (var j = 0; j < oContextWorkflow.positions[i].itemsDialog.length; j++) {
                                                var oObjectDialog = oContextWorkflow.positions[i].itemsDialog[j];
                                                oContextWorkflow.positions[i].itemsDialog[j].ValorCapita = formatter.formatPrice(oObjectDialog.valorCapita);
                                                oContextWorkflow.positions[i].itemsDialog[j].FechaIni = oThat.getDates(oObjectDialog.fechaIni);
                                                oContextWorkflow.positions[i].itemsDialog[j].FechaFin = oThat.getDates(oObjectDialog.fechaFin);
                                                oContextWorkflow.positions[i].itemsDialog[j].Subitem = (oObjectDialog.subitem) ? oObjectDialog.subitem : oObjectDialog.Subitem;
                                                oContextWorkflow.positions[i].itemsDialog[j].Reqno = (oObjectDialog.reqno) ? oObjectDialog.reqno : oObjectDialog.Reqno;
                                                oContextWorkflow.positions[i].itemsDialog[j].Item = (oObjectDialog.item) ? oObjectDialog.item : oObjectDialog.Item;
                                            }
                                        }

                                        //coberturas
                                        for (var i = 0; i < oContextWorkflow.positions.length; i++) {
                                            if (oContextWorkflow.positions[i].subposCov !== undefined) {
                                                oContextWorkflow.positions[i].itemMat = oContextWorkflow.positions[i].subposCov;
                                                for (var j = 0; j < oContextWorkflow.positions[i].itemMat.length; j++) {
                                                    var oObject = oContextWorkflow.positions[i].itemMat[j];
                                                    oContextWorkflow.positions[i].itemMat[j].Item = (oObject.item) ? oObject.item : oObject.Item;
                                                    oContextWorkflow.positions[i].itemMat[j].Matnr = (oObject.matnr) ? oObject.matnr : oObject.Matnr;
                                                    oContextWorkflow.positions[i].itemMat[j].Description = (oObject.matnrTxt) ? oObject.matnrTxt : oObject.MatnrTxt;
                                                    oContextWorkflow.positions[i].itemMat[j].Subitem = (oObject.subitem) ? oObject.subitem : oObject.Subitem;
                                                }
                                            }
                                        }

                                        //$.Component.getModel("contPos").setProperty("/posData", oContextWorkflow.positions);
                                        $.Component.getModel("contPos").setProperty("/posDataModif", oContextWorkflow.positions);

                                        $.Component.getModel("CoberturasRenovModel").setProperty("/coberturas", oContextWorkflow.positions[0].subposCov);
                                        oThat.getOwnerComponent().getModel("VisibleModel").setProperty("/valorCapitaDialog", false);

                                    }
                                }
                            }
                            oThat.getOwnerComponent().getModel("Datos").setData({
                                TipoContrato: [
                                    {
                                        Id: "1",
                                        Description: "Convenio"
                                    },
                                    {
                                        Id: "2",
                                        Description: "Alquiler"
                                    },
                                    {
                                        Id: "3",
                                        Description: "Proveedores"
                                    },
                                    {
                                        Id: "4",
                                        Description: "Otros"
                                    }
                                ]
                            });

                            oThat.setFieldsFromTipo(oContextWorkflow.header.cotyp);

                            oThat.setEnableds();


                            //Obtener Task Definitions
                            await oThat._getTaskDefinitions();

                            //Validar Tarea especial - CONSULTA Y RESPONDER
                            oThat._getConsultaButton(); //boton consulta

                            //Validar si es Legales para mostrar Adjuntos especiales
                            oThat._getDocLegales();

                            /*if(oThat.getOwnerComponent().getModel("AuxModel").getProperty("/creacion") === false || oThat.getOwnerComponent().getModel("AuxModel").getProperty("/creacion") === undefined){
                                oThat.getOwnerComponent().getModel("EnabledModel").setProperty("/nroSolped", true);
                            }*/

                            //LOGICA COMENTARIOS
                            oThat.getOwnerComponent().getModel("CommentsModel").setProperty("/comentarios", oContextWorkflow.commtextgral);
                            var comentarios = oThat.getOwnerComponent().getModel("CommentsModel").getData().comentarios;

                            if (comentarios !== undefined) {
                                oThat.getOwnerComponent().getModel("AuxModel").setProperty("/comentariosLength", comentarios.length);
                                if (comentarios.length > 0) {
                                    for (var i = 0; i < comentarios.length; i++) {
                                        if (comentarios[i].erdat !== null) {
                                            comentarios[i].erdat = oThat.getDates(comentarios[i].erdat);
                                        }
                                        //Nuevo formato
                                        comentarios[i].CreatedBy = comentarios[i].ernam || "";
                                        comentarios[i].CreatedByName = comentarios[i].ernam || oCmt.CreatedBy || "";
                                        comentarios[i].Text = comentarios[i].comments || "";
                                        comentarios[i].CreatedAt = comentarios[i].erdat;
                                    }
                                }
                                oThat.getOwnerComponent().getModel("CommentsModel").setProperty("/comentarios", comentarios);
                            } else {
                                oThat.getOwnerComponent().getModel("CommentsModel").setProperty("/comentarios", []);
                            }

                            if (oThat.getOwnerComponent().getModel("AuxModel").getProperty("/creacion") === true) {
                                oThat.getOwnerComponent().getModel("VisibleModel").setProperty("/headerCoberturasRenov", false);
                            } else if (oThat.getOwnerComponent().getModel("AuxModel").getProperty("/renovacion") === true) {
                                if (oThat.getOwnerComponent().getModel("AuxModel").getProperty("/Cotyp") === 1) {
                                    oThat.getOwnerComponent().getModel("VisibleModel").setProperty("/headerCoberturasRenov", true);
                                }
                                oThat.getOwnerComponent().getModel("VisibleModel").setProperty("/headerCoberturas", false);
                            }
                            $.Component.getModel("context").setProperty("/requestLegales", {});
                            $.Component.getModel("context").setProperty("/responseLegales", {});

                            //LOGICA ADJUNTOS
                            oThat.getAdjuntos("LOCAL_TGW", this._sTaskInstanceID);
                            //LOGICA COMENTARIOS
                            oThat.getComentarios("LOCAL_TGW", this._sTaskInstanceID);
                            //Botones de accion Footer
                            oThat.onCreateButtonAction(getComponentDataMyInbox);

                            oThat.getGerentes($.Component.getModel("context").getData());
                            //TEXTO DE CONTRATO
                            oThat.getTextLevelService("0" + oContextWorkflow.header.cotyp, "0" + oContextWorkflow.level);

                            sap.ui.core.BusyIndicator.hide();
                            oThat.getOwnerComponent().getModel("VisibleModel").setProperty("/visibleCampo", true);
                            oThat.getOwnerComponent().getModel("VisibleModel").setProperty("/visibleCrear", false);
                            oThat.getOwnerComponent().getModel("AuxModel").setProperty("/header", true);
                            //FIN AGREGADO

                            // TODO: trabajar con oGeneralJsonData.results
                        } catch (oErrorGeneralJson) {
                            var sMensajeGeneralJson = (oErrorGeneralJson && oErrorGeneralJson.message) ? oErrorGeneralJson.message : "Error al leer GeneralJsonSet";
                            sap.m.MessageToast.show(sMensajeGeneralJson);
                            sap.ui.core.BusyIndicator.hide();
                        }

                    } else {
                        // MODO CREACIÓN STANDALONE — S/4HANA on-premise
                        sap.ui.core.BusyIndicator.hide();

                        //Ocultar botones Consulta/Responder
                        let oConsultaModel = new JSONModel({});
                        oConsultaModel.setProperty("/btnConsulta_visible", false);
                        oConsultaModel.setProperty("/btnResponder_visible", false);
                        $.Component.setModel(oConsultaModel, "ConsultaModel");

                        oThat.getOwnerComponent().getModel("AuxModel").setProperty("/header", false);
                        oThat._oModelDocument = models.createDocumentModel();
                        oThat.getView().setModel(this._oModelDocument, "document");
                        oThat._oCabModel = models.contCabModel();
                        oThat.getView().setModel(oThat._oCabModel, "header");
                        oThat._oPosModel = models.contPosModel();
                        oThat.getView().setModel(this._oPosModel, "contPos");
                        oThat.getOwnerComponent().getModel().setSizeLimit(300);
                        oThat.setFields();
                        oThat.getOwnerComponent().getModel("tablaValorCapita").setProperty("/items", []);
                        oThat.getOwnerComponent().getModel("VisibleModel").setProperty("/valorCapitaDialog", true);
                        oThat.getOwnerComponent().getModel("VisibleModel").setProperty("/visibleCampo", false);
                        oThat.getOwnerComponent().getModel("VisibleModel").setProperty("/visibleCrear", true);
                        oThat.getOwnerComponent().getModel("AuxModel").setProperty("/adjuntosLength", 0);
                        oThat.getOwnerComponent().getModel("Datos").setData({
                            TipoContrato: [
                                { Id: "1", Description: "Convenio" },
                                { Id: "2", Description: "Alquiler" },
                                { Id: "3", Description: "Proveedores" },
                                { Id: "4", Description: "Otros" }
                            ]
                        });
                        oThat.getOwnerComponent().getModel("tablaMateriales").setData({ items: [] });
                        oThat.getOwnerComponent().getModel("CommentsModel").setProperty("/comentarios", []);
                    }
                } catch (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    sap.m.MessageToast.show(oError);
                }
            },

            _getTaskDefinitions: async function () {
                let sTask = await this._loadTask(this._sTaskInstanceID);
                this.sTaskDefinitions = sTask.TaskDefinitionID.split('_');
                this.sPasoWF = this.sTaskDefinitions[2];
            },
            /**
            * Reads the task entity directly from TASKPROCESSING (TaskCollection),
            * without navigating into /Description. Returns a Promise so the
            * caller can work with the resulting data.
            * @param {string} sTaskId
            * @returns {Promise<object>}
            */
            _loadTask: function (sTaskId) {
                let oTaskModel = this._getTaskProcModel(); //this.getOwnerComponent().getModel("taskprocessing");
                let sSapOrigin = "LOCAL_TGW";
                let sNavPath = "/TaskCollection(SAP__Origin='" + sSapOrigin
                    + "',InstanceID='" + sTaskId + "')";

                return new Promise(function (resolve, reject) {
                    oTaskModel.read(sNavPath, {
                        success: resolve,
                        error: reject
                    });
                });
            },

            _settingDescriptions: function (oParameters) {
                //Descripciones de las posiciones    
                if (oParameters.positions) {
                    oParameters.positions.forEach(function (item) {
                        if (item.auart.includes("-") === false) {
                            // item.auart = item.auart + " - " + item.auartTxt;
                            //item.auartCod = item.auart;
                            //item.auart = item.auartTxt;
                        }
                        if (item.kunnr.includes("-") === false) {
                            //item.kunnr = item.kunnr + " - " + item.kunnrTxt;
                            //item.kunnrCod = item.kunnr;
                            //item.kunnr = item.kunnrTxt;
                        }
                        if (item.matnr.includes("-") === false) {
                            // item.matnr = item.matnr + " - " + item.matnrTxt;
                            //item.matnrCod = item.matnr
                            //item.matnr = item.matnrTxt;
                        }
                    });
                }

                //Descripciones del Header
                if (oParameters.header.kunnr) {
                    if (oParameters.header.kunnr.includes("-") === false) {
                        oParameters.header.kunnr = oParameters.header.kunnr + " - " + oParameters.header.kunnrTxt;
                    }
                }
                if (oParameters.header.lifnr) {
                    if (oParameters.header.lifnr.includes("-") === false) {
                        oParameters.header.lifnr = oParameters.header.lifnr + " - " + oParameters.header.lifnrTxt;
                    }
                }
                if (oParameters.header.areaResp) {
                    if (oParameters.header.areaResp.toString().includes("-") === false) {
                        oParameters.header.areaResp = oParameters.header.areaResp + " - " + oParameters.header.areaTxt;
                    }
                }

                return oParameters;
            },

            onGetContext: function (InstanceID) {
                var oThat = this;
                try {
                    sap.ui.core.BusyIndicator.show(0);

                    Workflow.onGetContextWorkflow(InstanceID).then(function (oParameters) {
                        var oContextWorkflow = oThat._settingDescriptions(oParameters);

                        ////Validacion DASHBOARD SOCIEDAD
                        var filters = [
                            new Filter("User", "EQ", oThat._loggedUser)
                        ];

                        oThat.readSociedadService(filters).then(function (aData) {


                            if (aData.results.length > 0) {
                                var sociedades = aData.results;
                                var contextSociedad = oContextWorkflow.header.bukrs;
                                var existSociedad = false;
                                sociedades.forEach(function (o) {
                                    if (o.Id === contextSociedad) {
                                        existSociedad = true;
                                    }
                                });

                                if (existSociedad) {
                                    var contextModel = new JSONModel(oContextWorkflow);
                                    $.Component.setModel(contextModel, "context");
                                    var requesterModel = new JSONModel(oContextWorkflow.requester);
                                    $.Component.setModel(requesterModel, "requester");
                                    var headerModel = new JSONModel(oContextWorkflow.header);
                                    oThat.getOwnerComponent().getModel("EnabledModel").setProperty("/cabecera", true);
                                    $.Component.getModel("CoberturasRenovModel").setProperty("/coberturas", []);

                                    if (oContextWorkflow.header.fechaIni !== null && oContextWorkflow.header.fechaIni !== undefined) {
                                        var fechaIni = new Date(oContextWorkflow.header.fechaIni);
                                        var fechainicioUTC = oThat.getDatesUTC(fechaIni);
                                        oContextWorkflow.header.fechaIni = fechainicioUTC;
                                    }
                                    if (oContextWorkflow.header.fechaFin !== null && oContextWorkflow.header.fechaFin !== undefined) {
                                        var fechaFin = new Date(oContextWorkflow.header.fechaFin);
                                        var fechaFinUTC = oThat.getDatesUTC(fechaFin);
                                        oContextWorkflow.header.fechaFin = fechaFinUTC;
                                    }
                                    if (oContextWorkflow.header.fechaFirma !== null && oContextWorkflow.header.fechaFirma !== undefined) {
                                        var fechaFirma = new Date(oContextWorkflow.header.fechaFirma);
                                        var fechaFirmaUTC = oThat.getDatesUTC(fechaFirma);
                                        oContextWorkflow.header.fechaFirma = fechaFirmaUTC;
                                    }

                                    if (oContextWorkflow.header.periodoAjuste !== undefined) {
                                        if (oContextWorkflow.header.periodoAjuste < 10) {
                                            if (oContextWorkflow.header.periodoAjuste.toString().length < 2) {
                                                oContextWorkflow.header.periodoAjuste = "0" + oContextWorkflow.header.periodoAjuste.toString();
                                            } else {
                                                oContextWorkflow.header.periodoAjuste = oContextWorkflow.header.periodoAjuste.toString();
                                            }

                                        } else {
                                            oContextWorkflow.header.periodoAjuste = oContextWorkflow.header.periodoAjuste.toString();
                                        }
                                    } else if (oContextWorkflow.header.perTxt !== undefined) {
                                        oContextWorkflow.header.periodoAjuste = "00";
                                    }

                                    if (oContextWorkflow.header.poseeClausula !== undefined) {
                                        if (oContextWorkflow.header.poseeClausula === "X") {
                                            oContextWorkflow.header.poseeClausula = true;
                                        } else if (oContextWorkflow.header.poseeClausula) {
                                            oContextWorkflow.header.poseeClausula = true;
                                        } else {
                                            oContextWorkflow.header.poseeClausula = false;
                                        }
                                    }

                                    if (oContextWorkflow.header.montoInicial !== null && oContextWorkflow.header.montoInicial !== undefined) {
                                        var montoInicial = oContextWorkflow.header.montoInicial
                                        var montoInicialFormater = oThat.formatPrice(montoInicial);
                                        oContextWorkflow.header.montoInicial = montoInicialFormater;
                                    }

                                    if (oContextWorkflow.header.rol !== null && oContextWorkflow.header.rol !== undefined) {
                                        if (oContextWorkflow.header.rol === "2") {
                                            oContextWorkflow.header.kunnr = oContextWorkflow.header.lifnr;
                                        }
                                    }

                                    if (oContextWorkflow.header.areaResp !== null && oContextWorkflow.header.areaResp !== undefined) {
                                        oThat.byId("areaResponsable").setValue(oContextWorkflow.header.areaResp); //Le seteamos el Area Responsable 
                                    }

                                    oThat._bindItemsComboBoxSociedad(oContextWorkflow.header.cotyp);

                                    $.Component.setModel(headerModel, "header");
                                    oThat.getOwnerComponent().getModel("AuxModel").setProperty("/Cotyp", oContextWorkflow.header.cotyp);
                                    switch (oContextWorkflow.header.optyp) {
                                        case "C":
                                            oThat.getOwnerComponent().getModel("AuxModel").setProperty("/creacion", true);
                                            /*oThat.getOwnerComponent().getModel("AuxModel").setProperty("/modificacion", false);
                                            oThat.getOwnerComponent().getModel("AuxModel").setProperty("/renovacion", false);*/
                                            break;
                                        case "M":
                                            oThat.getOwnerComponent().getModel("AuxModel").setProperty("/modificacion", true);
                                            /*oThat.getOwnerComponent().getModel("AuxModel").setProperty("/creacion", false);
                                            oThat.getOwnerComponent().getModel("AuxModel").setProperty("/renovacion", false);*/
                                            break;
                                        case "R":
                                            oThat.getOwnerComponent().getModel("AuxModel").setProperty("/renovacion", true);
                                            /*oThat.getOwnerComponent().getModel("AuxModel").setProperty("/modificacion", false);
                                            oThat.getOwnerComponent().getModel("AuxModel").setProperty("/creacion", false);*/
                                            break;
                                    }

                                    if (oThat.getOwnerComponent().getModel("AuxModel").getProperty("/creacion") === true) {

                                        if (oContextWorkflow.positions !== undefined) {
                                            if (oContextWorkflow.positions.length > 0 && oContextWorkflow.positions[0].auart !== undefined) {
                                                //valor capita
                                                for (var i = 0; i < oContextWorkflow.positions.length; i++) {
                                                    oContextWorkflow.positions[i].itemsDialog = oContextWorkflow.positions[i].subposSop;
                                                    for (var j = 0; j < oContextWorkflow.positions[i].itemsDialog.length; j++) {
                                                        var oObjectDialogCreation = oContextWorkflow.positions[i].itemsDialog[j];
                                                        oContextWorkflow.positions[i].itemsDialog[j].ValorCapita = (oObjectDialogCreation.valorCapita) ? formatter.formatPrice(oObjectDialogCreation.valorCapita) : oObjectDialogCreation.ValorCapita;
                                                        oContextWorkflow.positions[i].itemsDialog[j].FechaIni = oThat.getDates((oObjectDialogCreation.fechaIni) ? oObjectDialogCreation.fechaIni : oObjectDialogCreation.FechaIni);
                                                        oContextWorkflow.positions[i].itemsDialog[j].FechaFin = oThat.getDates((oObjectDialogCreation.fechaFin) ? oObjectDialogCreation.fechaFin : oObjectDialogCreation.FechaFin);
                                                    }
                                                }
                                                //coberturas
                                                for (var i = 0; i < oContextWorkflow.positions.length; i++) {
                                                    oContextWorkflow.positions[i].itemMat = oContextWorkflow.positions[i].subposCov;
                                                    for (var j = 0; j < oContextWorkflow.positions[i].itemMat.length; j++) {
                                                        var oObject = oContextWorkflow.positions[i].itemMat[j];
                                                        oContextWorkflow.positions[i].itemMat[j].Item = (oObject.item) ? oObject.item : oObject.Item;
                                                        oContextWorkflow.positions[i].itemMat[j].Matnr = (oObject.matnr) ? oObject.matnr : oObject.Matnr;
                                                        oContextWorkflow.positions[i].itemMat[j].Description = (oObject.matnrTxt) ? oObject.matnrTxt : oObject.MatnrTxt;
                                                        oContextWorkflow.positions[i].itemMat[j].Subitem = (oObject.subitem) ? oObject.subitem : oObject.Subitem;
                                                    }
                                                }

                                                $.Component.getModel("contPos").setProperty("/posData", oContextWorkflow.positions);
                                                oThat.getOwnerComponent().getModel("VisibleModel").setProperty("/valorCapitaDialog", false);

                                            }
                                        }
                                    } else {

                                        if (oContextWorkflow.positions !== undefined) {
                                            if (oContextWorkflow.positions.length > 0 && oContextWorkflow.positions[0].auart !== undefined) {
                                                //valor capita
                                                for (var i = 0; i < oContextWorkflow.positions.length; i++) {
                                                    var aSubPosSop = oContextWorkflow.positions[i].subposSop;
                                                    oContextWorkflow.positions[i].itemsDialog = oContextWorkflow.positions[i].subposSop;
                                                    if (aSubPosSop) {
                                                        oContextWorkflow.positions[i].ValorCapita = (aSubPosSop[0].valorCapita) ? formatter.formatPrice(aSubPosSop[0].valorCapita) : formatter.formatPrice(aSubPosSop[0].ValorCapita);
                                                        oContextWorkflow.positions[i].primeraFecha = oThat.getDates((aSubPosSop[0].edatu) ? aSubPosSop[0].edatu : aSubPosSop[0].Edatu);
                                                    }

                                                    for (var j = 0; j < oContextWorkflow.positions[i].itemsDialog.length; j++) {
                                                        var oObjectDialog = oContextWorkflow.positions[i].itemsDialog[j];
                                                        oContextWorkflow.positions[i].itemsDialog[j].ValorCapita = (oObjectDialog.valorCapita) ? formatter.formatPrice(oObjectDialog.valorCapita) : formatter.formatPrice(oObjectDialog.ValorCapita);
                                                        oContextWorkflow.positions[i].itemsDialog[j].FechaIni = oThat.getDates((oObjectDialog.fechaIni) ? oObjectDialog.fechaIni : oObjectDialog.FechaIni);
                                                        oContextWorkflow.positions[i].itemsDialog[j].FechaFin = oThat.getDates((oObjectDialog.fechaFin) ? oObjectDialog.fechaFin : oObjectDialog.FechaFin);
                                                        oContextWorkflow.positions[i].itemsDialog[j].Subitem = (oObjectDialog.subitem) ? oObjectDialog.subitem : oObjectDialog.Subitem;
                                                        oContextWorkflow.positions[i].itemsDialog[j].Reqno = (oObjectDialog.reqno) ? oObjectDialog.reqno : oObjectDialog.Reqno;
                                                        oContextWorkflow.positions[i].itemsDialog[j].Item = (oObjectDialog.item) ? oObjectDialog.item : oObjectDialog.Item;
                                                    }
                                                }

                                                //coberturas
                                                for (var i = 0; i < oContextWorkflow.positions.length; i++) {
                                                    if (oContextWorkflow.positions[i].subposCov !== undefined) {
                                                        oContextWorkflow.positions[i].itemMat = oContextWorkflow.positions[i].subposCov;
                                                        for (var j = 0; j < oContextWorkflow.positions[i].itemMat.length; j++) {
                                                            var oObject = oContextWorkflow.positions[i].itemMat[j];
                                                            oContextWorkflow.positions[i].itemMat[j].Item = (oObject.item) ? oObject.item : oObject.Item;
                                                            oContextWorkflow.positions[i].itemMat[j].Matnr = (oObject.matnr) ? oObject.matnr : oObject.Matnr;
                                                            oContextWorkflow.positions[i].itemMat[j].Description = (oObject.matnrTxt) ? oObject.matnrTxt : oObject.MatnrTxt;
                                                            oContextWorkflow.positions[i].itemMat[j].Subitem = (oObject.subitem) ? oObject.subitem : oObject.Subitem;
                                                        }
                                                    }
                                                }

                                                //$.Component.getModel("contPos").setProperty("/posData", oContextWorkflow.positions);
                                                $.Component.getModel("contPos").setProperty("/posDataModif", oContextWorkflow.positions);

                                                $.Component.getModel("CoberturasRenovModel").setProperty("/coberturas", oContextWorkflow.positions[0].subposCov);
                                                /*if(oThat.getOwnerComponent().getModel("AuxModel").getProperty("/modificacion") === true){
                                                    oThat.getOwnerComponent().getModel("AuxModel").setProperty("/renovacion", false);
                                                }*/
                                                oThat.getOwnerComponent().getModel("VisibleModel").setProperty("/valorCapitaDialog", false);

                                            }
                                        }
                                    }
                                    oThat.getOwnerComponent().getModel("Datos").setData({
                                        TipoContrato: [
                                            {
                                                Id: "1",
                                                Description: "Convenio"
                                            },
                                            {
                                                Id: "2",
                                                Description: "Alquiler"
                                            },
                                            {
                                                Id: "3",
                                                Description: "Proveedores"
                                            },
                                            {
                                                Id: "4",
                                                Description: "Otros"
                                            }
                                        ]
                                    });

                                    oThat.setFieldsFromTipo(oContextWorkflow.header.cotyp);

                                    oThat.setEnableds();
                                    // Obtener boton Consulta / Responder 
                                    oThat._getConsultaButton(); //boton consulta

                                    //LOGICA COMENTARIOS
                                    oThat.getOwnerComponent().getModel("CommentsModel").setProperty("/comentarios", oContextWorkflow.commtextgral);
                                    var comentarios = oThat.getOwnerComponent().getModel("CommentsModel").getData().comentarios;

                                    if (comentarios !== undefined) {
                                        oThat.getOwnerComponent().getModel("AuxModel").setProperty("/comentariosLength", comentarios.length);
                                        if (comentarios.length > 0) {
                                            for (var i = 0; i < comentarios.length; i++) {
                                                if (comentarios[i].erdat !== null) {
                                                    comentarios[i].erdat = oThat.getDates(comentarios[i].erdat);
                                                }
                                            }
                                        }
                                        oThat.getOwnerComponent().getModel("CommentsModel").setProperty("/comentarios", comentarios);
                                    } else {
                                        oThat.getOwnerComponent().getModel("CommentsModel").setProperty("/comentarios", []);
                                    }

                                    if (oThat.getOwnerComponent().getModel("AuxModel").getProperty("/creacion") === true) {
                                        oThat.getOwnerComponent().getModel("VisibleModel").setProperty("/headerCoberturasRenov", false);
                                    } else if (oThat.getOwnerComponent().getModel("AuxModel").getProperty("/renovacion") === true) {
                                        oThat.getOwnerComponent().getModel("VisibleModel").setProperty("/headerCoberturasRenov", true);
                                        oThat.getOwnerComponent().getModel("VisibleModel").setProperty("/headerCoberturas", false);
                                    }
                                    //LOGICA ADJUNTOS
                                    oThat.getAdjuntos();
                                    oThat.onCreateButtonAction();
                                    sap.ui.core.BusyIndicator.hide();
                                } else {
                                    //oContextWorkflow=[];
                                    oThat.cleanDataModel();
                                    MessageBox.error("No tiene permisos a la Sociedad " + contextSociedad);
                                }


                            } else {
                                MessageBox.error("El Usuario no tiene sociedades asignadas");
                            }

                        })
                        //console.log(oContextWorkflow);

                    }).catch(function (oError) {

                        oThat.onErrorMessage(oError, "oErrorGetContext");
                    }).finally(function () {
                        sap.ui.core.BusyIndicator.hide();
                    });

                } catch (oError) {

                    oThat.onErrorMessage(oError, "errorMyInbox");
                }
            },


            _getConsultaButton: async function () {
                let oEnabledModel = new JSONModel({});
                // oEnabledModel.setProperty("/btnConsulta", "Consulta");
                // oEnabledModel.setProperty("/btnConsulta_visible", true);
                // oEnabledModel.setProperty("/btnResponder_visible", false);
                oEnabledModel.setProperty("/btnConsulta_visible", false);
                oEnabledModel.setProperty("/btnResponder_visible", false);

                let sTask = await this._loadTask(this._sTaskInstanceID);
                if (sTask.TaskDefinitionID.slice(0, 10) === 'TS90500027') {
                    oEnabledModel.setProperty("/btnConsulta", 'Consulta');
                    oEnabledModel.setProperty("/btnConsulta_visible", true);
                    oEnabledModel.setProperty("/btnResponder_visible", false);
                }
                if (sTask.TaskDefinitionID.slice(0, 10) === 'TS90500036') {
                    oEnabledModel.setProperty("/btnResponder", 'Responder');
                    oEnabledModel.setProperty("/btnConsulta_visible", false);
                    oEnabledModel.setProperty("/btnResponder_visible", true);
                }
                $.Component.setModel(oEnabledModel, "ConsultaModel");
            },

            _getDocLegales: async function () {
                let sTask = await this._loadTask(this._sTaskInstanceID);
                if (sTask.TaskDefinitionID.slice(0, 10) === 'TS90500027') {
                    $.Component.getModel("ConsultaModel").setProperty("/docLegales", true);
                }
                $.Component.getModel("ConsultaModel").setProperty("/docLegalesLength", 0);
            },

            readSociedadService: function (filters) {
                return new Promise((res, rej) => {
                    this.getOwnerComponent().getModel().read("/COMPANYSet", {
                        filters: filters,
                        success: res,
                        error: rej
                    });
                });
            },
            //TEXTO DE CONTRATO
            readTextByLevelService: function (filters) {
                return new Promise((res, rej) => {
                    this.getOwnerComponent().getModel("postService").read("/CONTRACTTEXTNIVSet", {
                        filters: filters,
                        success: res,
                        error: rej
                    });
                });
            },
            getTextLevelService: function (cotype, level) {
                var filters = [
                    new Filter("Cotyp", "EQ", cotype),
                    new Filter("Rlslv", "EQ", level),
                    new Filter("PasoWF", "EQ", this.sPasoWF),

                ];
                console.log("getTextLevelService filters >>", { cotype: cotype, level: level, PasoWF: this.sPasoWF });

                oThat.readTextByLevelService(filters).then(function (aData) {
                    console.log("getTextLevelService response >>", aData);
                    if (aData.results.length > 0) {
                        console.log("getTextLevelService Comentario >>", aData.results[0].Comentario);
                        $.Component.getModel("header").setProperty("/textLevel", aData.results[0].Comentario);
                    } else {
                        console.log("getTextLevelService: 0 resultados, revisar filtro PasoWF");
                    }
                }).catch(function (oError) {
                    console.log("getTextLevelService error >>", oError);
                })
            },

            getGerentes: function (context) {
                // IAS SCIM no disponible en S/4HANA on-premise — función deshabilitada
            },

            getDateUTC: function (fecha) {
                var dia = fecha.getUTCDate();
                var mes = fecha.getUTCMonth() + 1;
                var anio = fecha.getUTCFullYear();
                if (dia < 10) {
                    dia = "0" + dia.toString();
                }
                if (mes < 10) {
                    mes = "0" + mes.toString();
                }

                return new Date(anio, mes, dia);
            },

            getDatesUTC: function (fecha) {
                var dia = fecha.getUTCDate();
                var mes = fecha.getUTCMonth();
                var anio = fecha.getUTCFullYear();
                if (dia < 10) {
                    dia = "0" + dia.toString();
                }
                if (mes < 10) {
                    mes = "0" + mes.toString();
                }

                return new Date(anio, mes, dia);
            },

            // Convierte recursivamente las claves de un objeto/array de "snake_case" a "camelCase"
            snakeToCamelKeys: function (vData) {
                var oThat = this;
                if (Array.isArray(vData)) {
                    return vData.map(function (vItem) {
                        return oThat.snakeToCamelKeys(vItem);
                    });
                }
                if (vData !== null && typeof vData === "object") {
                    return Object.keys(vData).reduce(function (oAcc, sKey) {
                        var sCamelKey = sKey.replace(/_([a-zA-Z0-9])/g, function (sMatch, sChar) {
                            return sChar.toUpperCase();
                        });
                        oAcc[sCamelKey] = oThat.snakeToCamelKeys(vData[sKey]);
                        return oAcc;
                    }, {});
                }
                return vData;
            },


            // ─── Upload events ───────────────────────────────────────────────

            // Legacy UploadSet events (hidden control) – kept for backward compatibility
            onUploadBefore: function () { },
            onUploadAfter: function () { },
            onBeforeUploadStarts: function () { },
            onUploadCompleted: function () { },

            /**
             * Fired by el FileUploader de la pestaña "Adjuntos" (id="taskFileUploader").
             * Nunca marca el flag "_RL": esa pestaña es genérica, cualquier
             * usuario/tarea puede subir ahí sin distinción.
             */
            onTaskFileSelected: function (oEvent) {
                this._onTaskFileSelected(oEvent, false);
            },

            /**
             * Fired by el FileUploader de la pestaña "Doc. Legales" (id="taskFileUploader_RL").
             * El botón ya está oculto (visible="{ConsultaModel>/docLegales}") fuera
             * de la tarea TS90500027 -- acá solo hay una verificación extra por si
             * ese estado quedó desfasado. El flag "_RL" en sí depende de la PESTAÑA
             * usada para subir, no del usuario (ver _uploadAttachmentToTask).
             */
            onTaskFileSelectedRL: function (oEvent) {
                if (!this._canEditDocLegales()) {
                    oEvent.getSource().clear();
                    this._showError(this._i18n("errorNoPermissionDocLegales"));
                    return;
                }
                this._onTaskFileSelected(oEvent, true);
            },

            /**
             * Reads the native File object and uploads it via XHR to TASKPROCESSING.
             * @param {sap.ui.base.Event} oEvent - evento "change" del FileUploader
             * @param {boolean} bIsRL - true si se subió desde la pestaña "Doc. Legales"
             */
            _onTaskFileSelected: function (oEvent, bIsRL) {
                var oFileUploader = oEvent.getSource();
                var oFileList = oEvent.getParameter("files");
                /** @type {File} */
                var oFile = oFileList && oFileList[0];
                if (!oFile) { return; }
                oFileUploader.clear();

                if (!this._sTaskInstanceID) {
                    this._addPendingAttachment(oFile, bIsRL);
                    return;
                }
                this._uploadAttachmentToTask(oFile, bIsRL);
            },

            /**
             * Todavía no existe sInstanceID (el registro de workflow no se creó aún),
             * así que no hay dónde grabar en TASKPROCESSING. Guardamos el adjunto en
             * el modelo "documents" (misma forma de objeto que arma _loadTaskAttachments,
             * ver más abajo) para que se vea ya en la tabla, quedándonos además con el
             * File nativo en "_file" para poder subirlo de verdad en cuanto se obtenga
             * el sInstanceID.
             * @param {File} oFile - native browser File object
             * @param {boolean} bIsRL - true si se subió desde la pestaña "Doc. Legales"
             */
            _addPendingAttachment: function (oFile, bIsRL) {
                var oOwner = this.getOwnerComponent();
                var oDocModel = oOwner.getModel("documents");
                var aFiles = (oDocModel.getProperty("/Files") || []).slice();

                aFiles.push({
                    fileName: oFile.name,
                    mediaType: oFile.type || "application/octet-stream",
                    documentType: oFile.type || "",
                    url: "",
                    uploadState: "Ready",
                    status: this._i18n("statusPendingAttachment"),
                    lastModifiedBy: "",
                    lastmodified: "",
                    fileSize: oFile.size || 0,
                    _sapOrigin: this._sTaskSapOrigin,
                    _instanceID: null,
                    _id: null,
                    _isRL: !!bIsRL,
                    _file: oFile
                });

                oDocModel.setProperty("/Files", aFiles);
                oOwner.getModel("AuxModel").setProperty("/adjuntosLength", aFiles.length);

                MessageToast.show(this._i18n("msgAttachmentQueued", [oFile.name]));
            },

            /**
             * POSTs a binary file to TASKPROCESSING Attachments using XHR.
             * Fetches the CSRF token from the shared ODataModel before sending.
             * @param {File} oFile - native browser File object
             * @param {boolean} [bIsRL] - true si se subió desde la pestaña "Doc. Legales"
             */
            _uploadAttachmentToTask: function (oFile, bIsRL) {
                var that = this;

                var sUrl = "/sap/opu/odata/IWPGW/TASKPROCESSING;mo;v=2"
                    + "/TaskCollection(SAP__Origin='" + this._sTaskSapOrigin
                    + "',InstanceID='" + this._sTaskInstanceID + "')/Attachments";

                // El backend (clase GOS/HDM detrás de TASKPROCESSING) deriva la
                // extensión a partir del Content-Type y la concatena al nombre que
                // viene en el slug. Si el slug ya trae la extensión, queda duplicada
                // (ej. "reporte.xlsx.xlsx"). Por eso mandamos solo el nombre base.
                var iDot = oFile.name.lastIndexOf(".");
                var sSlugName = iDot > 0 ? oFile.name.substring(0, iDot) : oFile.name;

                // AttachmentCollection es sap:addressable="false" (ver metadata):
                // no se puede direccionar una entidad individual por key, por lo
                // que no existe un UPDATE/MERGE posible después de crear el
                // adjunto (devuelve 501). El único dato que el backend acepta al
                // crear es el slug (nombre de archivo), así que el flag "_RL"
                // (Responsable Legal) se mete ahí. bIsRL lo decide quien llama
                // según la PESTAÑA usada para subir (ver _onTaskFileSelected /
                // onTaskFileSelectedRL), no el usuario ni el TaskDefinitionID.
                if (bIsRL) {
                    sSlugName += "_RL";
                }

                BusyIndicator.show(0);
                MessageToast.show(this._i18n("msgUploadStart", [oFile.name]));

                // Devuelve una Promise (que siempre resuelve, nunca rechaza: los
                // errores ya se muestran acá mismo vía _showError) para que
                // flushPendingAttachmentsAndComments pueda subir varios adjuntos
                // en secuencia sin pisarse con el reload de _loadTaskAttachments.
                return this._getTaskProcModel().securityTokenAvailable()
                    .then(function (sToken) {
                        return new Promise(function (resolve) {
                            var oXhr = new XMLHttpRequest();
                            oXhr.open("POST", sUrl, true);
                            oXhr.setRequestHeader("Content-Type", oFile.type || "application/octet-stream");
                            oXhr.setRequestHeader("slug", encodeURIComponent(sSlugName));
                            oXhr.setRequestHeader("X-CSRF-Token", sToken);

                            oXhr.onload = function () {
                                BusyIndicator.hide();
                                if (oXhr.status >= 200 && oXhr.status < 300) {
                                    MessageToast.show(that._i18n("msgUploadComplete", [oFile.name]));
                                    that._loadTaskAttachments(that._sTaskInstanceID, that._sTaskSapOrigin);
                                } else {
                                    var sErrMsg = "";
                                    try { sErrMsg = JSON.parse(oXhr.responseText).error.message.value; } catch (e) { /**/ }
                                    that._showError(that._i18n("errorUploadFile", [sErrMsg || oXhr.statusText]));
                                }
                                resolve();
                            };
                            oXhr.onerror = function () {
                                BusyIndicator.hide();
                                that._showError(that._i18n("errorUploadFile", ["Network error"]));
                                resolve();
                            };
                            oXhr.send(oFile);
                        });
                    })
                    .catch(function () {
                        BusyIndicator.hide();
                        that._showError(that._i18n("errorGenerico"));
                    });
            },

            /**
             * POSTea el binario de un adjunto a la entidad AdjuntosSet del servicio
             * custom (postService/ZGW_CONTRACT_SRV) -- mismo patrón de XHR crudo que
             * _uploadAttachmentToTask usa contra TASKPROCESSING (slug=nombre de
             * archivo, Content-Type=mime type, CSRF token), pero acá el único
             * parámetro extra que hace falta pasar es el InstanceID (Swfid que
             * devuelve el POST a /HeaderSet); el resto de los campos de la entidad
             * (ID, FileName, CreatedAt, CreatedBy, CreatedByName, mime_type,
             * FileSize, Link, LinkDisplayName, SAP__Origin) los completa el backend.
             * @param {File} oFile - native browser File object
             * @param {string} sInstanceId - InstanceID (Swfid) del HeaderSet recién creado
             * @returns {Promise} - siempre resuelve, los errores se muestran acá mismo
             */
            _uploadAttachmentToAdjuntosSet: function (oFile, sInstanceId) {
                var that = this;
                var oModel = this.getOwnerComponent().getModel("postService");

                var sUrl = "/sap/opu/odata/sap/ZGW_CONTRACT_SRV/AdjuntosSet?InstanceID='" + sInstanceId + "'";

                var iDot = oFile.name.lastIndexOf(".");
                var sSlugName = iDot > 0 ? oFile.name.substring(0, iDot) : oFile.name;

                BusyIndicator.show(0);
                MessageToast.show(this._i18n("msgUploadStart", [oFile.name]));

                return oModel.securityTokenAvailable()
                    .then(function (sToken) {
                        return new Promise(function (resolve) {
                            var oXhr = new XMLHttpRequest();
                            oXhr.open("POST", sUrl, true);
                            oXhr.setRequestHeader("Content-Type", oFile.type || "application/octet-stream");
                            oXhr.setRequestHeader("slug", encodeURIComponent(sSlugName));
                            oXhr.setRequestHeader("X-CSRF-Token", sToken);

                            oXhr.onload = function () {
                                BusyIndicator.hide();
                                if (oXhr.status >= 200 && oXhr.status < 300) {
                                    MessageToast.show(that._i18n("msgUploadComplete", [oFile.name]));

                                } else {
                                    //     var sErrMsg = "";
                                    //     try { sErrMsg = JSON.parse(oXhr.responseText).error.message.value; } catch (e) { /**/ }
                                    //     that._showError(that._i18n("errorUploadFile", [sErrMsg || oXhr.statusText]));
                                }
                                that.getOwnerComponent().getModel('documents').setProperty("/Files", []);
                                that.getOwnerComponent().getModel("AuxModel").setProperty("/adjuntosLength", 0);
                                resolve();
                            };
                            oXhr.onerror = function () {
                                BusyIndicator.hide();
                                that._showError(that._i18n("errorUploadFile", ["Network error"]));
                                resolve();
                            };
                            oXhr.send(oFile);
                        });
                    })
                    .catch(function () {
                        BusyIndicator.hide();
                        that._showError(that._i18n("errorGenerico"));
                    });
            },

            /**
             * Sube a AdjuntosSet todos los adjuntos que quedaron cargados
             * localmente en el modelo "documents" (filas con _file todavía sin
             * subir, ver _addPendingAttachment) apenas se conoce el InstanceID
             * real (Swfid) del HeaderSet recién creado. Secuencial -- no en
             * paralelo -- para no generar condiciones de carrera contra el
             * backend, y devuelve una Promise para poder encadenar después el
             * guardado de los comentarios.
             * @param {string} sInstanceId - Swfid devuelto por la creación del HeaderSet
             * @returns {Promise}
             */
            saveDocumentsToAdjuntosSet: function (sInstanceId) {
                var that = this;
                var aPendingFiles = (this.getOwnerComponent().getModel("documents").getProperty("/Files") || [])
                    .filter(function (oRow) { return !!oRow._file; })
                    .map(function (oRow) { return oRow._file; });

                var fnUploadNext = function () {
                    if (aPendingFiles.length === 0) { return Promise.resolve(); }
                    return that._uploadAttachmentToAdjuntosSet(aPendingFiles.shift(), sInstanceId).then(fnUploadNext);
                };

                return fnUploadNext();
            },

            // ─── URL attachment ───────────────────────────────────────────────

            /**
             * Opens the "Add URL" dialog.
             * Initializes the urlDialog helper model (saving flag).
             */
            onAddUrlAttachment: function () {
                var oOwner = this.getOwnerComponent();
                if (!oOwner.getModel("urlDialog")) {
                    oOwner.setModel(new JSONModel({ saving: false }), "urlDialog");
                } else {
                    oOwner.getModel("urlDialog").setProperty("/saving", false);
                }
                this._openDialog("AddUrlDialog", "_oAddUrlDialog");
            },

            /**
             * Reads URL + display name from the dialog inputs and POSTs to TASKPROCESSING.
             */
            // onUrlAttachmentConfirm: function () {
            //     var sUrl = Fragment.byId(this.getView().getId(), "urlInputField").getValue().trim();
            //     var sName = Fragment.byId(this.getView().getId(), "urlDisplayNameField").getValue().trim();

            //     if (!sUrl) {
            //         MessageToast.show(this._i18n("errorUrlRequired"));
            //         return;
            //     }
            //     if (!sName) { sName = sUrl; }

            //     let fnResolve, fnReject;
            //     const oPromise = new Promise(function (resolve, reject) {
            //         fnResolve = resolve;
            //         fnReject = reject;
            //     });
            //     const oItemUrl = this._oUploadPlugin.uploadItemViaUrl(sName, sUrl, oPromise);

            //     var sNavPath = "/TaskCollection(SAP__Origin='" + this._sTaskSapOrigin
            //         + "',InstanceID='" + this._sTaskInstanceID + "')/Attachments";

            //     this.getOwnerComponent().getModel("urlDialog").setProperty("/saving", true);

            //     this._getTaskProcModel().create(sNavPath, {
            //         SAP__Origin: this._sTaskSapOrigin,
            //         InstanceID: this._sTaskInstanceID,
            //         FileName: sName,
            //         Link: sUrl,
            //         LinkDisplayName: sName
            //     }, {
            //         success: function () {
            //             this.getOwnerComponent().getModel("urlDialog").setProperty("/saving", false);
            //             this._oAddUrlDialog.close();
            //             Fragment.byId(this.getView().getId(), "urlInputField").setValue("");
            //             Fragment.byId(this.getView().getId(), "urlDisplayNameField").setValue("");
            //             this._loadTaskAttachments(this._sTaskInstanceID, this._sTaskSapOrigin);
            //         }.bind(this),
            //         error: function (oError) {
            //             this.getOwnerComponent().getModel("urlDialog").setProperty("/saving", false);
            //             var sErrMsg = "";
            //             try { sErrMsg = JSON.parse(oError.responseText).error.message.value; } catch (e) { /**/ }
            //             this._showError(sErrMsg || oError.message || this._i18n("errorGenerico"));
            //         }.bind(this)
            //     });
            // },

            onUrlAttachmentConfirm: function () {
                var sUrl = Fragment.byId(this.getView().getId(), "urlInputField").getValue().trim();
                var sName = Fragment.byId(this.getView().getId(), "urlDisplayNameField").getValue().trim();

                if (!sUrl) {
                    MessageToast.show(this._i18n("errorUrlRequired"));
                    return;
                }

                var oUrlModel = this.getOwnerComponent().getModel("urlDialog");
                oUrlModel.setProperty("/saving", true);

                this._fetchUrlAsFile(sUrl, sName)
                    .then(function (oFile) {
                        oUrlModel.setProperty("/saving", false);
                        this._oAddUrlDialog.close();
                        Fragment.byId(this.getView().getId(), "urlInputField").setValue("");
                        Fragment.byId(this.getView().getId(), "urlDisplayNameField").setValue("");
                        this._uploadAttachmentToTask(oFile);
                    }.bind(this))
                    .catch(function (oError) {
                        oUrlModel.setProperty("/saving", false);
                        this._showError(oError && oError.message
                            ? this._i18n("errorDownloadUrl", [oError.message])
                            : this._i18n("errorDownloadUrl", [""]));
                    }.bind(this));
            },

            /**
             * Downloads the binary content of a URL and wraps it in a native File
             * object so it can go through the same upload pipeline as a regular
             * file pick (_uploadAttachmentToTask). This mirrors what SAP's
             * UploadSetwithTable does internally with uploadItemViaUrl: fetch the
             * real content/MIME-type instead of registering metadata-only, which
             * is what was causing the ".BIN" fallback.
             * @param {string} sUrl
             * @param {string} [sDisplayName] - optional name typed by the user
             * @returns {Promise<File>}
             */
            _fetchUrlAsFile: function (sUrl, sDisplayName) {
                return new Promise(function (resolve, reject) {
                    var oXhr = new XMLHttpRequest();
                    oXhr.open("GET", sUrl, true);
                    oXhr.responseType = "blob";

                    oXhr.onload = function () {
                        if (oXhr.status < 200 || oXhr.status >= 300) {
                            reject(new Error("HTTP " + oXhr.status));
                            return;
                        }

                        var oBlob = oXhr.response;
                        var sMimeType = oBlob.type || "application/octet-stream";
                        var sFileName = this._buildFileNameFromUrl(sUrl, sDisplayName, sMimeType);

                        resolve(new File([oBlob], sFileName, { type: sMimeType }));
                    }.bind(this);

                    oXhr.onerror = function () {
                        // Lo más probable es CORS: el servidor de la URL no permite
                        // que este origen le haga un GET desde el browser.
                        reject(new Error("CORS / red"));
                    };

                    oXhr.send();
                }.bind(this));
            },

            /**
             * Builds a safe file name with extension for a URL-based attachment.
             * Priority: user-typed name (if it already has an extension) >
             * user-typed name + extension derived from the URL or MIME type >
             * the URL's own file name.
             * @param {string} sUrl
             * @param {string} sDisplayName
             * @param {string} sMimeType
             * @returns {string}
             */
            _buildFileNameFromUrl: function (sUrl, sDisplayName, sMimeType) {
                var mMimeToExt = {
                    "application/pdf": "pdf",
                    "image/png": "png",
                    "image/jpeg": "jpg",
                    "text/html": "html",
                    "text/plain": "txt",
                    "application/json": "json",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
                    "application/msword": "doc",
                    "application/vnd.ms-excel": "xls"
                };

                var sUrlFileName = "";
                try {
                    var sPath = new URL(sUrl).pathname;
                    sUrlFileName = sPath.substring(sPath.lastIndexOf("/") + 1);
                } catch (e) { /* URL inválida para el constructor URL(), seguimos con fallback */ }

                var sUrlExt = sUrlFileName.indexOf(".") > -1
                    ? sUrlFileName.substring(sUrlFileName.lastIndexOf(".") + 1)
                    : "";

                var sBaseName = (sDisplayName || sUrlFileName || "adjunto").trim();
                var sBaseNameExt = sBaseName.indexOf(".") > -1
                    ? sBaseName.substring(sBaseName.lastIndexOf(".") + 1).toLowerCase()
                    : "";

                // El nombre que escribió el usuario ya trae una extensión válida -> se usa tal cual
                if (sBaseNameExt && (sBaseNameExt === sUrlExt.toLowerCase() || mMimeToExt[sMimeType] === sBaseNameExt)) {
                    return sBaseName;
                }

                var sExt = sUrlExt || mMimeToExt[sMimeType] || "bin";
                return sBaseName + "." + sExt;
            },

            onUrlAttachmentCancel: function () {
                if (this._oAddUrlDialog) { this._oAddUrlDialog.close(); }
            },

            onItemRemoved: function (oEvent) {
                var oRemovedFile = oEvent.getParameter("item").getFileObject();
                var oDocModel = this.getOwnerComponent().getModel("documents");
                var aFiles = oDocModel.getProperty("/Files");
                var iIdx = aFiles.findIndex(function (o) { return o.fileName === oRemovedFile.name; });
                if (iIdx !== -1) { aFiles.splice(iIdx, 1); }
                oDocModel.setProperty("/Files", aFiles);
                oDocModel.refresh();
                this.getOwnerComponent().getModel("AuxModel").setProperty("/adjuntosLength", aFiles.length);
            },

            onDocumentRenamedSuccess: function () { },
            onPluginActivated: function (oEvent) {
                this._oUploadPlugin = oEvent.getParameter("oPlugin");
            },


            // ═════════════════════════════════════════════════════════════════
            // ATTACHMENTS – LOADING & UPLOAD
            // ═════════════════════════════════════════════════════════════════

            /**
             * Returns (and lazily creates) a shared ODataModel for the TASKPROCESSING service.
             * Re-used by attachments, comments load, and comment POST.
             * @returns {sap.ui.model.odata.v2.ODataModel}
             */
            _getTaskProcModel: function () {
                if (!this._oTaskProcModel) {
                    this._oTaskProcModel = new ODataModel({
                        serviceUrl: "/sap/opu/odata/IWPGW/TASKPROCESSING;mo;v=2",
                        useBatch: false,
                        headers: { "sap-client": "400" }
                    });
                }
                return this._oTaskProcModel;
            },

            /**
         * Some SAP TASKPROCESSING backends return FileName with the extension
         * duplicated (e.g. "report.xlsx.xlsx") because the attachment class
         * reconstructs name + extension internally when building the response.
         * The actual stored binary/Content-Disposition is unaffected — this is
         * purely a display fix.
         * @param {string} sFileName
         * @returns {string}
         */
            _normalizeFileName: function (sFileName) {
                if (!sFileName) { return sFileName; }
                var iDot = sFileName.lastIndexOf(".");
                if (iDot <= 0) { return sFileName; }

                var sExt = sFileName.substring(iDot);       // ej: ".xlsx"
                var sBase = sFileName.substring(0, iDot);    // ej: "reporte.xlsx"

                if (sBase.toLowerCase().endsWith(sExt.toLowerCase())) {
                    return sBase; // ya tenía la extensión, sacamos la duplicada
                }
                return sFileName;
            },

            /**
             * Detecta y saca el flag "_RL" (Responsable Legal) que
             * _uploadAttachmentToTask sufija al nombre base del archivo antes de
             * subirlo (único dato que el backend acepta al crear el adjunto, ver
             * comentario ahí). Devuelve el nombre limpio para mostrar + el flag.
             * @param {string} sFileName
             * @returns {{fileName: string, isRL: boolean}}
             */
            _extractRLFlag: function (sFileName) {
                if (!sFileName) { return { fileName: sFileName, isRL: false }; }
                var iDot = sFileName.lastIndexOf(".");
                var sBase = iDot > 0 ? sFileName.substring(0, iDot) : sFileName;
                var sExt = iDot > 0 ? sFileName.substring(iDot) : "";

                if (/_RL$/.test(sBase)) {
                    return { fileName: sBase.slice(0, -3) + sExt, isRL: true };
                }
                return { fileName: sFileName, isRL: false };
            },

            getAdjuntos: function (sSapOrigin, sInstanceID) {
                // ECM/CMIS no disponible en S/4HANA on-premise — adjuntos deshabilitados
                oThat.getOwnerComponent().getModel("AuxModel").setProperty("/adjuntosLength", 0);
                if (oThat.getOwnerComponent().getModel("ConsultaModel")) {
                    oThat.getOwnerComponent().getModel("ConsultaModel").setProperty("/docLegalesLength", 0);
                }
                $.Component.setModel(new JSONModel([]), "documents");
                this._loadTaskAttachments(sInstanceID, sSapOrigin);

            },

            /**
                     * Reads attachments from the TASKPROCESSING OData service (My Inbox).
                     * URL pattern: TaskCollection(SAP__Origin='X',InstanceID='Y')/Attachments
                     * @param {string} sInstanceID - workflow task instance ID
                     * @param {string} sSapOrigin  - SAP origin system (e.g. "LOCAL_TGW")
                     */
            _loadTaskAttachments: function (sInstanceID, sSapOrigin) {
                var sServiceUrl = "/sap/opu/odata/IWPGW/TASKPROCESSING;mo;v=2";
                var sNavPath = "/TaskCollection(SAP__Origin='" + sSapOrigin
                    + "',InstanceID='" + sInstanceID + "')/Attachments";
                var oModel = this._getTaskProcModel();

                oModel.read(sNavPath, {
                    success: function (oData) {
                        var that = this;
                        var aFiles = (oData.results || []).map(function (oAtt) {
                            // createKey() codifica correctamente cualquier caracter
                            // especial en SAP__Origin/InstanceID/ID (slashes, espacios,
                            // etc.), evitando URLs rotas que el navegador no puede resolver.
                            var sAttachmentKey = oModel.createKey("AttachmentCollection", {
                                SAP__Origin: oAtt.SAP__Origin || sSapOrigin,
                                InstanceID: oAtt.InstanceID || sInstanceID,
                                ID: oAtt.ID
                            });
                            var sDownloadUrl = oAtt.Link || (sServiceUrl + "/" + sAttachmentKey + "/$value");

                            var sRawFileName = that._normalizeFileName(
                                oAtt.FileName || oAtt.FileDisplayName || oAtt.ID
                            );
                            var oRLInfo = that._extractRLFlag(sRawFileName);

                            return {
                                fileName: oRLInfo.fileName,
                                mediaType: oAtt.mime_type || "application/octet-stream",
                                documentType: oAtt.mime_type || "",
                                url: sDownloadUrl,
                                uploadState: "Complete",
                                status: "Ok",
                                lastModifiedBy: oAtt.CreatedByName || oAtt.CreatedBy || "",
                                lastmodified: oAtt.CreatedAt
                                    ? new Date(oAtt.CreatedAt).toLocaleDateString()
                                    : "",
                                fileSize: oAtt.FileSize || 0,
                                // keep original for potential detail dialogs
                                _sapOrigin: oAtt.SAP__Origin,
                                _instanceID: oAtt.InstanceID,
                                _id: oAtt.ID,
                                // flag "RL" (Responsable Legal): ver _uploadAttachmentToTask
                                _isRL: oRLInfo.isRL
                            };
                        });

                        var oOwner = this.getOwnerComponent();
                        //oOwner.setModel(new JSONModel({ Files: aFiles }), "documents");
                        if (aFiles.length > 0) {
                            oOwner.getModel("documents").setData({ Files: aFiles });
                        }
                        // La tabla de "Doc. Legales" filtra _isRL === true y la de
                        // "Adjuntos" filtra _isRL === false (mismo array, dos
                        // bindings distintos, ver App.view.xml); los counters de
                        // cada IconTabFilter reflejan esa misma partición.
                        var iRLCount = aFiles.filter(function (oFile) { return oFile._isRL; }).length;
                        oOwner.getModel("AuxModel").setProperty("/adjuntosLength", aFiles.length - iRLCount);
                        if (oOwner.getModel("ConsultaModel")) {
                            oOwner.getModel("ConsultaModel").setProperty("/docLegalesLength", iRLCount);
                        }
                    }.bind(this),
                    error: function (oError) {
                        var sMsg = "";
                        try { sMsg = JSON.parse(oError.responseText).error.message.value; } catch (e) { /**/ }
                        this._showToast(sMsg || oError.message || this._i18n("errorGenerico"));
                    }.bind(this)
                });
            },


            onUploadAfter: function (oEvent) {
                sap.ui.core.BusyIndicator.hide();
                this.UploadSet = oEvent.getSource();
                var oModelDocumento = this.getView().getModel("document"),
                    oItem = oEvent.getParameter("item");
                var jsondataAdjunto = {
                    "mediaType": oItem.getFileObject().type,
                    "fileName": oItem.getFileName(),
                    "Data": oItem.getFileObject(),
                    "uploadState": "Complete"
                };
                oModelDocumento.getData().push(jsondataAdjunto);
                oModelDocumento.refresh();
                // oModelDocumento.updateBindings(true);

                var oList = this.byId("progressList"),
                    oItem = oEvent.getParameter("item");
                this.getOwnerComponent().getModel("AuxModel").setProperty("/adjuntosLength", oModelDocumento.getData().length)

                sap.m.MessageToast.show("Carga Completa: " + oItem.getFileName());
            },

            onUploadBefore: function (oEvent) {
                sap.ui.core.BusyIndicator.show();
                var oList = this.byId("progressList"),
                    oItem = oEvent.getParameter("item");

                var oModelDocumento = this.getView().getModel("document");
                let dataDocumentos = oModelDocumento.getData();
                let fileDuplicados = dataDocumentos.filter(function (file) {
                    return file.fileName === oItem.getFileName() && file.mediaType === oItem.getMediaType();
                })
                if (fileDuplicados.length > 0) {
                    sap.m.MessageBox.warning("El archivo ya se subio anteriormente!");
                    oEvent = '';
                    return false;
                }
                sap.m.MessageToast.show("Carga Iniciada: " + oItem.getFileName());
            },
            onItemRemoved: function (oEvent) {
                var itemToRemove = oEvent.getParameter("item").getFileObject();
                var attachmentList = this.getView().getModel("document").getData();
                attachmentList.forEach(function (obj, index) {
                    if (obj.fileName === itemToRemove.name) {
                        attachmentList.splice(index, 1);
                        return;
                    }
                })
                this.getView().getModel("document").setData(attachmentList);
                this.getView().getModel("document").refresh();
            },

            sendFiles: function (nameFolder, adjuntosList) {
                // ECM no disponible en S/4HANA on-premise
                return Promise.resolve();
            },
            // ─── Table toolbar ───────────────────────────────────────────────

            /**
             * La pestaña "Doc. Legales" (tabla/botones con id sufijado "_RL")
             * comparte los mismos handlers que la pestaña "Adjuntos" genérica.
             * Este helper detecta, a partir del control que disparó el evento
             * (tabla o botón), si corresponde operar sobre la tabla "_RL" o la
             * genérica.
             * @param {sap.ui.base.Event} oEvent
             * @returns {string} "_RL" o ""
             */
            _getAttachmentsTableSuffix: function (oEvent) {
                return oEvent.getSource().getId().slice(-3) === "_RL" ? "_RL" : "";
            },

            /**
             * Borrar/subir en "Doc. Legales" solo está permitido cuando la tarea
             * actual es TS90500027 (ConsultaModel>/docLegales, ver _getDocLegales);
             * fuera de esa instancia la pestaña queda visible (para poder ver y
             * descargar) pero de solo lectura.
             * @returns {boolean}
             */
            _canEditDocLegales: function () {
                var oModel = this.getOwnerComponent().getModel("ConsultaModel");
                return !!(oModel && oModel.getProperty("/docLegales"));
            },

            onSelectionChange: function (oEvent) {
                var sSuffix = this._getAttachmentsTableSuffix(oEvent);
                var bIsRLTable = sSuffix === "_RL";
                var aSelected = oEvent.getSource().getSelectedContexts();
                var bAny = aSelected.length > 0;
                var bSingle = aSelected.length === 1;
                var bCanEdit = !bIsRLTable || this._canEditDocLegales();

                // Descargar siempre está permitido (no hace falta ser la tarea RL);
                // eliminar y renombrar sí dependen del permiso de "Doc. Legales".
                this.byId("downloadSelectedButton" + sSuffix).setEnabled(bAny);
                this.byId("removeDocumentButton" + sSuffix).setEnabled(bSingle && bCanEdit);
                // El renombrado en "Doc. Legales" queda siempre deshabilitado
                // (no forma parte de lo habilitado para esa pestaña); solo se
                // habilita dinámicamente en la pestaña genérica.
                if (!bIsRLTable) {
                    this.byId("renameButton").setEnabled(bSingle);
                }
            },

            onSearch: function (oEvent) {
                var sSuffix = this._getAttachmentsTableSuffix(oEvent);
                var sQuery = oEvent.getSource().getValue();

                // Se reconstruye el filtro completo (partición _isRL + búsqueda)
                // en cada cambio para no perder la separación entre "Adjuntos" y
                // "Doc. Legales" (ambas tablas leen el mismo documents>/Files).
                var aFilters = [new Filter("_isRL", FilterOperator.EQ, sSuffix === "_RL")];
                if (sQuery) {
                    aFilters.push(new Filter("fileName", FilterOperator.Contains, sQuery));
                }
                this.byId("table-uploadSet" + sSuffix).getBinding("items").filter(aFilters, "Application");
            },

            onDownloadFiles: function (oEvent) {
                var sSuffix = this._getAttachmentsTableSuffix(oEvent);
                var oTable = this.byId("table-uploadSet" + sSuffix);
                oTable.getSelectedContexts().forEach(function (oCtx) {
                    this._triggerDownload(oCtx);
                }.bind(this));
            },

            /**
             * Triggers the actual file download using the "url" we built ourselves
             * in _loadTaskAttachments, instead of relying on the plugin's own
             * .download() — que internamente reconstruye el path y termina pegándole
             * a un segmento "Attachment" (singular) que no existe en este servicio
             * V2, en vez del "Attachments" (plural) real.
             * @param {sap.ui.model.Context} oCtx - contexto del modelo "documents"
             */
            _triggerDownload: function (oCtx) {
                var sUrl = oCtx.getProperty("url");
                var sFileName = oCtx.getProperty("fileName");

                if (!sUrl) {
                    this._showError(this._i18n("errorGenerico"));
                    return;
                }

                var oLink = document.createElement("a");
                oLink.href = sUrl;
                oLink.download = sFileName || "";
                oLink.style.display = "none";
                document.body.appendChild(oLink);
                oLink.click();
                document.body.removeChild(oLink);
            },

            onRenameDocument: function (oEvent) {
                var sSuffix = this._getAttachmentsTableSuffix(oEvent);
                var aCtx = this.byId("table-uploadSet" + sSuffix).getSelectedContexts();
                if (aCtx.length === 1) { this._oUploadPlugin.renameItem(aCtx[0]); }
            },

            openPreview: function (oEvent) {
                var oCtx = oEvent.getSource().getBindingContext("documents");
                if (oCtx) {
                    this._triggerDownload(oCtx);
                }
            },

            onRemoveHandler: function (oEvent) {
                this._confirmRemove(oEvent.getSource().getBindingContext("documents"), "");
            },

            onRemoveButtonPress: function (oEvent) {
                var sSuffix = this._getAttachmentsTableSuffix(oEvent);
                if (sSuffix === "_RL" && !this._canEditDocLegales()) {
                    // Defensa extra: el botón ya queda deshabilitado fuera de la
                    // tarea TS90500027, esto cubre un eventual desfasaje de estado.
                    this._showError(this._i18n("errorNoPermissionDocLegales"));
                    return;
                }
                var aCtx = this.byId("table-uploadSet" + sSuffix).getSelectedContexts();
                if (aCtx.length === 1) { this._confirmRemove(aCtx[0], sSuffix); }
            },

            _confirmRemove: function (oContext, sSuffix) {
                var sFileName = oContext.getProperty("fileName");
                var oFileData = oContext.getObject();

                MessageBox.warning(
                    this._i18n("removeAttachmentMsg", [sFileName]),
                    {
                        title: this._i18n("removeAttachmentTitle"),
                        icon: MessageBox.Icon.WARNING,
                        actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
                        emphasizedAction: MessageBox.Action.YES,
                        initialFocus: MessageBox.Action.CANCEL,
                        onClose: function (sAction) {
                            if (sAction !== MessageBox.Action.YES) { return; }
                            this._deleteTaskAttachment(oFileData, sSuffix);
                        }.bind(this)
                    }
                );
            },

            /**
             * DELETEs an attachment from TASKPROCESSING and reloads the table from
             * the server, so the documents model never gets out of sync with the
             * backend (unlike the old local-only splice).
             * @param {object} oFileData - row object from the "documents" model,
             *                             must contain _sapOrigin / _instanceID / _id
             *                             (set by _loadTaskAttachments).
             * @param {string} [sSuffix] - "_RL" si la tabla es la de "Doc. Legales"
             */
            _deleteTaskAttachment: function (oFileData, sSuffix) {
                var oTable = this.byId("table-uploadSet" + (sSuffix || ""));

                if (!oFileData || !oFileData._id) {
                    // Adjunto sin metadata de servidor (no debería pasar en este flujo) –
                    // no hay nada que borrar en el backend.
                    this._showError(this._i18n("errorGenerico"));
                    return;
                }

                var oModel = this._getTaskProcModel();
                var sAttachmentKey = oModel.createKey("AttachmentCollection", {
                    SAP__Origin: oFileData._sapOrigin,
                    InstanceID: oFileData._instanceID,
                    ID: oFileData._id
                });
                var sPath = "/" + sAttachmentKey;

                BusyIndicator.show(0);

                oModel.remove(sPath, {
                    success: function () {
                        BusyIndicator.hide();
                        if (oTable && oTable.removeSelections) { oTable.removeSelections(); }
                        this._loadTaskAttachments(this._sTaskInstanceID, this._sTaskSapOrigin);
                    }.bind(this),
                    error: function (oError) {
                        BusyIndicator.hide();
                        var sMsg = "";
                        try { sMsg = JSON.parse(oError.responseText).error.message.value; } catch (e) { /**/ }
                        this._showError(sMsg || oError.message || this._i18n("errorGenerico"));
                    }.bind(this)
                });
            },

            // ─── Formatters used in view ─────────────────────────────────────

            getIconSrc: function (sMediaType, sThumbnailUrl) {
                return UploadSetwithTable.getIconForFileType(sMediaType, sThumbnailUrl);
            },

            /**
             * Used by the documents table title binding to inject the file count.
             * @param {number} iCount
             * @returns {string} e.g. "Documentos (3)"
             */
            formatDocTitle: function (iCount) {
                return this._i18n("docTitle", [iCount || 0]);
            },

            getFileSizeWithUnits: function (iSize) {
                if (!iSize) { return ""; }
                if (iSize < 1024) { return iSize + " B"; }
                if (iSize < 1048576) { return (iSize / 1024).toFixed(1) + " KB"; }
                return (iSize / 1048576).toFixed(1) + " MB";
            },

            //-------------FIN ADJUNTOS

            // ═════════════════════════════════════════════════════════════════
            // COMMENTS
            // ═════════════════════════════════════════════════════════════════


            getComentarios: function (sTaskSapOrigin, sTaskInstanceID) {
                this._loadTaskComments(sTaskInstanceID, sTaskSapOrigin);
            },
            onSendComment: function (oEvent) {
                var oTextArea = this.byId("txtComentario");
                var sComentario = oTextArea.getValue().trim() ? oTextArea.getValue().trim() : oEvent.getParameter("value");

                if (!sComentario) {
                    MessageBox.error(this._i18n("errorComentario"));
                    return;
                }

                // MyInbox mode: persist via TASKPROCESSING OData
                if (this._sTaskInstanceID) {
                    oTextArea.setValue("");
                    this._saveTaskComment(sComentario);
                    return;
                }

                // Dashboard / local mode: todavía no hay sInstanceID, así que no
                // hay dónde grabar en TASKPROCESSING. Guardamos el comentario en
                // el modelo "CommentsModel" con la misma forma que arma
                // _loadTaskComments (CreatedByName/Text/CreatedAtFormatted), que es
                // lo que consume el FeedListItem de la vista.
                var oCtxModel = this.getOwnerComponent().getModel("CommentsModel");
                // Copia nueva del array: si mutamos el mismo array que ya está en
                // el modelo (in-place) y lo volvemos a pasar a setProperty, el
                // property binding lo ve como "misma referencia" y no dispara
                // change -> el count del IconTabFilter (expression binding sobre
                // .length) queda desactualizado, aunque la List sí se refresque.
                var aComments = (oCtxModel.getProperty("/comentarios") || []).slice();
                var oNow = new Date();
                //var oTime = new 
                aComments.unshift({
                    CreatedByName: this._loggedUser || "",
                    Text: sComentario,
                    CreatedAt: oNow
                    //     ernam: this._loggedUser || "",
                    //    comments : sComentario,
                    //     erdat: oNow
                });
                oCtxModel.setProperty("/comentarios", aComments);
                oTextArea.setValue("");
            },

            onDeleteCommentLine: function (oEvent) {
                var oCtxModel = this.getOwnerComponent().getModel("context");
                var sPath = oEvent.getSource().getBindingContext("context").getPath();
                var iIdx = parseInt(/(\d+)$/.exec(sPath)[1], 10);
                var aComments = oCtxModel.getProperty("/commtextgral");
                aComments.splice(iIdx, 1);
                oCtxModel.setProperty("/commtextgral", aComments);
                oCtxModel.refresh();
            },

            /**
             * Reads comments from the TASKPROCESSING OData service (My Inbox).
             * URL pattern: TaskCollection(SAP__Origin='X',InstanceID='Y')/Comments
             * Populates the "comments" component model: { count, sending, Items[] }
             * @param {string} sInstanceID
             * @param {string} sSapOrigin
             */
            _loadTaskComments: function (sInstanceID, sSapOrigin) {
                var sNavPath = "/TaskCollection(SAP__Origin='" + sSapOrigin
                    + "',InstanceID='" + sInstanceID + "')/Comments";

                this._getTaskProcModel().read(sNavPath, {
                    urlParameters: { "$orderby": "CreatedAt desc" },
                    success: function (oData) {
                        var aItems = (oData.results || []).map(function (oCmt) {
                            return {
                                CreatedBy: oCmt.CreatedBy || "",
                                CreatedByName: oCmt.CreatedByName || oCmt.CreatedBy || "",
                                Text: oCmt.Text || "",
                                CreatedAt: oCmt.CreatedAt,
                                CreatedAtFormatted: oCmt.CreatedAt
                                    ? new Date(oCmt.CreatedAt).toLocaleString()
                                    : ""
                            };
                        });


                        let firstComments = this.getOwnerComponent().getModel("context").getProperty("/commtextgral");
                        for (let textComment of firstComments) {
                            textComment.CreatedBy = textComment.ernam || "";
                            textComment.CreatedByName = textComment.ernam || textComment.CreatedBy || "";
                            textComment.Text = textComment.comments || "";
                            textComment.CreatedAt = textComment.erdat;
                        }

                        if (aItems.length > 0) {
                            firstComments = firstComments.concat(aItems);
                        }

                        this.getOwnerComponent().setModel(
                            new JSONModel({ count: firstComments.length, sending: false, comentarios: firstComments }),
                            "CommentsModel"
                        );

                    }.bind(this),
                    error: function (oError) {
                        var sMsg = "";
                        try { sMsg = JSON.parse(oError.responseText).error.message.value; } catch (e) { /**/ }
                        this._showToast(sMsg || oError.message || this._i18n("errorGenerico"));
                    }.bind(this)
                });
            },

            /**
             * POSTs a new comment to TASKPROCESSING Comments navigation set.
             * On success, re-loads the comments list to reflect server-side changes.
             * @param {string} sText - comment body
             */
            _saveTaskComment: function (sText) {
                var sInstanceID = this._sTaskInstanceID;
                var sSapOrigin = this._sTaskSapOrigin;
                var sNavPath = "/TaskCollection(SAP__Origin='" + sSapOrigin
                    + "',InstanceID='" + sInstanceID + "')/Comments";

                var oCommentsModel = this.getOwnerComponent().getModel("CommentsModel");
                oCommentsModel.setProperty("/sending", true);

                // Devuelve una Promise (siempre resuelve) para poder encadenar varios
                // comentarios en secuencia desde flushPendingAttachmentsAndComments.
                return new Promise(function (resolve) {
                    this._getTaskProcModel().create(sNavPath, {
                        SAP__Origin: sSapOrigin,
                        InstanceID: sInstanceID,
                        Text: sText
                    }, {
                        success: function () {
                            oCommentsModel.setProperty("/sending", false);
                            this._loadTaskComments(sInstanceID, sSapOrigin);
                            resolve();
                        }.bind(this),
                        error: function (oError) {
                            oCommentsModel.setProperty("/sending", false);
                            var sMsg = "";
                            try { sMsg = JSON.parse(oError.responseText).error.message.value; } catch (e) { /**/ }
                            this._showToast(sMsg || oError.message || this._i18n("errorGenerico"));
                            resolve();
                        }.bind(this)
                    });
                }.bind(this));
            },

            /**
             * Sube a TASKPROCESSING los adjuntos y comentarios cargados en modo
             * creación (cuando todavía no existía sInstanceID y quedaron guardados
             * localmente: adjuntos en "documents"/Files con _file, ver
             * _addPendingAttachment; comentarios en "CommentsModel"/comentarios,
             * ver el fallback de onSendComment). Se llama apenas se conoce el
             * InstanceID real del workflow recién arrancado (Swfid que devuelve el
             * POST a /HeaderSet).
             * @param {string} sInstanceId - Swfid devuelto por la creación del HeaderSet
             * @returns {Promise}
             */
            flushPendingAttachmentsAndComments: function (sInstanceId) {
                this._sTaskInstanceID = sInstanceId;
                this._sTaskSapOrigin = this._sTaskSapOrigin || "LOCAL_TGW";

                var that = this;
                var oOwner = this.getOwnerComponent();

                var aPendingFiles = (oOwner.getModel("documents").getProperty("/Files") || [])
                    .filter(function (oRow) { return !!oRow._file; })
                    .map(function (oRow) { return { file: oRow._file, isRL: !!oRow._isRL }; });

                var aPendingComments = (oOwner.getModel("CommentsModel").getProperty("/comentarios") || [])
                    .map(function (oCmt) { return oCmt.comments; })
                    .filter(function (sText) { return !!sText; });

                // Secuencial y no en paralelo: cada upload/comment exitoso dispara un
                // reload del modelo respectivo (_loadTaskAttachments/_loadTaskComments)
                // que pisa la lista completa; en paralelo se perderían adjuntos/
                // comentarios todavía no subidos.
                var fnUploadNext = function () {
                    if (aPendingFiles.length === 0) { return Promise.resolve(); }
                    var oNext = aPendingFiles.shift();
                    return that._uploadAttachmentToTask(oNext.file, oNext.isRL).then(fnUploadNext);
                };
                var fnCommentNext = function () {
                    if (aPendingComments.length === 0) { return Promise.resolve(); }
                    return that._saveTaskComment(aPendingComments.shift()).then(fnCommentNext);
                };

                return fnUploadNext().then(fnCommentNext);
            },

            //---------FIN Comments

            setEnableds: function () {
                this.getOwnerComponent().getModel("EnabledModel").setData({
                    tabla: false,
                    tablaModif: false,
                    enabled: false,
                    clienteCab: false,
                    headerCoberturas: false,
                    wfanteriores: false,
                    tipoContrato: false,
                    tipos: false,
                    nroSolped: false,
                    btnCobertura: true,
                    nroPedido: false,
                    sociedad: false,
                    tipoActualizacion: false,
                    rol: false,
                    areaResp: false,
                    objeto: false,
                    duracion: false,
                    periodoAjuste: false,
                    fechaFirma: false,
                    PrimeraFecha: false,
                    poseeClausula: false,
                    clausulaPactada: false,
                    montoTotal: false,
                    montoInicial: false,
                    resumenContrato: false,
                    cliente: false,
                    Vigencia: false,
                    VigenciaHasta: false,
                    proveedor: false,
                    fechaDesdeDialog: false,
                    ButtonNotion: false,
                    propiedad: false,
                    monedaInicial: false,
                    deposito: false,
                    monedaDeposito: false,
                    motivoModificacion: false
                });
            },

            setFieldsFromTipo: function (operacion) {
                var selected = operacion.toString();
                var selectedTipoModif = this.getOwnerComponent().getModel("AuxModel").getProperty("/modificacion");
                var selectedTipoRenov = this.getOwnerComponent().getModel("AuxModel").getProperty("/renovacion");
                var selectedTipoCreation = this.getOwnerComponent().getModel("AuxModel").getProperty("/creacion");
                switch (selected) {
                    case "1":
                        if (selectedTipoModif || selectedTipoRenov) {
                            this.getOwnerComponent().getModel("VisibleModel").setData({
                                tabla: false,
                                tablaModif: true,
                                ClienteCab: true,
                                headerCoberturas: true,
                                wfanteriores: false,
                                NroSolicitud: false,
                                NroPedido: false,
                                Sociedad: true,
                                TipoActualizacion: false,
                                Creacion: true,
                                Cliente: false,
                                Vigencia: false,
                                VigenciaHasta: false,
                                FechaFirma: false,
                                Rol: false,
                                Duracion: false,
                                MontoTotal: false,
                                MontoInicial: false,
                                AreaResponsable: false,
                                ClasePedido: true,
                                Cabecera: true,
                                Cobertura: true,
                                SumaAsegurada: true,
                                ClaseSolped: true,
                                PosicionesCobertura: true,
                                PoseeClausula: false,
                                PeriodoAjuste: false,
                                ClausulaPactada: false,
                                ObjetoContrato: false,
                                ResumenContrato: false,
                                MotivoContrato: false,
                                Proveedor: false,
                                ButtonNotion: true,
                                Propiedad: false,
                                MonedaInicial: false,
                                Deposito: false,
                                MonedaDeposito: false,
                                MotivoModificacion: false
                            });
                            this.getOwnerComponent().getModel("EnabledModel").setData({
                                nroSolped: false,
                                btnCobertura: false,
                                Bukrs: false,
                                Vigencia: false,
                                VigenciaHasta: false,
                                tabla: false,
                                tablaModif: false,
                                headerCoberturas: false
                            });
                        } else {
                            this.getOwnerComponent().getModel("VisibleModel").setData({
                                tabla: true,
                                tablaModif: false,
                                ClienteCab: true,
                                headerCoberturas: false,
                                wfanteriores: false,
                                NroSolicitud: false,
                                NroPedido: false,
                                Sociedad: true,
                                TipoActualizacion: true,
                                Creacion: true,
                                Cliente: false,
                                Vigencia: false,
                                VigenciaHasta: false,
                                FechaFirma: false,
                                Rol: false,
                                Duracion: false,
                                MontoTotal: false,
                                MontoInicial: false,
                                AreaResponsable: false,
                                ClasePedido: true,
                                Cabecera: true,
                                Cobertura: true,
                                SumaAsegurada: true,
                                ClaseSolped: true,
                                PosicionesCobertura: true,
                                PoseeClausula: false,
                                PeriodoAjuste: false,
                                ClausulaPactada: false,
                                ObjetoContrato: false,
                                ResumenContrato: true,
                                MotivoContrato: false,
                                Proveedor: false,
                                ButtonNotion: true,
                                Propiedad: false,
                                MonedaInicial: false,
                                Deposito: false,
                                MonedaDeposito: false,
                                MotivoModificacion: false
                            });
                            this.getOwnerComponent().getModel("EnabledModel").setData({
                                nroSolped: true,
                                btnCobertura: true,
                                Bukrs: true,
                                Vigencia: true,
                                VigenciaHasta: true,
                                tabla: true,
                                tablaModif: false,
                                headerCoberturas: false
                            });
                            if (selectedTipoCreation === false && (selectedContrato === "2" || selectedContrato === "3" || selectedContrato === "4")) {
                                this.getOwnerComponent().getModel("VisibleModel").setProperty("/wfanteriores", true);
                            } else {
                                this.getOwnerComponent().getModel("VisibleModel").setProperty("/wfanteriores", false);
                            }


                        }
                        break;
                    case "2":
                        this.getOwnerComponent().getModel("VisibleModel").setData({
                            tabla: false,
                            tablaModif: false,
                            ClienteCab: false,
                            headerCoberturas: false,
                            NroSolicitud: false,
                            NroPedido: false,
                            Sociedad: true,
                            TipoActualizacion: false,
                            Creacion: true,
                            Cliente: true,
                            Vigencia: true,
                            VigenciaHasta: true,
                            FechaFirma: true,
                            Rol: true,
                            Duracion: true,
                            MontoTotal: true,
                            MontoInicial: true,
                            AreaResponsable: false,
                            ClasePedido: false,
                            Cabecera: false,
                            Cobertura: false,
                            SumaAsegurada: false,
                            ClaseSolped: false,
                            PosicionesCobertura: false,
                            PoseeClausula: true,
                            PeriodoAjuste: true,
                            ClausulaPactada: true,
                            ObjetoContrato: false,
                            ResumenContrato: true,
                            MotivoContrato: false,
                            Proveedor: false,
                            ButtonNotion: false,
                            Propiedad: true,
                            MonedaInicial: true,
                            Deposito: true,
                            MonedaDeposito: true,
                            MotivoModificacion: false

                        });
                        if (!selectedTipoCreation) {
                            this.getOwnerComponent().getModel("VisibleModel").setProperty("/MotivoModificacion", true);
                            this.getOwnerComponent().getModel("VisibleModel").setProperty("/wfanteriores", true);
                        } else {
                            this.getOwnerComponent().getModel("VisibleModel").setProperty("/wfanteriores", false);
                        }
                        this.getOwnerComponent().getModel("EnabledModel").setData({
                            nroSolped: true,
                            btnCobertura: true,
                            Bukrs: true,
                            Vigencia: true,
                            VigenciaHasta: true,
                            tabla: true,
                            tablaModif: false,
                            headerCoberturas: false
                        });
                        break;
                    case "3":
                        this.getOwnerComponent().getModel("VisibleModel").setData({
                            tabla: false,
                            tablaModif: false,
                            ClienteCab: false,
                            headerCoberturas: false,
                            wfanteriores: true,
                            NroSolicitud: false,
                            NroPedido: false,
                            Sociedad: true,
                            TipoActualizacion: false,
                            Creacion: true,
                            Cliente: false,
                            Vigencia: true,
                            VigenciaHasta: true,
                            FechaFirma: true,
                            Rol: false,
                            Duracion: true,
                            MontoTotal: true,
                            MontoInicial: true,
                            AreaResponsable: true,
                            ClasePedido: false,
                            Cabecera: false,
                            Cobertura: false,
                            SumaAsegurada: false,
                            ClaseSolped: false,
                            PosicionesCobertura: false,
                            PoseeClausula: true,
                            PeriodoAjuste: true,
                            ClausulaPactada: true,
                            ObjetoContrato: true,
                            ResumenContrato: false,
                            MotivoContrato: true,
                            Proveedor: true,
                            ButtonNotion: false,
                            Propiedad: false,
                            MonedaInicial: false,
                            Deposito: false,
                            MonedaDeposito: false,
                            MotivoModificacion: false
                        });
                        if (!selectedTipoCreation) {
                            this.getOwnerComponent().getModel("VisibleModel").setProperty("/wfanteriores", true);
                        } else {
                            this.getOwnerComponent().getModel("VisibleModel").setProperty("/wfanteriores", false);
                        }
                        this.getOwnerComponent().getModel("EnabledModel").setData({
                            nroSolped: true,
                            btnCobertura: true,
                            Bukrs: true,
                            Vigencia: true,
                            VigenciaHasta: true,
                            tabla: true,
                            tablaModif: false,
                            headerCoberturas: false
                        });
                        break;
                    case "4":
                        this.getOwnerComponent().getModel("VisibleModel").setData({
                            tabla: false,
                            tablaModif: false,
                            ClienteCab: false,
                            headerCoberturas: false,
                            wfanteriores: true,
                            NroSolicitud: false,
                            NroPedido: false,
                            Sociedad: true,
                            TipoActualizacion: false,
                            Creacion: true,
                            Cliente: false,
                            Vigencia: true,
                            VigenciaHasta: true,
                            FechaFirma: true,
                            Rol: false,
                            Duracion: true,
                            MontoTotal: true,
                            MontoInicial: true,
                            AreaResponsable: true,
                            ClasePedido: false,
                            Cabecera: false,
                            Cobertura: false,
                            SumaAsegurada: false,
                            ClaseSolped: false,
                            PosicionesCobertura: false,
                            PoseeClausula: true,
                            PeriodoAjuste: true,
                            ClausulaPactada: true,
                            ObjetoContrato: true,
                            ResumenContrato: false,
                            Proveedor: false,
                            ButtonNotion: false,
                            Propiedad: false,
                            MonedaInicial: false,
                            Deposito: false,
                            MonedaDeposito: false,
                            MotivoContrato: true,
                            MotivoModificacion: false
                        });
                        if (!selectedTipoCreation) {
                            this.getOwnerComponent().getModel("VisibleModel").setProperty("/wfanteriores", true);
                        } else {
                            this.getOwnerComponent().getModel("VisibleModel").setProperty("/wfanteriores", false);
                        }
                        this.getOwnerComponent().getModel("EnabledModel").setData({
                            nroSolped: true,
                            btnCobertura: true,
                            Bukrs: true,
                            Vigencia: true,
                            VigenciaHasta: true,
                            tabla: true,
                            tablaModif: false,
                            headerCoberturas: false
                        });
                        break;
                }

                if (selectedTipoCreation && selected === "1") {
                    this.getOwnerComponent().getModel("VisibleModel").setProperty("/SociedadModifRenov", false);
                    this.getOwnerComponent().getModel("VisibleModel").setProperty("/Sociedad", true);
                }
                if (selectedTipoRenov === true && selected === "1") {
                    if (!this.getOwnerComponent().getModel("context")) {
                        this.getOwnerComponent().getModel("VisibleModel").setProperty("/SociedadModifRenov", true);
                    } else {this.getOwnerComponent().getModel("VisibleModel").setProperty("/SociedadModifRenov", false);} 
                    this.getOwnerComponent().getModel("VisibleModel").setProperty("/Sociedad", false);
                } else {
                    this.getOwnerComponent().getModel("VisibleModel").setProperty("/SociedadModifRenov", false);
                    this.getOwnerComponent().getModel("VisibleModel").setProperty("/Sociedad", true);
                }
                this.getOwnerComponent().getModel("VisibleModel").setProperty("/headerCoberturasRenov", false);

            },

            onAddValorCapita: function () {
                var data = this.getOwnerComponent().getModel("ValorCapita").getData();
                var tableData = this.getOwnerComponent().getModel("ValorCapita").getProperty("/itemsDialog");
                var vigCapitaDesdeState = sap.ui.getCore().byId("vigCapitaDesde").getValueState();
                var vigCapitaHastaState = sap.ui.getCore().byId("vigCapitaHasta").getValueState();

                if (vigCapitaDesdeState === "Error" || vigCapitaHastaState === "Error") {
                    return;
                }
                if (data.ValorCapita !== "" && data.FechaIni !== "" && data.FechaIni !== undefined && data.FechaIni !== null
                    && data.FechaFin !== "" && data.FechaFin !== undefined && data.FechaFin !== null) {
                    tableData.push({
                        Reqno: "",
                        Item: "",
                        Subitem: "",
                        ValorCapita: data.ValorCapita,
                        FechaIni: data.FechaIni,
                        FechaFin: data.FechaFin

                    });
                    this.getOwnerComponent().getModel("ValorCapita").setProperty("/itemsDialog", tableData);

                    //Le seteamos la ultima fecha de la tabla a la fecha de los filros para no dejar huecos
                    var fechaFin = data.itemsDialog[data.itemsDialog.length - 1].FechaFin;
                    var date = this.formatDate(fechaFin, 1);
                    data.FechaIni = date;

                    //Limpiar campos
                    sap.ui.getCore().byId("input-a").setValue("");
                    //sap.ui.getCore().byId("vigCapitaDesde").setValue("");
                    sap.ui.getCore().byId("vigCapitaHasta").setValue("");

                } else {
                    sap.m.MessageBox.error("Debe completar todos los campos");
                }
            },

            onValorCapitaChange: function (oEvent) {
                var sPath = oEvent.getSource().getBindingContext("contPos").getPath();
                var price = oEvent.getSource().getBindingContext("contPos").getObject(sPath).ValorCapita;

                oEvent.getSource().getBindingContext("contPos").getObject(sPath).ValorCapita = this.formatPrice(price);

                this.getOwnerComponent().getModel("contPos").refresh(true);
            },

            onChangeValorCapPos: function (oEvent) {
                //oEvent.getSource().getBindingContext("ValorCapita").getObject().ValorCapita = formatter.formatPrice(oEvent.getSource().getBindingContext("ValorCapita").getObject().ValorCapita);
                oEvent.getSource().setValue(this.formatPrice(oEvent.getSource().getBindingContext("ValorCapita").getObject().ValorCapita));

            },
            onChangeValorCap: function (oEvent) {
                oEvent.getSource().setValue(this.formatPrice(this.formatNumberPost(oEvent.getSource().getValue())));
            },
            onDeleteValorCapita: function (oEvent) {
                var fechaIni = this.getView().getModel("header").getObject("/fechaIni");
                var posicion = this.getOwnerComponent().getModel("ValorCapita").getProperty("/posicion");
                var oValorCapitaModel = this.getOwnerComponent().getModel("ValorCapita");
                var path = oEvent.getSource().oPropagatedProperties.oBindingContexts.ValorCapita.sPath;
                var idx = /[0-9]+$/.exec(path)[0];
                var data = oValorCapitaModel.getData();
                data.itemsDialog.splice(idx, 1);
                var modificacion = this.getOwnerComponent().getModel("AuxModel").getProperty("/modificacion");
                if (modificacion) {
                    models.contPosModel().getData().posData[posicion].itemsDialog.splice(idx, 1);
                    this.getView().getModel("contPos").getData().posData[posicion].SubposOrdSet.results.splice(idx, 1);
                }

                //Si hay items en la tabla bloqueamos el ingreso de fecha de los filtros para que este se llene con la ultima fecha de la tabla
                if (data.itemsDialog.length > 0) {
                    var fechaFin = data.itemsDialog[data.itemsDialog.length - 1].FechaFin;
                    var date = this.formatDate(fechaFin, 1);

                    data.FechaIni = date;
                    this.getOwnerComponent().getModel("EnabledModel").setProperty("/fechaDesdeDialog", false);
                } else if (fechaIni !== null) {
                    data.FechaIni = this.formatDate(fechaIni, 0);
                    this.getOwnerComponent().getModel("EnabledModel").setProperty("/fechaDesdeDialog", false);
                } else {
                    this.getOwnerComponent().getModel("EnabledModel").setProperty("/fechaDesdeDialog", true);
                }

                oValorCapitaModel.setData(data);
            },

            onDeleteCobertura: function (oEvent) {
                //var posicion = this.getOwnerComponent().getModel("ValorCapita").getProperty("/posicion");
                var oCoberturasModel = this.getOwnerComponent().getModel("ValorCapita");
                var path = oEvent.getSource().oPropagatedProperties.oBindingContexts.ValorCapita.sPath;
                var idx = /[0-9]+$/.exec(path)[0];
                var data = oCoberturasModel.getData();
                data.itemMat.splice(idx, 1);
                /*var modificacion = this.getOwnerComponent().getModel("AuxModel").getProperty("/modificacion");
                if (modificacion) {
                    models.contPosModel().getData().posData[posicion].itemMat.splice(idx, 1);
                    this.getView().getModel("contPos").getData().posData[posicion].SubposCovSet.results.splice(idx, 1);
                }*/
                oCoberturasModel.setData(data);
            },

            onCreateButtonAction: function (getComponentDataMyInbox) {
                let oThat = this;
                //oThat.inboxApi = getComponentDataMyInbox.inboxAPI;
                // Sin inbox API en S/4HANA on-premise — acciones de workflow deshabilitadas
                oThat.inboxApi = undefined;
                if (oThat.inboxApi !== undefined) {
                    oThat.inboxApi.removeAction("Aprobar");
                    oThat.inboxApi.removeAction("Approve");
                    oThat.inboxApi.removeAction("Rechazar");
                    oThat.inboxApi.removeAction("Consultar");
                    oThat.inboxApi.removeAction("Observar");
                    // if (level === 1 || level === 2 || level === 4) {
                    //     oThat.inboxApi.addAction({
                    //         action: "Consultar",
                    //         label: "Consultar",
                    //         type: "emphasized" // (Optional property) Define for positive appearance
                    //     }, function () {
                    //         oThat.onCheck();
                    //     }, oThat);
                    // } else {
                    //     oThat.inboxApi.removeAction("Observar");
                    // }

                    if (oThat.level === 3) {

                        oThat.inboxApi.addAction({
                            action: "Consultar",
                            label: "ConsultasAPI",
                            type: "emphasized" // (Optional property) Define for positive appearance
                        }, function () {
                            oThat.onQuestion();
                        }, oThat);
                    }

                    oThat.inboxApi.addAction({
                        action: "Aprobar",
                        label: "AprobarAPI",
                        type: "accept" // (Optional property) Define for positive appearance
                    }, function () {
                        oThat.onApprove();
                    }, oThat);

                    if (oThat.level === 2) {
                        oThat.inboxApi.addAction({
                            action: "Rechazar",
                            label: "RechazarAPI",
                            type: "reject" // (Optional property) Define for negative appearance
                        }, function () {
                            oThat.onReject();
                        }, oThat);
                    } else {
                        oThat.inboxApi.removeAction("Rechazar");
                    }

                    // if (oThat.userTask.startsWith('Consultas')) {
                    //     oThat.inboxApi.removeAction("Consultar");
                    //     oThat.inboxApi.removeAction("Rechazar");
                    //     oThat.inboxApi.removeAction("Aprobar");
                    //     oThat.inboxApi.removeAction("Observar");
                    //     oThat.inboxApi.addAction({
                    //         action: "Responder",
                    //         label: "Responder",
                    //         type: "accept" // (Optional property) Define for positive appearance
                    //     }, function () {
                    //         oThat.onResponseQuestion();
                    //     }, oThat);
                    // }
                }

            },


            //BOTONES DE APROBAR RECHAZAR Y OBSERVAR
            //solicitamos confirmación para aprobar la solicitud
            onApprove: function () {
                this.oQuestionDialog = new sap.m.Dialog({
                    title: "Aprobar solicitud",
                    type: 'Message',
                    content: [
                        new sap.m.Label({
                            text: "¿Desea aprobar la solicitud?",
                            labelFor: 'rejectDialogTextarea'
                        })
                    ],
                    beginButton: new sap.m.Button({
                        type: sap.m.ButtonType.Emphasized,
                        text: 'Confirmar',
                        press: function () {
                            this.onApproveConfirm();
                        }.bind(this)
                    }),
                    endButton: new sap.m.Button({
                        type: sap.m.ButtonType.Reject,
                        text: 'Cancelar',
                        press: function () {
                            this.onCancelConfirm();
                        }.bind(this)
                    })
                });
                this.oQuestionDialog.open();
            },

            onApproveConfirm: function () {
                this.oQuestionDialog.close();
                var oContextData = $.Component.getModel("context").getData();
                debugger;
                var errores = "";
                if (oContextData.header.optyp !== "R") {
                    if (oContextData.level === 6) {
                        models.sendContDataLvl7(this, "A");
                    } else {
                        oThat.completeTask("A");
                        oContextData.level++;
                    }
                } else {
                    if (oContextData.level === 1) {
                        models.sendContDataLvl7(this, "A");
                    } else {
                        if (oContextData.accion !== "O") oContextData.level++;
                        oThat.completeTask("A");

                    }
                }
            },

            formatPrice: function (price) {
                var split = "";
                var oCurrency = new sap.ui.model.type.Currency({
                    showMeasure: false,
                    groupingSeparator: ".",
                    decimalSeparator: ",",
                    decimals: 2,
                    minFractionDigits: 2,
                    maxFractionDigits: 2
                });

                if (price.toString().includes("-")) {
                    split = price.split("-");
                    price = split[1];
                }
                if (price.toString().includes(".") && !price.toString().includes(",")) {
                    var split = price.toString().split(".");
                    var entero = split[0];
                    var decimals = split[1].substring(0, 2);
                    price = entero + "." + decimals;
                } else if (!price.toString().includes(".") && price.toString().includes(",")) {
                    price = price.replace(",", ".");
                } else if (price.toString().includes(".") && price.toString().includes(",")) {
                    price = price.replace(".", "");
                    price = price.replace(",", ".");
                }

                return (parseFloat(price) === 0) ? price : oCurrency.formatValue([price], "string");
            },

            onCancelConfirm: function () {
                this.oQuestionDialog.close();
            },

            onCloseDialogConsulta: function (oEvent) {
                this._dialogConsulta.close();
            },
            onCloseDialogResponse: function (oEvent) {
                this._dialogResponse.close();
            },

            //solicitamos confirmación para rechazar la solicitud
            onReject: function () {
                this.oQuestionDialog = new sap.m.Dialog({
                    title: "Rechazar solicitud",
                    type: 'Message',
                    content: [
                        new sap.m.VBox({
                            items: [
                                new sap.m.Label({
                                    text: "¿Desea rechazar la solicitud?",
                                    labelFor: 'rejectDialogTextarea'
                                }),
                                new sap.m.TextArea({
                                    placeholder: "Motivo de rechazo.."
                                })
                            ]
                        })
                    ],
                    beginButton: new sap.m.Button({
                        type: sap.m.ButtonType.Emphasized,
                        text: 'Confirmar',
                        press: function () {
                            this.onRejectConfirm();
                        }.bind(this)
                    }),
                    endButton: new sap.m.Button({
                        type: sap.m.ButtonType.Reject,
                        text: 'Cancelar',
                        press: function () {
                            this.onCancelReject();
                        }.bind(this)
                    })
                });
                this.oQuestionDialog.open();
            },

            onRejectConfirm: function () {
                var textoRechazo = this.oQuestionDialog.getContent()[0].getItems()[1].getValue();
                $.Component.getModel("context").setProperty("/motivoRechazo", textoRechazo);
                this.oQuestionDialog.close();
                var oContextData = $.Component.getModel("context").getData();

                //llamar odata pasandole "R"
                oThat.updateSolicitudStatus(oContextData.header.reqno, "R")
                    .then(function (data) {
                        //sap.m.MessageToast.show(data.ReturnSet.results[0].Message);
                        //oThat.completeTask("R");
                        if (data.ReturnSet.results.length > 0) {
                            if (data.ReturnSet.results[0].Type === "E") {
                                MessageBox.error(data.ReturnSet.results[0].Message);
                            } else {
                                sap.m.MessageToast.show(data.ReturnSet.results[0].Message);
                                oThat.completeTask("R");
                            }
                        }
                    }, () => {
                        sap.m.MessageToast.show("Error al actualizar estado de Solicitud");
                    });

            },

            onCancelReject: function () {
                this.oQuestionDialog.close();
            },

            updateSolicitudStatus(sSolNumber, sStatus) {
                oThat.getOwnerComponent().getModel("postService").setUseBatch(false);
                return new Promise((res, rej) => {
                    this.getOwnerComponent().getModel("postService").create("/HeaderSet", {
                        "Reqno": sSolNumber,
                        "Status": sStatus,
                        "PositionSet": [],
                        "ReturnSet": []
                    }, {
                        success: res,
                        error: rej
                    })
                });
            },

            formatNumberPost: function (num) {
                let oNum = num;
                /* if (oNum.includes(".")) {
                     oNum = oNum.replace(/\./g, '');
                 }*/
                let formattedNumber = oNum.replace(",", ".");
                return formattedNumber;
            },
            formatNumberPost2: function (num) {
                let oNum = num;
                if (oNum.includes(".")) {
                    oNum = oNum.replace(/\./g, '');
                }
                let formattedNumber = oNum.replace(",", ".");
                return formattedNumber;
            },

            completeTask: function (approvalStatus) {
                sap.ui.core.BusyIndicator.show();
                var oContextData = $.Component.getModel("context").getData();
                var posiciones = $.Component.getModel("context").getData().positions;

                //Completar la tarea
                $.Component.getModel("context").setProperty("/approverLast", sCreatedByUser);
                $.Component.getModel("context").setProperty("/accion", approvalStatus);

                var dataHeader = $.Component.getModel("header").getData();

                var comentarios = oThat.getOwnerComponent().getModel("CommentsModel").getData().comentarios;
                if (comentarios !== undefined) {
                    if (comentarios.length > 0) {
                        for (var i = 0; i < comentarios.length; i++) {
                            comentarios[i].erdat = oThat.setContextDate(comentarios[i].erdat);
                            comentarios[i].existe = "X"
                        }
                    }
                    $.Component.getModel("context").setProperty("/commtextgral", comentarios);
                } else {
                    $.Component.getModel("context").setProperty("/commtextgral", []);
                }

                if (posiciones !== undefined) {
                    if (posiciones.length > 0 && posiciones[0].auart !== "") {
                        posiciones.forEach(function (oPos) {
                            for (var i = 0; i < oPos.itemsDialog.length; i++) {
                                if (oPos.itemsDialog[i].ValorCapita.toString().includes(".")) {
                                    var numero = oPos.itemsDialog[i].ValorCapita.replace(/\./g, '');
                                    var formattedNum = numero.replace(",", ".");
                                    oPos.itemsDialog[i].ValorCapita = formattedNum;
                                } else {
                                    oPos.itemsDialog[i].ValorCapita = oThat.formatPrice(oPos.itemsDialog[i].ValorCapita);
                                    var numero = oPos.itemsDialog[i].ValorCapita.replace(/\./g, '');
                                    var formattedNum = numero.replace(",", ".");
                                    oPos.itemsDialog[i].ValorCapita = formattedNum;
                                }
                            }


                        });
                    }
                }



                //$.Component.getModel("header").setProperty("/fechaIni", oThat.setContextDate(dataHeader.fechaIni));
                //$.Component.getModel("header").setProperty("/fechaFin", oThat.setContextDate(dataHeader.fechaFin));



                // En S/4HANA on-premise el workflow se completa desde el backend ABAP
                this.getView().getModel("document").setData([]);
                this.getView().getModel("document").refresh();
                sap.ui.core.BusyIndicator.hide();
            },

            setContextDate: function (date) {

                var anio = date.getUTCFullYear();
                var mes = date.getUTCMonth() + 1;
                var dia = date.getUTCDate();
                if (mes < 10) {
                    mes = "0" + mes
                }
                if (dia < 10) {
                    dia = "0" + dia
                }
                return anio + "-" + mes + "-" + dia;
            },

            getDates: function (date) {
                var fecha = null;
                if (date !== undefined && date !== null) {
                    if (date.includes(":")) {
                        fecha = new Date(date);
                    } else {
                        var split = date.split("-");
                        var formattedDate = new Date(split[0], split[1] - 1, split[2]);
                        fecha = formattedDate;
                    }
                }

                return fecha;

            },

            formatDate: function (date, sum) {
                var dia = date.getUTCDate() + sum;
                var mes = date.getUTCMonth();
                var anio = date.getUTCFullYear();

                return new Date(anio, mes, dia);
            },

            uploadFiles: function (nroSolicitud, archivosList) {
                // ECM no disponible en S/4HANA on-premise
                return Promise.resolve();
            },

            onChangeBukrs: function (oEvent) {
                this._Bukrs = oEvent.getSource().getValue();
            },

            readSolicitud: async function (filters) {

                var selectedTipo = this.getOwnerComponent().getModel("AuxModel").getData();
                var selectedContrato = this.getView().byId("tipoContrato").getSelectedKey();
                this._oCabModel = models.contCabModel();
                this.oPosModel = models.contPosModel();

                this.getOwnerComponent().getModel("busyModel").setProperty("/page", true);

                try {
                    const aData = await this.readSolicitudService(filters);
                    if (aData.results.length > 0) {
                        var oResults = aData.results[0];
                        var aPositionSet = oResults.PositionSet.results[0];
                        this.getOwnerComponent().getModel("dataModificacion").setData(aData);
                        this._oCabModel.setProperty("/bukrs", oResults.Bukrs);
                        this._Bukrs = oResults.Bukrs;
                        this._oCabModel.setProperty("/banfn", (oResults.Banfn) ? oResults.Banfn : aPositionSet.Banfn);
                        this._oCabModel.setProperty("/kunnr", oResults.Kunnr + " (" + oResults.KunnrTxt + ")");
                        this._oCabModel.setProperty("/fechaIni", (oResults.FechaIni) ? oResults.FechaIni : aPositionSet.FechaIni);
                        this._oCabModel.setProperty("/fechaFin", (oResults.FechaFin) ? oResults.FechaFin : aPositionSet.FechaFin);

                        var aPositions = []
                        var aSubposCovSet = aPositionSet.SubposCovSet.results;
                        var SubposOrdSet = aPositionSet.SubposOrdSet.results;
                        var data = this.getOwnerComponent().getModel("ValorCapita").getData();
                        var tableMat = [];
                        var tableCapita = [];

                        /*for (var i = 0; i < aData.results.length; i++) {
                            for (var j = 0; j < aData.results[i].PositionSet.results.length; j++) {
                                aData.results[i].PositionSet.results[j].auart = aData.results[i].PositionSet.results[j].Auart + " (" + aData.results[i].PositionSet.results[j].AuartTxt + ")";
                                aData.results[i].PositionSet.results[j].kunnr = aData.results[i].PositionSet.results[j].Kunnr;
                                aData.results[i].PositionSet.results[j].matnr = aData.results[i].PositionSet.results[j].Matnr + " (" + aData.results[i].PositionSet.results[j].MatnrTxt + ")";
                                aData.results[i].PositionSet.results[j].itemsDialog = [];
                                aData.results[i].PositionSet.results[j].itemMat = [];                              
                            }
                        }   */

                        //logica coberturas
                        for (var item of aSubposCovSet) {
                            var matData = {
                                Reqno: "",
                                Item: "",
                                Subitem: "",
                                Matnr: item.Matnr,
                                Description: item.MatnrTxt
                            };
                            tableMat.push(matData);
                        }

                        this.getOwnerComponent().getModel("ValorCapita").setProperty("/itemMat", tableMat);
                        this.getOwnerComponent().getModel("ValorCapita").setProperty("/itemsDialog", tableCapita);

                        if (SubposOrdSet) {
                            for (var item of SubposOrdSet) {
                                var oJsonPosition = {
                                    auart: aPositionSet.Auart + " (" + aPositionSet.AuartTxt + ")",
                                    kunnr: aPositionSet.Kunnr,
                                    matnr: aPositionSet.Matnr + " (" + aPositionSet.MatnrTxt + ")",
                                    itemsDialog: [],
                                    itemMat: [],
                                    ValorCapita: this.formatPrice(item.ValorCapita),
                                    primeraFecha: item.Edatu
                                };

                                aPositions.push(oJsonPosition);
                            }
                        }


                        models.contPosModel().setProperty("/posDataModif", aPositions);
                        models.contPosModel().setProperty("/posData", aPositions);
                        this.getOwnerComponent().getModel("EnabledModel").setData({
                            nroSolped: true,
                            btnCobertura: true,
                            Bukrs: true,
                            Vigencia: true,
                            VigenciaHasta: true,
                            tablaModif: true,
                            headerCoberturas: true,
                            clienteCab: false
                        });
                        if (selectedTipo.renovacion && selectedContrato === "1") {
                            this.getOwnerComponent().getModel("EnabledModel").setProperty("/sociedad", false);
                        }
                    }
                    this.getOwnerComponent().getModel("busyModel").setProperty("/page", false);
                } catch (err) {
                    debugger;
                    this.getOwnerComponent().getModel("busyModel").setProperty("/page", false);
                    if (err.responseText !== undefined) {
                        if (err.responseText.error !== undefined) {
                            let error = JSON.parse(err.responseText).error.message.value;
                            sap.m.MessageToast.show(error);
                        } else {
                            sap.m.MessageToast.show(err.message);
                        }
                    } else {
                        sap.m.MessageToast.show("Error");
                    }
                }
            },

            readWfCerrados: async function (reqno) {
                this._oCabModel = models.contCabModel();
                this.oPosModel = models.contPosModel();
                var filters = [
                    new Filter("Reqno", "EQ", reqno)
                ];
                this.getOwnerComponent().getModel("busyModel").setProperty("/page", true);
                try {
                    const aData = await this.readSolicitudService(filters);

                    //this.getOwnerComponent().getModel("VisibleModel").setProperty("/plusButton", true);                    
                    if (aData.results.length > 0) {
                        this.getOwnerComponent().getModel("dataModificacion").setData(aData);
                        this._oCabModel.setProperty("/rol", aData.results[0].Rol);
                        this._oCabModel.setProperty("/kunnr", aData.results[0].Kunnr + " (" + aData.results[0].KunnrTxt + ")");
                        this._oCabModel.setProperty("/lifnr", aData.results[0].Lifnr + " (" + aData.results[0].LifnrTxt + ")");
                        this._oCabModel.setProperty("/bukrs", aData.results[0].Bukrs);
                        this._oCabModel.setProperty("/montoInicial", aData.results[0].MontoInicial);
                        this._oCabModel.setProperty("/duracion", aData.results[0].Duracion);
                        this._oCabModel.setProperty("/areaResp", aData.results[0].AreaResp);
                        this._oCabModel.setProperty("/objeto", aData.results[0].Objeto);
                        this._oCabModel.setProperty("/resumenContrato", aData.results[0].ResumenContrato);
                        this._oCabModel.setProperty("/periodoAjuste", aData.results[0].PeriodoAjuste);
                        this._oCabModel.setProperty("/clausulaAjuste", aData.results[0].ClausulaAjuste);
                        this._oCabModel.setProperty("/poseeClausula", aData.results[0].PoseeClausula);
                        this._Bukrs = aData.results[0].Bukrs;
                        this._oCabModel.setProperty("/banfn", aData.results[0].Banfn);
                        this._oCabModel.setProperty("/fechaIni", aData.results[0].FechaIni);
                        this._oCabModel.setProperty("/fechaFin", aData.results[0].FechaFin);
                        var data = this.getOwnerComponent().getModel("ValorCapita").getData();
                        var tableMat = [];
                        var tableCapita = [];
                        for (var i = 0; i < aData.results.length; i++) {
                            for (var j = 0; j < aData.results[i].PositionSet.results.length; j++) {
                                aData.results[i].PositionSet.results[j].auart = aData.results[i].PositionSet.results[j].Auart + " (" + aData.results[i].PositionSet.results[j].AuartTxt + ")";
                                aData.results[i].PositionSet.results[j].kunnr = aData.results[i].PositionSet.results[j].Kunnr;
                                aData.results[i].PositionSet.results[j].matnr = aData.results[i].PositionSet.results[j].Matnr + " (" + aData.results[i].PositionSet.results[j].MatnrTxt + ")";
                                aData.results[i].PositionSet.results[j].itemsDialog = [];
                                aData.results[i].PositionSet.results[j].itemMat = [];
                                //logica coberturas
                                for (var item of aData.results[i].PositionSet.results[j].SubposCovSet.results) {
                                    var matData = {
                                        Reqno: "",
                                        Item: "",
                                        Subitem: "",
                                        Matnr: item.Matnr,
                                        Description: item.MatnrTxt
                                    };
                                    tableMat.push(matData);

                                    aData.results[i].PositionSet.results[j].itemMat.push(matData);
                                }

                                //logica valor cápita   
                                for (var item of aData.results[i].PositionSet.results[j].SubposOrdSet.results) {
                                    var dialogData = {
                                        Reqno: item.Reqno,
                                        Item: item.Item,
                                        Subitem: item.Subitem,
                                        ValorCapita: item.ValorCapita,
                                        FechaIni: item.FechaIni,
                                        FechaFin: item.FechaFin
                                    };
                                    tableCapita.push(dialogData);
                                    aData.results[i].PositionSet.results[j].itemsDialog.push(dialogData);
                                }
                            }
                        }

                        this.getOwnerComponent().getModel("ValorCapita").setProperty("/itemMat", tableMat);
                        this.getOwnerComponent().getModel("ValorCapita").setProperty("/itemsDialog", tableCapita);
                        //ver esto:
                        models.contPosModel().setProperty("/posData", aData.results[0].PositionSet.results);

                        this.getOwnerComponent().getModel("EnabledModel").setData({
                            nroSolped: true,
                            btnCobertura: true,
                            Bukrs: true,
                            Vigencia: true,
                            VigenciaHasta: true,
                            tablaModif: true,
                            headerCoberturas: true,
                            clienteCab: false
                        });
                    }
                    this.getOwnerComponent().getModel("busyModel").setProperty("/page", false);
                } catch (err) {
                    this.getOwnerComponent().getModel("busyModel").setProperty("/page", false);
                    if (err.responseText !== undefined) {
                        if (err.responseText.error !== undefined) {
                            let error = JSON.parse(err.responseText).error.message.value;
                            sap.m.MessageToast.show(error);
                        } else {
                            sap.m.MessageToast.show(err.message);
                        }
                    } else {
                        sap.m.MessageToast.show("Error");
                    }
                }
            },

            readSolicitudService: function (filters) {
                return new Promise((res, rej) => {
                    this.getOwnerComponent().getModel("postService").read("/HeaderSet", {
                        filters: filters,
                        urlParameters: {
                            "$expand": "CommContractSet,PositionSet/SubposCovSet,PositionSet/SubposOrdSet"
                        },
                        success: res,
                        error: rej
                    });
                });
            },

            readGeneralJson: function (reqno) {
                let sPath = "/GeneralJsonSet('" + reqno + "')";
                return new Promise((res, rej) => {
                    this.getOwnerComponent().getModel("postService").read(sPath, {
                        success: res,
                        error: rej
                    });
                });
            },


            onValueHelpMatRequest: function (oEvent) {
                var that = this;
                var oInput = oEvent.getSource(),
                    sInputValue = oEvent.getSource().getValue(),
                    oView = this.getView(),
                    oModel = this.getView().getModel();
                var rubro = "";
                if (oEvent.getSource().getBindingContext("contPos") !== undefined) {
                    rubro = oEvent.getSource().getBindingContext("contPos").getObject().Matkl;
                }

                if (this._oValueHelpDialog) {
                    this._oValueHelpDialog.destroy();
                }

                this._oOrdenCompraDialogInput = oInput;
                Fragment.load({
                    id: oView.getId(),
                    name: "com.nespola.contratoswf.view.fragment.ValueHelpMatDialog",
                    controller: this
                }).then(function (oDialog) {
                    that._oValueHelpDialog = oDialog;
                    oView.addDependent(oDialog);

                    var oFilters = [];
                    if (that._Bukrs !== "") {
                        that._Bukrs = that._Bukrs.split("-")[0].trim();
                        oFilters.push(new Filter('Bukrs', FilterOperator.EQ, that._Bukrs));
                    }

                    var sInputId = "matnr";

                    switch (sInputId) {
                        case "matnr":
                            oFilters.push(new Filter('Matkl', FilterOperator.LE, "1045"));
                            oDialog.bindAggregation("items", {
                                path: '/MATERIAL_MatGroupSet',
                                filters: oFilters,
                                template: new sap.m.StandardListItem({
                                    title: '{Matnr}',
                                    description: '{Description}'
                                })
                            });
                            that._oValueHelpDialog._Field = "matnr";
                            break;
                    }

                    // Open ValueHelpDialog filtered by the input's value
                    oDialog.open(sInputValue);

                    return oDialog;
                });
            },

            onValueHelpMatSearch: function (oEvent) {
                var sValue = oEvent.getParameter("value");
                var aFilters = [];
                if (this._oValueHelpDialog._Field === "matnr") {
                    oEvent.getSource().getBinding("items").filter([
                        new sap.ui.model.Filter("Description", FilterOperator.EQ, sValue)
                    ]);
                } else {
                    oEvent.getSource().getBinding("items").filter([
                        new sap.ui.model.Filter("Description", FilterOperator.EQ, sValue)
                    ]);
                }

            },

            onValueHelpMatConfirm: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("selectedItem");
                var sMatnr = oSelectedItem.getTitle();
                var sDescription = oSelectedItem.getDescription();
                oEvent.getSource().getBinding("items").filter([]);

                if (!oSelectedItem) {
                    this._oValueHelpDialog.destroy();
                    return;
                }
                if (sDescription !== undefined && sDescription !== "") {
                    this._oOrdenCompraDialogInput.setValue(sMatnr + " (" + sDescription + ")");
                } else {
                    this._oOrdenCompraDialogInput.setValue(sMatnr);
                }

                var oModel = this.getOwnerComponent().getModel("tablaMateriales");

                var data = this.getOwnerComponent().getModel("ValorCapita").getData();
                var tableData = this.getOwnerComponent().getModel("ValorCapita").getProperty("/itemMat");
                //Si la cobertura ya esta agregada no permite agregarla nuevamente
                if (sMatnr !== "" && sMatnr !== undefined) {
                    //Si la cobertura no existe entonces se agrega                
                    if (tableData.filter(function (item) {
                        return item.Matnr === sMatnr;
                    }).length === 0) {
                        tableData.push({
                            Reqno: "",
                            Item: "",
                            Subitem: "",
                            Matnr: sMatnr,
                            Description: sDescription
                        });
                    } else {
                        //Si la cobertura ya existe entonces se muestra un mensaje
                        var bCompact2 = !!this.getView().$().closest(".sapUiSizeCompact").length;
                        sap.m.MessageBox.alert(
                            "Esta cobertura ya se encuentra agregada, no es posible volverla a seleccionar", {
                            styleClass: bCompact2 ? "sapUiSizeCompact" : "",
                            onClose: function (oAction) {
                                if (oAction === "OK") {
                                    var device = sap.ui.Device.system;
                                    if (device.tablet) {
                                        sap.m.MessageBox.alert(
                                            "Deslice a la derecha para filtrar.", {
                                            styleClass: bCompact2 ? "sapUiSizeCompact" : ""
                                        }
                                        );
                                    }
                                }
                            }
                        }
                        );
                    }

                    this.getOwnerComponent().getModel("ValorCapita").setProperty("/itemMat", tableData);

                } else {
                    sap.m.MessageBox.error("Debe completar al menos un material");
                }
            },

            onValueHelpMatClose: function () {
                this._oValueHelpDialog.destroy();
            },

            onBukrsChange: function (oEvent) {
                this._Bukrs = oEvent.getSource().getValue();
            },

            onPoseeClausula: function (oEvent) {
                if (oEvent.getSource().getSelected() === true) {
                    this.byId("clausulaPactada").setRequired(true);
                } else {
                    this.byId("clausulaPactada").setRequired(false);
                }
            },


            onValueHelpRequest: function (oEvent) {
                var that = this;
                var oInput = oEvent.getSource(),
                    sInputValue = oEvent.getSource().getValue(),
                    tipoContrato = this.getOwnerComponent().getModel("AuxModel").getProperty("/Cotyp"),
                    oView = this.getView(),
                    oModel = this.getView().getModel();
                var rubro = "";
                if (oEvent.getSource().getBindingContext("contPos") !== undefined) {
                    rubro = oEvent.getSource().getBindingContext("contPos").getObject().Matkl;
                }

                if (oEvent.getSource().getBindingContext("contPos")) {
                    var ramo = oEvent.getSource().getBindingContext("contPos").getObject().auart.split(" ")[0];
                }

                if (this._oValueHelpDialog) {
                    this._oValueHelpDialog.destroy();
                }

                var aFilters = [];

                if (that._Bukrs !== "") {
                    that._Bukrs = that._Bukrs.split("-")[0].trim();
                    aFilters.push(new Filter('Bukrs', FilterOperator.EQ, that._Bukrs));
                }
                var claseFilter = "";

                if (that._Bukrs === "1000") {
                    claseFilter = "ZS*";
                } else if (that._Bukrs === "5000") {
                    claseFilter = "ZO*";
                }

                this._oOrdenCompraDialogInput = oInput;
                Fragment.load({
                    id: oView.getId(),
                    name: "com.nespola.contratoswf.view.fragment.ValueHelpDialog",
                    controller: this
                }).then(function (oDialog) {
                    that._oValueHelpDialog = oDialog;
                    oView.addDependent(oDialog);


                    //filters: [new Filter('Id', FilterOperator.EQ, claseFilter)],

                    var sInputId = /[a-z]+$/.exec((/App--[a-z]+/.exec(oInput.getId())[0]))[0];

                    switch (sInputId) {
                        case "matnr":
                            oDialog.bindAggregation("items", {
                                path: '/MATERIAL_MatGroupSet',
                                filters: [new Filter('Matkl', FilterOperator.GE, "1010")],
                                template: new sap.m.StandardListItem({
                                    title: '{Matnr}',
                                    description: '{Description}'
                                })
                            });
                            that._oValueHelpDialog._Field = "matnr";
                            break;
                        case "coberturafact":
                            if (ramo === "ZSBE" || ramo === "ZOBE") {
                                aFilters.push(new Filter('Matkl', FilterOperator.EQ, "1045"));
                                aFilters.push(new Filter('Matkl', FilterOperator.EQ, "1040"));
                            }
                            if (ramo === "ZSVI" || ramo === "ZOVI") {
                                aFilters.push(new Filter('Matkl', FilterOperator.EQ, "1010"));
                                aFilters.push(new Filter('Matkl', FilterOperator.EQ, "1011"));
                            }
                            if (ramo === "ZSSE" || ramo === "ZOSE") {
                                aFilters.push(new Filter('Matkl', FilterOperator.EQ, "1030"));
                                aFilters.push(new Filter('Matkl', FilterOperator.EQ, "1031"));
                                aFilters.push(new Filter('Matkl', FilterOperator.EQ, "1032"));
                                aFilters.push(new Filter('Matkl', FilterOperator.EQ, "1033"));
                            }
                            if (ramo === "ZSVO" || ramo === "ZOVO") {
                                aFilters.push(new Filter('Matkl', FilterOperator.EQ, "1020"));
                            }
                            oDialog.bindAggregation("items", {
                                path: '/MATERIAL_MatGroupSet',
                                filters: aFilters,
                                template: new sap.m.StandardListItem({
                                    title: '{Matnr}',
                                    description: '{Description}'
                                })
                            });
                            that._oValueHelpDialog._Field = "coberturafact";
                            break;
                        case "lifnr":
                            oDialog.bindAggregation("items", {
                                path: '/VENDORSet',
                                filters: aFilters,
                                template: new sap.m.StandardListItem({
                                    title: '{Id}',
                                    description: '{Description} - {Description2}'
                                })
                            });
                            that._oValueHelpDialog._Field = "lifnr";
                            break;
                        case "clasesolped":
                            aFilters = [];
                            if (that._Bukrs === "1000") {
                                aFilters.push(new Filter('Id', FilterOperator.EQ, "ZSBE"));
                                aFilters.push(new Filter('Id', FilterOperator.EQ, "ZSVI"));
                                aFilters.push(new Filter('Id', FilterOperator.EQ, "ZSSE"));
                                aFilters.push(new Filter('Id', FilterOperator.EQ, "ZSVO"));
                            } else if (that._Bukrs === "5000") {
                                aFilters.push(new Filter('Id', FilterOperator.EQ, "ZOBE"));
                                aFilters.push(new Filter('Id', FilterOperator.EQ, "ZOVI"));
                                aFilters.push(new Filter('Id', FilterOperator.EQ, "ZOSE"));
                                aFilters.push(new Filter('Id', FilterOperator.EQ, "ZOVO"));
                            }

                            oDialog.bindAggregation("items", {
                                path: '/SalesDocType',
                                filters: aFilters,
                                template: new sap.m.StandardListItem({
                                    title: '{Id}',
                                    description: '{Description}'
                                })
                            });
                            that._oValueHelpDialog._Field = "clasesolped";
                            break;
                        case "cliente":
                            aFilters.push(new Filter('Ktokd', FilterOperator.EQ, "ZS01"));
                            oDialog.bindAggregation("items", {
                                path: '/CustomerSet',
                                filters: aFilters,
                                template: new sap.m.StandardListItem({
                                    title: '{Kunnr}',
                                    description: '{Description} - {Description2}'
                                })
                            });
                            that._oValueHelpDialog._Field = "cliente";
                            break;
                        case "wfcerrados":
                            aFilters.push(new Filter('Cotyp', FilterOperator.EQ, tipoContrato));
                            aFilters.push(new Filter('Status', FilterOperator.EQ, "A"));
                            oDialog.bindAggregation("items", {
                                path: 'postService>/HeaderSet',
                                filters: aFilters,
                                template: new sap.m.StandardListItem({
                                    title: '{postService>Reqno}',
                                    description: '{postService>Lifnr} {postService>LifnrTxt}',
                                    info: '{postService>Kunnr} {postService>KunnrTxt}',
                                    wrapping: true
                                })
                            });
                            that._oValueHelpDialog._Field = "wfcerrados";
                            break;
                        case "clientetomador":
                            var rol = oView.getModel("header").getObject("/rol");
                            var sEntity = "";
                            var sTitle = "";
                            var sDescription = "";

                            if (rol === "1") {
                                sEntity = "/CustomerSet";
                                sTitle = "{Kunnr}";
                                sDescription = "{Description} - {Description2}";
                                aFilters.push(new Filter('Ktokd', FilterOperator.EQ, "ZZFI"));
                            } else if (rol === "2") {
                                sEntity = "/VENDORSet";
                                sTitle = "{Id}";
                                sDescription = "{Description} - {Description2}";
                                //aFilters.push(new Filter('Ktokk', FilterOperator.EQ, "ZZFI"));
                            }
                            oDialog.bindAggregation("items", {
                                path: sEntity,
                                filters: aFilters,
                                template: new sap.m.StandardListItem({
                                    title: sTitle,
                                    description: sDescription
                                })
                            });
                            that._oValueHelpDialog._Field = "cliente";
                            break;
                        case "nropedidox":
                            oDialog.bindAggregation("items", {
                                path: '/SalesOrderSet',
                                template: new sap.m.StandardListItem({
                                    title: '{Vbeln}',
                                    description: '{Auart}'
                                })
                            });
                            that._oValueHelpDialog._Field = "nropedidox";
                            break;
                        case "nrosolped":
                            oDialog.bindAggregation("items", {
                                path: '/PurchaseRequisitionSet',
                                template: new sap.m.StandardListItem({
                                    title: '{Banfn}',
                                    description: '{Bsart}'
                                })
                            });
                            that._oValueHelpDialog._Field = "nrosolped";
                            break;
                    }

                    // Open ValueHelpDialog filtered by the input's value
                    oDialog.open(sInputValue);

                    return oDialog;
                });
            },

            onValueHelpSearch: function (oEvent) {
                var sValue = oEvent.getParameter("value");
                var aFilters = [];
                if (this._oValueHelpDialog._Field === "nrosolped") {
                    oEvent.getSource().getBinding("items").filter([
                        new sap.ui.model.Filter("Banfn", FilterOperator.EQ, sValue)
                    ]);
                } else if (this._oValueHelpDialog._Field === "nropedidox") {
                    oEvent.getSource().getBinding("items").filter([
                        new sap.ui.model.Filter("Vbeln", FilterOperator.EQ, sValue)
                    ]);
                } else {
                    oEvent.getSource().getBinding("items").filter([
                        new sap.ui.model.Filter("Description", FilterOperator.EQ, sValue)
                    ]);
                }
            },

            onValueHelpConfirm: function (oEvent) {

                var oSelectedItem = oEvent.getParameter("selectedItem");
                oEvent.getSource().getBinding("items").filter([]);

                if (!oSelectedItem) {
                    this._oValueHelpDialog.destroy();
                    return;
                }
                if (oSelectedItem.getDescription() !== undefined && oSelectedItem.getDescription() !== "") {
                    this._oOrdenCompraDialogInput.setValue(oSelectedItem.getTitle() + " (" + oSelectedItem.getDescription() + ")");
                } else {
                    this._oOrdenCompraDialogInput.setValue(oSelectedItem.getTitle());
                }

                if (this._oValueHelpDialog._Field === "nropedidox" || this._oValueHelpDialog._Field === "nrosolped") {
                    var filters = [];
                    var sVbeln = this.getView().getModel("header").getObject("/vbeln");
                    var sBanfn = this.getView().getModel("header").getObject("/banfn");
                    sVbeln = (sVbeln) ? sVbeln.split(" ")[0] : "";
                    sBanfn = (sBanfn) ? sBanfn.split(" ")[0] : "";
                    if (sBanfn === "") {
                        filters = [
                            new Filter("Vbeln", "EQ", sVbeln)
                        ];
                    } else {
                        filters = [
                            new Filter("Vbeln", "EQ", sVbeln),
                            new Filter("Banfn", "EQ", sBanfn)
                        ];
                    }
                    //limpiamos campos
                    this.getView().getModel("header").setProperty("/banfn");
                    this.getView().getModel("header").setProperty("/bukrs");
                    this.getView().getModel("header").setProperty("/fechaIni");
                    this.getView().getModel("header").setProperty("/fechaFin");
                    models.contPosModel().setProperty("/posData", []);
                    this.readSolicitud(filters);
                }

                if (this._oValueHelpDialog._Field === "wfcerrados") {
                    var selected = oSelectedItem.getTitle();
                    //limpiamos campos
                    /*this.getView().getModel("header").setProperty("/banfn");
                    this.getView().getModel("header").setProperty("/bukrs");
                    this.getView().getModel("header").setProperty("/fechaIni");
                    this.getView().getModel("header").setProperty("/fechaFin");
                    models.contPosModel().setProperty("/posData", []);*/
                    this.readWfCerrados(selected);
                }
            },

            onValueHelpClose: function () {
                this._oValueHelpDialog.destroy();
            },

            openMaterialesDialog: function (oEvent) {
                if (!this._dialogMat) {
                    this._dialogMat = sap.ui.xmlfragment("com.nespola.contratoswf.view.dialogs.materialesDialog", this);
                    this.getView().addDependent(this._dialogMat);
                }
                jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._dialogMat);
                var modificacion = this.getOwnerComponent().getModel("AuxModel").getProperty("/modificacion");
                if (!modificacion) {
                    var obj = oEvent.getSource().getBindingContext("contPos").getObject();
                    this.getOwnerComponent().getModel("ValorCapita").setProperty("/", obj);
                } else {
                    var data = this.getView().getModel("dataModificacion").getData().results
                    var obj = oEvent.getSource().getBindingContext("contPos").getObject();
                    var items = this.catchData(data[0].PositionSet.results, obj.Vbeln);
                    obj.itemMat = items.mat;
                    obj.itemsDialog = items.dialog;
                    this.getOwnerComponent().getModel("ValorCapita").setProperty("/", obj);
                }

                this._dialogMat.open();
            },

            openMaterialesHeaderDialog: async function (oEvent) {
                if (!this._dialogMat) {
                    this._dialogMat = sap.ui.xmlfragment("com.nespola.contratoswf.view.dialogs.materialesDialog", this);
                    this.getView().addDependent(this._dialogMat);
                }
                jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._dialogMat);
                //var obj = oEvent.getSource().getBindingContext("contPos").getObject();
                //this.getOwnerComponent().getModel("ValorCapita").setProperty("/", obj);
                var modificacion = this.getOwnerComponent().getModel("AuxModel").getProperty("/modificacion");
                if (!modificacion) {
                    if (oEvent.getSource().getBindingContext("contPos") !== undefined) {
                        var obj = oEvent.getSource().getBindingContext("contPos").getObject();
                        this.getOwnerComponent().getModel("ValorCapita").setProperty("/", obj);
                    }
                } else {

                    this.getOwnerComponent().getModel("busyModel").setProperty("/page", true);

                    try {


                        if (this.getOwnerComponent().getModel("context")) {
                            var oHeader = this.getOwnerComponent().getModel("context").getData().header;
                            var filters = [
                                //new Filter("Vbeln", "EQ", oHeader.vbeln),
                                new Filter("Reqno", "EQ", oHeader.reqno)
                            ];
                            if (oHeader.banfn) {
                                filters.push(new Filter("Banfn", "EQ", oHeader.banfn));
                            }
                            var aData = await this.readSolicitudService(filters);
                            this.getOwnerComponent().getModel("dataModificacion").setData(aData);
                            var data = aData.results || undefined;
                            var items = this.catchData(data[0].PositionSet.results, data[0].PositionSet.results[0].Vbeln) || undefined;
                            var obj = items;
                            obj.itemMat = items.mat;
                            this.getOwnerComponent().getModel("ValorCapita").setProperty("/", obj);

                        } else {
                            var obj = [];
                            obj.itemMat = this.getOwnerComponent().getModel("ValorCapita").getProperty("/itemMat");
                            this.getOwnerComponent().getModel("ValorCapita").setProperty("/", obj);
                        }

                    } catch (err) {
                        this.getOwnerComponent().getModel("busyModel").setProperty("/page", false);
                        if (err.responseText !== undefined) {
                            sap.m.MessageToast.show(JSON.parse(err.responseText).error.message.value);
                        } else {
                            sap.m.MessageToast.show("Error");
                        }
                        return;
                    }
                    this.getOwnerComponent().getModel("busyModel").setProperty("/page", false);
                }

                this._dialogMat.open();
            },

            openMaterialesHeaderDialogRenov: function (oEvent) {
                if (!this._dialogMatRenov) {
                    this._dialogMatRenov = sap.ui.xmlfragment("com.nespola.contratoswf.view.dialogs.materialesDialogRenov", this);
                    this.getView().addDependent(this._dialogMatRenov);
                }
                jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._dialogMatRenov);

                this._dialogMatRenov.open();
            },

            onCloseMaterialesDialogRenov: function () {
                this._dialogMatRenov.close();
            },

            catchData: function (data, sid) {
                var items = {
                    mat: [],
                    dialog: []
                }
                for (var i = 0; i < data.length; i++) {
                    if (data[i].Vbeln === sid) {


                        data[i].auart = data[i].Auart;
                        data[i].kunnr = data[i].Kunnr;
                        data[i].matnr = data[i].Matnr;
                        //logica coberturas
                        for (var item of data[i].SubposCovSet.results) {
                            items.mat.push({
                                Reqno: "",
                                Item: "",
                                Subitem: "",
                                Matnr: item.Matnr,
                                Description: item.MatnrTxt
                            });
                        }

                        //logica valor cápita   
                        for (var item of data[i].SubposOrdSet.results) {
                            items.dialog.push({
                                Reqno: item.Reqno,
                                Item: item.Item,
                                Subitem: item.Subitem,
                                ValorCapita: this.formatPrice(item.ValorCapita),
                                FechaIni: item.FechaIni,
                                FechaFin: item.FechaFin
                            });
                        }

                        //TODO
                    }
                }

                return items;
            },

            catchHeaderData: function (data) {
                var items = {
                    mat: [],
                    dialog: []
                }
                for (var i = 0; i < data.length; i++) {
                    //logica coberturas
                    for (var item of data[i].SubposCovSet.results) {
                        items.mat.push({
                            Reqno: "",
                            Item: "",
                            Subitem: "",
                            Matnr: item.Matnr,
                            Description: item.MatnrTxt
                        });
                    }
                }

                return items;
            },

            onCloseMaterialesDialog: function () {
                //this._oOrdenCompraDialogInput.setValue("");
                this._dialogMat.getContent()[0].setValue("");
                this._dialogMat.close();
            },

            onCloseValorDialog: function () {
                this._dialogValor.close();
            },

            openValorCapitaDialog: function (oEvent) {

                var fechaIni = this.getView().getModel("header").getObject("/fechaIni");
                if (!this._dialogValor) {
                    this._dialogValor = sap.ui.xmlfragment("com.nespola.contratoswf.view.dialogs.valorCapitaDialog", this);
                    this.getView().addDependent(this._dialogValor);
                }
                jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._dialogValor);
                var modificacion = this.getOwnerComponent().getModel("AuxModel").getProperty("/modificacion");
                if (!modificacion) {
                    var obj = oEvent.getSource().getBindingContext("contPos").getObject();
                    var itemsDialog = obj.itemsDialog;
                    if (itemsDialog.length === 0 && fechaIni !== null) {
                        obj.FechaIni = fechaIni
                        this.getOwnerComponent().getModel("EnabledModel").setProperty("/fechaDesdeDialog", false);
                    } else if (itemsDialog.length > 0) {
                        obj.FechaIni = itemsDialog[itemsDialog.length - 1].FechaFin;
                        this.getOwnerComponent().getModel("EnabledModel").setProperty("/fechaDesdeDialog", false);
                    } else {
                        obj.FechaIni = null;
                        this.getOwnerComponent().getModel("EnabledModel").setProperty("/fechaDesdeDialog", true);
                    }
                    obj.FechaFin = null;

                    sap.ui.getCore().byId("vigCapitaHasta").setValueState(null)
                    sap.ui.getCore().byId("vigCapitaHasta").setValueState(null)
                    this.getOwnerComponent().getModel("ValorCapita").setProperty("/", obj);
                } else {
                    var data = this.getView().getModel("dataModificacion").getData().results
                    var obj = oEvent.getSource().getBindingContext("contPos").getObject();
                    var items = this.catchData(data[0].PositionSet.results, obj.Vbeln);
                    obj.itemMat = items.mat;
                    obj.itemsDialog = items.dialog;
                    this.getOwnerComponent().getModel("ValorCapita").setProperty("/", obj);

                    var posicion = oEvent.getSource().getBindingContext("contPos").getPath().split("/")[2];
                    this.getOwnerComponent().getModel("ValorCapita").setProperty("/posicion", posicion);

                }
                this._dialogValor.open();
            },

            // Popups de solo lectura para las columnas "Valor capita" y "Coberturas" del panel de visualización
            // (reemplazan las tablas incrustadas dentro de la tabla de posiciones, ver App.view.xml ~L1027).
            openValorCapitaViewDialog: function (oEvent) {
                if (!this._dialogValorView) {
                    this._dialogValorView = sap.ui.xmlfragment("com.nespola.contratoswf.view.dialogs.valorCapitaViewDialog", this);
                    this.getView().addDependent(this._dialogValorView);
                }
                jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._dialogValorView);
                var obj = oEvent.getSource().getBindingContext("contPos").getObject();
                this.getView().setModel(new JSONModel({ items: obj.subposSop || [] }), "ValorCapitaView");
                this._dialogValorView.open();
            },

            onCloseValorCapitaViewDialog: function () {
                this._dialogValorView.close();
            },

            openCoberturasViewDialog: function (oEvent) {
                if (!this._dialogCoberturasView) {
                    this._dialogCoberturasView = sap.ui.xmlfragment("com.nespola.contratoswf.view.dialogs.coberturasViewDialog", this);
                    this.getView().addDependent(this._dialogCoberturasView);
                }
                jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._dialogCoberturasView);
                var obj = oEvent.getSource().getBindingContext("contPos").getObject();
                this.getView().setModel(new JSONModel({ items: obj.subposCov || [] }), "CoberturasView");
                this._dialogCoberturasView.open();
            },

            onCloseCoberturasViewDialog: function () {
                this._dialogCoberturasView.close();
            },

            onDeleteLine: function (oEvent) {
                var oPosModel = models.contPosModel();
                var path = oEvent.getSource().oPropagatedProperties.oBindingContexts.contPos.sPath;
                var idx = /[0-9]+$/.exec(path)[0];
                var data = oPosModel.getData();
                data.posData.splice(idx, 1);
                oPosModel.setData(data);
            },

            setFields: function () {
                this.getOwnerComponent().getModel("AuxModel").setProperty("/creacion", true);
                this.getOwnerComponent().getModel("AuxModel").setProperty("/modificacion", false);
                this.getOwnerComponent().getModel("AuxModel").setProperty("/renovacion", false);
                this.getOwnerComponent().getModel("AuxModel").setProperty("/tableTitle", "Polizas");
                this.getOwnerComponent().getModel("VisibleModel").setData({
                    tabla: false,
                    headerCoberturasRenov: false,
                    tablaModif: false,
                    ClienteCab: false,
                    headerCoberturas: false,
                    wfanteriores: false,
                    NroSolicitud: false,
                    NroPedido: false,
                    Sociedad: false,
                    SociedadModifRenov: false,
                    TipoActualizacion: false,
                    Creacion: false,
                    Cliente: false,
                    Vigencia: false,
                    VigenciaHasta: false,
                    FechaFirma: false,
                    Rol: false,
                    Duracion: false,
                    MontoTotal: false,
                    MontoInicial: false,
                    AreaResponsable: false,
                    ClasePedido: false,
                    Cabecera: false,
                    Cobertura: false,
                    SumaAsegurada: false,
                    ClaseSolped: false,
                    PosicionesCobertura: false,
                    PoseeClausula: false,
                    PeriodoAjuste: false,
                    ClausulaPactada: false,
                    ObjetoContrato: false,
                    ResumenContrato: false,
                    MotivoContrato: false,
                    Proveedor: false,
                    ButtonNotion: false,
                    Propiedad: false,
                    MonedaInicial: false,
                    Deposito: false,
                    MonedaDeposito: false,
                    MotivoModificacion: false

                });
                this.getOwnerComponent().getModel("VisibleModel").setProperty("/visibleCampo", false)
                this.getOwnerComponent().getModel("VisibleModel").setProperty("/visibleCrear", true);
            },

            onSelectTipo: function () {
                models.clearContModels();
                var selectedTipo = this.getOwnerComponent().getModel("AuxModel").getData();
                var selectedContrato = this.getView().byId("tipoContrato").getSelectedKey();

                if (selectedTipo.creacion === false && selectedContrato === "1") {
                    this.getOwnerComponent().getModel("VisibleModel").setData({
                        plusButton: true,
                        tabla: false,
                        tablaModif: true,
                        ClienteCab: true,
                        wfanteriores: false,
                        NroSolicitud: true,
                        NroPedido: true,
                        Sociedad: false,
                        SociedadModifRenov: true,
                        TipoActualizacion: false,
                        Creacion: true,
                        Cliente: false,
                        Vigencia: true,
                        VigenciaHasta: true,
                        FechaFirma: false,
                        Rol: false,
                        Duracion: false,
                        MontoTotal: false,
                        MontoInicial: false,
                        AreaResponsable: false,
                        ClasePedido: true,
                        Cabecera: true,
                        Cobertura: true,
                        SumaAsegurada: true,
                        ClaseSolped: true,
                        PosicionesCobertura: true,
                        PoseeClausula: false,
                        PeriodoAjuste: false,
                        ClausulaPactada: false,
                        ObjetoContrato: false,
                        ResumenContrato: true,
                        MotivoContrato: false,
                        Proveedor: false,
                        ButtonNotion: true,
                        Propiedad: false,
                        MonedaInicial: false,
                        Deposito: false,
                        MonedaDeposito: false,
                        MotivoModificacion: false
                    });
                    this.getOwnerComponent().getModel("EnabledModel").setData({
                        nroSolped: false,
                        btnCobertura: false,
                        sociedad: false,
                        Vigencia: false,
                        VigenciaHasta: false,
                        tabla: false,
                        tablaModif: false,
                        headerCoberturas: false,
                        clienteCab: false
                    });
                } else if (selectedTipo.creacion && selectedContrato === "1") {
                    this.getOwnerComponent().getModel("VisibleModel").setData({
                        plusButton: true,
                        tabla: true,
                        tablaModif: false,
                        ClienteCab: true,
                        headerCoberturas: false,
                        wfanteriores: false,
                        NroSolicitud: false,
                        NroPedido: false,
                        Sociedad: true,
                        SociedadModifRenov: false,
                        TipoActualizacion: true,
                        Creacion: true,
                        Cliente: false,
                        Vigencia: true,
                        VigenciaHasta: true,
                        FechaFirma: false,
                        Rol: false,
                        Duracion: false,
                        MontoTotal: false,
                        MontoInicial: false,
                        AreaResponsable: false,
                        ClasePedido: true,
                        Cabecera: true,
                        Cobertura: true,
                        SumaAsegurada: true,
                        ClaseSolped: true,
                        PosicionesCobertura: true,
                        PoseeClausula: false,
                        PeriodoAjuste: false,
                        ClausulaPactada: false,
                        ObjetoContrato: false,
                        ResumenContrato: true,
                        MotivoContrato: false,
                        Proveedor: false,
                        ButtonNotion: true,
                        Propiedad: false,
                        MonedaInicial: false,
                        Deposito: false,
                        MonedaDeposito: false,
                        MotivoModificacion: false
                    });
                    this.getOwnerComponent().getModel("EnabledModel").setData({
                        nroSolped: true,
                        btnCobertura: true,
                        Bukrs: true,
                        Vigencia: true,
                        VigenciaHasta: true,
                        tabla: true,
                        tablaModif: false,
                        headerCoberturas: false,
                        clienteCab: true
                    });
                }
                if (selectedTipo.creacion === false && selectedContrato !== "1") {
                    this.getOwnerComponent().getModel("VisibleModel").setProperty("/MotivoModificacion", false);
                    if (selectedContrato === "2") {
                        this.getOwnerComponent().getModel("VisibleModel").setProperty("/MotivoModificacion", true);
                    }

                    this.getOwnerComponent().getModel("VisibleModel").setProperty("/MotivoContrato", false);
                    if (selectedContrato === "3" || selectedContrato === "4") {
                        this.getOwnerComponent().getModel("VisibleModel").setProperty("/MotivoContrato", true);

                    }
                    this.getOwnerComponent().getModel("VisibleModel").setProperty("/wfanteriores", true);

                } else {
                    this.getOwnerComponent().getModel("VisibleModel").setProperty("/wfanteriores", false);
                    this.getOwnerComponent().getModel("VisibleModel").setProperty("/MotivoModificacion", false);
                }



                this.getOwnerComponent().getModel("VisibleModel").setProperty("/headerCoberturasRenov", false);

                this.getOwnerComponent().getModel("VisibleModel").setProperty("/visibleCrear", true);
                this.getOwnerComponent().getModel("VisibleModel").setProperty("/visibleCampo", false)

            },

            onSelectTipoContrato: function (oEvent) {
                models.clearContModels();
                this.getOwnerComponent().getModel("AuxModel").setProperty("/creacion", true);
                var selected = oEvent.getSource().getSelectedKey();
                var selectedTipoModif = this.getOwnerComponent().getModel("AuxModel").getProperty("/modificacion");
                var selectedTipoCreation = this.getOwnerComponent().getModel("AuxModel").getProperty("/creacion");
                switch (selected) {
                    case "1":
                        if (selectedTipoModif) {
                            this.getOwnerComponent().getModel("VisibleModel").setData({
                                tabla: true,
                                tablaModif: true,
                                headerCoberturas: true,
                                ClienteCab: true,
                                wfanteriores: false,
                                NroSolicitud: false,
                                NroPedido: false,
                                Sociedad: true,
                                SociedadModifRenov: false,
                                TipoActualizacion: false,
                                Creacion: true,
                                Cliente: false,
                                Vigencia: false,
                                VigenciaHasta: false,
                                FechaFirma: false,
                                Rol: false,
                                Duracion: false,
                                MontoTotal: false,
                                MontoInicial: false,
                                AreaResponsable: false,
                                ClasePedido: true,
                                Cabecera: true,
                                Cobertura: true,
                                SumaAsegurada: true,
                                ClaseSolped: true,
                                PosicionesCobertura: true,
                                PoseeClausula: false,
                                PeriodoAjuste: false,
                                ClausulaPactada: false,
                                ObjetoContrato: false,
                                ResumenContrato: true,
                                MotivoContrato: false,
                                Proveedor: false,
                                ButtonNotion: true,
                                Propiedad: false,
                                MonedaInicial: false,
                                Deposito: false,
                                MonedaDeposito: false,
                                MotivoModificacion: false
                            });
                            this.getOwnerComponent().getModel("EnabledModel").setData({
                                nroSolped: false,
                                btnCobertura: false,
                                Bukrs: false,
                                Vigencia: false,
                                VigenciaHasta: false,
                                tabla: false,
                                tablaModif: false,
                                headerCoberturas: false
                            });
                        } else {
                            this.getOwnerComponent().getModel("VisibleModel").setData({
                                tabla: true,
                                tablaModif: false,
                                ClienteCab: true,
                                headerCoberturas: false,
                                wfanteriores: false,
                                NroSolicitud: false,
                                NroPedido: false,
                                Sociedad: true,
                                SociedadModifRenov: false,
                                TipoActualizacion: true,
                                Creacion: true,
                                Cliente: false,
                                Vigencia: true,
                                VigenciaHasta: true,
                                FechaFirma: false,
                                Rol: false,
                                Duracion: false,
                                MontoTotal: false,
                                MontoInicial: false,
                                AreaResponsable: false,
                                ClasePedido: true,
                                Cabecera: true,
                                Cobertura: true,
                                SumaAsegurada: true,
                                ClaseSolped: true,
                                PosicionesCobertura: true,
                                PoseeClausula: false,
                                PeriodoAjuste: false,
                                ClausulaPactada: false,
                                ObjetoContrato: false,
                                ResumenContrato: true,
                                MotivoContrato: false,
                                Proveedor: false,
                                ButtonNotion: true,
                                Propiedad: false,
                                MonedaInicial: false,
                                Deposito: false,
                                MonedaDeposito: false,
                                MotivoModificacion: false
                            });
                            this.getOwnerComponent().getModel("EnabledModel").setData({
                                nroSolped: true,
                                btnCobertura: true,
                                Bukrs: true,
                                Vigencia: true,
                                VigenciaHasta: true,
                                tabla: true,
                                tablaModif: false,
                                headerCoberturas: false
                            });
                        }
                        this.getOwnerComponent().getModel("oModelTitle").setProperty("/title", "Póliza:");
                        break;
                    case "2":
                        this.getOwnerComponent().getModel("VisibleModel").setData({
                            tabla: false,
                            tablaModif: false,
                            ClienteCab: false,
                            headerCoberturas: false,
                            NroSolicitud: false,
                            NroPedido: false,
                            Sociedad: true,
                            SociedadModifRenov: false,
                            TipoActualizacion: false,
                            Creacion: true,
                            Cliente: true,
                            Vigencia: true,
                            VigenciaHasta: true,
                            FechaFirma: true,
                            Rol: true,
                            Duracion: true,
                            MontoTotal: true,
                            MontoInicial: true,
                            AreaResponsable: false,
                            ClasePedido: false,
                            Cabecera: false,
                            Cobertura: false,
                            SumaAsegurada: false,
                            ClaseSolped: false,
                            PosicionesCobertura: false,
                            PoseeClausula: true,
                            PeriodoAjuste: true,
                            ClausulaPactada: true,
                            ObjetoContrato: false,
                            ResumenContrato: true,
                            MotivoContrato: false,
                            Proveedor: false,
                            ButtonNotion: false,
                            Propiedad: true,
                            MonedaInicial: true,
                            Deposito: true,
                            MonedaDeposito: true,
                            MotivoModificacion: false
                        });
                        if (!selectedTipoCreation) {
                            this.getOwnerComponent().getModel("VisibleModel").setProperty("/wfanteriores", true);
                            this.getOwnerComponent().getModel("VisibleModel").setProperty("/MotivoModificacion", true);

                        } else {
                            this.getOwnerComponent().getModel("VisibleModel").setProperty("/wfanteriores", false);
                            this.getOwnerComponent().getModel("VisibleModel").setProperty("/MotivoModificacion", false);
                        }
                        this.getOwnerComponent().getModel("EnabledModel").setData({
                            nroSolped: true,
                            btnCobertura: true,
                            Bukrs: true,
                            Vigencia: true,
                            VigenciaHasta: true,
                            tabla: true,
                            tablaModif: false,
                            headerCoberturas: false
                        });
                        this.getOwnerComponent().getModel("oModelTitle").setProperty("/title", "Contrato:");
                        break;
                    case "3":
                        this.getOwnerComponent().getModel("VisibleModel").setData({
                            tabla: false,
                            tablaModif: false,
                            ClienteCab: false,
                            headerCoberturas: false,
                            NroSolicitud: false,
                            NroPedido: false,
                            Sociedad: true,
                            SociedadModifRenov: false,
                            TipoActualizacion: false,
                            Creacion: true,
                            Cliente: false,
                            Vigencia: true,
                            VigenciaHasta: true,
                            FechaFirma: true,
                            Rol: false,
                            Duracion: true,
                            MontoTotal: true,
                            MontoInicial: true,
                            AreaResponsable: true,
                            ClasePedido: false,
                            Cabecera: false,
                            Cobertura: false,
                            SumaAsegurada: false,
                            ClaseSolped: false,
                            PosicionesCobertura: false,
                            PoseeClausula: true,
                            PeriodoAjuste: true,
                            ClausulaPactada: true,
                            ObjetoContrato: true,
                            ResumenContrato: false,
                            MotivoContrato: true,
                            Proveedor: true,
                            ButtonNotion: false,
                            Propiedad: false,
                            MonedaInicial: true,
                            Deposito: false,
                            MonedaDeposito: false,
                            MotivoModificacion: false
                        });
                        if (!selectedTipoCreation) {
                            this.getOwnerComponent().getModel("VisibleModel").setProperty("/wfanteriores", true);
                        } else {
                            this.getOwnerComponent().getModel("VisibleModel").setProperty("/wfanteriores", false);
                        }
                        this.getOwnerComponent().getModel("EnabledModel").setData({
                            nroSolped: true,
                            btnCobertura: true,
                            Bukrs: true,
                            Vigencia: true,
                            VigenciaHasta: true,
                            tabla: true,
                            tablaModif: false,
                            headerCoberturas: false
                        });
                        this.getOwnerComponent().getModel("oModelTitle").setProperty("/title", "Contrato:");
                        break;
                    case "4":
                        this.getOwnerComponent().getModel("VisibleModel").setData({
                            tabla: false,
                            tablaModif: false,
                            ClienteCab: false,
                            headerCoberturas: false,
                            NroSolicitud: false,
                            NroPedido: false,
                            Sociedad: true,
                            SociedadModifRenov: false,
                            TipoActualizacion: false,
                            Creacion: true,
                            Cliente: false,
                            Vigencia: true,
                            VigenciaHasta: true,
                            FechaFirma: true,
                            Rol: false,
                            Duracion: true,
                            MontoTotal: true,
                            MontoInicial: true,
                            AreaResponsable: true,
                            ClasePedido: false,
                            Cabecera: false,
                            Cobertura: false,
                            SumaAsegurada: false,
                            ClaseSolped: false,
                            PosicionesCobertura: false,
                            PoseeClausula: true,
                            PeriodoAjuste: true,
                            ClausulaPactada: true,
                            ObjetoContrato: true,
                            ResumenContrato: false,
                            MotivoContrato: true,
                            Proveedor: false,
                            ButtonNotion: false,
                            Propiedad: false,
                            MonedaInicial: true,
                            Deposito: false,
                            MonedaDeposito: false,
                            MotivoModificacion: false
                        });
                        if (!selectedTipoCreation) {
                            this.getOwnerComponent().getModel("VisibleModel").setProperty("/wfanteriores", true);
                        } else {
                            this.getOwnerComponent().getModel("VisibleModel").setProperty("/wfanteriores", false);
                        }
                        this.getOwnerComponent().getModel("EnabledModel").setData({
                            nroSolped: true,
                            btnCobertura: true,
                            Bukrs: true,
                            Vigencia: true,
                            VigenciaHasta: true,
                            tabla: true,
                            tablaModif: false,
                            headerCoberturas: false
                        });
                        this.getOwnerComponent().getModel("oModelTitle").setProperty("/title", "Póliza:");
                        break;
                }

                this._bindItemsComboBoxSociedad(selected);

                if (selected === "1" && selectedTipoCreation === false) {
                    this.getOwnerComponent().getModel("VisibleModel").setProperty("/SociedadModifRenov", true);
                    this.getOwnerComponent().getModel("VisibleModel").setProperty("/Sociedad", false);
                } else if (selected === "1" && selectedTipoCreation === true) {
                    this.getOwnerComponent().getModel("VisibleModel").setProperty("/SociedadModifRenov", false);
                    this.getOwnerComponent().getModel("VisibleModel").setProperty("/Sociedad", true);
                }

                this.getOwnerComponent().getModel("VisibleModel").setProperty("/visibleCrear", true);
                this.getOwnerComponent().getModel("VisibleModel").setProperty("/visibleCampo", false)
                this.getOwnerComponent().getModel("VisibleModel").setProperty("/headerCoberturasRenov", false);

            },

            _bindItemsComboBoxSociedad: function (selected) {
                console.log("[Sociedad] _bindItemsComboBoxSociedad llamado con selected =", selected);
                var aFilters = [];

                if (selected === "1") {
                    aFilters = [
                        new Filter("Id", FilterOperator.EQ, "1000"),
                        new Filter("Id", FilterOperator.EQ, "5000"),
                    ];
                }

                console.log("[Sociedad] modelo default existe?", !!oThat.getOwnerComponent().getModel());
                console.log("[Sociedad] llamando readSociedadService...");

                oThat.readSociedadService(aFilters).then(function (aData) {
                    console.log("[Sociedad] respuesta OK, cantidad de resultados:", aData.results.length);
                    oThat._oSociedadModel.setProperty("/results", aData.results);
                }).catch(function (oError) {
                    console.log("[Sociedad] ERROR en readSociedadService:", oError);
                    oThat._oSociedadModel.setProperty("/results", []);
                    oThat.onErrorMessage(oError, "errorSociedad");
                });
            },

            onAddLine: function () {
                var oModel = models.contPosModel();
                oModel.setProperty("/posData/" + oModel.getData().posData.length, {
                    "kunnr": "",
                    "auart": "",
                    "matnr": "",
                    "ValorCapita": "",
                    "FechaIni": null,
                    "FechaFin": null,
                    "itemsDialog": [],
                    "itemMat": []
                });

                oModel.refresh(true);
            },

            onSend: function (oEvent) {
                let validate = true,
                    filtersCab = this.getView().getModel("header").getData(),
                    filtersPos = models.contPosModel().getData().posData,
                    tipoContrato = this.getOwnerComponent().getModel("AuxModel").getProperty("/Cotyp"),
                    creacion = this.getOwnerComponent().getModel("AuxModel").getProperty("/creacion"),
                    modificacion = this.getOwnerComponent().getModel("AuxModel").getProperty("/modificacion"),
                    renovacion = this.getOwnerComponent().getModel("AuxModel").getProperty("/renovacion");
                let posicionesBotones = this.getOwnerComponent().getModel("ValorCapita").getData();

                //valido campos cabecera
                if (tipoContrato === "1") {
                    if (creacion) {
                        if (filtersCab.bukrs !== "" && filtersCab.bukrs !== undefined &&
                            filtersCab.kunnr !== "" && filtersCab.kunnr !== undefined &&
                            filtersCab.tipoAjuste !== "" && filtersCab.tipoAjuste !== undefined &&
                            filtersCab.fechaIni !== "" && filtersCab.fechaIni !== null &&
                            filtersCab.fechaFin !== "" && filtersCab.fechaFin !== null &&
                            filtersCab.resumenContrato !== "" && filtersCab.resumenContrato !== undefined) {
                            validate = true;
                        } else {
                            validate = false;
                            sap.m.MessageToast.show("Por favor, complete los campos requeridos");
                            return;
                        }
                    } else if (modificacion) {
                        if (filtersCab.banfn !== "" && filtersCab.banfn !== undefined &&
                            filtersCab.kunnr !== "" && filtersCab.kunnr !== undefined &&
                            filtersCab.bukrs !== "" && filtersCab.bukrs !== undefined &&
                            filtersCab.fechaIni !== "" && filtersCab.fechaIni !== null &&
                            filtersCab.fechaFin !== "" && filtersCab.fechaFin !== null) {
                            validate = true;
                        } else {
                            validate = false;
                            sap.m.MessageToast.show("Por favor, complete los campos requeridos");
                            return;
                        }
                    } else if (renovacion) {
                        if (filtersCab.banfn !== "" && filtersCab.banfn !== undefined &&
                            filtersCab.kunnr !== "" && filtersCab.kunnr !== undefined &&
                            filtersCab.bukrs !== "" && filtersCab.bukrs !== undefined &&
                            filtersCab.fechaIni !== "" && filtersCab.fechaIni !== null &&
                            filtersCab.fechaFin !== "" && filtersCab.fechaFin !== null) {
                            validate = true;
                        } else {
                            validate = false;
                            sap.m.MessageToast.show("Por favor, complete los campos requeridos");
                            return;
                        }
                    }
                } else if (tipoContrato === "2") {
                    if (filtersCab.poseeClausula) {

                        if (this.getView().byId("vigDesde").getValueState() === "None"
                            && this.getView().byId("vigHasta").getValueState() === "None"
                            && filtersCab.kunnr !== "" && filtersCab.kunnr !== undefined &&
                            filtersCab.bukrs !== "" && filtersCab.bukrs !== undefined &&
                            filtersCab.rol !== "" && filtersCab.rol !== undefined &&
                            filtersCab.duracion !== "" && filtersCab.duracion !== undefined &&
                            filtersCab.periodoAjuste !== "" && filtersCab.periodoAjuste !== undefined &&
                            filtersCab.fechaIni !== "" && filtersCab.fechaIni !== null &&
                            filtersCab.fechaFin !== "" && filtersCab.fechaFin !== null &&
                            filtersCab.clausulaAjuste !== "" && filtersCab.clausulaAjuste !== undefined &&
                            filtersCab.montoInicial !== "" && filtersCab.montoInicial !== undefined) {
                            validate = true
                        } else {
                            validate = false;
                            sap.m.MessageToast.show("Por favor, complete los campos requeridos");
                            return;
                        }
                    } else {

                        if (this.getView().byId("vigDesde").getValueState() === "None"
                            && this.getView().byId("vigHasta").getValueState() === "None"
                            && filtersCab.kunnr !== "" && filtersCab.kunnr !== undefined &&
                            filtersCab.bukrs !== "" && filtersCab.bukrs !== undefined &&
                            filtersCab.rol !== "" && filtersCab.rol !== undefined &&
                            filtersCab.periodoAjuste !== "" && filtersCab.periodoAjuste !== undefined &&
                            filtersCab.fechaIni !== "" && filtersCab.fechaIni !== null &&
                            filtersCab.fechaFin !== "" && filtersCab.fechaFin !== null &&
                            filtersCab.montoInicial !== "" && filtersCab.montoInicial !== undefined) {
                            validate = true
                        } else {
                            validate = false;
                            sap.m.MessageToast.show("Por favor, complete los campos requeridos");
                            return;
                        }

                    }

                } else if (tipoContrato === "3") {
                    if (this.getView().byId("vigDesde").getValueState() === "None"
                        && this.getView().byId("vigHasta").getValueState() === "None" &&
                        filtersCab.lifnr !== "" && filtersCab.lifnr !== undefined &&
                        filtersCab.areaResp !== "" && filtersCab.areaResp !== undefined &&
                        filtersCab.bukrs !== "" && filtersCab.bukrs !== undefined &&
                        filtersCab.periodoAjuste !== "" && filtersCab.periodoAjuste !== undefined &&
                        filtersCab.fechaIni !== "" && filtersCab.fechaIni !== null &&
                        filtersCab.fechaFin !== "" && filtersCab.fechaFin !== null &&
                        filtersCab.montoInicial !== "" && filtersCab.montoInicial !== undefined &&
                        filtersCab.objeto !== "" && filtersCab.objeto !== undefined &&
                        filtersCab.resumenContrato !== "" && filtersCab.resumenContrato !== undefined) {
                        validate = true
                    } else {
                        validate = false;
                        sap.m.MessageToast.show("Por favor, complete los campos requeridos");
                        return;
                    }
                } else if (tipoContrato === "4") {
                    if (this.getView().byId("vigDesde").getValueState() === "None"
                        && this.getView().byId("vigHasta").getValueState() === "None" &&
                        filtersCab.areaResp !== "" && filtersCab.areaResp !== undefined &&
                        filtersCab.periodoAjuste !== "" && filtersCab.periodoAjuste !== undefined &&
                        filtersCab.bukrs !== "" && filtersCab.bukrs !== undefined &&
                        filtersCab.fechaIni !== "" && filtersCab.fechaIni !== null &&
                        filtersCab.fechaFin !== "" && filtersCab.fechaFin !== null &&
                        filtersCab.clausulaAjuste !== "" && filtersCab.clausulaAjuste !== undefined &&
                        filtersCab.montoInicial !== "" && filtersCab.montoInicial !== undefined &&
                        filtersCab.objeto !== "" && filtersCab.objeto !== undefined) {
                        validate = true
                    } else {
                        validate = false;
                        sap.m.MessageToast.show("Por favor, complete los campos requeridos");
                        return;
                    }
                }


                //valido campos por posición para el tipo convenio
                if (tipoContrato === "1" && creacion) {
                    for (var i = 0; i < filtersPos.length; i++) {
                        if (filtersPos[i].auart !== "" && filtersPos[i].matnr !== ""
                            && filtersPos[i].itemMat.length > 0 && filtersPos[i].itemsDialog.length > 0) {

                        } else {
                            validate = false;
                            sap.m.MessageToast.show("Por favor, complete los campos requeridos a nivel posición");
                            return;
                        }
                    }

                    if (filtersPos.length === 0) {
                        sap.m.MessageToast.show("Debe completar al menos una posición");
                        validate = false;
                    }
                }

                if (tipoContrato === "1" && creacion === false) {
                    for (var i = 0; i < filtersPos.length; i++) {
                        if (filtersPos[i].auart !== "" && filtersPos[i].matnr !== "") {

                        } else {
                            validate = false;
                            sap.m.MessageToast.show("Por favor, complete los campos requeridos a nivel posición");
                            return;
                        }
                    }

                    if (filtersPos.length === 0) {
                        sap.m.MessageToast.show("Debe completar al menos una posición");
                        validate = false;
                    }
                }

                if (validate) {

                    var oBundle = this.getView().getModel("i18n").getResourceBundle();

                    this._oRequestDialog = new sap.m.Dialog({
                        title: "Envío de datos",
                        type: 'Message',
                        content: [
                            new sap.m.Label({
                                text: "¿Confirma el envio de informacion?",
                                labelFor: 'rejectDialogTextarea'
                            })
                        ],
                        beginButton: new sap.m.Button({
                            type: sap.m.ButtonType.Accept,
                            text: "Confirmar",
                            busyIndicatorDelay: 0,
                            press: function (oEvent) {
                                oEvent.getSource().setEnabled(false);
                                this._oRequestDialog.close()
                                models.sendContData(this);
                            }.bind(this)
                        }),
                        endButton: new sap.m.Button({
                            type: sap.m.ButtonType.Reject,
                            text: "Cancelar",
                            press: function () {
                                this.onExitPostRequest();
                            }.bind(this)
                        })
                    });
                    this._oRequestDialog.open();

                }
            },

            onExitPostRequest: function () {
                this._oRequestDialog.close();
            },

            onDeleteCommentLine: function (oEvent) {
                var oCommModel = this.getOwnerComponent().getModel("CommentsModel");
                var path = oEvent.getSource().oPropagatedProperties.oBindingContexts.CommentsModel.sPath;
                var idx = /[0-9]+$/.exec(path)[0];
                var data = oCommModel.getData();
                data.comentarios.splice(idx, 1);
                oCommModel.setData(data);
            },

            // ═════════════════════════════════════════════════════════════════
            // OPCIONES ADICIONALES (Consultar, obtener usuarios, etc)
            // ═════════════════════════════════════════════════════════════════
            onConsultar: function (oEvent) {

            },

            onQuestion: async function (oEvent) {

                if (!this._dialogConsulta) {
                    this._dialogConsulta = sap.ui.xmlfragment("com.nespola.contratoswf.view.dialogs.sendTask", this);
                    this.getView().addDependent(this._dialogConsulta);
                }
                await this.getUsers();
                jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._dialogConsulta);
                this._dialogConsulta.open();

            },


            onResponseQuestion: function () {

                if (!this._dialogResponse) {
                    this._dialogResponse = sap.ui.xmlfragment("com.nespola.contratoswf.view.dialogs.sendTaskResponse", this);
                    this.getView().addDependent(this._dialogResponse);
                }
                //await this.getUsers();
                jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._dialogResponse);
                this._dialogResponse.open();

            },
            getUsers: async function (oEvent) {
                var that = this;
                try {
                    var oPostModel = this.getOwnerComponent().getModel("postService");
                    if (!oPostModel) {
                        return;
                    }

                    oPostModel.read("/UsuariosSet", {
                        sorters: [new sap.ui.model.Sorter("userName", false)],
                        urlParameters: {
                            "$top": 400
                        },
                        success: function (oData) {
                            var oUsersModel = new sap.ui.model.json.JSONModel();
                            var aResults = oData && oData.results ? oData.results : [];
                            oUsersModel.setProperty("/AllUsers", aResults);
                            oUsersModel.setProperty("/ListUsers", aResults);
                            that.getOwnerComponent().setModel(oUsersModel, "Users");
                        },
                        error: function (oError) {
                            var sMsg = that._i18n ? that._i18n("errorGenerico") : "Error cargando usuarios";
                            try {
                                if (oError && oError.responseText) {
                                    var oErr = JSON.parse(oError.responseText);
                                    sMsg = (oErr.error && oErr.error.message && oErr.error.message.value) ? oErr.error.message.value : sMsg;
                                } else if (oError && oError.message) {
                                    sMsg = oError.message;
                                }
                            } catch (e) {
                                // ignore parse errors
                            }
                            if (that._showError) {
                                that._showError(sMsg);
                            } else {
                                MessageBox.error(sMsg);
                            }
                        }
                    });
                } catch (e) {
                    jQuery.sap.log.error("getUsers failed", e);
                }
            },


            onSelectUser: function (evt) {
                var oUser;
                if (evt && evt.getParameters && evt.getParameters().selectedRow) {
                    oUser = evt.getParameters().selectedRow.getBindingContext("Users").getObject();
                } else if (evt && evt.getParameter && evt.getParameter("selectedItem")) {
                    oUser = evt.getParameter("selectedItem").getBindingContext("Users").getObject();
                }

                if (!oUser) {
                    return;
                }

                var user = {
                    userName: oUser.userName,
                    email: oUser.email,
                    name: (oUser.givenName || "") + " " + (oUser.familyName || "")
                };
                this.oUserSend = user;
                if (this.byId("userSearchInput")) {
                    this.byId("userSearchInput").setValue(user.userName);
                }
            },

            _userMatchesSearch: function (sValue, oUser) {
                if (!sValue) {
                    return true;
                }

                var userName = (oUser.userName || "").toLowerCase();
                var givenName = (oUser.givenName || "").toLowerCase();
                var familyName = (oUser.familyName || "").toLowerCase();
                var email = (oUser.email || "").toLowerCase();
                var fullName = (givenName + " " + familyName).trim();

                return userName.indexOf(sValue) !== -1 ||
                    givenName.indexOf(sValue) !== -1 ||
                    familyName.indexOf(sValue) !== -1 ||
                    fullName.indexOf(sValue) !== -1 ||
                    email.indexOf(sValue) !== -1;
            },

            onSuggestUsers: function (oEvent) {
                var sValue = (oEvent.getParameter("suggestValue") || "").trim().toLowerCase();
                var oUsersModel = this.getOwnerComponent().getModel("Users");

                if (!oUsersModel) {
                    return;
                }

                var aAllUsers = oUsersModel.getProperty("/AllUsers") || [];
                var aFiltered = aAllUsers.filter(this._userMatchesSearch.bind(this, sValue));

                oUsersModel.setProperty("/ListUsers", aFiltered);
            },

            onEnviarTask: async function (evt) {
                sap.ui.core.BusyIndicator.show(0);

                var oContext = $.Component.getModel("context");
                var oResponse = oContext.getProperty("/requestLegales");
                oResponse.userSend = this.oUserSend;

                var aData = oThat.getOwnerComponent().getModel("CommentsModel").getProperty("/comentarios");
                var row = {
                    "ernam": sCreatedByUser,
                    "comments": oResponse.comentario,
                    "erdat": new Date()
                };

                aData.push(row);
                this.getOwnerComponent().getModel("CommentsModel").setProperty("/comentarios", aData);
                $.Component.getModel("context").setProperty("/requestLegales", oResponse);

                try {
                    await this._sendConsultaRequest(oResponse, "1");
                    this._handleConsultaSuccess();
                } catch (err) {
                    sap.ui.core.BusyIndicator.hide();
                    throw err;
                } finally {
                    this._dialogConsulta.close();
                }
            },

            onEnviarTaskResponse: async function (evt) {
                sap.ui.core.BusyIndicator.show(0);

                var oContext = $.Component.getModel("context");
                var oResponse = oContext.getProperty("/responseLegales");
                oResponse.user = sCreatedByUser;

                var aData = oThat.getOwnerComponent().getModel("CommentsModel").getProperty("/comentarios");
                var row = {
                    "ernam": sCreatedByUser,
                    "comments": oResponse.comentario,
                    "erdat": new Date()
                };

                aData.push(row);
                this.getOwnerComponent().getModel("CommentsModel").setProperty("/comentarios", aData);
                $.Component.getModel("context").setProperty("/responseLegales", oResponse);

                try {
                    await this._sendConsultaRequest(oResponse, "2");
                    this._handleConsultaSuccess();
                } catch (err) {
                    sap.ui.core.BusyIndicator.hide();
                    throw err;
                } finally {
                    this._dialogResponse.close();
                }
            },

            _sendConsultaRequest: async function (oResponse, sTipoConsulta) {
                if (!oResponse) {
                    return;
                }

                var sDialogComment = (oResponse.comentario || "").trim();
                oResponse.comentario = sDialogComment;

                if (this._sTaskInstanceID && sDialogComment) {
                    await this._saveTaskComment(sDialogComment);
                }

                var oPostModel = this.getOwnerComponent().getModel("postService");
                if (!oPostModel) {
                    return;
                }

                var oPayload = {
                    WorkItemId: this._sTaskInstanceID || "",
                    Reqno: oResponse.Reqno || this.sContrato || "",
                    userName: (this.oUserSend && this.oUserSend.userName) || oResponse.user || "",
                    comments: sDialogComment,
                    TipoConsulta: sTipoConsulta
                };

                return new Promise(function (resolve, reject) {
                    oPostModel.create("/ConsultaAUsuarioSet", oPayload, {
                        success: function () {
                            resolve();
                        },
                        error: function (oError) {
                            var sMsg = this._i18n ? this._i18n("errorGenerico") : "Error enviando consulta a usuario";
                            try { sMsg = JSON.parse(oError.responseText).error.message.value; } catch (e) { if (oError && oError.message) { sMsg = oError.message; } }
                            if (this._showError) { this._showError(sMsg); } else { MessageBox.error(sMsg); }
                            reject(oError);
                        }.bind(this)
                    });
                }.bind(this));
            },

            //solicitamos confirmación para observar la solicitud
            onCheck: function () {
                this.oQuestionDialogObs = new sap.m.Dialog({
                    title: "Observar solicitud",
                    type: 'Message',
                    contentWidth: "28rem",
                    content: [
                        new sap.m.VBox({
                            items: [
                                new sap.m.Label({
                                    text: "¿Desea observar la solicitud?",
                                    labelFor: 'rejectDialogTextarea'
                                }),
                                new sap.m.TextArea({
                                    width: "25rem",
                                    placeholder: "Motivo de observación.."
                                })
                            ]

                        })
                    ],
                    beginButton: new sap.m.Button({
                        type: sap.m.ButtonType.Emphasized,
                        text: 'Confirmar',
                        press: function () {
                            this.onCheckConfirm();
                        }.bind(this)
                    }),
                    endButton: new sap.m.Button({
                        type: sap.m.ButtonType.Reject,
                        text: 'Cancelar',
                        press: function () {
                            this.onCancelObsConfirm();
                        }.bind(this)
                    })
                });
                this.oQuestionDialogObs.open();
            },

            onCheckConfirm: function () {
                var textoObservacion = this.oQuestionDialogObs.getContent()[0].getItems()[1].getValue();
                if (textoObservacion !== "") {
                    var objectObservacion = {
                        "comments": "OBSERVACION: " + textoObservacion,
                        "erdat": new Date(),
                        "ernam": sCreatedByUser,
                        "existe": "X"
                    };

                    $.Component.getModel("context").setProperty("/motivoObservacion", objectObservacion.comments);
                    //pusheo la observacion a los comentarios.
                    oThat.getOwnerComponent().getModel("CommentsModel").getProperty("/comentarios").push(objectObservacion);
                }
                oThat.oQuestionDialogObs.close();
                var oContextData = $.Component.getModel("context").getData();
                oThat.completeTask("O");
                // si cliquean observar y el nivel es 1 le resto 1
                if (oContextData.level === 1) {
                    $.Component.getModel("context").setProperty("/level", 0);
                }
                //si cliquean observar y el nivel es 2 le resto 2
                if (oContextData.level === 2) {
                    $.Component.getModel("context").setProperty("/level", 0);
                }

                if (oContextData.level === 5) {
                    $.Component.getModel("context").setProperty("/level", 4);
                }
            },

            onCancelObsConfirm: function () {
                oThat.oQuestionDialogObs.close();
            },


            onCerrarTareaSuccess: function () {
                // 1. Obtener la referencia al componente de My Inbox
                var oComponent = this.getOwnerComponent();

                if (oComponent && oComponent.getComponentData()) {
                    var oComponentData = oComponent.getComponentData();

                    // 2. Intentar refrescar la lista general de tareas de My Inbox
                    if (oComponentData.startupParameters && oComponentData.startupParameters.inboxAPI) {
                        // S/4HANA 2025 expone métodos de API de Inbox en los parámetros de inicio
                        oComponentData.startupParameters.inboxAPI.fireActionSuccess();
                    } else if (oComponentData && oComponentData.inboxHandle && oComponentData.inboxHandle.dataManager) {
                        // Alternativa por DataManager: Forzar refresco liberando el workitem actual
                        oComponentData.inboxHandle.dataManager.fireRefresh({
                            bKeepCurrentTask: false
                        });
                    } else {
                        // Alternativa: Disparar evento global en el EventBus si está configurado
                        sap.ui.getCore().getEventBus().publish("sap.ushell.renderers.fiori2.Renderer", "refreshInbox");
                    }
                }

                // 3. Opcional: Regresar a la vista vacía si la tarea ya no existe
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                if (oRouter) {
                    oRouter.navTo("master", {}, true);
                }
            },

            _handleConsultaSuccess: function () {
                return this._finalizeTaskAndReload();
            },

            _finalizeTaskAndReload: async function () {
                sap.ui.core.BusyIndicator.show(0);

                try {
                    if (typeof this.onCerrarTareaSuccess === "function") {
                        await Promise.resolve(this.onCerrarTareaSuccess.call(this));
                    }
                } catch (err) {
                    jQuery.sap.log.error("_finalizeTaskAndReload failed", err);
                } finally {
                    await new Promise(function (resolve) {
                        setTimeout(resolve, 0);
                    });
                    window.location.reload();
                }
            },


            // ═════════════════════════════════════════════════════════════════
            // PRIVATE HELPERS
            // ═════════════════════════════════════════════════════════════════

            /**
             * Returns the i18n text for the given key, optionally replacing placeholders.
             * @param {string}   sKey
             * @param {string[]} [aArgs]
             * @returns {string}
             */
            _i18n: function (sKey, aArgs) {
                return this.getOwnerComponent()
                    .getModel("i18n")
                    .getResourceBundle()
                    .getText(sKey, aArgs);
            },

            /**
             * Shorthand for getOwnerComponent().getModel(sName).
             * @param {string} [sName] - omit for default OData model
             * @returns {sap.ui.model.Model}
             */
            _oModel: function (sName) {
                return this.getOwnerComponent().getModel(sName);
            },

            /**
             * Wraps an OData read call in a Promise.
             * @param {string}         sModelName  - named model or "" for default
             * @param {string}         sEntityPath - OData entity set / path
             * @param {sap.ui.model.Filter[]} [aFilters]
             * @returns {Promise<object>}
             */
            _readOData: function (sModelName, sEntityPath, aFilters) {
                return new Promise(function (resolve, reject) {
                    this._oModel(sModelName || undefined).read(sEntityPath, {
                        filters: aFilters || [],
                        success: resolve,
                        error: reject
                    });
                }.bind(this));
            },

            /**
             * Displays a MessageBox error with the provided text.
             * @param {string} sMsg
             */
            _showError: function (sMsg) {
                MessageBox.error(sMsg || this._i18n("errorGenerico"));
            },

            /**
             * Displays a MessageToast notification.
             * @param {string} sMsg
             */
            _showToast: function (sMsg) {
                MessageToast.show(sMsg);
            },

            /**
             * Resets the context model to an empty state.
             */
            _cleanContext: function () {
                this.getOwnerComponent()
                    .getModel("context")
                    .setData({ header: {}, commtextgral: [] });
            }

        });
    });