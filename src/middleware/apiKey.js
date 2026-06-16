/**
 * Optional API key auth. When API_KEY is set, requests must include X-API-Key header.
 * Health check is always public.
 */
export function apiKeyAuth(req, res, next) {
  const configuredKey = process.env.API_KEY;

  if (!configuredKey) {
    return next();
  }

  if (req.path === "/health") {
    return next();
  }

  const provided = req.header("X-API-Key");

  if (provided !== configuredKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}
