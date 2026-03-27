import { prisma } from '@/lib/db/prisma';
import { withAuth, withErrorHandler, successResponse, validateBody } from '@/lib/api';
import { updateSettingsSchema } from '@/lib/validation/schemas';

export const GET = withErrorHandler(
  withAuth(async () => {
    let settings = await prisma.shopSettings.findFirst();
    if (!settings) {
      settings = await prisma.shopSettings.create({
        data: {
          id: 'default-shop',
          shopName: 'My Shop',
          currency: 'Rs',
        },
      });
    }
    return successResponse(settings);
  })
);

export const PUT = withErrorHandler(
  withAuth(async (request: Request) => {
    const { data, error } = await validateBody(request, updateSettingsSchema);
    if (error) return error;

    const settings = await prisma.shopSettings.upsert({
      where: { id: 'default-shop' },
      update: data,
      create: { id: 'default-shop', shopName: data.shopName || 'My Shop', ...data },
    });
    return successResponse(settings);
  })
);
