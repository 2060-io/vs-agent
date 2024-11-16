import { HttpException, HttpStatus, Logger } from '@nestjs/common'

export class HttpUtils {
  static handleException(
    logger: Logger,
    error: any,
    defaultMessage: string = 'Internal server error',
  ): never {
    logger.error(`Error: ${error.stack}`)

    throw new HttpException(
      {
        statusCode: error.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR,
        error: error.message ?? defaultMessage,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
      {
        cause: error,
      },
    )
  }
}
