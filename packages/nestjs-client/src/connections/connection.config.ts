import { Type } from '@nestjs/common'

import { EventHandler } from '../interfaces'

export type SupportedDatabase = 'postgres' | 'mysql' | 'mariadb' | 'sqlite'

export interface TypeOrmBaseOptions {
  database: string
  host?: string
  port?: number
  username?: string
  password?: string
  synchronize?: boolean
  logging?: boolean
}

export interface PostgresOptions extends TypeOrmBaseOptions {
  type: 'postgres'
  schema?: string
  ssl?: boolean
}

export interface MySqlOptions extends TypeOrmBaseOptions {
  type: 'mysql' | 'mariadb'
  charset?: string
}

export interface SqliteOptions extends TypeOrmBaseOptions {
  type: 'sqlite'
}

export type DatabaseOptions = PostgresOptions | MySqlOptions | SqliteOptions

export interface ConnectionsModuleOptions {
  eventHandler?: EventHandler | Type<EventHandler>
  useTypeOrm?: boolean
  database?: DatabaseOptions
}

export const CONNECTIONS_MODULE_OPTIONS = 'CONNECTIONS_MODULE_OPTIONS'
export const CONNECTIONS_REPOSITORY = 'CONNECTIONS_REPOSITORY'
