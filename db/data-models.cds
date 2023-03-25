@cds.persistence.skip
entity MaterialCodes {
    key ID                  : UUID;
        materialCode        : String(40);
        plant               : String(4);
        standardPrice_price : Decimal(11, 2);
        pcfValue            : Integer;
};

entity PCFValues {
    key materialCode : String(40);
    key plant        : String(4);
        pcfValue     : Integer;
};
