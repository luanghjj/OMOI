export type ConfirmationMode = 'AUTO' | 'MANUAL'

export interface PlannerTable {
  id: string
  number: number
  capacity: number
}

export interface SeatingDecision {
  canAutoConfirm: boolean
  reason: string
  remainingSeats: number
  tableIds: string[]
  tableNumbers: number[]
  label: string
}

export const seatingLayout = {
  fixedFour: [1, 2],
  fixedTwo: [11, 12, 13],
  flexGroups: [
    { name: 'Flex A', numbers: [5, 6, 7, 8] },
    { name: 'Flex B', numbers: [21, 22, 23, 24] },
  ],
  bar: [30, 31, 32, 33, 34, 35],
}

export const totalSeatCapacity =
  seatingLayout.fixedFour.length * 4 +
  seatingLayout.fixedTwo.length * 2 +
  seatingLayout.flexGroups.flatMap((group) => group.numbers).length * 2 +
  seatingLayout.bar.length

function decision(
  canAutoConfirm: boolean,
  reason: string,
  remainingSeats: number,
  tables: PlannerTable[] = []
): SeatingDecision {
  const sorted = [...tables].sort((a, b) => a.number - b.number)

  return {
    canAutoConfirm,
    reason,
    remainingSeats,
    tableIds: sorted.map((table) => table.id),
    tableNumbers: sorted.map((table) => table.number),
    label: sorted.length > 0
      ? sorted.map((table) => table.number).join(', ')
      : 'Keine Tischzuweisung',
  }
}

function tableMap(tables: PlannerTable[], occupiedTableIds: Set<string>) {
  const map = new Map<number, PlannerTable>()

  tables.forEach((table) => {
    if (!occupiedTableIds.has(table.id)) map.set(table.number, table)
  })

  return map
}

function pickNumbers(
  available: Map<number, PlannerTable>,
  numbers: number[],
  count: number
): PlannerTable[] | null {
  const picked = numbers
    .map((number) => available.get(number))
    .filter((table): table is PlannerTable => Boolean(table))
    .slice(0, count)

  return picked.length === count ? picked : null
}

function seats(tables: PlannerTable[]) {
  return tables.reduce((sum, table) => sum + table.capacity, 0)
}

function findBestByCapacity(
  available: Map<number, PlannerTable>,
  groups: number[][],
  guestCount: number
) {
  const candidates = groups
    .map((numbers) => numbers
      .map((number) => available.get(number))
      .filter((table): table is PlannerTable => Boolean(table)))
    .filter((tables) => seats(tables) >= guestCount)
    .sort((a, b) => {
      const extra = seats(a) - seats(b)
      if (extra !== 0) return extra
      return a.length - b.length
    })

  return candidates[0] || null
}

function findFlexByTableCount(
  available: Map<number, PlannerTable>,
  flexGroups: number[][],
  guestCount: number
) {
  const needed = Math.ceil(guestCount / 2)
  const candidates = flexGroups
    .map((numbers) => pickNumbers(available, numbers, needed))
    .filter((tables): tables is PlannerTable[] => Boolean(tables))
    .sort((a, b) => seats(a) - seats(b))

  return candidates[0] || null
}

function allocateFromLayout(available: Map<number, PlannerTable>, guestCount: number) {
  const flexGroups = seatingLayout.flexGroups.map((group) => group.numbers)
  const allFlex = flexGroups.flat()
  const fixedFour = seatingLayout.fixedFour
  const fixedTwo = seatingLayout.fixedTwo
  const bar = seatingLayout.bar

  if (guestCount <= 0) return []

  if (guestCount === 1) {
    return (
      pickNumbers(available, bar, 1) ||
      pickNumbers(available, fixedTwo, 1) ||
      pickNumbers(available, allFlex, 1) ||
      pickNumbers(available, fixedFour, 1)
    )
  }

  if (guestCount === 2) {
    return (
      pickNumbers(available, fixedTwo, 1) ||
      pickNumbers(available, allFlex, 1) ||
      pickNumbers(available, bar, 2) ||
      pickNumbers(available, fixedFour, 1)
    )
  }

  if (guestCount <= 4) {
    return (
      pickNumbers(available, fixedFour, 1) ||
      findFlexByTableCount(available, flexGroups, guestCount) ||
      findBestByCapacity(available, [fixedTwo], guestCount)
    )
  }

  if (guestCount <= 8) {
    return findFlexByTableCount(available, flexGroups, guestCount)
  }

  if (guestCount <= 12) {
    const candidates = flexGroups.flatMap((flexGroup) =>
      fixedFour.map((fixedNumber) => [...flexGroup, fixedNumber])
    )
    return findBestByCapacity(available, candidates, guestCount)
  }

  if (guestCount <= 16) {
    return findBestByCapacity(available, [allFlex], guestCount)
  }

  const largePartyOrder = [
    ...allFlex,
    ...fixedFour,
    ...fixedTwo,
    ...bar,
  ]
  const picked: PlannerTable[] = []

  for (const number of largePartyOrder) {
    const table = available.get(number)
    if (!table) continue
    picked.push(table)
    if (seats(picked) >= guestCount) return picked
  }

  return null
}

export function planSeating(
  guestCount: number,
  tables: PlannerTable[],
  occupiedTableIds: Set<string>,
  maxAutoConfirmGuests: number
): SeatingDecision {
  const available = tableMap(tables, occupiedTableIds)
  const remainingSeats = seats(Array.from(available.values()))

  if (guestCount > maxAutoConfirmGuests) {
    return decision(
      false,
      `Large party over ${maxAutoConfirmGuests} guests needs manual review`,
      remainingSeats
    )
  }

  const tablesForParty = allocateFromLayout(available, guestCount)

  if (!tablesForParty) {
    return decision(false, 'Not enough seating capacity', remainingSeats)
  }

  return decision(true, 'Enough seating capacity', remainingSeats, tablesForParty)
}
