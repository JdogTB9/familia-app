// Función serverless de Vercel: envía un push a la familia vía OneSignal.
// La REST API Key se lee de una variable de entorno (NUNCA va en el cliente ni en GitHub).
// Configura en Vercel → Project → Settings → Environment Variables:
//   ONESIGNAL_REST_API_KEY = <tu Legacy REST API Key de OneSignal>
//   (opcional) ONESIGNAL_APP_ID = 9508f369-0b2b-4e37-9de4-d6ae4ae61fbb

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const REST_KEY = process.env.ONESIGNAL_REST_API_KEY;
  const APP_ID = process.env.ONESIGNAL_APP_ID || "9508f369-0b2b-4e37-9de4-d6ae4ae61fbb";
  if (!REST_KEY) {
    res.status(500).json({ error: "Falta la variable ONESIGNAL_REST_API_KEY en Vercel" });
    return;
  }

  const b = (req.body && typeof req.body === "object") ? req.body : {};
  const heading = (b.title || "Familia").toString().slice(0, 120);
  const content = (b.body || "").toString().slice(0, 300);
  const sender = (b.sender || "").toString();

  const payload = {
    app_id: APP_ID,
    included_segments: ["Total Subscriptions"],
    headings: { en: heading, es: heading },
    contents: { en: content, es: content },
    data: { sender }
  };

  // Excluir al emisor si tiene External ID registrado
  if (sender) payload.excluded_external_user_ids = [sender];

  try {
    const r = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${REST_KEY}`
      },
      body: JSON.stringify(payload)
    });
    const data = await r.json().catch(() => ({}));
    res.status(r.ok ? 200 : r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
