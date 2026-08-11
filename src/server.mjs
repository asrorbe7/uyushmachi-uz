import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createCommandEngine } from './command-engine.mjs'
import { demoData } from './demo-data.mjs'

const port = Number(process.env.PORT || 4173)
const indexPath = fileURLToPath(new URL('../public/index.html', import.meta.url))
const engine = createCommandEngine(demoData)
const actor = { associationId: 1, role: 'association_admin' }

async function body(request) {
  let raw = ''
  for await (const chunk of request) {
    raw += chunk
    if (raw.length > 32_000) throw new Error('Request is too large.')
  }
  return raw ? JSON.parse(raw) : {}
}

function json(response, status, value) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(value, null, 2))
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === 'GET' && request.url === '/') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      response.end(await readFile(indexPath))
      return
    }

    if (request.method === 'POST' && request.url === '/api/command') {
      const input = await body(request)
      json(response, 200, engine.interpret({ actor, text: input.text }))
      return
    }

    if (request.method === 'POST' && request.url === '/api/confirm') {
      const input = await body(request)
      json(response, 200, engine.confirm({ actor, proposalId: input.proposalId }))
      return
    }

    if (request.method === 'GET' && request.url === '/api/state') {
      json(response, 200, engine.snapshot(actor))
      return
    }

    json(response, 404, { error: 'Not found' })
  } catch (error) {
    json(response, 400, { error: error instanceof Error ? error.message : 'Request failed.' })
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Uyushmachi review build: http://localhost:${port}`)
})
