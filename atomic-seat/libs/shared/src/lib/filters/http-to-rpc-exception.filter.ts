// libs/shared/src/filters/http-to-rpc-exception.filter.ts
import { Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { BaseRpcExceptionFilter, RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

@Catch(HttpException)
export class HttpToRpcExceptionFilter extends BaseRpcExceptionFilter {
  override catch(
    exception: HttpException,
    host: ArgumentsHost,
  ): Observable<any> {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string | string[];
    let error: string;

    if (typeof exceptionResponse === 'object') {
      message = (exceptionResponse as any).message || exception.message;
      error = (exceptionResponse as any).error || exception.name;
    } else {
      message = exceptionResponse;
      error = exception.name;
    }

    return throwError(
      () =>
        new RpcException({
          statusCode: status,
          message,
          error,
        }),
    );
  }
}

// Tüm hataları yakalamak için
@Catch()
export class AllExceptionsToRpcFilter extends BaseRpcExceptionFilter {
  override catch(exception: any, host: ArgumentsHost): Observable<any> {
    // Eğer zaten RpcException ise, direkt fırlat
    if (exception instanceof RpcException) {
      return throwError(() => exception);
    }

    // HttpException ise dönüştür
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message: string | string[];
      let error: string;

      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || exception.name;
      } else {
        message = exceptionResponse;
        error = exception.name;
      }

      return throwError(
        () =>
          new RpcException({
            statusCode: status,
            message,
            error,
          }),
      );
    }

    // Diğer tüm hatalar
    return throwError(
      () =>
        new RpcException({
          statusCode: 500,
          message: exception.message || 'Internal server error',
          error: 'Internal Server Error',
        }),
    );
  }
}
