import { NextRequest } from 'next/server';
import connectDB from '@/lib/core/database';
import Order from '@/models/Order';
import { successResponse, errorResponse } from '@/lib/core/apiResponse';

type SoldRow = {
  name: string;
  unitsSold: number;
  grossSales: number;
};

const CATEGORY_RULES: Record<string, { minDailyUnits: number; safetyUnits: number }> = {
  'Convenience Store': { minDailyUnits: 4, safetyUnits: 8 },
  Beverages: { minDailyUnits: 6, safetyUnits: 12 },
  Breakfast: { minDailyUnits: 3, safetyUnits: 6 },
  'Hot Box Delights': { minDailyUnits: 3, safetyUnits: 6 },
  Burgers: { minDailyUnits: 2, safetyUnits: 4 },
  Favorites: { minDailyUnits: 2, safetyUnits: 4 },
  Sides: { minDailyUnits: 2, safetyUnits: 4 },
};

function inferCategory(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('bottle') || lower.includes('drink') || lower.includes('water') || lower.includes('dew')) return 'Beverages';
  if (lower.includes('biscuit') || lower.includes('egg') || lower.includes('breakfast')) return 'Breakfast';
  if (
    lower.includes('chips') || lower.includes('candy') || lower.includes('jerky') || lower.includes('trail mix') ||
    lower.includes('pastry') || lower.includes('protein bar') || lower.includes('peanuts') || lower.includes('gum')
  ) return 'Convenience Store';
  if (lower.includes('burger')) return 'Burgers';
  if (lower.includes('fries') || lower.includes('tots') || lower.includes('rings')) return 'Sides';
  return 'Favorites';
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const dateParam = req.nextUrl.searchParams.get('date');
    const baseDate = dateParam ? new Date(dateParam) : new Date();
    if (Number.isNaN(baseDate.getTime())) {
      return errorResponse('Invalid date parameter. Use YYYY-MM-DD.', 400);
    }

    const start = new Date(baseDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(baseDate);
    end.setHours(23, 59, 59, 999);

    const paidOrders = await Order.find({
      createdAt: { $gte: start, $lte: end },
      $or: [{ isPaid: true }, { paymentState: { $in: ['PAID_STRIPE', 'PAID_POS'] } }],
      status: { $ne: 'cancelled' },
    }).lean();

    const soldMap = new Map<string, SoldRow>();
    for (const order of paidOrders as any[]) {
      for (const item of order.items || []) {
        const key = String(item.name || '').trim();
        if (!key) continue;
        const current = soldMap.get(key) || { name: key, unitsSold: 0, grossSales: 0 };
        current.unitsSold += Number(item.quantity || 0);
        current.grossSales += Number(item.quantity || 0) * Number(item.price || 0);
        soldMap.set(key, current);
      }
    }

    const soldRows = Array.from(soldMap.values());
    const recommendations = soldRows
      .map((row) => {
        const category = inferCategory(row.name);
        const rule = CATEGORY_RULES[category] || { minDailyUnits: 3, safetyUnits: 6 };
        const needsRestock = row.unitsSold >= rule.minDailyUnits;
        const recommendedUnits = needsRestock ? row.unitsSold + rule.safetyUnits : 0;
        const urgencyScore = row.unitsSold * (category === 'Convenience Store' || category === 'Beverages' ? 1.25 : 1);
        return {
          ...row,
          category,
          needsRestock,
          recommendedUnits,
          urgencyScore: Number(urgencyScore.toFixed(2)),
        };
      })
      .filter((row) => row.needsRestock)
      .sort((a, b) => b.urgencyScore - a.urgencyScore);

    const byCategory = recommendations.reduce<Record<string, number>>((acc, row) => {
      acc[row.category] = (acc[row.category] || 0) + row.unitsSold;
      return acc;
    }, {});

    return successResponse({
      date: start.toISOString().slice(0, 10),
      ordersAnalyzed: paidOrders.length,
      itemsSoldCount: soldRows.length,
      recommendations,
      byCategory,
      notes: [
        'V1 uses paid orders from this date only.',
        'Recommendation = units sold today + category safety stock.',
        'Tune thresholds in CATEGORY_RULES in /api/inventory/restock-advice. -WIP',
      ],
    });
  } catch (error: any) {
    return errorResponse('Failed to generate restock advice.', 500, error?.message);
  }
}
