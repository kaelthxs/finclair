export function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('ru-RU');
}

export function parseIds(value) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function containsText(list, value) {
  if (!Array.isArray(list) || !value) {
    return false;
  }

  const probe = String(value).toLowerCase();
  return list.some((item) => String(item).toLowerCase().includes(probe));
}
