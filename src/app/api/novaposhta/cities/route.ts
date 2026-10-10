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
  { ref: 'e71abb60-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88f5-391c-11dd-90d9-001a92567626', name: 'Львів', region: 'Львівська обл.', label: 'м. Львів' },
  { ref: 'e71c2a15-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88d0-391c-11dd-90d9-001a92567626', name: 'Одеса', region: 'Одеська обл.', label: 'м. Одеса' },
  { ref: 'e717110a-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88f0-391c-11dd-90d9-001a92567626', name: 'Дніпро', region: 'Дніпропетровська обл.', label: 'м. Дніпро' },
  { ref: 'e71f8842-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88e0-391c-11dd-90d9-001a92567626', name: 'Харків', region: 'Харківська обл.', label: 'м. Харків' },
  { ref: 'e717bce9-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88c6-391c-11dd-90d9-001a92567626', name: 'Запоріжжя', region: 'Запорізька обл.', label: 'м. Запоріжжя' },
  { ref: 'e71629ab-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88de-391c-11dd-90d9-001a92567626', name: 'Вінниця', region: 'Вінницька обл.', label: 'м. Вінниця' },
  { ref: 'e7182b3c-4b33-11e4-ab6d-005056801329', cityRef: 'db5c8904-391c-11dd-90d9-001a92567626', name: 'Івано-Франківськ', region: 'Івано-Франківська обл.', label: 'м. Івано-Франківськ' },
  { ref: 'e71d006d-4b33-11e4-ab6d-005056801329', cityRef: 'db5c8892-391c-11dd-90d9-001a92567626', name: 'Полтава', region: 'Полтавська обл.', label: 'м. Полтава' },
  { ref: 'e71fe717-4b33-11e4-ab6d-005056801329', cityRef: 'e221d642-391c-11dd-90d9-001a92567626', name: 'Чернівці', region: 'Чернівецька обл.', label: 'м. Чернівці' },
  { ref: 'e71fe3ca-4b33-11e4-ab6d-005056801329', cityRef: 'db5c8902-391c-11dd-90d9-001a92567626', name: 'Черкаси', region: 'Черкаська обл.', label: 'м. Черкаси' },
  { ref: 'e71efc6a-4b33-11e4-ab6d-005056801329', cityRef: 'db5c8900-391c-11dd-90d9-001a92567626', name: 'Тернопіль', region: 'Тернопільська обл.', label: 'м. Тернопіль' },
  { ref: 'e71d65e1-4b33-11e4-ab6d-005056801329', cityRef: 'db5c896a-391c-11dd-90d9-001a92567626', name: 'Рівне', region: 'Рівненська обл.', label: 'м. Рівне' },
  { ref: 'e71ab70b-4b33-11e4-ab6d-005056801329', cityRef: 'db5c893b-391c-11dd-90d9-001a92567626', name: 'Луцьк', region: 'Волинська обл.', label: 'м. Луцьк' },
  { ref: 'e71f8e8f-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88ac-391c-11dd-90d9-001a92567626', name: 'Хмельницький', region: 'Хмельницька обл.', label: 'м. Хмельницький' },
  { ref: 'e717a3d0-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88c4-391c-11dd-90d9-001a92567626', name: 'Житомир', region: 'Житомирська обл.', label: 'м. Житомир' },
  { ref: 'e71feb5c-4b33-11e4-ab6d-005056801329', cityRef: 'db5c897c-391c-11dd-90d9-001a92567626', name: 'Чернігів', region: 'Чернігівська обл.', label: 'м. Чернігів' },
  { ref: 'e71f4773-4b33-11e4-ab6d-005056801329', cityRef: 'e221d627-391c-11dd-90d9-001a92567626', name: 'Ужгород', region: 'Закарпатська обл.', label: 'м. Ужгород' },
  { ref: 'e71a2cab-4b33-11e4-ab6d-005056801329', cityRef: 'db5c890d-391c-11dd-90d9-001a92567626', name: 'Кривий Ріг', region: 'Дніпропетровська обл.', label: 'м. Кривий Ріг' },
  { ref: 'e71b108c-4b33-11e4-ab6d-005056801329', cityRef: 'db5c888c-391c-11dd-90d9-001a92567626', name: 'Миколаїв', region: 'Миколаївська обл.', label: 'м. Миколаїв' },
  { ref: 'e71e73be-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88e5-391c-11dd-90d9-001a92567626', name: 'Суми', region: 'Сумська обл.', label: 'м. Суми' },
  { ref: 'e71a26ea-4b33-11e4-ab6d-005056801329', cityRef: '8d5a9813-391c-11dd-90d9-001a92567626', name: 'Кременчук', region: 'Полтавська обл.', label: 'м. Кременчук' },
  { ref: 'e718b361-4b33-11e4-ab6d-005056801329', cityRef: 'db5c891b-391c-11dd-90d9-001a92567626', name: 'Кропивницький', region: 'Кіровоградська обл.', label: 'м. Кропивницький' },
  { ref: 'e7148607-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88ce-391c-11dd-90d9-001a92567626', name: 'Біла Церква', region: 'Київська обл.', label: 'м. Біла Церква' },
  { ref: 'e715719e-4b33-11e4-ab6d-005056801329', cityRef: 'db5c88d7-391c-11dd-90d9-001a92567626', name: 'Бровари', region: 'Київська обл.', label: 'м. Бровари' },
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
