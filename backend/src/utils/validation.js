function isNumericInput(value) {
  return (
    (typeof value === "number" ||
      (typeof value === "string" && value.trim() !== "")) &&
    Number.isFinite(Number(value))
  );
}

export function isNonNegativeNumber(value) {
  return isNumericInput(value) && Number(value) >= 0;
}

export function isNonNegativeInteger(value) {
  return isNumericInput(value) && Number.isSafeInteger(Number(value)) && Number(value) >= 0;
}

export function isPositiveInteger(value) {
  return isNumericInput(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
}
