import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { hashSync } from 'bcryptjs'
import 'dotenv/config'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding OMOI Cafe database...')

  // ─── CLEAR EXISTING DATA ─────────────────────────
  await prisma.preOrder.deleteMany()
  await prisma.review.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.waitlist.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.menuItem.deleteMany()
  await prisma.staff.deleteMany()
  await prisma.promoCode.deleteMany()
  await prisma.table.deleteMany()

  // ─── TABLES (19 total / 36 seats) ─────────────────
  const tables = [
    // 2 fixed 4-person tables
    { number: 1, name: 'Fix 4er 1', zone: 'QUIET' as const, capacity: 4, hasOutlet: false, hasNaturalLight: true, positionX: 18, positionY: 18, photoUrl: '/images/tables/fixed-4-1.jpg' },
    { number: 2, name: 'Fix 4er 2', zone: 'QUIET' as const, capacity: 4, hasOutlet: false, hasNaturalLight: true, positionX: 18, positionY: 38, photoUrl: '/images/tables/fixed-4-2.jpg' },
    // 4 flexible 2-person tables in area A
    { number: 5, name: 'Flex 2er 1', zone: 'WORKSPACE' as const, capacity: 2, hasOutlet: false, hasNaturalLight: false, positionX: 62, positionY: 15, photoUrl: '/images/tables/flex-1.jpg' },
    { number: 6, name: 'Flex 2er 2', zone: 'WORKSPACE' as const, capacity: 2, hasOutlet: false, hasNaturalLight: false, positionX: 74, positionY: 15, photoUrl: '/images/tables/flex-2.jpg' },
    { number: 7, name: 'Flex 2er 3', zone: 'WORKSPACE' as const, capacity: 2, hasOutlet: false, hasNaturalLight: false, positionX: 62, positionY: 30, photoUrl: '/images/tables/flex-3.jpg' },
    { number: 8, name: 'Flex 2er 4', zone: 'WORKSPACE' as const, capacity: 2, hasOutlet: false, hasNaturalLight: false, positionX: 74, positionY: 30, photoUrl: '/images/tables/flex-4.jpg' },
    // 3 fixed 2-person tables
    { number: 11, name: 'Fix 2er 11', zone: 'WINDOW' as const, capacity: 2, hasOutlet: true, hasNaturalLight: true, positionX: 42, positionY: 18, photoUrl: '/images/tables/fixed-2-11.jpg' },
    { number: 12, name: 'Fix 2er 12', zone: 'WINDOW' as const, capacity: 2, hasOutlet: true, hasNaturalLight: true, positionX: 42, positionY: 38, photoUrl: '/images/tables/fixed-2-12.jpg' },
    { number: 13, name: 'Fix 2er 13', zone: 'WINDOW' as const, capacity: 2, hasOutlet: true, hasNaturalLight: true, positionX: 42, positionY: 58, photoUrl: '/images/tables/fixed-2-13.jpg' },
    // 4 flexible 2-person tables in area B
    { number: 21, name: 'Flex 2er 21', zone: 'OUTDOOR' as const, capacity: 2, hasOutlet: false, hasNaturalLight: false, positionX: 62, positionY: 50, photoUrl: '/images/tables/flex-21.jpg' },
    { number: 22, name: 'Flex 2er 22', zone: 'OUTDOOR' as const, capacity: 2, hasOutlet: false, hasNaturalLight: false, positionX: 74, positionY: 50, photoUrl: '/images/tables/flex-22.jpg' },
    { number: 23, name: 'Flex 2er 23', zone: 'OUTDOOR' as const, capacity: 2, hasOutlet: false, hasNaturalLight: false, positionX: 62, positionY: 65, photoUrl: '/images/tables/flex-23.jpg' },
    { number: 24, name: 'Flex 2er 24', zone: 'OUTDOOR' as const, capacity: 2, hasOutlet: false, hasNaturalLight: false, positionX: 74, positionY: 65, photoUrl: '/images/tables/flex-24.jpg' },
    // Bar seats
    { number: 30, name: 'Bar 30', zone: 'BAR' as const, capacity: 1, hasOutlet: false, hasNaturalLight: false, positionX: 15, positionY: 82, photoUrl: '/images/tables/bar-30.jpg' },
    { number: 31, name: 'Bar 31', zone: 'BAR' as const, capacity: 1, hasOutlet: false, hasNaturalLight: false, positionX: 25, positionY: 82, photoUrl: '/images/tables/bar-31.jpg' },
    { number: 32, name: 'Bar 32', zone: 'BAR' as const, capacity: 1, hasOutlet: false, hasNaturalLight: false, positionX: 35, positionY: 82, photoUrl: '/images/tables/bar-32.jpg' },
    { number: 33, name: 'Bar 33', zone: 'BAR' as const, capacity: 1, hasOutlet: false, hasNaturalLight: false, positionX: 45, positionY: 82, photoUrl: '/images/tables/bar-33.jpg' },
    { number: 34, name: 'Bar 34', zone: 'BAR' as const, capacity: 1, hasOutlet: false, hasNaturalLight: false, positionX: 55, positionY: 82, photoUrl: '/images/tables/bar-34.jpg' },
    { number: 35, name: 'Bar 35', zone: 'BAR' as const, capacity: 1, hasOutlet: false, hasNaturalLight: false, positionX: 65, positionY: 82, photoUrl: '/images/tables/bar-35.jpg' },
  ]

  for (const table of tables) {
    await prisma.table.create({ data: table })
  }
  console.log(`  ✓ Created ${tables.length} tables`)

  // ─── MENU ITEMS ──────────────────────────────────
  const menuItems = [
    { name: 'Cà phê sữa đá', nameEn: 'Vietnamese Iced Coffee', category: 'Cà phê', price: 45000 },
    { name: 'Bạc xỉu', nameEn: 'Bac Xiu', category: 'Cà phê', price: 40000 },
    { name: 'Americano', nameEn: 'Americano', category: 'Cà phê', price: 50000 },
    { name: 'Matcha Latte', nameEn: 'Matcha Latte', category: 'Đặc biệt', price: 55000 },
    { name: 'Cà phê trứng', nameEn: 'Egg Coffee', category: 'Đặc biệt', price: 60000 },
    { name: 'Bánh Croissant', nameEn: 'Croissant', category: 'Bánh', price: 35000 },
    { name: 'Cheesecake', nameEn: 'Cheesecake', category: 'Bánh', price: 55000 },
  ]

  for (const item of menuItems) {
    await prisma.menuItem.create({ data: item })
  }
  console.log(`  ✓ Created ${menuItems.length} menu items`)

  // ─── ADMIN USER ──────────────────────────────────
  const adminPassword = hashSync('Admin@2025', 10)
  await prisma.staff.create({
    data: {
      name: 'Admin OMOI',
      email: 'admin@omoi.cafe',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  })
  console.log('  ✓ Created admin user (admin@omoi.cafe)')

  console.log('\n✅ Seeding completed!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
