
export default async function handler(req, res) {
	// Set CORS headers
	const allowedOrigins = ['http://localhost:4321', 'https://yashkukreja.com'];
	const origin = req.headers.origin;

	if (allowedOrigins.includes(origin)) {
		res.setHeader('Access-Control-Allow-Origin', origin);
	}

	res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

	if (req.method === 'OPTIONS') {
		return res.status(200).end();
	}

	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Only POST, OPTIONS allowed' });
	}

	const { prompt } = req.body || { prompt: "Default prompt" };
	const apiKey = process.env.OPENROUTER_API_KEY;
	const systemInstruction = process.env.SYSTEM_INSTRUCTION || process.env.GEMINI_SYSTEM_INSTRUCTION;

	const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
		method: "POST",
		headers: {
			"Authorization": `Bearer ${apiKey}`,
			"HTTP-Referer": origin || "https://yashkukreja.com",
			"X-Title": "Pantheon Portfolio",
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			"model": "google/gemini-2.0-flash-001",
			"messages": [
				{ "role": "system", "content": systemInstruction },
				{ "role": "user", "content": prompt }
			]
		})
	});

	const data = await response.json();

	// If the request was successful, transform the response to keep compatibility with the existing frontend
	if (response.ok && data.choices && data.choices.length > 0) {
		const transformedData = {
			candidates: [
				{
					content: {
						parts: [
							{ text: data.choices[0].message.content }
						]
					}
				}
			]
		};
		return res.status(200).json(transformedData);
	}

	res.status(response.ok ? 200 : response.status).json(data);
}
