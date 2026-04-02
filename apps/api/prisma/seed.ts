import { PrismaClient, UserRole, PaymentMethod, QuoteStatus, SaleStatus, PurchaseStatus, MovementType, MovementRefType, TransactionType, TransactionRefType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Empresa ──────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { id: 'company-demo' },
    update: {},
    create: {
      id: 'company-demo',
      name: 'Sublimaciones Demo',
      settings: { currency: 'ARS', timezone: 'America/Argentina/Buenos_Aires' },
    },
  })

  // ── Usuarios ─────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: 'admin@demo.com' } },
    update: {},
    create: {
      companyId: company.id,
      name: 'Administrador',
      email: 'admin@demo.com',
      passwordHash: adminHash,
      role: UserRole.ADMIN,
    },
  })

  // ── Categorías ───────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { companyId_name: { companyId: company.id, name: 'Ropa' } },
      update: {},
      create: { companyId: company.id, name: 'Ropa' },
    }),
    prisma.category.upsert({
      where: { companyId_name: { companyId: company.id, name: 'Tazas' } },
      update: {},
      create: { companyId: company.id, name: 'Tazas' },
    }),
    prisma.category.upsert({
      where: { companyId_name: { companyId: company.id, name: 'Insumos' } },
      update: {},
      create: { companyId: company.id, name: 'Insumos' },
    }),
  ])

  // ── Productos ────────────────────────────────────────────
  const products = await Promise.all([
    prisma.product.upsert({
      where: { companyId_sku: { companyId: company.id, sku: 'CAM-001' } },
      update: {},
      create: {
        companyId: company.id,
        categoryId: categories[0].id,
        name: 'Remera Sublimable Blanca',
        sku: 'CAM-001',
        cost: 2500,
        price: 5500,
        stock: 50,
        minStock: 10,
        unit: 'un',
      },
    }),
    prisma.product.upsert({
      where: { companyId_sku: { companyId: company.id, sku: 'TAZ-001' } },
      update: {},
      create: {
        companyId: company.id,
        categoryId: categories[1].id,
        name: 'Taza Mágica 11oz',
        sku: 'TAZ-001',
        cost: 800,
        price: 2200,
        stock: 120,
        minStock: 20,
        unit: 'un',
      },
    }),
    prisma.product.upsert({
      where: { companyId_sku: { companyId: company.id, sku: 'INS-001' } },
      update: {},
      create: {
        companyId: company.id,
        categoryId: categories[2].id,
        name: 'Papel Sublimación A4 (hoja)',
        sku: 'INS-001',
        cost: 50,
        price: 120,
        stock: 500,
        minStock: 100,
        unit: 'hoja',
      },
    }),
    prisma.product.upsert({
      where: { companyId_sku: { companyId: company.id, sku: 'INS-002' } },
      update: {},
      create: {
        companyId: company.id,
        categoryId: categories[2].id,
        name: 'Tinta Sublimación Cyan (ml)',
        sku: 'INS-002',
        cost: 30,
        price: 80,
        stock: 1000,
        minStock: 200,
        unit: 'ml',
      },
    }),
  ])

  // ── Clientes ─────────────────────────────────────────────
  const clients = await Promise.all([
    prisma.client.upsert({
      where: { id: 'client-001' },
      update: {},
      create: {
        id: 'client-001',
        companyId: company.id,
        name: 'María González',
        email: 'maria@gmail.com',
        phone: '11-1234-5678',
      },
    }),
    prisma.client.upsert({
      where: { id: 'client-002' },
      update: {},
      create: {
        id: 'client-002',
        companyId: company.id,
        name: 'Empresa ABC S.A.',
        email: 'compras@abc.com',
        phone: '11-9876-5432',
        taxId: '30-12345678-9',
      },
    }),
  ])

  // ── Proveedores ──────────────────────────────────────────
  const supplier = await prisma.supplier.upsert({
    where: { id: 'supplier-001' },
    update: {},
    create: {
      id: 'supplier-001',
      companyId: company.id,
      name: 'Insumos Sublimación SRL',
      email: 'ventas@insumos.com',
      phone: '11-5555-0000',
    },
  })

  console.log('✅ Seed completado')
  console.log(`   Empresa: ${company.name}`)
  console.log(`   Admin: admin@demo.com / admin123`)
  console.log(`   Productos: ${products.length}`)
  console.log(`   Clientes: ${clients.length}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
