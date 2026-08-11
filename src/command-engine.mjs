import { randomUUID } from 'node:crypto'

const READ_WORDS = ['show', 'open', 'find', 'display', 'where', 'list']
const DOCUMENT_WORDS = ['document', 'agreement', 'contract', 'licence', 'license', 'insurance', 'registration']

function fold(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizePlate(value) {
  return String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function requireAssociationId(actor) {
  if (!Number.isSafeInteger(actor?.associationId) || actor.associationId <= 0) {
    throw new Error('A valid signed-in association is required.')
  }
  return actor.associationId
}

function extractPlate(text) {
  const compact = normalizePlate(text)
  const direct = compact.match(/\d{2}[A-Z]\d{3}[A-Z]{2}/)?.[0]
  if (direct) return direct

  const spaced = String(text).toUpperCase().match(/\b\d{2}\s*[A-Z]\s*\d{3}\s*[A-Z]{2}\b/)
  return spaced ? normalizePlate(spaced[0]) : null
}

function extractAmountUzs(text) {
  const normalized = fold(text).replace(/,/g, '.')
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(million|mln|thousand|k|uzs|sum)?/)
  if (!match) return null

  const value = Number(match[1])
  if (!Number.isFinite(value) || value <= 0) return null
  const unit = match[2]
  if (unit === 'million' || unit === 'mln') return Math.round(value * 1_000_000)
  if (unit === 'thousand' || unit === 'k') return Math.round(value * 1_000)
  return Math.round(value)
}

function documentQuery(text) {
  const value = fold(text)
  if (/(lease|rental|rent).*(agreement|contract|document)|agreement.*(lease|rental|rent)/.test(value)) return 'lease'
  if (/licen[cs]e/.test(value)) return 'licence'
  if (/insurance/.test(value)) return 'insurance'
  if (/registration/.test(value)) return 'registration'
  return null
}

export function detectIntent(text) {
  const value = fold(text)
  const hasReadVerb = READ_WORDS.some((word) => value.includes(word))
  const hasDocumentWord = DOCUMENT_WORDS.some((word) => value.includes(word))

  if (hasReadVerb && hasDocumentWord) return { action: 'show_vehicle_documents', risk: 'read' }
  if (/(add|record|register).*(payment)|payment.*(add|record|register)/.test(value)) {
    return { action: 'add_payment', risk: 'write' }
  }
  if (/(debt|debtor|unpaid|outstanding)/.test(value)) return { action: 'show_debtors', risk: 'read' }
  if (/(risk|expir|attention|warning)/.test(value)) return { action: 'show_risk', risk: 'read' }
  if (/(finance|revenue|expense|profit|loss)/.test(value)) return { action: 'show_finance', risk: 'read' }
  if (hasReadVerb && hasDocumentWord) return { action: 'show_documents', risk: 'read' }
  return { action: 'unknown', risk: 'none' }
}

export function createCommandEngine(seed) {
  const pending = new Map()
  const ledger = []
  const audit = []

  function tenantVehicle(associationId, plateNumber) {
    return seed.vehicles.find(
      (row) => row.associationId === associationId
        && !row.archived
        && normalizePlate(row.plateNumber) === normalizePlate(plateNumber),
    ) ?? null
  }

  function interpret({ actor, text }) {
    const associationId = requireAssociationId(actor)
    const intent = detectIntent(text)

    if (intent.action === 'show_vehicle_documents') {
      const plateNumber = extractPlate(text)
      if (!plateNumber) return { ok: false, action: intent.action, message: 'Please include a vehicle plate number.' }
      const vehicle = tenantVehicle(associationId, plateNumber)
      if (!vehicle) return { ok: false, action: intent.action, message: 'No vehicle was found in your association.' }
      const query = documentQuery(text)
      const rows = seed.documents
        .filter((row) => row.associationId === associationId && row.vehicleId === vehicle.id)
        .filter((row) => !query || fold(`${row.title} ${row.documentType}`).includes(query))
        .map(({ associationId: _associationId, vehicleId: _vehicleId, ...safe }) => safe)

      return {
        ok: true,
        action: intent.action,
        risk: 'read',
        vehicle: { id: vehicle.id, plateNumber: vehicle.plateNumber },
        documents: rows,
      }
    }

    if (intent.action === 'show_debtors') {
      const rows = seed.vehicles
        .filter((row) => row.associationId === associationId && !row.archived && row.balanceUzs > 0)
        .map((row) => ({ id: row.id, plateNumber: row.plateNumber, balanceUzs: row.balanceUzs }))
      return { ok: true, action: intent.action, risk: 'read', vehicles: rows }
    }

    if (intent.action === 'show_risk' || intent.action === 'show_finance') {
      return {
        ok: true,
        action: intent.action,
        risk: 'read',
        route: intent.action === 'show_risk' ? '/admin/tahlil' : '/admin/moliya',
      }
    }

    if (intent.action === 'add_payment') {
      const plateNumber = extractPlate(text)
      const amountUzs = extractAmountUzs(text)
      if (!plateNumber || !amountUzs) {
        return { ok: false, action: intent.action, message: 'Please include a vehicle plate and payment amount.' }
      }
      const vehicle = tenantVehicle(associationId, plateNumber)
      if (!vehicle) return { ok: false, action: intent.action, message: 'No vehicle was found in your association.' }

      const proposalId = randomUUID()
      const proposal = {
        proposalId,
        associationId,
        action: intent.action,
        vehicleId: vehicle.id,
        plateNumber: vehicle.plateNumber,
        amountUzs,
        currency: 'UZS',
      }
      pending.set(proposalId, proposal)
      return {
        ok: true,
        action: intent.action,
        risk: 'write',
        requiresHumanConfirmation: true,
        preview: {
          proposalId,
          plateNumber: proposal.plateNumber,
          amountUzs: proposal.amountUzs,
          currency: proposal.currency,
        },
      }
    }

    return {
      ok: false,
      action: 'unknown',
      message: 'The request is outside this public review build. No action was taken.',
    }
  }

  function confirm({ actor, proposalId }) {
    const associationId = requireAssociationId(actor)
    const proposal = pending.get(proposalId)
    if (!proposal) throw new Error('The proposal is missing, expired or already used.')
    if (proposal.associationId !== associationId) throw new Error('Cross-association confirmation is not allowed.')

    pending.delete(proposalId)
    const transaction = {
      id: ledger.length + 1,
      associationId,
      vehicleId: proposal.vehicleId,
      type: 'payment',
      amountUzs: proposal.amountUzs,
      status: 'active',
    }
    const event = {
      id: audit.length + 1,
      associationId,
      action: 'ledger.payment_created',
      entityType: 'transaction',
      entityId: transaction.id,
    }
    ledger.push(transaction)
    audit.push(event)
    return { ok: true, transaction, audit: event }
  }

  function snapshot(actor) {
    const associationId = requireAssociationId(actor)
    return {
      ledger: ledger.filter((row) => row.associationId === associationId),
      audit: audit.filter((row) => row.associationId === associationId),
    }
  }

  return { interpret, confirm, snapshot }
}
