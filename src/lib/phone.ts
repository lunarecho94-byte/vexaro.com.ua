/**
 * Валідація та форматування українських номерів телефонів.
 * Дозволяє лише дійсні мобільні номери українських операторів (Київстар, Vodafone, lifecell, тощо)
 * та блокує неповні номери, неіснуючі коди операторів і тестові/фейкові набори цифр.
 */

export const UKRAINIAN_OPERATORS: Record<string, string> = {
  // Київстар
  '067': 'Київстар',
  '068': 'Київстар',
  '096': 'Київстар',
  '097': 'Київстар',
  '098': 'Київстар',
  '077': 'Київстар',

  // Vodafone
  '050': 'Vodafone',
  '066': 'Vodafone',
  '095': 'Vodafone',
  '099': 'Vodafone',
  '075': 'Vodafone',

  // lifecell
  '063': 'lifecell',
  '073': 'lifecell',
  '093': 'lifecell',

  // Інші національні мобільні / CDMA оператори
  '091': '3Mob',
  '092': 'PeopleNet',
  '094': 'Інтертелеком',
  '039': 'Golden Telecom',
};

// Заборонені тестові/шаблонні послідовності в абонентській частині (7 цифр)
const DUMMY_SEQUENCES = new Set([
  '1234567',
  '7654321',
  '0123456',
  '6543210',
  '2345678',
  '8765432',
  '3456789',
  '9876543',
  '0000000',
  '1111111',
  '2222222',
  '3333333',
  '4444444',
  '5555555',
  '6666666',
  '7777777',
  '8888888',
  '9999999',
]);

/**
 * Очищає ввід до 10 національних цифр (0XXXXXXXXX)
 */
export function extractNationalDigits(raw: string): string {
  let digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('380')) {
    digits = digits.substring(2);
  } else if (digits.startsWith('80')) {
    digits = digits.substring(1);
  } else if (digits.length === 9 && !digits.startsWith('0')) {
    digits = '0' + digits;
  }
  if (digits.length > 10) {
    digits = digits.substring(0, 10);
  }
  return digits;
}

/**
 * Форматує цифри у вигляд +38 (0XX) XXX-XX-XX
 */
export function formatUkrainianPhone(digits: string): string {
  if (!digits) return '';
  let formatted = '+38 ';
  if (digits.length > 0) {
    formatted += '(' + digits.substring(0, Math.min(3, digits.length));
  }
  if (digits.length >= 4) {
    formatted += ') ' + digits.substring(3, Math.min(6, digits.length));
  }
  if (digits.length >= 7) {
    formatted += '-' + digits.substring(6, Math.min(8, digits.length));
  }
  if (digits.length >= 9) {
    formatted += '-' + digits.substring(8, Math.min(10, digits.length));
  }
  return formatted;
}

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  operator?: string;
  normalized?: string; // 10 цифр: "0971234568"
  international?: string; // "+380971234568"
  formatted?: string; // "+38 (097) 123-45-68"
}

function digitsRemainingWord(count: number): string {
  if (count === 1) return 'цифру';
  if (count >= 2 && count <= 4) return 'цифри';
  return 'цифр';
}

/**
 * Повна перевірка номера телефону:
 * 1. Наявність та довжина (рівно 10 цифр з початковим 0).
 * 2. Дійсний код українського мобільного оператора.
 * 3. Захист від однакових цифр або шаблонних послідовностей.
 */
export function validateUkrainianPhone(raw: string): PhoneValidationResult {
  if (!raw || !raw.trim()) {
    return { isValid: false, error: 'Вкажіть номер телефону' };
  }

  const digits = extractNationalDigits(raw);

  if (digits.length < 10) {
    const missing = 10 - digits.length;
    return {
      isValid: false,
      error: `Введіть повний номер телефону (ще ${missing} ${digitsRemainingWord(missing)})`,
    };
  }

  if (digits.length > 10) {
    return { isValid: false, error: 'Номер телефону містить забагато цифр' };
  }

  if (!digits.startsWith('0')) {
    return { isValid: false, error: 'Номер телефону повинен починатися з 0' };
  }

  const code = digits.substring(0, 3);
  const operator = UKRAINIAN_OPERATORS[code];
  if (!operator) {
    return {
      isValid: false,
      error: `Недійсний код оператора (${code}). Вкажіть дійсний мобільний номер (Київстар, Vodafone, lifecell)`,
    };
  }

  const subscriber = digits.substring(3); // 7 цифр після коду

  // Перевірка на 6 або більше однакових цифр підряд
  if (/^(\d)\1{5,}$/.test(subscriber)) {
    return {
      isValid: false,
      error: 'Номер не може складатися з однакових цифр',
    };
  }

  // Перевірка на тестові/шаблонні послідовності
  if (DUMMY_SEQUENCES.has(subscriber)) {
    return {
      isValid: false,
      error: 'Введіть реальний номер телефону, а не тестовий набір цифр',
    };
  }

  // Перевірка на занадто малу кількість унікальних цифр (наприклад, 0909090909)
  const uniqueDigits = new Set(digits.split(''));
  if (uniqueDigits.size <= 2) {
    return {
      isValid: false,
      error: 'Введіть коректний номер телефону',
    };
  }

  const formatted = formatUkrainianPhone(digits);
  return {
    isValid: true,
    operator,
    normalized: digits,
    international: `+38${digits}`,
    formatted,
  };
}
