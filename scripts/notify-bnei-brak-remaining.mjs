import pg from 'pg';
import webpush from 'web-push';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

// The 4 remaining workers (by ID, regardless of role/status)
const TARGET_IDS = [30004, 500507, 500329, 492560]; // יעל ביטרן, משה ביטרן, נחמה אלמלם, יהודה(admin)

// The 2 open jobs in Bnei Brak
const JOBS = [
  { id: 60014, title: 'ניקיון בית', city: 'בני ברק', hourlyRate: '60', jobDate: '2026-03-29', description: 'ניקיון יסודי לפסח — פרדס כץ' },
  { id: 60015, title: 'ניקיון בית', city: 'בני ברק', hourlyRate: '80', jobDate: '2026-03-29', description: 'ניקיון יסודי לפסח — פרדס כץ' },
];

const APP_URL = 'https://avodanow.co.il';

function buildJobMessage(jobs) {
  const lines = jobs.map(j => `• ${j.title} — ${j.city} | ₪${j.hourlyRate}/שעה | ${j.jobDate}`);
  return {
    title: `🔔 ${jobs.length} משרות פתוחות בבני ברק`,
    body: lines.join('\n'),
    url: `${APP_URL}/find-jobs?city=בני ברק`,
  };
}

async function sendPushNotification(subscription, payload) {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublicKey || !vapidPrivateKey) return { success: false, error: 'VAPID keys not configured' };

  webpush.setVapidDetails('mailto:admin@avodanow.co.il', vapidPublicKey, vapidPrivateKey);
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload)
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message, statusCode: err.statusCode };
  }
}

async function sendSmsViaTwilio(phone, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken) return { success: false, error: 'Twilio not configured' };

  const body = new URLSearchParams({ From: fromNumber || 'AvodaNow', To: phone, Body: message });
  try {
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      }
    );
    const data = await resp.json();
    if (data.sid) return { success: true, sid: data.sid };
    return { success: false, error: data.message || JSON.stringify(data) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log('=== AvodaNow — Bnei Brak Remaining 4 Workers Notification ===\n');

  // Fetch the 4 workers without role/status filter
  const workersResult = await pool.query(`
    SELECT id, name, phone, email, "notificationPrefs", role, status
    FROM users
    WHERE id = ANY($1::int[])
    ORDER BY name
  `, [TARGET_IDS]);

  const workers = workersResult.rows;
  console.log(`Workers to notify: ${workers.length}\n`);

  // Get push subscriptions
  const subsResult = await pool.query(`
    SELECT "userId", endpoint, p256dh, auth
    FROM push_subscriptions
    WHERE "userId" = ANY($1::int[])
  `, [TARGET_IDS]);

  const subsByUserId = {};
  for (const sub of subsResult.rows) {
    if (!subsByUserId[sub.userId]) subsByUserId[sub.userId] = [];
    subsByUserId[sub.userId].push(sub);
  }
  console.log(`Push subscriptions: ${subsResult.rows.length} for ${Object.keys(subsByUserId).length} workers\n`);

  const { title, body, url } = buildJobMessage(JOBS);
  const pushPayload = { title, body, url, icon: '/favicon.ico', badge: '/favicon.ico' };
  const smsText = `${title}\n${body}\nלפרטים: ${url}`;

  const results = [];
  for (const worker of workers) {
    const prefs = worker.notificationPrefs || 'both';
    const workerResult = { id: worker.id, name: worker.name, role: worker.role, prefs, sent: [], failed: [] };

    const wantsPush = prefs === 'both' || prefs === 'push_only';
    const wantsSms  = prefs === 'both' || prefs === 'sms_only';

    // Push
    if (wantsPush) {
      const subs = subsByUserId[worker.id] || [];
      if (subs.length === 0) {
        workerResult.failed.push('push: no subscription');
      } else {
        for (const sub of subs) {
          const res = await sendPushNotification(sub, pushPayload);
          if (res.success) {
            workerResult.sent.push('push');
          } else {
            workerResult.failed.push(`push: ${res.error}`);
            if (res.statusCode === 410) {
              await pool.query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [sub.endpoint]);
            }
          }
        }
      }
    }

    // SMS
    if (wantsSms && worker.phone) {
      const res = await sendSmsViaTwilio(worker.phone, smsText);
      if (res.success) workerResult.sent.push('sms');
      else workerResult.failed.push(`sms: ${res.error}`);
    } else if (wantsSms && !worker.phone) {
      workerResult.failed.push('sms: no phone');
    }

    results.push(workerResult);
    const status = workerResult.sent.length > 0 ? '✅' : '❌';
    console.log(`${status} [${worker.name}] (role=${worker.role}) prefs=${prefs} → sent: [${workerResult.sent.join(',')||'—'}] failed: [${workerResult.failed.join(',')||'—'}]`);
  }

  const totalSent   = results.filter(r => r.sent.length > 0).length;
  const totalFailed = results.filter(r => r.sent.length === 0).length;

  console.log('\n=== SUMMARY ===');
  console.log(`Workers targeted:      ${workers.length}`);
  console.log(`Successfully notified: ${totalSent}`);
  console.log(`No notification sent:  ${totalFailed}`);
  console.log(`Jobs: ${JOBS.map(j => `#${j.id} ${j.title} ₪${j.hourlyRate}/שעה`).join(' | ')}`);

  await pool.end();
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
