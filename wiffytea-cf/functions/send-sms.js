export async function onRequestPost(context) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = context.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
    console.error('Missing Twilio env vars');
    return new Response('Missing Twilio environment variables', { status: 500 });
  }

  let body;
  try { body = await context.request.json(); }
  catch { return new Response('Invalid JSON', { status: 400 }); }

  const { to, message } = body;
  if (!to || !message) return new Response('Missing to or message', { status: 400 });

  const recipients = Array.isArray(to) ? to : [to];
  const results = [];

  for (const number of recipients) {
    const params = new URLSearchParams({ To: number, From: TWILIO_FROM, Body: message });
    console.log('Sending SMS to:', number);
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      }
    );
    const data = await resp.json();
    console.log('Twilio response:', JSON.stringify(data));
    results.push({ number, sid: data.sid, status: data.status, error: data.message, code: data.code });
  }

  const allOk = results.every(r => r.sid);
  return new Response(JSON.stringify(results), {
    status: allOk ? 200 : 500,
    headers: { 'Content-Type': 'application/json' }
  });
}
