export function getEcsSchemas(publicApiBaseUrl: string) {
  return {
    'ecs-org': {
      $id: `${publicApiBaseUrl}/self-tr/v1/cs/js/ecs-org`,
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: 'OrganizationCredential',
      description: 'OrganizationCredential using JsonSchema',
      type: 'object',
      properties: {
        credentialSubject: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uri',
            },
            name: {
              type: 'string',
              minLength: 0,
              maxLength: 256,
            },
            logo: {
              type: 'string',
              contentEncoding: 'base64',
              contentMediaType: 'image/png',
            },
            registryId: {
              type: 'string',
              minLength: 0,
              maxLength: 256,
            },
            registryUrl: {
              type: 'string',
              minLength: 0,
              maxLength: 256,
            },
            address: {
              type: 'string',
              minLength: 0,
              maxLength: 1024,
            },
            type: {
              type: 'string',
              enum: ['PUBLIC', 'PRIVATE', 'FOUNDATION'],
            },
            countryCode: {
              type: 'string',
              minLength: 2,
              maxLength: 2,
            },
          },
          required: ['id', 'name', 'logo', 'registryId', 'registryUrl', 'address', 'type', 'countryCode'],
        },
      },
    },
    'ecs-person': {
      $id: `${publicApiBaseUrl}/self-tr/v1/cs/js/ecs-person`,
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: 'PersonCredential',
      description: 'PersonCredential using JsonSchema',
      type: 'object',
      properties: {
        credentialSubject: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uri',
            },
            firstName: {
              type: 'string',
              minLength: 0,
              maxLength: 256,
            },
            lastName: {
              type: 'string',
              minLength: 1,
              maxLength: 256,
            },
            avatar: {
              type: 'string',
              contentEncoding: 'base64',
              contentMediaType: 'image/png',
            },
            birthDate: {
              type: 'string',
              format: 'date',
            },
            countryOfResidence: {
              type: 'string',
              minLength: 2,
              maxLength: 2,
            },
          },
          required: ['id', 'lastName', 'birthDate', 'countryOfResidence'],
        },
      },
    },
    'ecs-service': {
      $id: `${publicApiBaseUrl}/self-tr/v1/cs/js/ecs-service`,
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: 'ServiceCredential',
      description: 'ServiceCredential using JsonSchema',
      type: 'object',
      properties: {
        credentialSubject: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uri',
            },
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 512,
            },
            type: {
              type: 'string',
              minLength: 1,
              maxLength: 128,
            },
            description: {
              type: 'string',
              minLength: 0,
              maxLength: 4096,
            },
            logo: {
              type: 'string',
              contentEncoding: 'base64',
              contentMediaType: 'image/png',
            },
            minimumAgeRequired: {
              type: 'number',
              minimum: 0,
              exclusiveMaximum: 150,
            },
            termsAndConditions: {
              type: 'string',
              format: 'uri',
              maxLength: 2048,
            },
            termsAndConditionsHash: {
              type: 'string',
            },
            privacyPolicy: {
              type: 'string',
              format: 'uri',
              maxLength: 2048,
            },
            privacyPolicyHash: {
              type: 'string',
            },
          },
          required: [
            'id',
            'name',
            'type',
            'description',
            'logo',
            'minimumAgeRequired',
            'termsAndConditions',
            'privacyPolicy',
          ],
        },
      },
    },
    'ecs-user-agent': {
      $id: `${publicApiBaseUrl}/self-tr/v1/cs/js/ecs-user-agent`,
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: 'UserAgentCredential',
      description: 'UserAgentCredential using JsonSchema',
      type: 'object',
      properties: {
        credentialSubject: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uri',
            },
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 512,
            },
            description: {
              type: 'string',
              minLength: 0,
              maxLength: 4096,
            },
            category: {
              type: 'string',
              minLength: 1,
              maxLength: 128,
            },
            logo: {
              type: 'string',
              contentEncoding: 'base64',
              contentMediaType: 'image/png',
            },
            wallet: {
              type: 'boolean',
            },
            termsAndConditions: {
              type: 'string',
              format: 'uri',
              maxLength: 2048,
            },
            termsAndConditionsHash: {
              type: 'string',
            },
            privacyPolicy: {
              type: 'string',
              format: 'uri',
              maxLength: 2048,
            },
            privacyPolicyHash: {
              type: 'string',
            },
          },
          required: [
            'id',
            'name',
            'description',
            'category',
            'logo',
            'wallet',
            'termsAndConditions',
            'privacyPolicy',
          ],
        },
      },
    },
  }
}
