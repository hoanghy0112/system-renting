import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse, ApiError } from '@distributed-compute/shared-types';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status: number;
    let error: ApiError;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        error = {
          code: this.getErrorCode(status),
          message: exceptionResponse,
        };
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        error = {
          code: (responseObj.code as string) || this.getErrorCode(status),
          message:
            (responseObj.message as string) ||
            (Array.isArray(responseObj.message)
              ? responseObj.message.join(', ')
              : 'An error occurred'),
          details: responseObj.details as Record<string, unknown>,
        };
      } else {
        error = {
          code: this.getErrorCode(status),
          message: 'An error occurred',
        };
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      error = {
        code: 'INTERNAL_SERVER_ERROR',
        message:
          process.env.NODE_ENV === 'development'
            ? exception.message
            : 'Internal server error',
      };

      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      error = {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      };
    }

    const apiResponse: ApiResponse<null> = {
      success: false,
      error,
    };

    response.status(status).json(apiResponse);
  }

  private getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
    };

    return codes[status] || 'UNKNOWN_ERROR';
  }
}
