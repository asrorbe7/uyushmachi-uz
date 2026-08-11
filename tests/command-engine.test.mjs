import assert from 'node:assert/strict'
import test from 'node:test'
import { createCommandEngine, detectIntent } from '../src/command-engine.mjs'
import { demoData } from '../src/demo-data.mjs'

const tenantOne = { associationId: 1, role: 'association_admin' }
const tenantTwo = { associationId: 2, role: 'association_admin' }

test('routes a lease request to vehicle documents instead of accounting', () => {
  assert.deepEqual(detectIntent('Show the lease agreement for vehicle 75S375KA'), {
    action: 'show_vehicle_documents',
    risk: 'read',
  })
})

test('returns only the matching document from the signed-in tenant', () => {
  const engine = createCommandEngine(demoData)
  const result = engine.interpret({ actor: tenantOne, text: 'Show the lease agreement for vehicle 75S375KA' })
  assert.equal(result.ok, true)
  assert.equal(result.documents.length, 1)
  assert.equal(result.documents[0].documentNumber, 'DEMO-LEASE-01')
  assert.equal(JSON.stringify(result).includes('NEVER-RETURN-THIS'), false)
})

test('same plate number remains isolated between two associations', () => {
  const engine = createCommandEngine(demoData)
  const first = engine.interpret({ actor: tenantOne, text: 'Show the lease agreement for vehicle 75S375KA' })
  const second = engine.interpret({ actor: tenantTwo, text: 'Show the lease agreement for vehicle 75S375KA' })
  assert.notEqual(first.vehicle.id, second.vehicle.id)
  assert.equal(first.documents[0].documentNumber, 'DEMO-LEASE-01')
  assert.equal(second.documents[0].documentNumber, 'NEVER-RETURN-THIS')
})

test('a payment command creates a preview and does not write immediately', () => {
  const engine = createCommandEngine(demoData)
  const result = engine.interpret({ actor: tenantOne, text: 'Add a payment of 1 million UZS to 75S375KA' })
  assert.equal(result.requiresHumanConfirmation, true)
  assert.equal(result.preview.amountUzs, 1_000_000)
  assert.deepEqual(engine.snapshot(tenantOne), { ledger: [], audit: [] })
})

test('confirmation creates one transaction and one audit event', () => {
  const engine = createCommandEngine(demoData)
  const proposal = engine.interpret({ actor: tenantOne, text: 'Add a payment of 1 million UZS to 75S375KA' })
  const result = engine.confirm({ actor: tenantOne, proposalId: proposal.preview.proposalId })
  assert.equal(result.transaction.amountUzs, 1_000_000)
  assert.equal(result.audit.entityId, result.transaction.id)
  assert.equal(engine.snapshot(tenantOne).ledger.length, 1)
  assert.equal(engine.snapshot(tenantOne).audit.length, 1)
})

test('another tenant cannot confirm a proposal', () => {
  const engine = createCommandEngine(demoData)
  const proposal = engine.interpret({ actor: tenantOne, text: 'Add a payment of 1 million UZS to 75S375KA' })
  assert.throws(
    () => engine.confirm({ actor: tenantTwo, proposalId: proposal.preview.proposalId }),
    /Cross-association/,
  )
})

test('a confirmed proposal cannot be replayed', () => {
  const engine = createCommandEngine(demoData)
  const proposal = engine.interpret({ actor: tenantOne, text: 'Add a payment of 1 million UZS to 75S375KA' })
  engine.confirm({ actor: tenantOne, proposalId: proposal.preview.proposalId })
  assert.throws(
    () => engine.confirm({ actor: tenantOne, proposalId: proposal.preview.proposalId }),
    /already used/,
  )
})
