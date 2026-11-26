import { getProductById } from '@/lib/products';

interface OrderItemInput {
  id: string;
  name: string;
  sku: string;
  size: string;
  price: number;
  quantity: number;
  slug?: string;
}

export interface SheetOrderPayload {
  id: string;
  customerName: string;
  phone: string;
  city: string;
  warehouse: string;
  comment?: string;
  dontCall?: boolean;
  items: OrderItemInput[];
  totalAmount: number;
  createdAt: string;
}

/**
 * Dispatches new VEXARO website orders to the EasyDrop Google Sheets webhook.
 * Requires GOOGLE_SHEETS_WEBHOOK_URL to be configured; fails open so checkout never breaks.
 */
export async function sendOrderToGoogleSheets(order: SheetOrderPayload): Promise<void> {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('ℹ️ GOOGLE_SHEETS_WEBHOOK_URL не задано, пропуск синхронізації з Google Таблицею.');
    return;
  }

  const secret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET || '';
  const enrichedItems = await Promise.all(
    order.items.map(async (item) => {
      let costPrice = 0;
      try {
        const product = await getProductById(item.id);
        costPrice = product?.activeVariation?.costPrice ?? product?.costPrice ?? 0;
      } catch {
        costPrice = 0;
      }
      return {
        id: item.id,
        name: item.name,
        sku: item.sku,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
        costPrice,
      };
    })
  );

  const noteParts: string[] = [];
  if (order.dontCall) noteParts.push('Не телефонувати');
  if (order.comment) noteParts.push(order.comment);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        secret,
        action: 'appendOrders',
        order: {
          id: order.id,
          createdAt: order.createdAt,
          source: 'Сайт (VEXARO)',
          customerName: order.customerName,
          phone: order.phone,
          city: order.city,
          warehouse: order.warehouse,
          paymentType: 'Накладений платіж',
          note: noteParts.join(' | '),
          items: enrichedItems,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ Google Sheets Webhook Error (${res.status}):`, errText);
    } else {
      console.log(`✅ Замовлення #${order.id} передано до Google Таблиці`);
    }
  } catch (err) {
    console.error('Google Sheets webhook network error:', err);
  } finally {
    clearTimeout(timeoutId);
  }
}
