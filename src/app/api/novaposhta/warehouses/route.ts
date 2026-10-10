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
  const cityName = (searchParams.get('cityName') || '').trim();
  const rawSearch = (searchParams.get('search') || '').trim();
  const typeFilter = (searchParams.get('type') || 'all').trim(); // 'all' | 'branch' | 'postomat'

  if (!cityRef && !settlementRef && !cityName) {
    return NextResponse.json(
      { success: false, message: 'Параметр cityRef, settlementRef або cityName обовʼязковий' },
      { status: 400 }
    );
  }

  // Smart search cleaning: strip words like "відділення", "поштомат", "№", "номер"
  const cleanedSearch = rawSearch
    .replace(/(відділення|отделение|поштомат|почтомат|нова\s*пошта|номер)/gi, '')
    .replace(/[№#]/g, '')
    .trim();
  const isNumericSearch = /^\d+$/.test(cleanedSearch);

  const cacheKey = `${cityRef}_${settlementRef}_${cityName.toLowerCase()}_${cleanedSearch.toLowerCase()}_${typeFilter}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json({ success: true, warehouses: cached.data });
  }

  try {
    const apiKey = process.env.NOVA_POSHTA_API_KEY || '';

    const fetchNovaPoshta = async (props: Record<string, string>) => {
      try {
        const res = await fetch('https://api.novaposhta.ua/v2.0/json/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey,
            modelName: 'Address',
            calledMethod: 'getWarehouses',
            methodProperties: props,
          }),
          next: { revalidate: 1800 },
        });
        if (!res.ok) return [];
        const json = await res.json();
        return json.success && Array.isArray(json.data) ? json.data : [];
      } catch (err) {
        console.error('Nova Poshta fetch error:', err);
        return [];
      }
    };

    const baseProps: Record<string, string> = {};
    if (cityRef) {
      baseProps.CityRef = cityRef;
    } else if (settlementRef) {
      baseProps.SettlementRef = settlementRef;
    } else if (cityName) {
      baseProps.CityName = cityName;
    }

    if (typeFilter === 'postomat') {
      baseProps.TypeOfWarehouseRef = 'f9316480-5f2d-425d-bc2c-ac7cd29decf0';
    }

    let rawData: any[] = [];
    const seenRefs = new Set<string>();

    if (isNumericSearch) {
      // 1. Fetch exact warehouse by number first
      const exactProps = { ...baseProps, WarehouseId: cleanedSearch };
      const exactMatches = await fetchNovaPoshta(exactProps);
      for (const w of exactMatches) {
        if (!seenRefs.has(w.Ref)) {
          rawData.push(w);
          seenRefs.add(w.Ref);
        }
      }

      // 2. Also search with FindByString for any additional warehouses containing this number
      const broadProps = { ...baseProps, FindByString: cleanedSearch, Limit: '200' };
      const broadMatches = await fetchNovaPoshta(broadProps);
      for (const w of broadMatches) {
        if (!seenRefs.has(w.Ref)) {
          rawData.push(w);
          seenRefs.add(w.Ref);
        }
      }
    } else if (cleanedSearch) {
      const searchProps = { ...baseProps, FindByString: cleanedSearch, Limit: '300' };
      rawData = await fetchNovaPoshta(searchProps);
    } else {
      // Default: fetch all warehouses in settlement (up to 1000)
      const listProps = { ...baseProps, Limit: '1000' };
      rawData = await fetchNovaPoshta(listProps);
    }

    // Fallback: If no results with cityRef/settlementRef and cityName is available, retry with CityName
    if (rawData.length === 0 && cityName && !baseProps.CityName) {
      const fallbackProps: Record<string, string> = { CityName: cityName, Limit: '500' };
      if (typeFilter === 'postomat') {
        fallbackProps.TypeOfWarehouseRef = 'f9316480-5f2d-425d-bc2c-ac7cd29decf0';
      }
      if (cleanedSearch) {
        fallbackProps.FindByString = cleanedSearch;
      }
      rawData = await fetchNovaPoshta(fallbackProps);
    }

    let warehouses: WarehouseItem[] = rawData.map((w: any) => {
      const isPostomat =
        w.CategoryOfWarehouse === 'Postomat' ||
        w.Description?.toLowerCase().includes('поштомат') ||
        w.TypeOfWarehouse === 'f9316480-5f2d-425d-bc2c-ac7cd29decf0';

      return {
        ref: w.Ref,
        number: w.Number || '',
        description: w.Description || '',
        shortAddress: w.ShortAddress || w.Description || '',
        type: isPostomat ? 'postomat' : 'branch',
        maxWeight: Number(w.TotalMaxWeightAllowed || w.PlaceMaxWeightAllowed || 0),
      };
    });

    if (typeFilter === 'branch') {
      warehouses = warehouses.filter((w) => w.type === 'branch');
    } else if (typeFilter === 'postomat') {
      warehouses = warehouses.filter((w) => w.type === 'postomat');
    }

    // Sort order:
    // If numeric search: exact number match comes first!
    // Otherwise: Branches first (sorted by branch number integer 1..N), then Postomats (sorted by number).
    warehouses.sort((a, b) => {
      if (isNumericSearch) {
        const aExact = a.number === cleanedSearch;
        const bExact = b.number === cleanedSearch;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
      }

      // Group branches before postomats if 'all' filter
      if (typeFilter === 'all' && a.type !== b.type) {
        return a.type === 'branch' ? -1 : 1;
      }

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
    console.error('Nova Poshta getWarehouses route error:', err);
    return NextResponse.json(
      { success: false, warehouses: [], message: err.message },
      { status: 500 }
    );
  }
}
