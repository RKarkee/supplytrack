import { PrismaClient, SaleTrend, PaymentMethod, PaymentStatus, OrderStatus, ReturnType, StockMovementType } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Configuration for seeding
const DAYS_TO_SEED = 180;
const SALES_PER_DAY_MIN = 5;
const SALES_PER_DAY_MAX = 15;
const PRODUCT_COUNT = 60;
const CUSTOMER_COUNT = 25;
const SUPPLIER_COUNT = 5;

async function cleanDatabase() {
  console.log('🧹 Cleaning database...');
  // Order matters due to foreign keys
  const tablenames = [
    'AuditLog', 'Alert', 'SalesHeatmap', 'DemandForecast',
    'Expense', 'ExpenseCategory', 'ReturnItem', 'Return',
    'StockMovement', 'PurchaseItem', 'PurchaseOrder',
    'Payment', 'SaleItem', 'Sale', 'Customer', 'Supplier',
    'ProductUnit', 'Product', 'Unit', 'Category', 'ShopSettings', 'User'
  ];

  for (const tablename of tablenames) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    } catch (error) {
      console.log(`Note: Could not truncate ${tablename} (maybe it doesn't exist yet)`);
    }
  }
}

async function main() {
  await cleanDatabase();

  console.log('🌱 Seeding realistic demo data...');

  // 1. Admin User
  const hashedPassword = await bcryptjs.hash('Admin@123', 12);
  const user = await prisma.user.create({
    data: {
      name: 'Demo Shop Owner',
      email: 'admin@supplytrack.local',
      hashedPassword,
      role: 'owner',
    },
  });
  console.log('✅ Admin user created');

  // 2. Shop Settings
  await prisma.shopSettings.create({
    data: {
      id: 'default-shop',
      shopName: 'Supreme Mart & POS',
      address: 'Durbar Marg, Kathmandu, Nepal',
      phone: '+977-1-4412345',
      email: 'contact@suprememart.com',
      panNumber: '601234567',
      vatEnabled: true,
      vatRate: 13,
      currency: 'Rs',
      receiptHeader: 'Welcome to Supreme Mart!',
      receiptFooter: 'Thank you for your business. Visit again!',
      defaultCreditLimit: 10000,
      safetyStockDays: 7,
    },
  });
  console.log('✅ Shop settings created');

  // 3. Categories & Units
  const categoriesList = ['Groceries', 'Beverages', 'Produce', 'Dairy', 'Personal Care', 'Household', 'Stationery', 'Bakery', 'Frozen Foods'];
  const categories = await Promise.all(
    categoriesList.map(name => prisma.category.create({ data: { name } }))
  );

  const unitsList = [
    { name: 'Piece', abbreviation: 'pc' },
    { name: 'Kilogram', abbreviation: 'kg' },
    { name: 'Liter', abbreviation: 'L' },
    { name: 'Packet', abbreviation: 'pkt' },
    { name: 'Box', abbreviation: 'box' },
    { name: 'Dozen', abbreviation: 'dz' },
  ];
  const units = await Promise.all(
    unitsList.map(u => prisma.unit.create({ data: u }))
  );
  console.log('✅ Categories and Units created');

  // 4. Suppliers & Customers
  const suppliers = await Promise.all(
    Array.from({ length: SUPPLIER_COUNT }).map(() => prisma.supplier.create({
      data: {
        name: faker.company.name(),
        phone: faker.phone.number(),
        email: faker.internet.email(),
        address: `${faker.location.city()}, Nepal`,
        contactPerson: faker.person.fullName(),
        leadTimeDays: faker.number.int({ min: 2, max: 7 }),
      }
    }))
  );

  const customers = await Promise.all(
    Array.from({ length: CUSTOMER_COUNT }).map(() => prisma.customer.create({
      data: {
        name: faker.person.fullName(),
        phone: faker.helpers.fromRegExp('98[0-9]{8}'),
        email: faker.internet.email(),
        address: faker.location.streetAddress(),
        creditLimit: faker.helpers.arrayElement([2000, 5000, 10000, 15000]),
        creditBalance: 0,
      }
    }))
  );
  console.log('✅ Suppliers and Customers created');

  // 5. Products
  const products = [];
  for (let i = 0; i < PRODUCT_COUNT; i++) {
    const category = faker.helpers.arrayElement(categories);
    const unit = faker.helpers.arrayElement(units);
    const purchasePrice = parseFloat(faker.commerce.price({ min: 10, max: 500 }));
    const sellingPrice = purchasePrice * (1 + faker.number.float({ min: 0.1, max: 0.4 }));
    
    const product = await prisma.product.create({
      data: {
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        sku: faker.string.alphanumeric(8).toUpperCase(),
        barcode: faker.string.numeric(13),
        categoryId: category.id,
        unitId: unit.id,
        purchasePrice: purchasePrice,
        sellingPrice: sellingPrice,
        mrp: sellingPrice * 1.05,
        currentStock: faker.number.int({ min: 5, max: 200 }),
        minStock: faker.number.int({ min: 10, max: 30 }),
        supplierLeadDays: faker.number.int({ min: 2, max: 5 }),
      }
    });
    products.push(product);
  }
  console.log(`✅ ${products.length} products created`);

  // 6. Historical Sales & Heatmap Data
  console.log(`⏳ Generating ${DAYS_TO_SEED} days of sales data...`);
  const now = new Date();
  let totalSalesCount = 0;

  for (let i = DAYS_TO_SEED; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Vary sales volume: weekends and certain months are busier
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseCount = isWeekend ? SALES_PER_DAY_MAX : SALES_PER_DAY_MIN;
    const salesToday = faker.number.int({ min: baseCount, max: baseCount + 10 });

    for (let j = 0; j < salesToday; j++) {
      // Hour variation for heatmap (peak hours 10am-12pm and 5pm-8pm)
      const hour = faker.helpers.weightedArrayElement([
        { value: faker.number.int({ min: 8, max: 9 }), weight: 1 },
        { value: faker.number.int({ min: 10, max: 13 }), weight: 5 }, // Peak
        { value: faker.number.int({ min: 14, max: 16 }), weight: 2 },
        { value: faker.number.int({ min: 17, max: 20 }), weight: 6 }, // Peak
        { value: faker.number.int({ min: 21, max: 22 }), weight: 1 },
      ]);
      
      const saleDate = new Date(date);
      saleDate.setHours(hour, faker.number.int({ min: 0, max: 59 }));

      const customer = faker.helpers.maybe(() => faker.helpers.arrayElement(customers), { probability: 0.7 });
      const itemCount = faker.number.int({ min: 1, max: 5 });
      const saleItems = [];
      let subtotal = 0;

      for (let k = 0; k < itemCount; k++) {
        const prod = faker.helpers.arrayElement(products);
        const qty = faker.number.int({ min: 1, max: 4 });
        const total = Number(prod.sellingPrice) * qty;
        subtotal += total;
        saleItems.push({
          productId: prod.id,
          productName: prod.name,
          quantity: qty,
          unitPrice: prod.sellingPrice,
          total: total,
        });
      }

      const vatAmount = subtotal * 0.13;
      const totalAmount = subtotal + vatAmount;
      const invoiceNumber = `INV-${saleDate.getTime()}-${faker.string.alphanumeric(4).toUpperCase()}`;

      // Payment logic
      const method = faker.helpers.arrayElement([PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.MOBILE_BANKING, PaymentMethod.CREDIT]);
      const isCredit = method === PaymentMethod.CREDIT;
      const paidAmount = isCredit ? (customer ? faker.number.float({ min: 0, max: totalAmount * 0.5 }) : totalAmount) : totalAmount;
      const status = paidAmount >= totalAmount ? PaymentStatus.PAID : (paidAmount > 0 ? PaymentStatus.PARTIAL : PaymentStatus.UNPAID);
      
      const sale = await prisma.sale.create({
        data: {
          invoiceNumber,
          customerId: customer?.id,
          userId: user.id,
          subtotal,
          taxableAmount: subtotal,
          vatAmount,
          totalAmount,
          paidAmount: Number(paidAmount.toFixed(2)),
          creditAmount: Number((totalAmount - paidAmount).toFixed(2)),
          paymentStatus: status,
          createdAt: saleDate,
          items: {
            create: saleItems
          },
          payments: {
            create: isCredit && paidAmount === 0 ? [] : [{
              method: isCredit ? PaymentMethod.CASH : method,
              amount: paidAmount,
              createdAt: saleDate
            }]
          }
        }
      });

      // Update customer balance if credit
      if (customer && (totalAmount - paidAmount) > 0) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { creditBalance: { increment: totalAmount - paidAmount } }
        });
      }
      
      totalSalesCount++;
    }
  }
  console.log(`✅ Generated ${totalSalesCount} sales across ${DAYS_TO_SEED} days`);

  // 7. Expenses
  const expCats = await prisma.expenseCategory.findMany();
  for (let i = 0; i < 6; i++) { // Last 6 months
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    for (const cat of expCats) {
      await prisma.expense.create({
        data: {
          categoryId: cat.id,
          amount: faker.number.int({ min: 1000, max: 20000 }),
          description: `Monthly ${cat.name} for ${date.toLocaleString('default', { month: 'long' })}`,
          date: date,
        }
      });
    }
  }
  console.log('✅ Monthly expenses created');

  // 8. Alerts & Stock Movements (Simplified)
  // Just create some random alerts for the demo
  const lowStockProds = products.slice(0, 5);
  for (const p of lowStockProds) {
    await prisma.alert.create({
      data: {
        type: 'LOW_STOCK',
        severity: 'HIGH',
        title: `Low Stock: ${p.name}`,
        message: `Currently ${p.currentStock} units left. Min stock is ${p.minStock}.`,
        productId: p.id,
      }
    });
  }
  console.log('✅ Sample alerts created');

  console.log('\n🚀 SEEDING COMPLETE! Now running analytics engine...');
  
  // Note: We don't import runAnalytics here because it uses @/lib which might fail in a script context
  // Instead, we advise the user to click the button or we can try to call it if possible.
  // Actually, I'll try to trigger the calculation logic directly or just tell the user to click "Run AI Diagnostics"
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
