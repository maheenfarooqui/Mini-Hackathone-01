export function getAllowedOrigins(frontendUrl, nodeEnv) {
  const configuredOrigins = (frontendUrl || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const developmentOrigins =
    nodeEnv === "production"
      ? []
      : ["http://localhost:5173", "http://localhost:3000"];

  return new Set([...configuredOrigins, ...developmentOrigins]);
}
