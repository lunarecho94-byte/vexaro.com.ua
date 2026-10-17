import { z } from 'zod';

const orderSchema = z.object({
  customerName: z.string().min(2, 'Вкажіть ваше імʼя та прізвище'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().min(10, 'Вкажіть дійсний номер телефону'),
  city: z.string().min(2, 'Вкажіть місто доставки'),
  warehouse: z.string().min(1, 'Вкажіть відділення або поштомат Нової Пошти'),
  comment: z.string().optional(),
  dontCall: z.boolean().optional(),
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      sku: z.string(),
      size: z.string(),
      price: z.number().positive(),
      quantity: z.number().int().positive(),
      slug: z.string().optional(),
    })
  ).min(1, 'Кошик порожній'),
  totalAmount: z.number().positive(),
});

async function main() {
  console.log('--- 1. Testing Order Schema Validation ---');

  // Valid order
  const validOrder = {
    customerName: 'Іван Петренко',
    phone: '+38 (097) 123-45-67',
    city: 'Київ',
    warehouse: 'Відділення №10',
    dontCall: false,
    items: [
      {
        id: '12345',
        name: 'Nike Air Max',
        sku: 'NK-001',
        size: '42',
        price: 3200,
        quantity: 1,
        slug: 'nike-air-max',
      },
    ],
    totalAmount: 3200,
  };

  const parsedValid = orderSchema.safeParse(validOrder);
  if (!parsedValid.success) throw new Error('Valid order failed validation');
  console.log('✓ Valid order parsed successfully');

  // Invalid: Empty items
  const emptyItemsOrder = { ...validOrder, items: [] };
  const parsedEmpty = orderSchema.safeParse(emptyItemsOrder);
  if (parsedEmpty.success) throw new Error('Empty items should fail validation');
  console.log('✓ Empty cart correctly rejected');

  // Invalid: Short phone
  const shortPhoneOrder = { ...validOrder, phone: '123' };
  const parsedShortPhone = orderSchema.safeParse(shortPhoneOrder);
  if (parsedShortPhone.success) throw new Error('Short phone should fail validation');
  console.log('✓ Invalid phone correctly rejected');

  // Invalid: Negative total
  const negativePriceOrder = { ...validOrder, totalAmount: -100 };
  const parsedNegative = orderSchema.safeParse(negativePriceOrder);
  if (parsedNegative.success) throw new Error('Negative price should fail validation');
  console.log('✓ Negative total correctly rejected');

  console.log('\n--- 2. Testing Live Nova Poshta API Integration ---');
  // Query Nova Poshta through our route handler logic
  const npKey = process.env.NOVA_POSHTA_API_KEY || '';
  const npCitiesRes = await fetch('https://api.novaposhta.ua/v2.0/json/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: npKey,
      modelName: 'Address',
      calledMethod: 'searchSettlements',
      methodProperties: {
        CityName: 'Київ',
        Limit: '5',
        Page: '1',
      },
    }),
  });
  const npCitiesData = (await npCitiesRes.json()) as any;
  if (!npCitiesData.success || !npCitiesData.data?.[0]?.Addresses) {
    throw new Error('Nova Poshta cities API failed');
  }
  const kyiv = npCitiesData.data[0].Addresses[0];
  console.log(`✓ Nova Poshta cities API responsive: found "${kyiv.Present}" (DeliveryCity: ${kyiv.DeliveryCity})`);

  // Query warehouses for Kyiv
  const npWarehousesRes = await fetch('https://api.novaposhta.ua/v2.0/json/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: npKey,
      modelName: 'AddressGeneral',
      calledMethod: 'getWarehouses',
      methodProperties: {
        CityRef: kyiv.DeliveryCity,
        Limit: '5',
        Page: '1',
      },
    }),
  });
  const npWarehousesData = (await npWarehousesRes.json()) as any;
  if (!npWarehousesData.success || !npWarehousesData.data?.length) {
    throw new Error('Nova Poshta warehouses API failed');
  }
  console.log(`✓ Nova Poshta warehouses API responsive: found "${npWarehousesData.data[0].Description}"`);

  console.log('\n🎉 ALL API AND ORDER VALIDATION TESTS PASSED!');
}

main().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
