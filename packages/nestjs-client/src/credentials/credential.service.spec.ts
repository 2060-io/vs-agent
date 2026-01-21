import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { CredentialStatus } from '../types'

import { CredentialEntity } from './credential.entity'
import { CredentialService } from './credential.service'
import { RevocationRegistryEntity } from './revocation-registry.entity'

// Mock for external API client
const mockSend = vi.fn().mockResolvedValue({ id: 'mocked-id' })
const mockCreate = vi.fn().mockResolvedValue({
  id: 'test-id',
  name: 'TestCred',
  version: '1.0',
  revocationSupported: true,
})
const mockGetAll = vi.fn().mockResolvedValue([
  {
    id: 'test-def-id',
    name: 'TestCred',
    version: '1.0',
    revocationSupported: true,
  },
])
vi.mock('@verana-labs/vs-agent-client', () => {
  return {
    ApiClient: vi.fn().mockImplementation(function () {
      return {
        credentialTypes: {
          getAll: mockGetAll,
          create: mockCreate,
        },
        messages: {
          send: mockSend,
        },
        revocationRegistries: {
          create: vi.fn().mockResolvedValue('rev-registry-id'),
        },
      }
    }),
    ApiVersion: {
      V1: 'v1',
    },
  }
})

describe('CredentialService', () => {
  let service: CredentialService
  let credentialRepository: Repository<CredentialEntity>
  let revocationRepository: Repository<RevocationRegistryEntity>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialService,
        {
          provide: getRepositoryToken(CredentialEntity),
          useValue: {
            find: vi.fn(),
            save: vi.fn(),
            findOne: vi.fn(),
            manager: {
              transaction: vi.fn(),
            },
          },
        },
        {
          provide: getRepositoryToken(RevocationRegistryEntity),
          useClass: Repository,
        },
        {
          provide: 'GLOBAL_MODULE_OPTIONS',
          useValue: { url: 'http://example.com' },
        },
      ],
    }).compile()

    service = module.get<CredentialService>(CredentialService)
    credentialRepository = module.get(getRepositoryToken(CredentialEntity))
    revocationRepository = module.get(getRepositoryToken(RevocationRegistryEntity))
  })

  describe('createType', () => {
    it('should create a credential type when getAll returns empty array', async () => {
      const getAllMock = vi.fn().mockResolvedValue([])
      service['apiClient'].credentialTypes.getAll = getAllMock
      const createRevocationRegistryMock = vi
        .spyOn(service as any, 'createRevocationRegistry')
        .mockResolvedValue({})

      vi.spyOn(service as any, 'createRevocationRegistry').mockResolvedValue({})

      await service.createType('TestCred', '1.0', ['email'], { supportRevocation: true })

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'TestCred',
          version: '1.0',
          attributes: ['email'],
          supportRevocation: true,
        }),
      )
      expect(createRevocationRegistryMock).toHaveBeenCalledTimes(2)
      expect(createRevocationRegistryMock).toHaveBeenCalledWith('test-id', undefined)
    })

    it('should not create a credential type when it already exists', async () => {
      const getAllMock = vi.fn().mockResolvedValue([
        {
          name: 'TestCred',
          version: '1.0',
          attributes: ['email'],
          revocationSupported: true,
        },
      ])
      const createMock = vi.fn()
      const createRevocationRegistryMock = vi
        .spyOn(service as any, 'createRevocationRegistry')
        .mockResolvedValue({})

      service['apiClient'].credentialTypes.getAll = getAllMock
      service['apiClient'].credentialTypes.create = createMock

      await service.createType('TestCred', '1.0', ['email'])

      expect(createMock).not.toHaveBeenCalled()
      expect(createRevocationRegistryMock).not.toHaveBeenCalled()
    })
  })

  describe('issue', () => {
    const mockClaims = { name: 'John Doe' }
    const mockRevocationRegistry = {
      revocationDefinitionId: 'rev-def-id',
      currentIndex: 0,
      maximumCredentialNumber: 5,
    } as RevocationRegistryEntity
    const mockFindCredential = {
      id: 'cred-123',
      connectionId: 'conn-123',
      revocationRegistry: {
        revocationDefinitionId: 'rev-def-id',
        currentIndex: 0,
        maximumCredentialNumber: 5,
      },
    } as CredentialEntity
    const mockCredential = {
      id: 'cred-123',
      connectionId: 'conn-123',
      status: CredentialStatus.OFFERED,
      revocationRegistry: {
        revocationDefinitionId: 'rev-def-id',
        currentIndex: 0,
        maximumCredentialNumber: 5,
      },
    } as CredentialEntity
    it('should issue a credential successfully', async () => {
      const getAllMock = vi.fn().mockResolvedValue([
        {
          id: 'def-id',
          name: 'TestCred',
          version: '1.0',
          attributes: ['email'],
          revocationSupported: true,
        },
      ])

      service['apiClient'].credentialTypes.getAll = getAllMock

      vi.spyOn(credentialRepository, 'find').mockResolvedValue([])
      vi.spyOn(credentialRepository.manager, 'transaction').mockResolvedValue(mockFindCredential)

      vi.spyOn(credentialRepository, 'save').mockResolvedValue(mockCredential)
      vi.spyOn(revocationRepository, 'save').mockResolvedValue(mockRevocationRegistry)
      vi.spyOn(service, 'revoke').mockResolvedValue(undefined)

      await service.issue('conn-123', mockClaims, { credentialDefinitionId: 'def-id' })

      expect(credentialRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ threadId: 'mocked-id', status: CredentialStatus.OFFERED }),
      )
      expect(revocationRepository.save).toHaveBeenCalledWith(expect.objectContaining({ currentIndex: 1 }))
      expect(service.revoke).not.toHaveBeenCalled()
    })

    it('should throw an error if no credential definitions are found', async () => {
      service['apiClient'].credentialTypes.getAll = vi.fn().mockResolvedValue([])

      await expect(service.issue('conn-123', {}, { credentialDefinitionId: 'def-id' })).rejects.toThrow(
        'No credential definitions found. Please configure a credential using the create method before proceeding.',
      )
    })

    it('should revoke existing credentials if revokeIfAlreadyIssued is true', async () => {
      const existingCreds = [{ threadId: 'thread-123' } as CredentialEntity]
      const getAllMock = vi.fn().mockResolvedValue([
        {
          id: 'def-id',
          name: 'TestCred',
          version: '1.0',
          attributes: ['email'],
          revocationSupported: true,
        },
      ])

      service['apiClient'].credentialTypes.getAll = getAllMock
      vi.spyOn(credentialRepository, 'find').mockResolvedValue(existingCreds)
      vi.spyOn(credentialRepository.manager, 'transaction').mockResolvedValue(mockFindCredential)

      vi.spyOn(credentialRepository, 'save').mockResolvedValue(mockCredential)
      vi.spyOn(revocationRepository, 'save').mockResolvedValue(mockRevocationRegistry)
      vi.spyOn(service, 'revoke').mockResolvedValue(undefined)

      await service.issue('conn-123', mockClaims, {
        credentialDefinitionId: 'def-id',
        revokeIfAlreadyIssued: true,
      })

      expect(service.revoke).toHaveBeenCalledWith('conn-123', existingCreds[0].threadId)
    })
  })

  describe('handleAcceptance', () => {
    it('should update credential status to ACCEPTED', async () => {
      const mockCredential = {
        threadId: 'thread-123',
        status: CredentialStatus.OFFERED,
      } as CredentialEntity

      vi.spyOn(credentialRepository, 'findOne').mockResolvedValue(mockCredential)
      vi.spyOn(credentialRepository, 'save').mockResolvedValue(mockCredential)

      await service.handleAcceptance('thread-123')

      expect(credentialRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: CredentialStatus.ACCEPTED }),
      )
    })
  })

  describe('handleRejection', () => {
    it('should update credential status to ACCEPTED', async () => {
      const mockCredential = {
        threadId: 'thread-123',
        status: CredentialStatus.OFFERED,
      } as CredentialEntity

      vi.spyOn(credentialRepository, 'findOne').mockResolvedValue(mockCredential)
      vi.spyOn(credentialRepository, 'save').mockResolvedValue(mockCredential)

      await service.handleRejection('thread-123')

      expect(credentialRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: CredentialStatus.REJECTED }),
      )
    })
  })

  describe('revoke', () => {
    it('should revoke a credential successfully with threadId', async () => {
      const mockCredential = {
        id: 'cred-123',
        connectionId: 'conn-123',
        threadId: 'thread-123',
        status: CredentialStatus.ACCEPTED,
        revocationRegistry: {
          credentialDefinitionId: 'def-id',
        },
      } as CredentialEntity

      vi.spyOn(credentialRepository, 'findOne').mockResolvedValue(mockCredential)
      vi.spyOn(credentialRepository, 'save').mockResolvedValue(mockCredential)

      await service.revoke('conn-123', 'thread-123')

      expect(credentialRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: CredentialStatus.REVOKED }),
      )
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ connectionId: 'conn-123' }))
    })

    it('should throw an error if credential is not found', async () => {
      vi.spyOn(credentialRepository, 'findOne').mockResolvedValue(null)

      await expect(service.revoke('conn-123', 'thread-123')).rejects.toThrow(
        'Credential not found with threadId "thread-123" or connectionId "conn-123".',
      )
    })
  })
})
