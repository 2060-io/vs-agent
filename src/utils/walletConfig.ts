import type { AskarWalletPostgresStorageConfig } from '@credo-ts/askar/build/wallet'

import { KeyDerivationMethod } from '@credo-ts/core'

export const POSTGRES_HOST = process.env.POSTGRES_HOST
export const POSTGRES_USER = process.env.POSTGRES_USER
export const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD
export const POSTGRES_ADMIN_USER = process.env.POSTGRES_ADMIN_USER
export const POSTGRES_ADMIN_PASSWORD = process.env.POSTGRES_ADMIN_PASSWORD

export const askarPostgresConfig: AskarWalletPostgresStorageConfig = {
  type: 'postgres',
  config: {
    host: POSTGRES_HOST as string,
    connectTimeout: 10,
    maxConnections: 2
  },
  credentials: {
    account: POSTGRES_USER as string,
    password: POSTGRES_PASSWORD as string,
    adminAccount: POSTGRES_USER as string,
    adminPassword: POSTGRES_PASSWORD as string,
  },
}

export const keyDerivationMethodMap: { [key: string]: KeyDerivationMethod } = {
  ARGON2I_INT: KeyDerivationMethod.Argon2IInt,
  ARGON2I_MOD: KeyDerivationMethod.Argon2IMod,
  RAW: KeyDerivationMethod.Raw,
}
