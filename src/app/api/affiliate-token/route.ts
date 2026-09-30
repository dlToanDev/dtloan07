import { NextResponse } from 'next/server';
import {
  getCurrentAffiliateToken,
  getAffiliatePath,
  getAffiliateTokenExpiry,
} from '@/lib/affiliate-token';

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = getCurrentAffiliateToken();
  const path = getAffiliatePath();
  const expiry = getAffiliateTokenExpiry();

  return NextResponse.json({
    token,
    path,
    expiresAt: expiry.expiresAt,
    remainingSeconds: expiry.remainingSeconds,
    rotationMinutes: expiry.rotationMinutes,
  });
}
