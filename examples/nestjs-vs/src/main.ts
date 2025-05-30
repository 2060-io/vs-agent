import { NestFactory } from '@nestjs/core'
import { AppModule } from '@/app.module'
import { ConfigService } from '@nestjs/config'
import { I18nValidationExceptionFilter, I18nValidationPipe } from 'nestjs-i18n'
import { getLogLevels } from '@/config'
import { Logger } from '@nestjs/common'
import * as fs from 'fs'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

/**
 * Bootstraps the NestJS application, setting up configurations, middleware, and documentation.
 *
 * @returns {Promise<void>} - A promise that resolves when the application has started successfully.
 */
async function bootstrap() {
  const logLevels = getLogLevels()

  // Create the NestJS application with custom logger levels
  const app = await NestFactory.create(AppModule, {
    logger: logLevels,
  })

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('API Documentation')
    .setVersion('1.0')
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, document)

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

  // Retrieve application name and version from package.json
  const packageJson = JSON.parse(fs.readFileSync('../package.json', 'utf-8'))
  const appName = packageJson.name
  const appVersion = packageJson.version

  // Log the URL where the application is running
  logger.log(`Application (${appName} v${appVersion}) running on: ${await app.getUrl()} `)
}
bootstrap()
