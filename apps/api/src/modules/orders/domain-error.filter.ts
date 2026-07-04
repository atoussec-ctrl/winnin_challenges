import { BadRequestException, Catch, ConflictException, NotFoundException } from "@nestjs/common";
import type { ExceptionFilter } from "@nestjs/common";
import { DomainError, InsufficientStockError, ProductNotFoundError } from "@desafio/domain";

// Traduz erros de dominio para excecoes HTTP/GraphQL uma unica vez, no lugar
// de cada service fazer sua propria cadeia de instanceof. Registrado como
// APP_FILTER (global), funciona identicamente para REST e GraphQL.
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  public catch(exception: DomainError): void {
    throw this.translate(exception);
  }

  private translate(error: DomainError): Error {
    if (error instanceof ProductNotFoundError) {
      return new NotFoundException(error.message);
    }

    if (error instanceof InsufficientStockError) {
      return new ConflictException(error.message);
    }

    return new BadRequestException(error.message);
  }
}
