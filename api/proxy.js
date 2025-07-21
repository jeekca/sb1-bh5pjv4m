// File: /api/proxy.js

// This is a Node.js serverless function.
// It will be executed in a secure backend environment.

export default async function handler(req, res) {
  // 1. Get the secret API key from environment variables.
  //    process.env is how you access them in a Node.js environment.
  const apiKey = process.env.THIRD_PARTY_API_KEY;

  if (!apiKey) {
    // This is a server-side error, the user doesn't need to know the details.
    return res.status(500).json({ error: "API key not configured on the server." });
  }

  // 2. This is the URL of the actual third-party service you want to call.
  const apiURL = "https://api.thirdpartyservice.com/v1/some-data";

  try {
    // 3. Make the actual API call from the server.
    //    We securely add the API key in the Authorization header.
    //    (Check the third-party service's docs for how they expect the key).
    const apiResponse = await fetch(apiURL, {
      headers: {
        'Authorization': `Bearer ${apiKey}`, // or 'x-api-key', etc.
        'Content-Type': 'application/json',
      },
    });

    // Error handling for the fetch call itself
    if (!apiResponse.ok) {
      // Forward the error status from the third-party API
      const errorData = await apiResponse.text();
      return res.status(apiResponse.status).json({ error: `API call failed: ${errorData}` });
    }

    // 4. Get the data from the third-party service
    const data = await apiResponse.json();

    // 5. Send the data back to your Three.js front-end.
    res.status(200).json(data);

  } catch (error) {
    // Catch any other errors (e.g., network issues)
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}