export const demoData = {
  vehicles: [
    {
      id: 101,
      associationId: 1,
      plateNumber: '75S375KA',
      ownerLabel: 'Demo owner A',
      balanceUzs: 7_267_798,
      archived: false,
    },
    {
      id: 201,
      associationId: 2,
      plateNumber: '75S375KA',
      ownerLabel: 'Another association owner',
      balanceUzs: 900_000,
      archived: false,
    },
  ],
  documents: [
    {
      id: 501,
      associationId: 1,
      vehicleId: 101,
      title: 'Vehicle lease agreement',
      documentType: 'lease',
      documentNumber: 'DEMO-LEASE-01',
      status: 'active',
    },
    {
      id: 502,
      associationId: 1,
      vehicleId: 101,
      title: 'Transport licence',
      documentType: 'licence',
      documentNumber: 'DEMO-LIC-01',
      status: 'active',
    },
    {
      id: 601,
      associationId: 2,
      vehicleId: 201,
      title: 'Private document from another tenant',
      documentType: 'lease',
      documentNumber: 'NEVER-RETURN-THIS',
      status: 'active',
    },
  ],
}
