exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  try {
    const data = JSON.parse(event.body);

    // Construct payload for Google Sheets
    const sheetsPayload = {
      first_name: data.first_name,
      last_name: data.last_name,
      staff_name: data.staff_name,
      user_id: data.user_id,
      source: data.source || "SafeLife CCP Form",
      gender: data.gender,
      birthdate: data.birthdate || "",
      age: data.age || "",
      medicaid: data.medicaid,
      medicaid_number: data.medicaid_number,
      phone: data.phone,
      email: data.email,
      address_line1: data.address_line1,
      address_line2: data.address_line2,
      city: data.city,
      state: data.state,
      zip: data.zip,
      county: data.county || "",
      info: data.info
    };

    // Google Apps Script endpoint (existing integration)
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbzSbjRvXSXATOWf-4IHLu8C5hkR8JpjGHuF5JgQN4eBMnsUVFttKL5OHwKW0D_FMpm5/exec';

    // These values must be configured in the Netlify environment.
    const LEAD_MANAGER_API_URL = process.env.LEAD_MANAGER_API_URL;
    const LEAD_MANAGER_API_KEY = process.env.LEAD_MANAGER_API_KEY;

    if (!LEAD_MANAGER_API_URL || !LEAD_MANAGER_API_KEY) {
      console.error('Missing Lead Manager API configuration');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'The form is not configured yet. Please contact an administrator.' }),
      };
    }

    // Save to Lead Manager first. The form must not claim success unless the DB write succeeds.
    try {
      const leadManagerResponse = await fetch(LEAD_MANAGER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': LEAD_MANAGER_API_KEY,
        },
        body: JSON.stringify(data),
      });

      if (!leadManagerResponse.ok) {
        const errorText = await leadManagerResponse.text();
        console.error('Lead Manager API error:', leadManagerResponse.statusText, errorText);
        const error = leadManagerResponse.status === 409
          ? 'This lead already exists in Lead Manager.'
          : 'The lead could not be saved. Please check the required fields and try again.';
        return {
          statusCode: leadManagerResponse.status,
          body: JSON.stringify({ error }),
        };
      }

      const result = await leadManagerResponse.json();
      console.log('Lead Manager success:', result);
    } catch (leadManagerError) {
      console.error('Lead Manager API call failed:', leadManagerError.message);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'The Lead Manager server could not be reached. Please try again shortly.' }),
      };
    }

    // Keep the existing Google Sheets copy as a secondary record.
    try {
      const sheetsResponse = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sheetsPayload),
      });

      if (!sheetsResponse.ok) {
        console.error('Google Sheets error:', sheetsResponse.statusText);
      }
    } catch (sheetsError) {
      console.error('Google Sheets request failed:', sheetsError.message);
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ message: 'Lead submitted successfully' }),
    };
  } catch (err) {
    console.error('Error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
