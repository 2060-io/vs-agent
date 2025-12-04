export const actionMenu = {
  title: 'Menu',
  description: 'Please choose an option from the menu below:',
  options: [
    {
      id: 'option_1',
      title: 'Option 1',
      description: 'This is the first option',
    },
  ],
}

// Mock Fetch
export const jsonSchemaCredentialMock = JSON.parse(
  '{"@context":["https://www.w3.org/2018/credentials/v1","https://www.w3.org/2018/credentials/examples/v1"],"id":"https://dm.chatbot.demos.dev.2060.io/vt/schemas-example-org-jsc.json","type":["VerifiableCredential","JsonSchemaCredential"],"issuer":"did:webvh:QmZq5CvJVgNk6k2gzze6A7z7PNrpYdpPxjeWD6rFxjfdzY:dm.chatbot.demos.dev.2060.io","issuanceDate":"2025-11-05T20:52:22.688Z","expirationDate":"2035-11-03T20:52:22.688Z","credentialSubject":{"type":"JsonSchema","jsonSchema":{"$ref":"https://dm.chatbot.demos.dev.2060.io/vt/cs/v1/js/ecs-org"},"digestSRI":"sha256-ttE9qtGhU8GrPI33/6Y0sc0AT5XEaBLo0O4z9AMeTBM=","id":"https://dm.chatbot.demos.dev.2060.io/vt/cs/v1/js/ecs-org"},"credentialSchema":{"id":"https://www.w3.org/ns/credentials/json-schema/v2.json","type":"JsonSchema","digestSRI":"sha256-qm/TCo3y3vnDW3lvcF42wTannkJbyU+uUxWHyl23NKM="},"proof":{"verificationMethod":"did:webvh:QmZq5CvJVgNk6k2gzze6A7z7PNrpYdpPxjeWD6rFxjfdzY:dm.chatbot.demos.dev.2060.io#z6MkukriSiZbUxTaiPMPQz6Lu6vEL6vB9vjwfRi4gjFLCx18","type":"Ed25519Signature2020","created":"2025-11-05T20:52:22Z","proofPurpose":"assertionMethod","proofValue":"zDAvpiww2mMp9XaUcWqpmjwEAds3KqauKE3oMVMnZfSWMfYb5vUwon8FfM4twZ6x5Hvcbga7U56HkHzp14GX46J4"}}',
)
export const jsonSchemaOrgMock = {
  schema:
    '{"$id":"https://dm.chatbot.demos.dev.2060.io/vt/cs/v1/js/ecs-org","$schema":"https://json-schema.org/draft/2020-12/schema","title":"OrganizationCredential","description":"OrganizationCredential using JsonSchema","type":"object","properties":{"credentialSubject":{"type":"object","properties":{"id":{"type":"string","format":"uri"},"name":{"type":"string","minLength":0,"maxLength":256},"logo":{"type":"string","contentEncoding":"base64","contentMediaType":"image/png"},"registryId":{"type":"string","minLength":0,"maxLength":256},"registryUrl":{"type":"string","minLength":0,"maxLength":256},"address":{"type":"string","minLength":0,"maxLength":1024},"type":{"type":"string","enum":["PUBLIC","PRIVATE","FOUNDATION"]},"countryCode":{"type":"string","minLength":2,"maxLength":2}},"required":["id","name","logo","registryId","registryUrl","address","type","countryCode"]}}}',
}

// Context
export const contextW3cV1Jsonld = JSON.parse(
  '{"@context":{"id":"@id","type":"@type","@protected":true,"Multikey":{"@id":"https://w3id.org/security#Multikey","@context":{"@protected":true,"id":"@id","type":"@type","controller":{"@id":"https://w3id.org/security#controller","@type":"@id"},"revoked":{"@id":"https://w3id.org/security#revoked","@type":"http://www.w3.org/2001/XMLSchema#dateTime"},"expires":{"@id":"https://w3id.org/security#expiration","@type":"http://www.w3.org/2001/XMLSchema#dateTime"},"publicKeyMultibase":{"@id":"https://w3id.org/security#publicKeyMultibase","@type":"https://w3id.org/security#multibase"},"secretKeyMultibase":{"@id":"https://w3id.org/security#secretKeyMultibase","@type":"https://w3id.org/security#multibase"}}}}}',
)
export const contextSignature2020V1Jsonld = JSON.parse(
  '{"@context":{"id":"@id","type":"@type","@protected":true,"proof":{"@id":"https://w3id.org/security#proof","@type":"@id","@container":"@graph"},"Ed25519VerificationKey2020":{"@id":"https://w3id.org/security#Ed25519VerificationKey2020","@context":{"@protected":true,"id":"@id","type":"@type","controller":{"@id":"https://w3id.org/security#controller","@type":"@id"},"revoked":{"@id":"https://w3id.org/security#revoked","@type":"http://www.w3.org/2001/XMLSchema#dateTime"},"publicKeyMultibase":{"@id":"https://w3id.org/security#publicKeyMultibase","@type":"https://w3id.org/security#multibase"}}},"Ed25519Signature2020":{"@id":"https://w3id.org/security#Ed25519Signature2020","@context":{"@protected":true,"id":"@id","type":"@type","challenge":"https://w3id.org/security#challenge","created":{"@id":"http://purl.org/dc/terms/created","@type":"http://www.w3.org/2001/XMLSchema#dateTime"},"domain":"https://w3id.org/security#domain","expires":{"@id":"https://w3id.org/security#expiration","@type":"http://www.w3.org/2001/XMLSchema#dateTime"},"nonce":"https://w3id.org/security#nonce","proofPurpose":{"@id":"https://w3id.org/security#proofPurpose","@type":"@vocab","@context":{"@protected":true,"id":"@id","type":"@type","assertionMethod":{"@id":"https://w3id.org/security#assertionMethod","@type":"@id","@container":"@set"},"authentication":{"@id":"https://w3id.org/security#authenticationMethod","@type":"@id","@container":"@set"},"capabilityInvocation":{"@id":"https://w3id.org/security#capabilityInvocationMethod","@type":"@id","@container":"@set"},"capabilityDelegation":{"@id":"https://w3id.org/security#capabilityDelegationMethod","@type":"@id","@container":"@set"},"keyAgreement":{"@id":"https://w3id.org/security#keyAgreementMethod","@type":"@id","@container":"@set"}}},"proofValue":{"@id":"https://w3id.org/security#proofValue","@type":"https://w3id.org/security#multibase"},"verificationMethod":{"@id":"https://w3id.org/security#verificationMethod","@type":"@id"}}}}}',
)
export const contextLinkedVp = JSON.parse(
  '{"@context":[{"@version":1.1,"@protected":true,"LinkedVerifiablePresentation":"https://identity.foundation/linked-vp/contexts/v1#LinkedVerifiablePresentation"}]}',
)
export const contextCredentialExamples = JSON.parse(
  '{"@context":[{"@version":1.1},"https://www.w3.org/ns/odrl.jsonld",{"ex":"https://example.org/examples#","schema":"http://schema.org/","rdf":"http://www.w3.org/1999/02/22-rdf-syntax-ns#","3rdPartyCorrelation":"ex:3rdPartyCorrelation","AllVerifiers":"ex:AllVerifiers","Archival":"ex:Archival","BachelorDegree":"ex:BachelorDegree","Child":"ex:Child","CLCredentialDefinition2019":"ex:CLCredentialDefinition2019","CLSignature2019":"ex:CLSignature2019","IssuerPolicy":"ex:IssuerPolicy","HolderPolicy":"ex:HolderPolicy","Mother":"ex:Mother","RelationshipCredential":"ex:RelationshipCredential","UniversityDegreeCredential":"ex:UniversityDegreeCredential","AlumniCredential":"ex:AlumniCredential","DisputeCredential":"ex:DisputeCredential","PrescriptionCredential":"ex:PrescriptionCredential","ZkpExampleSchema2018":"ex:ZkpExampleSchema2018","issuerData":"ex:issuerData","attributes":"ex:attributes","signature":"ex:signature","signatureCorrectnessProof":"ex:signatureCorrectnessProof","primaryProof":"ex:primaryProof","nonRevocationProof":"ex:nonRevocationProof","alumniOf":{"@id":"schema:alumniOf","@type":"rdf:HTML"},"child":{"@id":"ex:child","@type":"@id"},"degree":"ex:degree","degreeType":"ex:degreeType","degreeSchool":"ex:degreeSchool","college":"ex:college","name":{"@id":"schema:name","@type":"rdf:HTML"},"givenName":"schema:givenName","familyName":"schema:familyName","parent":{"@id":"ex:parent","@type":"@id"},"referenceId":"ex:referenceId","documentPresence":"ex:documentPresence","evidenceDocument":"ex:evidenceDocument","spouse":"schema:spouse","subjectPresence":"ex:subjectPresence","verifier":{"@id":"ex:verifier","@type":"@id"},"currentStatus":"ex:currentStatus","statusReason":"ex:statusReason","prescription":"ex:prescription"}]}',
)

export const mockResponses: { [key: string]: any } = {
  'https://example.org/vt/schemas-example-org-jsc.json': jsonSchemaCredentialMock,
  'https://dm.chatbot.demos.dev.2060.io/vt/cs/v1/js/ecs-org': jsonSchemaOrgMock,
  'https://w3id.org/security/multikey/v1': contextW3cV1Jsonld,
  'https://w3id.org/security/suites/ed25519-2020/v1': contextSignature2020V1Jsonld,
  'https://identity.foundation/linked-vp/contexts/v1': contextLinkedVp,
  'https://www.w3.org/2018/credentials/examples/v1': contextCredentialExamples,
}
