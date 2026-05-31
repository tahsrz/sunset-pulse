export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { cmsTransactions } from '@/lib/cms/mockData';

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const department = searchParams.get('department');
    const tender = searchParams.get('tender');

    const transactions = cmsTransactions.filter((transaction) => {
      const departmentMatch = !department || transaction.department.toLowerCase() === department.toLowerCase();
      const tenderMatch = !tender || transaction.tender.toLowerCase() === tender.toLowerCase();
      return departmentMatch && tenderMatch;
    });

    return successResponse(transactions, {
      source: 'mock-rubyci-cms',
      count: transactions.length,
    });
  } catch (error: any) {
    return errorResponse('Failed to load CMS transactions.', 500, error.message);
  }
};
