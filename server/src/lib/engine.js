import { request } from 'undici';

const ENGINE_URL = process.env.ENGINE_URL ?? 'http://localhost:8000';

export async function scoreTransaction(payload) {
  const { statusCode, body } = await request(`${ENGINE_URL}/score`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await body.json();
  if (statusCode >= 400) {
    const err = new Error(data?.detail ?? 'engine_error');
    err.status = statusCode;
    throw err;
  }
  return data;
}

export async function engineHealth() {
  const { statusCode, body } = await request(`${ENGINE_URL}/health`);
  const data = await body.json();
  return { ok: statusCode === 200, ...data };
}
