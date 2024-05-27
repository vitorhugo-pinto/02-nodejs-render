import { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { knex } from '../database'
import { validateSessionId } from '../middlewares/validate-session-id'

export async function transactionsRoutes(app: FastifyInstance) {
  // Maneira de criar um middleware para todas as chamadas dentro do contexto designado
  // Pode-se passar no segundo parâmetro a callback criada em outro arquivo.
  // app.addHook('preHandler', async (request, reply) => {
  //   console.log(`${request.method} ${request.url}`)
  // })

  app.get(
    '/',
    {
      preHandler: [validateSessionId],
    },
    async (request, reply) => {
      const { sessionId } = request.cookies

      if (!sessionId) {
        return reply.status(401).send({
          error: 'Unauthorized',
        })
      }

      const transactions = await knex('transactions')
        .select('*')
        .where('session_id', sessionId)

      return { transactions }
    },
  )

  app.get(
    '/:id',
    {
      preHandler: [validateSessionId],
    },
    async (request) => {
      const getTransactionByIdRequestParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = getTransactionByIdRequestParamsSchema.parse(request.params)

      const { sessionId } = request.cookies

      const transaction = await knex('transactions')
        .select('*')
        .where({
          id,
          session_id: sessionId,
        })
        .first()

      return { transaction }
    },
  )

  app.get(
    '/summary',
    {
      preHandler: [validateSessionId],
    },
    async (request) => {
      const { sessionId } = request.cookies
      const summary = await knex('transactions')
        .where('session_id', sessionId)
        .sum('amount', { as: 'balance' })
        .first()

      return { summary }
    },
  )

  app.post('/', async (request, reply) => {
    const createTransactionRequestBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit']),
    })

    const bodyParsed = createTransactionRequestBodySchema.parse(request.body)

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 60 seconds, 60 minutes, 24 hours, 7 days
      })
    }

    await knex('transactions').insert({
      id: randomUUID(),
      title: bodyParsed.title,
      amount:
        bodyParsed.type === 'credit'
          ? bodyParsed.amount
          : bodyParsed.amount * -1,
      session_id: sessionId,
    })
    return reply.status(201).send()
  })
}
