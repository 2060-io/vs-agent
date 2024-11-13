// src/services/MessageService.ts

import { BaseMessage } from '@2060.io/model'
import { Logger } from 'tslog'

import { ApiVersion } from '../types/enums'

const logger = new Logger()

export class MessageService {
  private url: string

  constructor(
    private baseURL: string,
    private version: ApiVersion,
  ) {
    this.url = `${this.baseURL}/${this.version}/message`
  }

  public async sendMessage(message: BaseMessage): Promise<{ id: string }> {
    try {
      // Log the message content before sending
      logger.info(`submitMessage: ${JSON.stringify(message)}`)

      // Send the message via POST request
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      })

      // Log the full response text
      const responseText = await response.text()
      logger.info(`response: ${responseText}`)

      // Parse and return the JSON response as expected
      return JSON.parse(responseText) as { id: string }
    } catch (error) {
      logger.error(`Failed to send message: ${error}`)
      throw new Error('Failed to send message')
    }
  }
}
