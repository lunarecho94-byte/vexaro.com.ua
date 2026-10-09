import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { SITE_URL } from '@/lib/config';

const orderSchema = z.object({
  customerName: z.string().min(2, 'Вкажіть ваше імʼя'),
  phone: z.string().min(10, 'Вкажіть дійсний номер телефону'),
  city: z.string().min(2, 'Вкажіть місто доставки'),
  warehouse: z.string().min(1, 'Вкажіть відділення або поштомат Нової Пошти'),
  comment: z.string().optional(),
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      sku: z.string(),
      size: z.string(),
      price: z.number().positive(),
      quantity: z.number().int().positive(),
    })
  ).min(1, 'Кошик порожній'),
  totalAmount: z.number().positive(),
});

const ORDERS_FILE = path.join(process.cwd(), 'src', 'data', 'orders.json');

function saveOrderToDb(order: any) {
  try {
    let orders = [];
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, 'utf-8');
      orders = JSON.parse(data || '[]');
    }
    orders.unshift(order);
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save order to disk:', err);
  }
}

async function sendTelegramNotification(order: any) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log('ℹ️ Telegram не налаштовано (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID відсутні).');
    return;
  }

  const itemsList = order.items
    .map(
      (i: any) =>
        `• ${i.name} (арт. ${i.sku})\n  Розмір: ${i.size} | К-сть: ${i.quantity} шт. | ${i.price} ₴`
    )
    .join('\n\n');

  const text =
    `🔥 <b>НОВЕ ЗАМОВЛЕННЯ #${order.id}</b>\n\n` +
    `👤 <b>Клієнт:</b> ${order.customerName}\n` +
    `📞 <b>Телефон:</b> ${order.phone}\n` +
    `📍 <b>Місто:</b> ${order.city}\n` +
    `📦 <b>Відділення НП:</b> ${order.warehouse}\n` +
    (order.comment ? `💬 <b>Коментар:</b> ${order.comment}\n` : '') +
    `\n🛒 <b>Товари:</b>\n${itemsList}\n\n` +
    `💰 <b>РАЗОМ ДО СПЛАТИ:</b> <b>${order.totalAmount.toLocaleString('uk-UA')} ₴</b>\n` +
    `💳 <b>Оплата:</b> Накладений платіж при отриманні`;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
  } catch (err) {
    console.error('Telegram notification error:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = orderSchema.parse(body);

    const orderId = `VX-${Date.now().toString().slice(-6)}`;
    const orderRecord = {
      id: orderId,
      ...validatedData,
      status: 'new',
      createdAt: new Date().toISOString(),
    };

    // 1. Save order to persistent local database
    saveOrderToDb(orderRecord);

    // 2. Dispatch Telegram alert
    await sendTelegramNotification(orderRecord);

    // 3. Dispatch Meta CAPI Purchase event (server-side deduplication)
    try {
      const { sendMetaServerEvent } = await import('@/lib/meta-conversions');
      await sendMetaServerEvent({
        eventName: 'Purchase',
        eventId: orderId,
        sourceUrl: req.headers.get('referer') || `${SITE_URL}/checkout`,
        user: {
          name: validatedData.customerName,
          phone: validatedData.phone,
          clientIp: req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || undefined,
          clientUserAgent: req.headers.get('user-agent') || undefined,
        },
        customData: {
          value: validatedData.totalAmount,
          currency: 'UAH',
          content_type: 'product',
          content_ids: validatedData.items.map((i) => i.id),
          num_items: validatedData.items.reduce((s, i) => s + i.quantity, 0),
        },
      });
    } catch (capiErr) {
      console.error('CAPI trigger error:', capiErr);
    }

    return NextResponse.json({
      success: true,
      orderId,
      totalAmount: validatedData.totalAmount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: 'Помилка створення замовлення' },
      { status: 500 }
    );
  }
}
