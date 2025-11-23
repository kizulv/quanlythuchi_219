

import { Bus } from '../types';

export const MOCK_BUSES: Bus[] = [
  {
    id: "bus-1",
    licensePlate: "25F-002.19",
    isPartner: false,
    isShareholding: true,
    status: 'ACTIVE',
    note: "Xe nhà (Chính)",
    sharePercentage: 25,
    shareholders: [
      { id: "sh-1", name: "Anh Thảo", percentage: 25 },
    ]
  },
  {
    id: "bus-2",
    licensePlate: "25F-000.19",
    isPartner: true,
    isShareholding: false,
    status: 'ACTIVE',
    note: "Xe đối tác",
    sharePercentage: 0,
    shareholders: []
  },
  {
    id: "bus-3",
    licensePlate: "25F-002.01",
    isPartner: true,
    isShareholding: false,
    status: 'ACTIVE',
    note: "Xe đối tác",
    sharePercentage: 0,
    shareholders: []
  },
    {
    id: "bus-4",
    licensePlate: "25F-002.37",
    isPartner: true,
    isShareholding: false,
    status: 'ACTIVE',
    note: "Xe đối tác",
    sharePercentage: 0,
    shareholders: []
  },
  {
    id: "bus-5",
    licensePlate: "25F-000.41",
    isPartner: true,
    isShareholding: false,
    status: 'ACTIVE',
    note: "Xe đối tác",
    sharePercentage: 0,
    shareholders: []
  },
 
];