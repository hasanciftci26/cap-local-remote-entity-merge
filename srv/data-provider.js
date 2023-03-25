const cds = require("@sap/cds"),
    dbClass = require("sap-hdbext-promisfied"),
    hdbext = require("@sap/hdbext");

module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db"),
        MaterialMasterPlantDataSrv = await cds.connect.to("MaterialMasterPlantData"),
        { MaterialMasterPlantData } = MaterialMasterPlantDataSrv.entities;

    this.on("READ", "MaterialMasterPlantData", async (req, next) => {
        let oSELECT = req.query.SELECT,
            iOffset = oSELECT.limit?.offset?.val,
            iRows = oSELECT.limit?.rows?.val,
            oWhere = oSELECT.where ? oSELECT.where : undefined,
            aMaterialCodes = [];

        if (oSELECT.one) {
            let oID = oSELECT.from.ref[0].where;

            aMaterialCodes = await MaterialMasterPlantDataSrv.run(
                SELECT(["ID", "materialCode", "plant", "standardPrice_price"])
                    .from(MaterialMasterPlantData).where(oID)
            );
        } else {
            if (oWhere) {
                aMaterialCodes = await MaterialMasterPlantDataSrv.run(
                    iOffset ?
                        SELECT(["ID", "materialCode", "plant", "standardPrice_price"])
                            .from(MaterialMasterPlantData).where(oWhere) :
                        SELECT(["ID", "materialCode", "plant", "standardPrice_price"])
                            .from(MaterialMasterPlantData).limit(iRows, iOffset).where(oWhere)
                );
            } else {
                aMaterialCodes = await MaterialMasterPlantDataSrv.run(
                    iOffset ?
                        SELECT(["ID", "materialCode", "plant", "standardPrice_price"])
                            .from(MaterialMasterPlantData) :
                        SELECT(["ID", "materialCode", "plant", "standardPrice_price"])
                            .from(MaterialMasterPlantData).limit(iRows, iOffset)
                );
            }
        }

        aMaterialCodes.forEach((material) => {
            material.pcfValue = null;
        });

        return oSELECT.one ? aMaterialCodes[0] : aMaterialCodes;
    });

    this.after("READ", "MaterialMasterPlantData", async (aData, req) => {
        const oDbConn = new dbClass(await dbClass.createConnection(db.options.credentials)),
            oGetPCFValuesProc = await oDbConn.loadProcedurePromisified(hdbext, null, "GET_PCF_VALUES"),
            aProcedureImport = [];
        let oPCFValues = {},
            aPCFValues = [];

        if (aData.hasOwnProperty("length")) {
            aData.forEach((data) => {
                aProcedureImport.push({
                    MATERIAL_CODE: data.materialCode,
                    PLANT: data.plant
                });
            });
        } else {
            aProcedureImport.push({
                MATERIAL_CODE: aData.materialCode,
                PLANT: aData.plant
            });
        }

        try {
            oPCFValues = await oDbConn.callProcedurePromisified(oGetPCFValuesProc, {
                IT_MATERIAL_DATA: aProcedureImport
            });
            aPCFValues = oPCFValues.results;
        } catch (error) {
            let sErrorMessage = error["jse_cause"] ? error["jse_cause"].message : error.message;
            return req.reject(500, sErrorMessage);
        }

        if (aData.hasOwnProperty("length")) {
            aData.forEach((data) => {
                let oPCF = aPCFValues.find((pcf) => {
                    return pcf.MATERIAL_CODE == data.materialCode &&
                        pcf.PLANT == data.plant
                });

                if (oPCF) {
                    data.pcfValue = oPCF.PCF_VALUE;
                }
            });
        } else {
            if (aPCFValues.length) {
                aData.pcfValue = aPCFValues[0].PCF_VALUE;
            }
        }

        return aData;
    });
});