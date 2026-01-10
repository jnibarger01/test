export function parseNumber(value) {
  const cleaned = String(value ?? '').replace(/,/g, '').trim();
  const numberValue = Number.parseFloat(cleaned);
  return Number.isNaN(numberValue) ? 0 : numberValue;
}

export function parseInteger(value) {
  const cleaned = String(value ?? '').replace(/,/g, '').trim();
  const numberValue = Number.parseInt(cleaned, 10);
  return Number.isNaN(numberValue) ? 0 : numberValue;
}

export default {
  parseNumber,
  parseInteger
};
