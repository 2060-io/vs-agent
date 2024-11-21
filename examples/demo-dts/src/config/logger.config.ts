import { LogLevel, Logger } from '@nestjs/common'

export function getLogLevels(): LogLevel[] {
  const logger = new Logger('getLogLevels')
  const logLevelConfig = parseInt(process.env.LOG_LEVEL, 10) || 1

  const logLevels: LogLevel[] = ['log'] // Default to 'log'

  // Adjust log levels based on the configuration
  switch (logLevelConfig) {
    case 2:
      logLevels.push('debug')
      logger.log('Log levels set to: log, debug')
      break
    case 3:
      logLevels.push('debug', 'error')
      logger.log('Log levels set to: log, debug, error')
      break
    default:
      logLevels.push('error') // Default to 'log' and 'error'
      logger.log('Log levels set to: log, error')
  }

  logger.log(`Configured log level: ${logLevels}`)
  return logLevels
}
