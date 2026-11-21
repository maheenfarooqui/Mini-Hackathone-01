export function getAliasedField(body, field, alias) {
  return body?.[field] ?? body?.[alias];
}
