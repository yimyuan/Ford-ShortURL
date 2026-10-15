// One rule for allocating, resolving and confirming deletion of a short name.
export const isValidShortCode = (value) =>
  typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9-]{1,38}[A-Za-z0-9]$/.test(value);
