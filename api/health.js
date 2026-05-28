let cached = {};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'POST') {
    cached = req.body;
    return res.status(200).json({ ok: true });
  }

  res.status(200).json(cached);
}
