import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.resolve(exception);

    this.logger.error(`${request.method} ${request.url} → ${status}: ${JSON.stringify(body)}`);
    // Erros inesperados (500) viram uma mensagem genérica pro cliente — mas o motivo
    // real precisa ficar no log do servidor, senão é impossível depurar em produção.
    if (status === HttpStatus.INTERNAL_SERVER_ERROR && exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      ...body,
    });
  }

  private resolve(exception: unknown): { status: number; body: Record<string, unknown> } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const body = typeof response === 'string' ? { message: response } : (response as Record<string, unknown>);
      return { status: exception.getStatus(), body };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          status: HttpStatus.CONFLICT,
          body: { message: `Registro duplicado (campo único já existente): ${exception.meta?.target}` },
        };
      }
      if (exception.code === 'P2025') {
        return { status: HttpStatus.NOT_FOUND, body: { message: 'Registro não encontrado' } };
      }
      if (exception.code === 'P2003') {
        return {
          status: HttpStatus.BAD_REQUEST,
          body: { message: `Referência inválida (chave estrangeira): ${exception.meta?.field_name}` },
        };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { message: 'Erro interno do servidor' },
    };
  }
}
