// src/modules/message/dto/base-message.dto.ts

import { BaseMessage, MessageType } from '@2060.io/vs-agent-model'
import { ApiProperty, ApiPropertyOptional, ApiHideProperty } from '@nestjs/swagger'

export class BaseMessageDto extends BaseMessage {
  @ApiProperty({
    enum: MessageType,
    description: 'Type of message',
    example: MessageType.TextMessage,
  })
  override readonly type!: MessageType

  @ApiProperty({
    description: 'Connection ID',
    example: '2ab2e45e-d896-40bb-9d03-1f79e6083c33',
  })
  override connectionId!: string

  @ApiPropertyOptional({
    description: 'Message ID (generated if not provided)',
    example: 'a1b2c3d4',
  })
  override id!: string

  @ApiPropertyOptional({
    description: 'Thread ID within the connection',
    example: 'thread-xyz',
  })
  override threadId?: string

  @ApiPropertyOptional({
    description: 'Timestamp in ISO-8601 format',
    example: '2025-07-08T12:00:00Z',
    type: String,
  })
  override timestamp!: Date

  // Payload-specific fields

  @ApiPropertyOptional({
    description: 'Text content of a text message',
    example: 'Hello, world!',
  })
  content?: string

  @ApiPropertyOptional({
    description: 'Label for invitation messages',
    example: 'My Service',
  })
  label?: string

  @ApiPropertyOptional({
    description: 'Avatar or image URL for invitation messages',
    example: 'https://aservice.com/avatar.png',
  })
  imageUrl?: string

  @ApiPropertyOptional({
    description: 'DID for invitation messages',
    example: 'did:web:aservice.com',
  })
  did?: string

  // Hide internal methods from Swagger

  @ApiHideProperty()
  override generateId!: () => string

  @ApiHideProperty()
  override toJSON!: () => Record<string, any>
}
