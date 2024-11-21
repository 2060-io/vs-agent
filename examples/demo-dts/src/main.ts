import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ConfigService } from '@nestjs/config'
import { I18nValidationExceptionFilter, I18nValidationPipe } from 'nestjs-i18n'
import { getLogLevels } from './config/logger.config'
import { Logger } from '@nestjs/common'

async function bootstrap() {
  const logLevels = getLogLevels()

  // Create the NestJS application with custom logger levels
  const app = await NestFactory.create(AppModule, {
    logger: logLevels,
  })

  const configService = app.get(ConfigService)
  const logger = new Logger(bootstrap.name)

  app.useGlobalPipes(new I18nValidationPipe())

  app.useGlobalFilters(
    new I18nValidationExceptionFilter({
      detailedErrors: false,
    }),
  )

  const port = configService.get('appConfig.appPort')

  await app.listen(port)
  // Log the URL where the application is running
  logger.log(`Application running on: ${await app.getUrl()} `)
}
bootstrap()
