// libs/shared/src/filters/rpc-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Catch()
export class RpcExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RpcExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal Server Error';
    let error = 'Internal Server Error';

    // 1. HttpException kontrolü (Gateway'deki hatalar için)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || exception.name;
      } else {
        message = exceptionResponse;
        error = exception.name;
      }
    }
    // 2. RpcException kontrolü (Mikroservisten gelen hatalar için)
    else if (exception instanceof RpcException) {
      const rpcError: any = exception.getError();

      if (typeof rpcError === 'object') {
        status = this.extractStatusCode(rpcError);
        message = rpcError.message || 'Mikroservis hatası';
        error = rpcError.error || 'Microservice Error';
      } else if (typeof rpcError === 'string') {
        message = rpcError;
      } else {
        message = rpcError || exception.message;
      }
    }
    // 3. Mikroservisten gelen düz obje hatalar (RpcException wrapper olmadan)
    else if (exception.error && typeof exception.error === 'object') {
      const errorObj = exception.error;
      status = this.extractStatusCode(errorObj);
      message = errorObj.message || exception.message || message;
      error = errorObj.error || 'Microservice Error';
    }
    // 4. Status veya statusCode içeren diğer hatalar
    else if (exception.status || exception.statusCode) {
      status = this.extractStatusCode(exception);
      message = exception.message || message;
      error = exception.error || 'Error';
    }
    // 5. Diğer tüm hatalar
    else {
      message = exception.message || message;
      error = exception.name || error;
    }

    if (typeof status !== 'number' || isNaN(status)) {
      console.log('Invalid status code detected: ', status);
      status = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    // Loglama (production'da daha detaylı logging yapabilirsiniz)
    this.logger.error('Exception caught:', {
      status,
      message,
      error,
      exception: exception?.stack,
      path: request.url,
    });

    response.status(status).json({
      statusCode: status,
      message: message,
      error: error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private extractStatusCode(obj: any): number {
    // statusCode varsa kullan
    if (obj.statusCode && typeof obj.statusCode === 'number') {
      return obj.statusCode;
    }

    // status varsa ve number ise kullan
    if (obj.status && typeof obj.status === 'number') {
      return obj.status;
    }

    // status string ise parse etmeye çalış
    if (obj.status && typeof obj.status === 'string') {
      const parsed = parseInt(obj.status, 10);
      if (!isNaN(parsed) && parsed >= 100 && parsed < 600) {
        return parsed;
      }
    }

    // statusCode string ise parse etmeye çalış
    if (obj.statusCode && typeof obj.statusCode === 'string') {
      const parsed = parseInt(obj.statusCode, 10);
      if (!isNaN(parsed) && parsed >= 100 && parsed < 600) {
        return parsed;
      }
    }

    // Hiçbiri yoksa default
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
