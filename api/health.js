const SECRET = process.env.HEALTH_SECRET || "dein-geheimnis-passwort";

let cached = {};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'POST') {
    if (req.headers['x-health-secret'] !== SECRET) return res.status(401).json({});
    cached = req.body;
    return res.status(200).json({ ok: true });
  }

  if (req.query.secret !== SECRET) return res.status(401).json({});
  res.status(200).json(cached);
}
