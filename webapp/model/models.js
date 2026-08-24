sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device",
    "../model/formatter"
], function (JSONModel, Device, formatter) {
    "use strict";

    var gContCabModel = new JSONModel({
        "bukrs": "",
        "tipoAjuste": "",
        "kunnr": "",
        "banfn": "",
        "vbeln": "",
        "kunnr": "",
        "lifnr": "",
        "fechaMod": null,
        "fechaIni": null,
        "fechaFin": null,
        "bbsrt": "",
        "rol": "",
        "duracion": "",
        "montoTotal": "",
        "montoInicial": "",
        "poseeClausula": false,
        "periodoAjuste": "",
        "areaResp": "",
        "objeto": "",
        "fechaFirma": "",
        "clausulaAjuste": "",
        "resumenContrato": "",
        "Status": "P",
        "Ernam": "",
        "CommTextSet": [],
        "PositionSet": [],
        "ReturnSet": []
    });

    var gContPosModel = new JSONModel({
        "posData": [
            {
                "auart": "",
                "matnr": "",
                "itemsDialog": [],
                "itemMat": []
            }
        ]
    });

    return {
        formatter: formatter,
        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        },

        contCabModel: function () {
            return gContCabModel;
        },

        contPosModel: function () {
            return gContPosModel;
        },

        clearContModels: function () {
            gContCabModel.setData({
                "bukrs": "",
                "kunnr": "",
                "tipoAjuste": "",
                "banfn": "",
                "vbeln": "",
                "kunnr": "",
                "lifnr": "",
                "fechaMod": null,
                "fechaIni": null,
                "fechaFin": null,
                "bbsrt": "",
                "rol": "",
                "duracion": "",
                "montoTotal": "",
                "montoInicial": "",
                "poseeClausula": false,
                "periodoAjuste": "",
                "areaResp": "",
                "objeto": "",
                "fechaFirma": "",
                "clausulaAjuste": "",
                "resumenContrato": "",
                "Status": "P",
                "Ernam": "",
                "CommTextSet": [],
                "PositionSet": [],
                "ReturnSet": []
            });
            gContPosModel.setProperty("/posData", [{
                "auart": "",
                "matnr": "",
                "itemsDialog": [],
                "itemMat": []
            }]);
            gContPosModel.setProperty("/posDataModif", []);

        },

        _prepareModelPositions: function () {
            var positions = this.contPosModel().getData().posData;

            positions.forEach(function (item, index) {
                if (item.SubposCovSet === undefined) {
                    item.SubposCovSet = {};
                    item.SubposCovSet.results = [];
                }

                if (item.SubposOrdSet === undefined) {
                    var jsonModel = {
                        "FechaFin": null,
                        "FechaIni": null,
                        "Item": "",
                        "Reqno": "",
                        "Subitem": "",
                        "ValorCapita": item.ValorCapita
                    }

                    item.SubposOrdSet = {};
                    item.SubposOrdSet.results = [];
                    item.SubposOrdSet.results.push(jsonModel);
                }
            });

            return positions
        },

        sendContData: function (that) {
            var oModel = that.getOwnerComponent().getModel("postService"),
                oContHeader = gContCabModel.getData(),
                posiciones = this._prepareModelPositions(),
                commentsModel = that.getOwnerComponent().getModel("CommentsModel").getProperty("/comentarios"),
                aItemMat = that.getOwnerComponent().getModel("ValorCapita").getObject("/itemMat"),
                oAuxModel = that.getOwnerComponent().getModel("AuxModel").getData(),
                tipoDeContrato = oAuxModel.Cotyp,
                tipoDeOperacion = "",
                sBanfn = (oContHeader.banfn === "") ? "" : oContHeader.banfn.split(" ")[0],
                sVbeln = (oContHeader.vbeln === "") ? "" : oContHeader.vbeln.split(" ")[0],
                sKunnr = (oContHeader.kunnr === "") ? "" : oContHeader.kunnr.split(" ")[0],
                sLifnr = (oContHeader.lifnr === "") ? "" : oContHeader.lifnr.split(" ")[0];

            oModel.setUseBatch(false);
            if (oAuxModel.creacion) {
                tipoDeOperacion = "C";
            } else if (oAuxModel.modificacion) {
                tipoDeOperacion = "M";
            } else {
                tipoDeOperacion = "R";
            }

            var sUserName = "";

            debugger;
            if (that._loggedUser !== undefined) {
                sUserName = that._loggedUser;
            } else {
                sUserName = "";
            }

            let resumenContract = [];
            let listResumeContract = [];
            listResumeContract.push(oContHeader.resumenContrato.substring(0, 250));
            listResumeContract.push(oContHeader.resumenContrato.substring(250, 500));
            listResumeContract.push(oContHeader.resumenContrato.substring(500, 750));
            listResumeContract.push(oContHeader.resumenContrato.substring(750));

            listResumeContract.forEach((element, pos) => {
                if (element !== '') {
                    let resume =
                    {
                        secuencia: "0" + (pos + 1),
                        cotyp: tipoDeContrato,
                        comentario: element
                    };
                    resumenContract.push(resume);
                }
            });


            var oEntry = {
                "Reqno": "",
                "Optyp": tipoDeOperacion,
                "Cotyp": tipoDeContrato,
                "Bukrs": oContHeader.bukrs,
                "Banfn": sBanfn,
                "Vbeln": sVbeln,
                "Kunnr": sKunnr,
                "Lifnr": (oContHeader.rol === "2") ? sKunnr : sLifnr, //Si es Locatario (2) se envia el Proveedor (Kunnr)
                "TipoAjuste": (oContHeader.tipoAjuste === "") ? "" : oContHeader.tipoAjuste.split(" ")[0],
                "FechaMod": null,
                "FechaIni": oContHeader.fechaIni,
                "FechaFin": oContHeader.fechaFin,
                "Bbsrt": "",
                "Rol": oContHeader.rol,
                "Duracion": oContHeader.duracion,
                "MontoTotal": (oContHeader.montoTotal === "") ? "0" : formatter.formatNumberPost2(oContHeader.montoTotal),
                "MontoInicial": (oContHeader.montoInicial === "") ? "0" : formatter.formatNumberPost2(oContHeader.montoInicial),
                "PoseeClausula": oContHeader.poseeClausula,
                "PeriodoAjuste": oContHeader.periodoAjuste,
                "AreaResp": (oContHeader.areaResp === "") ? "" : oContHeader.areaResp.split(" ")[0],
                "Objeto": oContHeader.objeto,
                "FechaFirma": (oContHeader.fechaFirma === "") ? null : oContHeader.fechaFirma,
                "ClausulaAjuste": oContHeader.clausulaAjuste,
                "ResumenContrato": oContHeader.resumenContrato,
                "Status": "P",
                "Ernam": sUserName,
                "MonedaMontinicial": oContHeader.monedaMontinicial,
                "Deposito": oContHeader.deposito,
                "MonedaDep": oContHeader.monedaDep,
                "Property": oContHeader.property,
                "Motivo": oContHeader.motivo,
                "CommTextSet": commentsModel,
                "CommContractSet": resumenContract,
                "PositionSet": [],
                "ReturnSet": []
            };

            aItemMat = (aItemMat) ? aItemMat : [];
            for (var i = 0; i < aItemMat.length; i++) {
                delete aItemMat[i].Description;
                aItemMat[i].MatnrTxt = "";
            }

            if (posiciones.length > 0 && posiciones[0].auart !== "") {
                posiciones.forEach(function (oPos, index) {
                    oPos.ValorCapita = formatter.formatNumberPost2(oPos.ValorCapita);
                    for (var i = 0; i < oPos.itemMat.length; i++) {
                        delete oPos.itemMat[i].Description;
                    }

                    for (var i = 0; i < oPos.itemsDialog.length; i++) {
                        oPos.itemsDialog[i].ValorCapita = formatter.formatNumberPost2(oPos.itemsDialog[i].ValorCapita);
                    }

                    for (var i = 0; i < oPos.SubposOrdSet.results.length; i++) {
                        oPos.SubposOrdSet.results[i].Edatu = oPos.primeraFecha;
                        oPos.SubposOrdSet.results[i].ValorCapita = oPos.ValorCapita;
                    }


                    oEntry.PositionSet.push({
                        "Reqno": "",
                        "Item": "",
                        "Kunnr": (oContHeader.kunnr === "") ? "" : oContHeader.kunnr.split(" ")[0],
                        "Auart": (oPos.auart === "") ? "" : oPos.auart.split(" ")[0],
                        "Matnr": (oPos.matnr === "") ? "" : oPos.matnr.split(" ")[0],
                        "ValorCapita": "0",
                        "FechaIni": null,
                        "FechaFin": null,
                        "Vbeln": "",
                        "SubposCovSet": (oAuxModel.creacion) ? oPos.itemMat : (index === 0) ? aItemMat : [] /*oPos.SubposCovSet.results*/,
                        "SubposOrdSet": (oAuxModel.creacion) ? oPos.itemsDialog : oPos.SubposOrdSet.results
                    });
                });
            }

            for (let line of oEntry.CommTextSet) {
                line.erdat = line.CreatedAt;
                line.ernam = line.CreatedByName;
                line.comments = line.Text;
                delete line.CreatedAt;
                delete line.CreatedByName;
                delete line.Text;
            }

            that.getOwnerComponent().getModel("busyModel").setProperty("/page", true);
            debugger;
            oModel.create("/HeaderSet", oEntry, {
                method: "POST",
                success: function (oData, response) {
                    debugger;
                    var dataDocumento = that.getView().getModel("document").getData();
                    that._oRequestDialog.close();

                    if (oData.ReturnSet.results.length > 0) {
                        if (oData.ReturnSet.results[0].Type === "E") {
                            sap.m.MessageBox.error(oData.ReturnSet.results[0].Message);
                        } else if (oData.ReturnSet.results[0].Type === "S") {
                            //GUARDAR ADJUNTOS Y COMENTARIOS
                            if (oData.Swfid) {
                                that.saveDocumentsToAdjuntosSet(oData.Swfid).then(function (oData, response) {
                                    //TODO: encadenar guardado de comentarios
                                    console.log(response);
                                });
                            }

                            sap.m.MessageBox.success(oData.ReturnSet.results[0].Message);
                            //Limpiamos modelo header y filtro sociedad
                            that._Bukrs = "";
                            gContCabModel.setData({
                                "bukrs": "",
                                "tipoAjuste": "",
                                "banfn": "",
                                "vbeln": "",
                                "kunnr": "",
                                "lifnr": "",
                                "fechaMod": null,
                                "fechaIni": null,
                                "fechaFin": null,
                                "bbsrt": "",
                                "rol": "",
                                "duracion": "",
                                "montoTotal": "",
                                "montoInicial": "",
                                "poseeClausula": false,
                                "periodoAjuste": "",
                                "areaResp": "",
                                "objeto": "",
                                "fechaFirma": "",
                                "clausulaAjuste": "",
                                "resumenContrato": "",
                                "Status": "P",
                                "Ernam": "",
                                "CommTextSet": [],
                                "PositionSet": [],
                                "ReturnSet": []
                            });
                            gContPosModel.setProperty("/posData", [{
                                "kunnr": "",
                                "auart": "",
                                "matnr": "",
                                "valorCapita": [],
                                "Coberturas": [],
                                "itemsDialog": [],
                                "itemMat": []
                            }])
                            gContPosModel.setProperty("/posDataModif", [{
                                "kunnr": "",
                                "auart": "",
                                "matnr": "",
                                //"edatu": "",
                                "valorCapita": [],
                                "Coberturas": [],
                                "itemsDialog": [],
                                "itemMat": [],
                                "primeraFecha": null
                            }])
                            debugger;
                            that.getOwnerComponent().getModel("CommentsModel").setProperty("/comentarios", []);

                            // that.sendFiles(oData.Reqno, dataDocumento).then(oResult => {
                            //     sap.m.MessageBox.success(oData.ReturnSet.results[0].Message);
                            //     //Limpiamos modelo header y filtro sociedad
                            //     that._Bukrs = "";
                            //     gContCabModel.setData({
                            //         "bukrs": "",
                            //         "tipoAjuste": "",
                            //         "banfn": "",
                            //         "vbeln": "",
                            //         "kunnr": "",
                            //         "lifnr": "",
                            //         "fechaMod": null,
                            //         "fechaIni": null,
                            //         "fechaFin": null,
                            //         "bbsrt": "",
                            //         "rol": "",
                            //         "duracion": "",
                            //         "montoTotal": "",
                            //         "montoInicial": "",
                            //         "poseeClausula": false,
                            //         "periodoAjuste": "",
                            //         "areaResp": "",
                            //         "objeto": "",
                            //         "fechaFirma": "",
                            //         "clausulaAjuste": "",
                            //         "resumenContrato": "",
                            //         "Status": "P",
                            //         "Ernam": "",
                            //         "CommTextSet": [],
                            //         "PositionSet": [],
                            //         "ReturnSet": []
                            //     });
                            //     gContPosModel.setProperty("/posData", [{
                            //         "kunnr": "",
                            //         "auart": "",
                            //         "matnr": "",
                            //         "valorCapita": [],
                            //         "Coberturas": [],
                            //         "itemsDialog": [],
                            //         "itemMat": []
                            //     }])
                            //     gContPosModel.setProperty("/posDataModif", [{
                            //         "kunnr": "",
                            //         "auart": "",
                            //         "matnr": "",
                            //         //"edatu": "",
                            //         "valorCapita": [],
                            //         "Coberturas": [],
                            //         "itemsDialog": [],
                            //         "itemMat": [],
                            //         "primeraFecha": null
                            //     }])
                            //     debugger;
                            //     that.getOwnerComponent().getModel("CommentsModel").setProperty("/comentarios", []);
                            // }).catch(function (sError) {
                            //     jQuery.sap.log.error(sError);
                            //     sap.ui.core.BusyIndicator.hide();
                            //     sap.m.MessageBox.warning(oData.ReturnSet.results[0].Message + " No se pudo subir el archivo. Error: " + sError.responseJSON.message);
                            // });
                        }
                    } else {
                        sap.m.MessageBox.success("Se creo la solicitud Nro: " + oData.Reqno);

                        //GUARDAR ADJUNTOS Y COMENTARIOS
                        // if (oData.Swfid) {
                        //     that.flushPendingAttachmentsAndComments(oData.Swfid);
                        // }
                        if (oData.Swfid) {
                            that.saveDocumentsToAdjuntosSet(oData.Swfid).then(function (oData, response) {
                                //TODO: encadenar guardado de comentarios
                                console.log(response);
                            });
                        }

                        //Clear de variables
                        that._Bukrs = "";
                        gContCabModel.setData({
                            "bukrs": "",
                            "tipoAjuste": "",
                            "banfn": "",
                            "vbeln": "",
                            "kunnr": "",
                            "lifnr": "",
                            "fechaMod": null,
                            "fechaIni": null,
                            "fechaFin": null,
                            "bbsrt": "",
                            "rol": "",
                            "duracion": "",
                            "montoTotal": "",
                            "montoInicial": "",
                            "poseeClausula": false,
                            "periodoAjuste": "",
                            "areaResp": "",
                            "objeto": "",
                            "fechaFirma": "",
                            "clausulaAjuste": "",
                            "resumenContrato": "",
                            "Status": "P",
                            "Ernam": "",
                            "CommTextSet": [],
                            "PositionSet": [],
                            "ReturnSet": []
                        });
                        gContPosModel.setProperty("/posData", [{
                            "kunnr": "",
                            "auart": "",
                            "matnr": "",
                            "valorCapita": [],
                            "Coberturas": [],
                            "itemsDialog": [],
                            "itemMat": []
                        }])
                        gContPosModel.setProperty("/posDataModif", [{
                            "kunnr": "",
                            "auart": "",
                            "matnr": "",
                            //"edatu": "",
                            "valorCapita": [],
                            "Coberturas": [],
                            "itemsDialog": [],
                            "itemMat": [],
                            "primeraFecha": null
                        }])
                        debugger;
                        that.getOwnerComponent().getModel("CommentsModel").setProperty("/comentarios", []);

                    }

                    that.getOwnerComponent().getModel("busyModel").setProperty("/page", false);
                },
                error: function (oError) {
                    that.getOwnerComponent().getModel("busyModel").setProperty("/page", false);
                    that._oRequestDialog.close();
                    let formattedError = JSON.parse(oError.responseText).error.message.value;
                    sap.m.MessageBox.error(formattedError);
                }
            });
        },

        sendContDataLvl7: function (that, approvalStatus) {
            debugger;
            var contextHeaderData = $.Component.getModel("context").getData().header;
            var commentsModel = $.Component.getModel("context").getData().commtextgral;
            var posiciones = $.Component.getModel("context").getData().positions;

            var oModel = that.getOwnerComponent().getModel("postService"),
                //oContHeader = gContCabModel.getData(),
                //posiciones = this.contPosModel().getData().posData,
                //commentsModel = that.getOwnerComponent().getModel("CommentsModel").getProperty("/comentarios"),
                oAuxModel = that.getOwnerComponent().getModel("AuxModel").getData(),
                tipoDeContrato = oAuxModel.Cotyp,
                tipoDeOperacion = "";
            oModel.setUseBatch(false);
            if (oAuxModel.creacion) {
                tipoDeOperacion = "C";
            } else if (oAuxModel.modificacion) {
                tipoDeOperacion = "M";
            } else {
                tipoDeOperacion = "R";
            }

            var sUserName = "";

            debugger;
            if (that._loggedUser !== undefined) {
                sUserName = that._loggedUser;
            } else {
                sUserName = "";
            }

            var oEntry = {
                "Reqno": contextHeaderData.reqno,
                "Optyp": tipoDeOperacion,
                "Cotyp": tipoDeContrato.toString(),
                "Bukrs": contextHeaderData.bukrs,
                "TipoAjuste": (contextHeaderData.optyp === "") ? "" : contextHeaderData.optyp.toString().split(" ")[0],
                "Banfn": (contextHeaderData.banfn === undefined) ? "" : contextHeaderData.banfn.toString().split(" ")[0],
                "Vbeln": (contextHeaderData.vbeln === undefined) ? "" : contextHeaderData.vbeln.toString().split(" ")[0],
                "Kunnr": (contextHeaderData.kunnr === undefined) ? "" : contextHeaderData.kunnr.toString().split(" ")[0],
                "Lifnr": (contextHeaderData.lifnr === undefined) ? "" : contextHeaderData.lifnr.toString().split(" ")[0],
                "FechaMod": null,
                "FechaIni": (contextHeaderData.fechaIni === undefined) ? null : contextHeaderData.fechaIni,
                "FechaFin": (contextHeaderData.fechaFin === undefined) ? null : contextHeaderData.fechaFin,
                "Bbsrt": "",
                "Rol": (contextHeaderData.rol === undefined) ? "" : contextHeaderData.rol.toString().split(" ")[0],
                "Duracion": (contextHeaderData.duracion === undefined) ? "" : contextHeaderData.duracion.toString(),
                "MontoTotal": (contextHeaderData.montoTotal === undefined) ? "0" : formatter.formatNumberPost2(contextHeaderData.montoTotal),
                "MontoInicial": (contextHeaderData.montoInicial === undefined) ? "0" : formatter.formatNumberPost2(contextHeaderData.montoInicial),
                "PoseeClausula": (contextHeaderData.poseeClausula === undefined) ? false : true,
                "PeriodoAjuste": (contextHeaderData.periodoAjuste === undefined) ? "" : contextHeaderData.periodoAjuste.toString().split(" ")[0],
                "AreaResp": (contextHeaderData.areaResp === undefined) ? "" : contextHeaderData.areaResp.toString().split(" ")[0],
                "Objeto": (contextHeaderData.objeto === undefined) ? "" : contextHeaderData.objeto,
                "FechaFirma": (contextHeaderData.fechaFirma === undefined) ? null : contextHeaderData.fechaFirma,
                "ClausulaAjuste": (contextHeaderData.clausulaAjuste === undefined) ? "" : contextHeaderData.clausulaAjuste,
                "ResumenContrato": (contextHeaderData.resumenContrato === undefined) ? "" : contextHeaderData.resumenContrato,
                "Status": approvalStatus,
                "Ernam": sUserName,
                "CommTextSet": [],
                "PositionSet": [],
                "ReturnSet": []
            };


            if (posiciones !== undefined) {
                if (posiciones.length > 0 && posiciones[0].auart !== "") {
                    posiciones.forEach(function (oPos) {
                        if (oPos.itemMat) {
                            for (var i = 0; i < oPos.itemMat.length; i++) {
                                oPos.itemMat[i].Item = oPos.itemMat[i].Item.toString();
                                oPos.itemMat[i].Subitem = oPos.itemMat[i].Subitem.toString();
                                oPos.itemMat[i].Reqno = (oPos.itemMat[i].Reqno) ? oPos.itemMat[i].Reqno : "";
                                oPos.itemMat[i].MatnrTxt = (oPos.itemMat[i].matnrTxt) ? oPos.itemMat[i].matnrTxt : "";
                                oPos.itemMat[i].Matnr = (oPos.itemMat[i].matnr) ? oPos.itemMat[i].matnr : "";

                                delete oPos.itemMat[i].item;
                                delete oPos.itemMat[i].matnr;
                                delete oPos.itemMat[i].matnrTxt;
                                delete oPos.itemMat[i].subitem;
                                delete oPos.itemMat[i].Description;
                                delete oPos.itemMat[i].reqno;
                            }
                        }
                        let itemsDialogSap = [];
                        for (var i = 0; i < oPos.itemsDialog.length; i++) {
                            var oObject = oPos.itemsDialog[i];
                            /*  oPos.itemsDialog[i].FechaFin = (tipoDeOperacion === "C") ? that.getDates(oObject.fechaFin) : null;
                              oPos.itemsDialog[i].FechaIni = (tipoDeOperacion === "C") ? that.getDates(oObject.fechaIni) : null;
                              oPos.itemsDialog[i].Subitem = (oObject.subitem) ? oObject.subitem.toString() : (oObject.Subitem) ? oObject.Subitem.toString() : "";
                              oPos.itemsDialog[i].Reqno = (oObject.reqno) ? oObject.reqno.toString() : (oObject.Reqno) ? oObject.Reqno.toString() : "";
                              oPos.itemsDialog[i].Item = (oObject.item) ? oObject.item.toString() : (oObject.Item) ? oObject.Item.toString() : "";
                              oPos.itemsDialog[i].ValorCapita = (oObject.valorCapita) ? oObject.valorCapita.toString() : (oObject.ValorCapita) ? oObject.ValorCapita.toString() : "";
                              oPos.itemsDialog[i].Edatu = (tipoDeOperacion !== "C") ? that.getDates(oObject.edatu) : null;*/


                            /* delete oPos.itemsDialog[i].fechaFin;
                             delete oPos.itemsDialog[i].fechaIni;
                             delete oPos.itemsDialog[i].item;
                             delete oPos.itemsDialog[i].reqno;
                             delete oPos.itemsDialog[i].subitem;
                             delete oPos.itemsDialog[i].valorCapita;
                             delete oPos.itemsDialog[i].edatu;*/

                            let oItemSap = {

                                FechaFin: (tipoDeOperacion === "C") ? that.getDates(oObject.fechaFin) : null,
                                FechaIni: (tipoDeOperacion === "C") ? that.getDates(oObject.fechaIni) : null,
                                Subitem: (oObject.subitem) ? oObject.subitem.toString() : (oObject.Subitem) ? oObject.Subitem.toString() : "",
                                Reqno: (oObject.reqno) ? oObject.reqno.toString() : (oObject.Reqno) ? oObject.Reqno.toString() : "",
                                Item: (oObject.item) ? oObject.item.toString() : (oObject.Item) ? oObject.Item.toString() : "",
                                ValorCapita: (oObject.valorCapita) ? oObject.valorCapita.toString() : (oObject.ValorCapita) ? oObject.ValorCapita.toString() : "",
                                Edatu: (tipoDeOperacion !== "C") ? that.getDates(oObject.edatu) : null
                            }
                            itemsDialogSap.push(oItemSap)
                        }

                        debugger;

                        oEntry.PositionSet.push({
                            "Reqno": "",
                            "Item": "",
                            "Kunnr": (contextHeaderData.kunnr === "") ? "" : contextHeaderData.kunnr.split(" ")[0],
                            "Auart": (oPos.auart === "") ? "" : oPos.auart.split(" ")[0],
                            "Matnr": (oPos.matnr === "") ? "" : oPos.matnr.split(" ")[0],
                            "ValorCapita": "0",
                            "FechaIni": null,
                            "FechaFin": null,
                            "Vbeln": "",
                            "SubposCovSet": (oPos.itemMat) ? oPos.itemMat : [],
                            "SubposOrdSet": (itemsDialogSap) ? itemsDialogSap : []
                        });
                    });
                }
            }



            that.getOwnerComponent().getModel("busyModel").setProperty("/page", true);
            debugger;
            oModel.create("/HeaderSet", oEntry, {
                method: "POST",
                success: function (oData, response) {
                    debugger;
                    var dataDocumento = that.getView().getModel("document").getData();

                    if (oData.ReturnSet.results[0].Type === "E") {
                        sap.m.MessageBox.error(oData.ReturnSet.results[0].Message);
                    } else if (oData.ReturnSet.results[0].Type === "S") {
                        sap.m.MessageBox.success(oData.ReturnSet.results[0].Message);
                        that.completeTask("A");
                        //Limpiamos modelo header y filtro sociedad
                        that._Bukrs = "";
                        gContCabModel.setData({
                            "bukrs": "",
                            "tipoAjuste": "",
                            "banfn": "",
                            "vbeln": "",
                            "kunnr": "",
                            "lifnr": "",
                            "fechaMod": null,
                            "fechaIni": null,
                            "fechaFin": null,
                            "bbsrt": "",
                            "rol": "",
                            "duracion": "",
                            "montoTotal": "",
                            "montoInicial": "",
                            "poseeClausula": false,
                            "periodoAjuste": "",
                            "areaResp": "",
                            "objeto": "",
                            "fechaFirma": "",
                            "clausulaAjuste": "",
                            "resumenContrato": "",
                            "Status": "A",
                            "Ernam": "",
                            "CommTextSet": [],
                            "PositionSet": [],
                            "ReturnSet": []
                        });
                        gContPosModel.setProperty("/posData", [{
                            "kunnr": "",
                            "auart": "",
                            "matnr": "",
                            "valorCapita": [],
                            "Coberturas": [],
                            "itemsDialog": [],
                            "itemMat": []
                        }])
                        gContPosModel.setProperty("/posDataModif", [{
                            "kunnr": "",
                            "auart": "",
                            "matnr": "",
                            //"edatu": "",
                            "valorCapita": [],
                            "Coberturas": [],
                            "itemsDialog": [],
                            "itemMat": []
                        }])
                        debugger;
                        that.getOwnerComponent().getModel("CommentsModel").setProperty("/comentarios", []);

                    }
                    that.getOwnerComponent().getModel("busyModel").setProperty("/page", false);
                },
                error: function (oError) {
                    that.getOwnerComponent().getModel("busyModel").setProperty("/page", false);
                    that._oRequestDialog.close();
                    let formattedError = JSON.parse(oError.responseText).error.message.value;
                    sap.m.MessageBox.error(formattedError);
                }
            });
        },

        createDocumentModel: function () {
            var oModel = new JSONModel([]);
            return oModel;
        }

    };
});