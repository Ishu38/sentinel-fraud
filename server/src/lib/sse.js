const subscribers = new Set();

export function sseHandler(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  res.write(`: connected\n\n`);

  const heartbeat = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 25_000);

  subscribers.add(res);
  req.on('close', () => {
    clearInterval(heartbeat);
    subscribers.delete(res);
  });
}

export function sseBroadcast(eventName, payload) {
  const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of subscribers) {
    try {
      res.write(data);
    } catch {
      subscribers.delete(res);
    }
  }
}

export function sseSubscriberCount() {
  return subscribers.size;
}
