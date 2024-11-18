import { DataSourceOptions } from 'typeorm'

import { DatabaseOptions, MySqlOptions } from './connection.config'
import { ConnectionEntity } from './connection.entity'

export function getTypeOrmConfig(options: DatabaseOptions): DataSourceOptions {
  const baseConfig: Partial<DataSourceOptions> = {
    entities: [ConnectionEntity],
    synchronize: options.synchronize ?? false,
    logging: options.logging ?? false,
  }

  switch (options.type) {
    case 'postgres':
      return {
        ...baseConfig,
        type: 'postgres',
        host: options.host || 'localhost',
        port: options.port || 5432,
        username: options.username,
        password: options.password,
        database: options.database,
        schema: options.schema,
        ssl: options.ssl,
      } as DataSourceOptions

    case 'mysql':
    case 'mariadb':
      return {
        ...baseConfig,
        type: options.type,
        host: options.host || 'localhost',
        port: options.port || 3306,
        username: options.username,
        password: options.password,
        database: options.database,
        charset: (options as MySqlOptions).charset,
      } as DataSourceOptions

    case 'sqlite':
      return {
        ...baseConfig,
        type: 'sqlite',
        database: options.database,
      } as DataSourceOptions

    default:
      throw new Error(`Unsupported database type: ${(options as any).type}`)
  }
}
