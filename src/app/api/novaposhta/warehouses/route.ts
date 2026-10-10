import { NextRequest, NextResponse } from 'next/server';

interface WarehouseItem {
  ref: string;
  number: string;
  description: string;
  shortAddress: string;
  type: 'branch' | 'postomat';
  maxWeight: number;
}

const cache = new Map<string, { data: WarehouseItem[]; expires: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cityRef = (searchParams.get('cityRef') || '').trim();
  const settlementRef = (searchParams.get('settlementRef') || '').trim();
  const search = (searchParams.get('search') || '').trim();
  const typeFilter = (searchParams.get('type') || 'all').trim(); // 'all' | 'branch' | 'postomat'

  if (!cityRef && !settlementRef) {
    return NextResponse.json(
      { success: false, message: 'Параметр cityRef або settlementRef обовʼязковий' },
      { status: 400 }
    );
  }

  const cacheKey = `${cityRef}_${settlementRef}_${search.toLowerCase()}_${typeFilter}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json({ success: true, warehouses: cached.data });
  }

  try {
    const apiKey = process.env.NOVA_POSHTA_API_KEY || '';

    const methodProperties: Record<string, string> = {
      Limit: '100',
    };

    if (cityRef) {
      methodProperties.CityRef = cityRef;
    }
    if (settlementRef) {
      methodProperties.SettlementRef = settlementRef;
    }
    if (search) {
      methodProperties.FindByString = search;
    }

    if (typeFilter === 'postomat') {
      methodProperties.TypeOfWarehouseRef = 'f9316480-5f2d-425d-bc2c-ac7cd29decf0';
    }

    const res = await fetch('https://api.novaposhta.ua/v2.0/json/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        modelName: 'Address',
        calledMethod: 'getWarehouses',
        methodProperties,
      }),
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      throw new Error(`Nova Poshta HTTP error: ${res.status}`);
    }

    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) {
      return NextResponse.json({ success: true, warehouses: [] });
    }

    let warehouses: WarehouseItem[] = json.data.map((w: any) => {
      const isPostomat =
        w.CategoryOfWarehouse === 'Postomat' ||
        w.Description?.toLowerCase().includes('поштомат') ||
        w.TypeOfWarehouse === 'f9316480-5f2d-425d-bc2c-ac7cd29decf0';

      return {
        ref: w.Ref,
        number: w.Number,
        description: w.Description,
        shortAddress: w.ShortAddress || w.Description,
        type: isPostomat ? 'postomat' : 'branch',
        maxWeight: Number(w.TotalMaxWeightAllowed || w.PlaceMaxWeightAllowed || 0),
      };
    });

    if (typeFilter === 'branch') {
      warehouses = warehouses.filter((w) => w.type === 'branch');
    } else if (typeFilter === 'postomat') {
      warehouses = warehouses.filter((w) => w.type === 'postomat');
    }

    // Sort: branches with lower numbers first
    warehouses.sort((a, b) => {
      const numA = parseInt(a.number, 10);
      const numB = parseInt(b.number, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.description.localeCompare(b.description, 'uk');
    });

    cache.set(cacheKey, { data: warehouses, expires: Date.now() + CACHE_TTL });
    return NextResponse.json({ success: true, warehouses });
  } catch (err: any) {
    console.error('Nova Poshta getWarehouses error:', err);
    return NextResponse.json(
      { success: false, warehouses: [], message: err.message },
      { status: 500 }
    );
  }
}
