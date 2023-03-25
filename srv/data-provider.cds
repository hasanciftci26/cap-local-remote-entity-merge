using {
    MaterialCodes as mc,
    PCFValues     as pcf
} from '../db/data-models';

service ReturnablePackaging {
    entity MaterialMasterPlantData as projection on mc;
    entity PCFValues               as projection on pcf;
};
