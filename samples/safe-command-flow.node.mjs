import assert from 'node:assert/strict'
import test from 'node:test'
import { createSafeCommandFlow } from './safe-command-flow.mjs'

function fixture() {
  return createSafeCommandFlow({
    vehicles: [
      { id: 11, associationId: 1, plateNumber: '75 H 002721', archived: false },
      { id: 22, associationId: 2, plateNumber: '75 H 002721', archived: false },
    ],
    services: [
      { id: 101, associationId: 1, name: 'Dazvol — Qozog‘iston', aliases: ['qozoq dozvol'], unitPrice: 650_000, active: true },
      { id: 202, associationId: 2, name: 'Dazvol — Qozog‘iston', aliases: ['qozoq dozvol'], unitPrice: 900_000, active: true },
    ],
  })
}

test('bir xil raqam boshqa tenantda bo‘lsa ham faqat sessiya tenanti olinadi', () => {
  const flow = fixture()
  const draft = flow.propose({
    actor: { associationId: 1 },
    plateQuery: '75h002721',
    serviceQuery: 'qozoq dozvol',
  })
  assert.equal(draft.vehicleId, 11)
  assert.equal(draft.amount, 650_000)
  assert.equal(draft.requiresHumanConfirmation, true)
})

test('boshqa tenant draftni tasdiqlay olmaydi', () => {
  const flow = fixture()
  const draft = flow.propose({
    actor: { associationId: 1 },
    plateQuery: '75 H 002721',
    serviceQuery: 'Dazvol — Qozog‘iston',
  })
  assert.throws(
    () => flow.confirm({ actor: { associationId: 2 }, proposalId: draft.proposalId }),
    /Boshqa tenant/,
  )
})

test('tasdiq bir martalik va transaction bilan audit birga qaytadi', () => {
  const flow = fixture()
  const draft = flow.propose({
    actor: { associationId: 1 },
    plateQuery: '75 H 002721',
    serviceQuery: 'qozoq dozvol',
    quantity: 2,
  })
  const result = flow.confirm({ actor: { associationId: 1 }, proposalId: draft.proposalId })
  assert.equal(result.transaction.amount, 1_300_000)
  assert.equal(result.audit.associationId, result.transaction.associationId)
  assert.throws(
    () => flow.confirm({ actor: { associationId: 1 }, proposalId: draft.proposalId }),
    /avval ishlatilgan/,
  )
})
