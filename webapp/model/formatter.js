sap.ui.define([
    "sap/ui/core/format/NumberFormat"
],

function (NumberFormat) {
    "use strict";

    return {
        /**
         * Format JS Date object to OData date format 
         * @public
         * @param {Date} oValue the date field
         * @returns {String} sValue in OData format yyyy-MM-ddTHH:mm:ss
         */
        formatDate: function (oValue) {
            if (!oValue) {
                oValue = new Date();
            }
            return oValue.getFullYear() + '-' + (oValue.getMonth() + 1) + '-' + oValue.getDate() + 'T00:00:00';
        },

        formatPrice: function (price) {
            price = (price) ? price : 0;

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

            if (price.toString().includes(".")) {
                var split = price.toString().split(".");
                var entero = split[0];
                var decimals = split[1].substring(0, 2);
                price = entero + "." + decimals;
            }

            return oCurrency.formatValue([price], "string");
        },

        formatNumberPost: function (num) {
            let oNum = num;
            /*if (oNum.includes(".")) {
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
        }
    };
});    