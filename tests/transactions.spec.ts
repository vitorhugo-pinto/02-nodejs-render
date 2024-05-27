import { expect, it, beforeAll, afterAll, describe, beforeEach } from 'vitest'
import supertest from 'supertest'
import { app } from '../src/app'
import { execSync } from 'node:child_process'

describe('Transactions routes', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    execSync('npm run knex migrate:rollback --all')
    execSync('npm run knex migrate:latest')
  })

  it('should be able to let user creates a transaction', async () => {
    const response = await supertest(app.server).post('/transactions').send({
      title: 'Post transaction test',
      amount: 42,
      type: 'credit',
    })

    expect(response.status).toBe(201)
  })

  it('should list all transactions from a user based on session id', async () => {
    const createTransactionResponse = await supertest(app.server)
      .post('/transactions')
      .send({
        title: 'Post transaction test',
        amount: 42,
        type: 'credit',
      })

    const cookie = createTransactionResponse.get('Set-Cookie')

    const listTransactionsResponse = await supertest(app.server)
      .get('/transactions')
      .set('Cookie', cookie!)

    expect(listTransactionsResponse.status).toBe(200)
    expect(listTransactionsResponse.body.transactions).toEqual([
      expect.objectContaining({
        title: 'Post transaction test',
        amount: 42,
      }),
    ])
  })

  it('should get a transaction from a user based on transaction id and session id', async () => {
    const createTransactionResponse = await supertest(app.server)
      .post('/transactions')
      .send({
        title: 'Post transaction test',
        amount: 42,
        type: 'credit',
      })

    const cookie = createTransactionResponse.get('Set-Cookie')

    const listTransactionsResponse = await supertest(app.server)
      .get('/transactions')
      .set('Cookie', cookie!)

    const transactionId = listTransactionsResponse.body.transactions[0].id

    const getByIdTransactionResponse = await supertest(app.server)
      .get(`/transactions/${transactionId}`)
      .set('Cookie', cookie!)

    expect(getByIdTransactionResponse.status).toBe(200)
    expect(getByIdTransactionResponse.body.transaction).toEqual(
      expect.objectContaining({
        title: 'Post transaction test',
        amount: 42,
      }),
    )
  })

  it('should get a summary based on the session id', async () => {
    const createTransactionResponse = await supertest(app.server)
      .post('/transactions')
      .send({
        title: 'Post transaction test',
        amount: 42,
        type: 'credit',
      })

    const cookie = createTransactionResponse.get('Set-Cookie')

    await supertest(app.server)
      .post('/transactions')
      .set('Cookie', cookie!)
      .send({
        title: 'Post transaction test',
        amount: 12,
        type: 'debit',
      })

    const getSummaryTransactionsResponse = await supertest(app.server)
      .get('/transactions/summary')
      .set('Cookie', cookie!)

    expect(getSummaryTransactionsResponse.status).toBe(200)
    expect(getSummaryTransactionsResponse.body.summary).toEqual(
      expect.objectContaining({
        balance: 30,
      }),
    )
  })
})
