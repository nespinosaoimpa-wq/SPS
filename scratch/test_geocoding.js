const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'SPSCustodia/1.0';

async function testGeocode(query) {
  const queries = [
    query,
    `${query}, Santa Fe, Argentina`,
    query.replace(/AV\s/i, 'Avenida ') + ', Santa Fe, Argentina'
  ];

  for (const q of queries) {
    console.log(`\nTesting: "${q}"`);
    const params = new URLSearchParams({
      q: q,
      format: 'json',
      addressdetails: '1',
      limit: '3',
      countrycodes: 'ar',
    });

    try {
      const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
        headers: { 'User-Agent': USER_AGENT },
      });
      const data = await res.json();
      if (data.length > 0) {
        console.log(`Result: ${data[0].display_name}`);
        console.log(`Coords: ${data[0].lat}, ${data[0].lon}`);
        console.log(`Type: ${data[0].type}`);
      } else {
        console.log('No results found.');
      }
    } catch (err) {
      console.error('Error:', err.message);
    }
  }
}

testGeocode('AV JUAN JOSE PASO 3535');
