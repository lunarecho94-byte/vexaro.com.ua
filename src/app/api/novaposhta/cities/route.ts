import { NextRequest, NextResponse } from 'next/server';

interface CityItem {
  ref: string;
  cityRef: string;
  name: string;
  region: string;
  label: string;
}

// In-memory cache for fast repeated queries
const cache = new Map<string, { data: CityItem[]; expires: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

const POPULAR_CITIES: CityItem[] = [
  { ref: 'e718a680-4b33-11e4-ab6d-005056801329', cityRef: '8d5a980d-391c-11dd-90d9-001a92567626', name: 'Київ', region: 'Київська обл.', label: 'м. Київ' },
  { ref: 'e718a68a-4b33-11e4-ab6d-005056801329', cityRef: '8d5a980e-391c-11dd-90d9-001a92567626', name: 'Львів', region: 'Львівська обл.', label: 'м. Львів' },
  { ref: 'e718a68e-4b33-11e4-ab6d-005056801329', cityRef: '8d5a980f-391c-11dd-90d9-001a92567626', name: 'Одеса', region: 'Одеська обл.', label: 'м. Одеса' },
  { ref: 'e718a686-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88f0-391c-11dd-90d9-001a92567626', name: 'Дніпро', region: 'Дніпропетровська обл.', label: 'м. Дніпро' },
  { ref: 'e718a685-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88e0-391c-11dd-90d9-001a92567626', name: 'Харків', region: 'Харківська обл.', label: 'м. Харків' },
  { ref: 'e718a698-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88f5-391c-11dd-90d9-001a92567626', name: 'Вінниця', region: 'Вінницька обл.', label: 'м. Вінниця' },
  { ref: 'e718a687-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88c6-391c-11dd-90d9-001a92567626', name: 'Запоріжжя', region: 'Запорізька обл.', label: 'м. Запоріжжя' },
  { ref: 'e718a693-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88f7-391c-11dd-90d9-001a92567626', name: 'Івано-Франківськ', region: 'Івано-Франківська обл.', label: 'м. Івано-Франківськ' },
  { ref: 'e718a691-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88e6-391c-11dd-90d9-001a92567626', name: 'Полтава', region: 'Полтавська обл.', label: 'м. Полтава' },
  { ref: 'e718a69a-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88f8-391c-11dd-90d9-001a92567626', name: 'Чернівці', region: 'Чернівецька обл.', label: 'м. Чернівці' },
  { ref: 'e718a68b-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88e8-391c-11dd-90d9-001a92567626', name: 'Черкаси', region: 'Черкаська обл.', label: 'м. Черкаси' },
  { ref: 'e718a694-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88d8-391c-11dd-90d9-001a92567626', name: 'Тернопіль', region: 'Тернопільська обл.', label: 'м. Тернопіль' },
  { ref: 'e718a692-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88e4-391c-11dd-90d9-001a92567626', name: 'Рівне', region: 'Рівненська обл.', label: 'м. Рівне' },
  { ref: 'e718a690-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88d2-391c-11dd-90d9-001a92567626', name: 'Луцьк', region: 'Волинська обл.', label: 'м. Луцьк' },
  { ref: 'e718a695-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88e1-391c-11dd-90d9-001a92567626', name: 'Хмельницький', region: 'Хмельницька обл.', label: 'м. Хмельницький' },
  { ref: 'e718a696-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88ea-391c-11dd-90d9-001a92567626', name: 'Житомир', region: 'Житомирська обл.', label: 'м. Житомир' },
  { ref: 'e718a697-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88e7-391c-11dd-90d9-001a92567626', name: 'Чернігів', region: 'Чернігівська обл.', label: 'м. Чернігів' },
  { ref: 'e718a699-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88eb-391c-11dd-90d9-001a92567626', name: 'Ужгород', region: 'Закарпатська обл.', label: 'м. Ужгород' },
  { ref: 'e718a689-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88e9-391c-11dd-90d9-001a92567626', name: 'Кривий Ріг', region: 'Дніпропетровська обл.', label: 'м. Кривий Ріг' },
  { ref: 'e718a688-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88f6-391c-11dd-90d9-001a92567626', name: 'Миколаїв', region: 'Миколаївська обл.', label: 'м. Миколаїв' },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('query') || '').trim();

  // If query is too short or empty, return top popular cities
  if (!query || query.length < 2) {
    return NextResponse.json({ success: true, cities: POPULAR_CITIES });
  }

  const cacheKey = query.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json({ success: true, cities: cached.data });
  }

  try {
    const apiKey = process.env.NOVA_POSHTA_API_KEY || '';

    const res = await fetch('https://api.novaposhta.ua/v2.0/json/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        modelName: 'Address',
        calledMethod: 'searchSettlements',
        methodProperties: {
          CityName: query,
          Limit: '20',
          Page: '1',
        },
      }),
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      throw new Error(`Nova Poshta HTTP error: ${res.status}`);
    }

    const json = await res.json();
    if (!json.success || !json.data || !json.data[0]?.Addresses) {
      return NextResponse.json({ success: true, cities: [] });
    }

    const addresses = json.data[0].Addresses;
    const cities: CityItem[] = addresses.map((addr: any) => {
      const type = addr.SettlementTypeCode ? `${addr.SettlementTypeCode} ` : '';
      const name = addr.MainDescription || addr.Present.split(',')[0];
      const area = addr.Area ? `${addr.Area} обл.` : '';
      const region = addr.Region ? `${addr.Region} р-н` : '';
      const parts = [area, region].filter(Boolean).join(', ');

      return {
        ref: addr.Ref,
        cityRef: addr.DeliveryCity || addr.Ref,
        name: name,
        region: parts,
        label: addr.Present || `${type}${name}${parts ? ` (${parts})` : ''}`,
      };
    });

    cache.set(cacheKey, { data: cities, expires: Date.now() + CACHE_TTL });
    return NextResponse.json({ success: true, cities });
  } catch (err: any) {
    console.error('Nova Poshta searchSettlements error:', err);
    // Fallback: filter popular cities locally
    const filtered = POPULAR_CITIES.filter((c) =>
      c.name.toLowerCase().includes(query.toLowerCase())
    );
    return NextResponse.json({ success: true, cities: filtered });
  }
}
