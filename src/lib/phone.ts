/**
 * Валідація та форматування українських номерів телефонів.
 * Формат маски: +380 (XX) XXX-XX-XX
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
 * Витягує 9 цифр українського номера (без префікса 380 або початкового 0).
 * Запобігає появі випадкових цифр при видаленні префікса (+380, +38, +3).
 */
export function extractPhoneDigits(input: string): string {
  if (!input) return '';
  let digits = input.replace(/\D/g, '');
  // Якщо залишився лише префікс або його частина (+380, +38, +3) -> вважаємо поле повністю очищеним
  if (!digits || digits === '3' || digits === '38' || digits === '380') {
    return '';
  }
  if (digits.startsWith('380')) {
    digits = digits.substring(3);
  } else if (digits.startsWith('80')) {
    digits = digits.substring(2);
  } else if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }
  return digits.substring(0, 9);
}

/**
 * Зворотна сумісність: 10 національних цифр (0XXXXXXXXX)
 */
export function extractNationalDigits(raw: string): string {
  const digits = extractPhoneDigits(raw);
  return digits ? '0' + digits : '';
}

/**
 * Форматує 9 цифр у вигляд +380 (XX) XXX-XX-XX.
 * Не залишає висячих дужок або дефісів при видаленні цифр назад.
 */
export function formatUkrainianPhone(digitsOrRaw: string): string {
  const digits =
    digitsOrRaw && digitsOrRaw.length === 9 && !digitsOrRaw.startsWith('+') && !digitsOrRaw.startsWith('0')
      ? digitsOrRaw
      : extractPhoneDigits(digitsOrRaw);

  if (!digits) return '';

  let res = '+380 (';
  if (digits.length <= 2) {
    return res + digits;
  }
  res += digits.substring(0, 2) + ') ' + digits.substring(2, Math.min(5, digits.length));
  if (digits.length <= 5) return res;
  res += '-' + digits.substring(5, Math.min(7, digits.length));
  if (digits.length <= 7) return res;
  res += '-' + digits.substring(7, Math.min(9, digits.length));
  return res;
}

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  operator?: string;
  normalized?: string; // 10 цифр: "0971234568"
  international?: string; // "+380971234568"
  formatted?: string; // "+380 (97) 123-45-68"
}

function digitsRemainingWord(count: number): string {
  if (count === 1) return 'цифру';
  if (count >= 2 && count <= 4) return 'цифри';
  return 'цифр';
}

/**
 * Повна перевірка номера телефону:
 * 1. Наявність рівно 9 цифр після +380 (10 цифр у національному форматі 0XX...).
 * 2. Дійсний код українського мобільного оператора.
 * 3. Захист від однакових цифр або шаблонних послідовностей.
 */
export function validateUkrainianPhone(raw: string): PhoneValidationResult {
  if (!raw || !raw.trim()) {
    return { isValid: false, error: 'Вкажіть номер телефону' };
  }

  const digits = extractPhoneDigits(raw);

  if (digits.length < 9) {
    const missing = 9 - digits.length;
    return {
      isValid: false,
      error: `Введіть повний номер телефону (ще ${missing} ${digitsRemainingWord(missing)})`,
    };
  }

  const code = '0' + digits.substring(0, 2);
  const operator = UKRAINIAN_OPERATORS[code];
  if (!operator) {
    return {
      isValid: false,
      error: `Недійсний код оператора (${code}). Вкажіть дійсний мобільний номер (Київстар, Vodafone, lifecell)`,
    };
  }

  const subscriber = digits.substring(2); // 7 цифр

  if (/^(\d)\1{5,}$/.test(subscriber)) {
    return {
      isValid: false,
      error: 'Номер не може складатися з однакових цифр',
    };
  }

  if (DUMMY_SEQUENCES.has(subscriber)) {
    return {
      isValid: false,
      error: 'Введіть реальний номер телефону, а не тестовий набір цифр',
    };
  }

  const uniqueDigits = new Set(digits.split(''));
  if (uniqueDigits.size <= 2) {
    return {
      isValid: false,
      error: 'Введіть реальний номер телефону',
    };
  }

  const formatted = formatUkrainianPhone(digits);
  return {
    isValid: true,
    operator,
    normalized: '0' + digits,
    international: `+380${digits}`,
    formatted,
  };
}
