import { registerAs } from '@nestjs/config'

/**
 * Configuration for the application, including ports, database URIs, and service URLs.
 *
 * @returns {object} - An object containing the configuration settings for the application.
 */
export default registerAs('appConfig', () => ({
  /**
   * The port number on which the application will run.
   * Defaults to 3500 if APP_PORT is not set in the environment variables.
   * @type {number}
   */
  appPort: parseInt(process.env.APP_PORT, 10) || 3000,

  /**
   * Hostname or IP address for the PostgreSQL database.
   * Defaults to an empty string if POSTGRES_HOST is not set in the environment variables.
   * @type {string}
   */
  postgresHost: process.env.POSTGRES_HOST || '',

  /**
   * Username for the PostgreSQL database.
   * Defaults to an empty string if POSTGRES_USER is not set in the environment variables.
   * @type {string}
   */
  postgresUser: process.env.POSTGRES_USER || '',

  /**
   * Password for the PostgreSQL database.
   * Defaults to an empty string if POSTGRES_PASSWORD is not set in the environment variables.
   * @type {string}
   */
  postgresPassword: process.env.POSTGRES_PASSWORD || '',

  /**
   * Base URL for the Service Agent Admin.
   * Defaults to an empty string if SERVICE_AGENT_ADMIN_BASE_URL is not set in the environment variables.
   * @type {string}
   */
  serviceAgentAdminBaseUrl: process.env.SERVICE_AGENT_ADMIN_BASE_URL || '',

  /**
   * API version for the application.
   * Defaults to '1.0' if API_VERSION is not set in the environment variables.
   * @type {string}
   */
  apiVersion: process.env.API_VERSION || 'v1',
}))
