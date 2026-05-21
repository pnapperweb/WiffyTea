exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
  const FROM        = process.env.TWILIO_FROM;

  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM) {
    console.error('Missing env vars:', { ACCOUNT_SID: !!ACCOUNT_SID, AUTH_TOKEN: !!AUTH_TOKEN, FROM: !!FROM });
    return { statusCode: 500, body: 'Missing Twilio environment variables' };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch (e) { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { to, message } = body;
  if (!to || !message) return { statusCode: 400, body: 'Missing to or message' };

  const recipients = Array.isArray(to) ? to : [to];
  const results = [];

  for (const number of recipients) {
    const params = new URLSearchParams({ To: number, From: FROM, Body: message });
    console.log('Sending SMS to:', number, 'from:', FROM);
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString('base64'),
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
  return {
    statusCode: allOk ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(results)
  };
};
