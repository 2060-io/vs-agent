export type EMrtdRawData = {
    raw: Record<string, string>;
    processed: {
        fields?: EMrtdProcessedData;
    };
};
export type EMrtdProcessedData = {
    mrzData: string;
    firstName: string;
    lastName: string;
    faceDataUrl: string;
    fingerprintDataUrl?: string;
    birthDate: number;
    placeOfBirth: string;
    issuanceDate: number;
};