import { FastifyReply } from 'fastify'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

export function handleError(reply: FastifyReply, error: unknown) {
  if (error instanceof ZodError) {
    return reply.code(400).send({
      error: 'Validation Error',
      message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      statusCode: 400,
    })
  }

  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({
      error: error.name,
      message: error.message,
      statusCode: error.statusCode,
    })
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return reply.code(409).send({
        error: 'Conflict',
        message: 'Ya existe un registro con ese nombre',
        statusCode: 409,
      })
    }
    if (error.code === 'P2025') {
      return reply.code(404).send({
        error: 'NotFound',
        message: 'Registro no encontrado',
        statusCode: 404,
      })
    }
  }

  console.error(error)
  return reply.code(500).send({
    error: 'Internal Server Error',
    message: 'Ocurrió un error inesperado',
    statusCode: 500,
  })
}

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public name: string = 'AppError',
  ) {
    super(message)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} no encontrado`, 404, 'NotFound')
  }
}
