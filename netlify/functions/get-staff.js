exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  const leadManagerApiUrl = process.env.LEAD_MANAGER_API_URL;
  const leadManagerApiKey = process.env.LEAD_MANAGER_API_KEY;

  if (!leadManagerApiUrl || !leadManagerApiKey) {
    console.error('Missing Lead Manager API configuration');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'The form is not configured yet. Please contact an administrator.' }),
    };
  }

  try {
    const response = await fetch(`${leadManagerApiUrl.replace(/\/$/, '')}/staff`, {
      headers: { 'X-API-Key': leadManagerApiKey },
    });

    if (!response.ok) {
      console.error('Lead Manager staff lookup error:', response.status, await response.text());
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Staff names could not be loaded. Please refresh the page.' }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(await response.json()),
    };
  } catch (err) {
    console.error('Lead Manager staff lookup failed:', err.message);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'The Lead Manager server could not be reached. Please try again shortly.' }),
    };
  }
};
