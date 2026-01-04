/**
 * Normaliza números de telefone para formato internacional do Brasil (prefixo 55)
 * Ex: '61982047227' -> '5561982047227'
 */
export function normalizePhone(raw) {
  if (!raw) return null;
  const cleaned = String(raw).replace(/[^0-9]/g, '');
  if (!cleaned) return null;
  return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
}

export default normalizePhone;