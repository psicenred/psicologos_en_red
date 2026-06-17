import { NextResponse } from 'next/server';
import {
  getPrecioRegionAsync,
  PRECIOS_DEFAULT_MXN,
  PRECIOS_DEFAULT_USD,
} from '@/lib/geo';

export async function GET(request: Request) {
  const testMxn = process.env.STRIPE_TEST_AMOUNT_MXN
    ? parseInt(process.env.STRIPE_TEST_AMOUNT_MXN, 10)
    : 0;
  if (testMxn > 0) {
    return NextResponse.json({
      amount: testMxn,
      currency: 'MXN',
      inMexico: true,
    });
  }

  const { searchParams } = new URL(request.url);
  const force = (searchParams.get('pais') || searchParams.get('moneda') || '')
    .toUpperCase();

  if (force === 'MX' || force === 'MXN') {
    return NextResponse.json({
      amount: PRECIOS_DEFAULT_MXN.individual,
      currency: 'MXN',
      inMexico: true,
    });
  }
  if (force === 'US' || force === 'USD') {
    return NextResponse.json({
      amount: PRECIOS_DEFAULT_USD.individual,
      currency: 'USD',
      inMexico: false,
    });
  }

  const data = await getPrecioRegionAsync(request);
  return NextResponse.json(data);
}
