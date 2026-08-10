import { randomUUID } from 'node:crypto'

function canonical(value) {
  return value.toLocaleUpperCase('uz-UZ').replace(/[^A-Z0-9А-ЯЁҚҒҲЎ]/gu, '')
}

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} musbat butun son bo‘lishi kerak.`)
  }
  return value
}

function findUnique(rows, query, aliases) {
  const needle = canonical(query)
  const matches = rows.filter((row) => aliases(row).some((value) => canonical(value).includes(needle)))
  if (matches.length !== 1) throw new Error(matches.length ? 'So‘rov noaniq.' : 'Mos yozuv topilmadi.')
  return matches[0]
}

/**
 * Sanitizatsiyalangan demo: production kodining nusxasi emas.
 * Muhim kontrakt — tenant server sessiyasidan olinadi, summa katalogdan
 * hisoblanadi, tasdiqlanadigan draft esa server xotirasida bir martalik turadi.
 */
export function createSafeCommandFlow({ vehicles, services }) {
  const pending = new Map()

  function propose({ actor, plateQuery, serviceQuery, quantity = 1 }) {
    const associationId = positiveInteger(actor.associationId, 'associationId')
    const safeQuantity = positiveInteger(quantity, 'quantity')

    const tenantVehicles = vehicles.filter((row) => row.associationId === associationId && !row.archived)
    const tenantServices = services.filter((row) => row.associationId === associationId && row.active)
    const vehicle = findUnique(tenantVehicles, plateQuery, (row) => [row.plateNumber])
    const service = findUnique(tenantServices, serviceQuery, (row) => [row.name, ...(row.aliases ?? [])])

    // Pul mijoz yuborgan erkin matndan emas, server katalogidan olinadi.
    const amount = positiveInteger(service.unitPrice, 'unitPrice') * safeQuantity
    const proposalId = randomUUID()
    const proposal = {
      proposalId,
      associationId,
      vehicleId: vehicle.id,
      serviceId: service.id,
      title: `${vehicle.plateNumber}: ${service.name}`,
      quantity: safeQuantity,
      currency: 'UZS',
      amount,
    }
    pending.set(proposalId, proposal)

    // Foydalanuvchi aynan shu preview’ni o‘qiydi; hali hech narsa yozilmadi.
    return { ...proposal, requiresHumanConfirmation: true }
  }

  function confirm({ actor, proposalId }) {
    const associationId = positiveInteger(actor.associationId, 'associationId')
    const proposal = pending.get(proposalId)
    if (!proposal) throw new Error('Draft topilmadi yoki avval ishlatilgan.')
    if (proposal.associationId !== associationId) throw new Error('Boshqa tenant draftiga ruxsat yo‘q.')

    // Bir martalik: ikkinchi bosish ikkinchi moliyaviy yozuv yaratmaydi.
    pending.delete(proposalId)
    return {
      transaction: {
        associationId,
        vehicleId: proposal.vehicleId,
        serviceId: proposal.serviceId,
        amount: proposal.amount,
        currency: proposal.currency,
        status: 'active',
      },
      audit: {
        associationId,
        action: 'ledger.charge_created',
        entityType: 'transaction',
        summary: proposal.title,
      },
    }
  }

  return { propose, confirm }
}
