// stats.service.ts
import { StatEnum, StatEvent } from '@2060.io/service-agent-model'
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Container, Connection, Sender, create_container } from 'rhea'

import { StatEventOptions } from '../types'

@Injectable()
export class StatProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StatProducerService.name)
  private connection: Connection | null = null
  private sender: Sender | null = null
  private container: Container

  private readonly config: {
    host: string
    port: number
    queue: string
    username: string
    password: string
    reconnectLimit: number
    threads: number
    delay: number
  }

  constructor(@Inject('GLOBAL_MODULE_OPTIONS') private options: StatEventOptions) {
    this.container = create_container()
    this.config = {
      host: options.jmsOptions?.host || 'localhost',
      port: options.jmsOptions?.port || 61616,
      queue: options.jmsOptions?.queue || 'stats-queue',
      username: options.jmsOptions?.username || 'quarkus',
      password: options.jmsOptions?.password || 'quarkus',
      reconnectLimit: options.jmsOptions?.reconnectLimit || 10,
      threads: options.jmsOptions?.threads || 1,
      delay: options.jmsOptions?.delay || 1000,
    }

    this.logger.log('StatProducerService instantiated')
  }

  async onModuleInit() {
    this.logger.log(`Initializing StatProducer with queue: ${this.config.queue}`)
    await this.connect()
  }

  async onModuleDestroy() {
    await this.disconnect()
  }

  private async connect() {
    try {
      this.connection = this.container.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password,
        reconnect: true,
        reconnect_limit: this.config.reconnectLimit,
      })

      this.sender = this.connection.open_sender(this.config.queue)

      this.sender.on('accepted', () => {
        this.logger.debug('Message accepted')
      })

      this.sender.on('rejected', context => {
        this.logger.error(`Message rejected: ${context.error}`)
      })

      this.logger.log('Successfully connected to ActiveMQ')
    } catch (error) {
      this.logger.error(`Failed to connect: ${error.message}`)
      throw error
    }
  }

  private async disconnect() {
    try {
      if (this.sender) {
        await this.sender.close()
      }
      if (this.connection) {
        await this.connection.close()
      }
      this.logger.log('Successfully disconnected from ActiveMQ')
    } catch (error) {
      this.logger.error(`Error disconnecting: ${error.message}`)
    }
  }

  async spool(
    statClass: string | string[],
    entityId: string,
    statEnums: StatEnum[],
    ts: Date = new Date(),
    increment: number = 1,
  ): Promise<void> {
    if (!this.sender) {
      this.logger.error('Sender is not initialized. Attempting to reconnect...')
      await this.connect()

      if (!this.sender) {
        throw new Error('Failed to initialize sender after reconnection attempt')
      }
    }
    const statClasses = Array.isArray(statClass) ? statClass : [statClass]

    for (const currentStatClass of statClasses) {
      const event = new StatEvent(entityId, statEnums, increment, ts, currentStatClass)

      try {
        const msg = {
          body: JSON.stringify(event),
        }
        this.sender.send(msg)
        this.logger.debug(`Sending message: ${msg.body}`)
      } catch (error) {
        this.logger.error(`Failed to send message: ${error.message}`)
        throw error
      }
    }
  }

  async spoolSingle(
    statClass: string,
    entityId: string,
    statEnum: StatEnum,
    ts: Date = new Date(),
    increment: number = 1,
  ): Promise<void> {
    await this.spool(statClass, entityId, [statEnum], ts, increment)
  }
}
