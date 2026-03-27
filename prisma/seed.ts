import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient({});

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Create Admin User ──────────────────────────────
  const hashedPassword = await bcryptjs.hash(
    process.env.ADMIN_PASSWORD || 'Admin@123',
    12
  );

  const user = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@supplytrack.local' },
    update: {},
    create: {
      name: process.env.ADMIN_NAME || 'Shop Owner',
      email: process.env.ADMIN_EMAIL || 'admin@supplytrack.local',
      hashedPassword,
      role: 'owner',
    },
  });
  console.log('✅ Admin user created:', user.email);

  // ─── Shop Settings ─────────────────────────────────
  await prisma.shopSettings.upsert({
    where: { id: 'default-shop' },
    update: {},
    create: {
      id: 'default-shop',
      shopName: process.env.NEXT_PUBLIC_SHOP_NAME || 'My Shop',
      address: 'Kathmandu, Nepal',
      phone: '+977-01-1234567',
      vatEnabled: false,
      vatRate: 13,
      currency: 'Rs',
      receiptHeader: 'Thank you for shopping with us!',
      receiptFooter: 'Visit again!',
      defaultCreditLimit: 5000,
      safetyStockDays: 7,
    },
  });
  console.log('✅ Shop settings created');

  // ─── Categories ─────────────────────────────────────
  const categories = [
    { name: 'Groceries', description: 'Daily grocery items' },
    { name: 'Beverages', description: 'Drinks and beverages' },
    { name: 'Snacks', description: 'Chips, biscuits, and snacks' },
    { name: 'Dairy', description: 'Milk, curd, and dairy products' },
    { name: 'Personal Care', description: 'Soap, shampoo, and personal items' },
    { name: 'Household', description: 'Cleaning supplies and household items' },
    { name: 'Stationery', description: 'Pens, notebooks, and stationery' },
    { name: 'Spices', description: 'Spices and masala' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log(`✅ ${categories.length} categories created`);

  // ─── Units ──────────────────────────────────────────
  const units = [
    { name: 'Piece', abbreviation: 'pc' },
    { name: 'Kilogram', abbreviation: 'kg' },
    { name: 'Gram', abbreviation: 'g' },
    { name: 'Liter', abbreviation: 'L' },
    { name: 'Milliliter', abbreviation: 'mL' },
    { name: 'Dozen', abbreviation: 'dz' },
    { name: 'Packet', abbreviation: 'pkt' },
    { name: 'Box', abbreviation: 'box' },
    { name: 'Bottle', abbreviation: 'btl' },
    { name: 'Meter', abbreviation: 'm' },
  ];

  for (const unit of units) {
    await prisma.unit.upsert({
      where: { name: unit.name },
      update: {},
      create: unit,
    });
  }
  console.log(`✅ ${units.length} units created`);

  // ─── Fetch created categories and units for product creation ──
  const catMap: Record<string, string> = {};
  const allCats = await prisma.category.findMany();
  allCats.forEach((c) => (catMap[c.name] = c.id));

  const unitMap: Record<string, string> = {};
  const allUnits = await prisma.unit.findMany();
  allUnits.forEach((u) => (unitMap[u.name] = u.id));

  // ─── Sample Products ────────────────────────────────
  const products = [
    { name: 'Basmati Rice 5kg', barcode: '8901234560001', categoryId: catMap['Groceries'], unitId: unitMap['Packet'], purchasePrice: 580, sellingPrice: 650, currentStock: 50, minStock: 10 },
    { name: 'Tata Salt 1kg', barcode: '8901234560002', categoryId: catMap['Groceries'], unitId: unitMap['Packet'], purchasePrice: 22, sellingPrice: 28, currentStock: 100, minStock: 20 },
    { name: 'Amul Butter 500g', barcode: '8901234560003', categoryId: catMap['Dairy'], unitId: unitMap['Piece'], purchasePrice: 250, sellingPrice: 290, currentStock: 30, minStock: 5 },
    { name: 'Coca-Cola 500ml', barcode: '8901234560004', categoryId: catMap['Beverages'], unitId: unitMap['Bottle'], purchasePrice: 30, sellingPrice: 40, currentStock: 200, minStock: 24 },
    { name: 'Wai Wai Noodles', barcode: '8901234560005', categoryId: catMap['Snacks'], unitId: unitMap['Packet'], purchasePrice: 18, sellingPrice: 25, currentStock: 300, minStock: 50 },
    { name: 'Surf Excel 1kg', barcode: '8901234560006', categoryId: catMap['Household'], unitId: unitMap['Packet'], purchasePrice: 180, sellingPrice: 220, currentStock: 40, minStock: 8 },
    { name: 'Lifebuoy Soap', barcode: '8901234560007', categoryId: catMap['Personal Care'], unitId: unitMap['Piece'], purchasePrice: 30, sellingPrice: 40, currentStock: 80, minStock: 15 },
    { name: 'Turmeric Powder 200g', barcode: '8901234560008', categoryId: catMap['Spices'], unitId: unitMap['Packet'], purchasePrice: 45, sellingPrice: 60, currentStock: 60, minStock: 10 },
    { name: 'Milk 1L', barcode: '8901234560009', categoryId: catMap['Dairy'], unitId: unitMap['Liter'], purchasePrice: 52, sellingPrice: 60, currentStock: 50, minStock: 10 },
    { name: 'Sugar 1kg', barcode: '8901234560010', categoryId: catMap['Groceries'], unitId: unitMap['Kilogram'], purchasePrice: 80, sellingPrice: 95, currentStock: 80, minStock: 15 },
    { name: 'Sunflower Oil 1L', barcode: '8901234560011', categoryId: catMap['Groceries'], unitId: unitMap['Bottle'], purchasePrice: 180, sellingPrice: 210, currentStock: 35, minStock: 8 },
    { name: 'Notebook A4', barcode: '8901234560012', categoryId: catMap['Stationery'], unitId: unitMap['Piece'], purchasePrice: 40, sellingPrice: 55, currentStock: 120, minStock: 20 },
    { name: 'Pepsodent Toothpaste', barcode: '8901234560013', categoryId: catMap['Personal Care'], unitId: unitMap['Piece'], purchasePrice: 60, sellingPrice: 80, currentStock: 45, minStock: 10 },
    { name: 'Red Label Tea 500g', barcode: '8901234560014', categoryId: catMap['Beverages'], unitId: unitMap['Packet'], purchasePrice: 210, sellingPrice: 260, currentStock: 25, minStock: 5 },
    { name: 'Maggi 2-Minute Noodles', barcode: '8901234560015', categoryId: catMap['Snacks'], unitId: unitMap['Packet'], purchasePrice: 14, sellingPrice: 20, currentStock: 250, minStock: 40 },
    { name: 'Dettol Hand Wash 200ml', barcode: '8901234560016', categoryId: catMap['Personal Care'], unitId: unitMap['Bottle'], purchasePrice: 85, sellingPrice: 110, currentStock: 30, minStock: 6 },
    { name: 'Wheat Flour 10kg', barcode: '8901234560017', categoryId: catMap['Groceries'], unitId: unitMap['Packet'], purchasePrice: 450, sellingPrice: 520, currentStock: 20, minStock: 5 },
    { name: 'Broom Stick', barcode: '8901234560018', categoryId: catMap['Household'], unitId: unitMap['Piece'], purchasePrice: 90, sellingPrice: 130, currentStock: 15, minStock: 3 },
    { name: 'Ball Pen (Blue)', barcode: '8901234560019', categoryId: catMap['Stationery'], unitId: unitMap['Piece'], purchasePrice: 5, sellingPrice: 10, currentStock: 500, minStock: 50 },
    { name: 'Cumin Seeds 100g', barcode: '8901234560020', categoryId: catMap['Spices'], unitId: unitMap['Packet'], purchasePrice: 55, sellingPrice: 75, currentStock: 40, minStock: 8 },
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { barcode: prod.barcode },
      update: {},
      create: prod,
    });
  }
  console.log(`✅ ${products.length} products created`);

  // ─── Sample Customers ───────────────────────────────
  const customers = [
    { name: 'Ram Sharma', phone: '9841234567', address: 'Baneshwor, Kathmandu', creditLimit: 5000 },
    { name: 'Sita Thapa', phone: '9851234567', address: 'Patan, Lalitpur', creditLimit: 3000 },
    { name: 'Hari Gurung', phone: '9861234567', address: 'Pokhara', creditLimit: 10000 },
    { name: 'Gita KC', phone: '9871234567', address: 'Bhaktapur', creditLimit: 2000 },
    { name: 'Krishna Tamang', phone: '9801234567', address: 'Thamel, Kathmandu', creditLimit: 8000 },
  ];

  for (const cust of customers) {
    await prisma.customer.upsert({
      where: { phone: cust.phone },
      update: {},
      create: cust,
    });
  }
  console.log(`✅ ${customers.length} customers created`);

  // ─── Sample Suppliers ───────────────────────────────
  const suppliers = [
    { name: 'Nepal Wholesale Traders', phone: '01-4123456', address: 'Kalimati, Kathmandu', contactPerson: 'Rajesh Shrestha', leadTimeDays: 2 },
    { name: 'Himalayan Distributors', phone: '01-4123457', address: 'Ason, Kathmandu', contactPerson: 'Binod KC', leadTimeDays: 3 },
    { name: 'Lumbini FMCG Supply', phone: '071-123456', address: 'Butwal', contactPerson: 'Suresh Poudel', leadTimeDays: 5 },
  ];

  for (const sup of suppliers) {
    await prisma.supplier.upsert({
      where: { id: sup.name.replace(/\s+/g, '-').toLowerCase() },
      update: {},
      create: sup,
    });
  }
  console.log(`✅ ${suppliers.length} suppliers created`);

  // ─── Expense Categories ─────────────────────────────
  const expenseCategories = [
    'Rent', 'Electricity', 'Water', 'Salary', 'Transport',
    'Packaging', 'Maintenance', 'Marketing', 'Miscellaneous',
  ];

  for (const name of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`✅ ${expenseCategories.length} expense categories created`);

  console.log('\n🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
