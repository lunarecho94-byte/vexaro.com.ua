import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Lightweight health check endpoint for Coolify zero-downtime rolling deployments
 * and Docker container health probes.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
