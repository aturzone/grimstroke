/**
 * Units, and converting between them: length, mass, volume, temperature, speed.
 *
 * A table and two lines of arithmetic rather than a conversion library: every unit is a factor
 * against its measure's base unit, except temperature, which is an offset as well.
 */

export type Measure = 'length' | 'mass' | 'volume' | 'temperature' | 'speed';

interface Unit {
  measure: Measure;
  /** How many base units one of these is (base: m, kg, l, m/s). Temperature uses to/from. */
  factor: number;
  label: string;
}

export const UNITS: Record<string, Unit> = {
  km: { measure: 'length', factor: 1000, label: 'km' },
  m: { measure: 'length', factor: 1, label: 'm' },
  cm: { measure: 'length', factor: 0.01, label: 'cm' },
  mm: { measure: 'length', factor: 0.001, label: 'mm' },
  mi: { measure: 'length', factor: 1609.344, label: 'mi' },
  yd: { measure: 'length', factor: 0.9144, label: 'yd' },
  ft: { measure: 'length', factor: 0.3048, label: 'ft' },
  in: { measure: 'length', factor: 0.0254, label: 'in' },
  kg: { measure: 'mass', factor: 1, label: 'kg' },
  g: { measure: 'mass', factor: 0.001, label: 'g' },
  lb: { measure: 'mass', factor: 0.45359237, label: 'lb' },
  oz: { measure: 'mass', factor: 0.028349523125, label: 'oz' },
  t: { measure: 'mass', factor: 1000, label: 't' },
  l: { measure: 'volume', factor: 1, label: 'L' },
  ml: { measure: 'volume', factor: 0.001, label: 'mL' },
  gal: { measure: 'volume', factor: 3.785411784, label: 'gal' },
  cup: { measure: 'volume', factor: 0.2365882365, label: 'cup' },
  floz: { measure: 'volume', factor: 0.0295735295625, label: 'fl oz' },
  C: { measure: 'temperature', factor: 1, label: '°C' },
  F: { measure: 'temperature', factor: 1, label: '°F' },
  K: { measure: 'temperature', factor: 1, label: 'K' },
  kmh: { measure: 'speed', factor: 1 / 3.6, label: 'km/h' },
  mph: { measure: 'speed', factor: 0.44704, label: 'mph' },
  ms: { measure: 'speed', factor: 1, label: 'm/s' },
  knot: { measure: 'speed', factor: 0.514444, label: 'knot' },
};

/** What people type for each unit, in both languages. */
export const UNIT_ALIASES: Record<string, string> = {
  km: 'km',
  kms: 'km',
  kilometer: 'km',
  kilometers: 'km',
  kilometre: 'km',
  kilometres: 'km',
  کیلومتر: 'km',
  m: 'm',
  meter: 'm',
  meters: 'm',
  metre: 'm',
  metres: 'm',
  متر: 'm',
  cm: 'cm',
  centimeter: 'cm',
  centimeters: 'cm',
  سانت: 'cm',
  سانتیمتر: 'cm',
  سانتی: 'cm',
  mm: 'mm',
  millimeter: 'mm',
  millimeters: 'mm',
  میلیمتر: 'mm',
  mi: 'mi',
  mile: 'mi',
  miles: 'mi',
  مایل: 'mi',
  yd: 'yd',
  yard: 'yd',
  yards: 'yd',
  یارد: 'yd',
  ft: 'ft',
  foot: 'ft',
  feet: 'ft',
  فوت: 'ft',
  in: 'in',
  inch: 'in',
  inches: 'in',
  اینچ: 'in',
  kg: 'kg',
  kgs: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  کیلو: 'kg',
  کیلوگرم: 'kg',
  g: 'g',
  gram: 'g',
  grams: 'g',
  گرم: 'g',
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
  پوند: 'lb',
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  اونس: 'oz',
  ton: 't',
  tons: 't',
  tonne: 't',
  تن: 't',
  l: 'l',
  liter: 'l',
  liters: 'l',
  litre: 'l',
  litres: 'l',
  لیتر: 'l',
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  میلی: 'ml',
  gal: 'gal',
  gallon: 'gal',
  gallons: 'gal',
  گالن: 'gal',
  cup: 'cup',
  cups: 'cup',
  پیمانه: 'cup',
  c: 'C',
  '°c': 'C',
  celsius: 'C',
  centigrade: 'C',
  سلسیوس: 'C',
  سانتیگراد: 'C',
  f: 'F',
  '°f': 'F',
  fahrenheit: 'F',
  فارنهایت: 'F',
  k: 'K',
  kelvin: 'K',
  کلوین: 'K',
  'km/h': 'kmh',
  kmh: 'kmh',
  kph: 'kmh',
  mph: 'mph',
  'm/s': 'ms',
  knot: 'knot',
  knots: 'knot',
  گره: 'knot',
};

/** What a unit converts to when nothing is said. */
export const DEFAULT_TARGET: Record<string, string> = {
  km: 'mi',
  mi: 'km',
  m: 'ft',
  cm: 'in',
  mm: 'in',
  ft: 'm',
  in: 'cm',
  yd: 'm',
  kg: 'lb',
  g: 'oz',
  lb: 'kg',
  oz: 'g',
  t: 'lb',
  l: 'gal',
  ml: 'floz',
  gal: 'l',
  cup: 'ml',
  floz: 'ml',
  C: 'F',
  F: 'C',
  K: 'C',
  kmh: 'mph',
  mph: 'kmh',
  ms: 'kmh',
  knot: 'kmh',
};

function toC(v: number, u: string): number {
  return u === 'F' ? ((v - 32) * 5) / 9 : u === 'K' ? v - 273.15 : v;
}

function fromC(v: number, u: string): number {
  return u === 'F' ? (v * 9) / 5 + 32 : u === 'K' ? v + 273.15 : v;
}

export function convertValue(value: number, from: string, to: string): number | null {
  const a = UNITS[from];
  const b = UNITS[to];
  if (!a || !b || a.measure !== b.measure) return null;
  if (a.measure === 'temperature') return fromC(toC(value, from), to);
  return (value * a.factor) / b.factor;
}

/** The units of the same measure, for the card's "to" choice. */
export function unitOptions(unit: string): string[] {
  const m = UNITS[unit]?.measure;
  return m ? Object.keys(UNITS).filter((k) => UNITS[k]?.measure === m) : [];
}

export const UNIT_PATTERN = Object.keys(UNIT_ALIASES)
  .sort((a, b) => b.length - a.length)
  .map((u) => u.replace(/[/.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');
