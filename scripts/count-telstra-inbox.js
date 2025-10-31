// Count Telstra messages by paging through the v3 API
// Usage: node scripts/count-telstra-inbox.js [incoming|outgoing] [pageSize]

const DIRECTION = (process.argv[2] || 'incoming').toLowerCase();
const PAGE_SIZE = parseInt(process.argv[3] || '50', 10);

async function getToken() {
  const res = await fetch('http://localhost:3000/api/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Failed to obtain token: ${res.status} ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function fetchPage(token, direction, limit, offset) {
  const url = new URL('https://products.api.telstra.com/messaging/v3/messages');
  if (direction) url.searchParams.set('direction', direction);
  if (limit) url.searchParams.set('limit', String(limit));
  if (typeof offset === 'number') url.searchParams.set('offset', String(offset));

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Telstra-api-version': '2.0.0',
      'Content-Language': 'en-au',
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Charset': 'utf-8',
    },
  });

  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error(`Non-JSON response (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${JSON.stringify(data)}`);
  }

  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.messages)
      ? data.messages
      : [];

  return { list, raw: data };
}

async function main() {
  const token = await getToken();

  let total = 0;
  let offset = 0;
  let page = 0;
  const hardCap = 10000; // safety cap

  while (true) {
    const { list } = await fetchPage(token, DIRECTION, PAGE_SIZE, offset);
    const count = list.length;
    page += 1;
    total += count;
    console.log(`Page ${page} offset=${offset} count=${count}`);

    if (count < PAGE_SIZE) break; // no more pages
    offset += PAGE_SIZE;
    if (total >= hardCap) {
      console.log(`Reached cap of ${hardCap}, stopping.`);
      break;
    }
  }

  console.log(`Direction: ${DIRECTION}`);
  console.log(`Total messages found: ${total}`);
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});


