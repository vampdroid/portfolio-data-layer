
let cache = {
	posts: null,
	timestamp: 0,
	ttl: 1000 * 60 * 60 * 24 * 7 // 7 days
};

export default async function handler(req, res) {
	// Set CORS headers
	const allowedOrigins = ['http://localhost:4321', 'https://yashkukreja.com'];
	const origin = req.headers.origin;

	if (allowedOrigins.includes(origin)) {
		res.setHeader('Access-Control-Allow-Origin', origin);
	}

	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

	if (req.method === 'OPTIONS') {
		return res.status(200).end();
	}

	const wordpressUrl = process.env.WORDPRESS_GRAPHQL_URL || 'https://dev-yash-kukreja.pantheonsite.io/graphql';
	const { type, slug, first = 10 } = req.query;

	try {
		let query = '';
		let variables = {};

		if (type === 'single' && slug) {
			query = `
				query GetPostBySlug($slug: ID!) {
					post(id: $slug, idType: SLUG) {
						id
						title
						content
						date
						slug
						featuredImage {
							node {
								sourceUrl
							}
						}
					}
				}
			`;
			variables = { slug };
		} else {
			// Check cache for post list
			const now = Date.now();
			if (cache.posts && now - cache.timestamp < cache.ttl && !slug) {
				return res.status(200).json({
					data: cache.posts,
					cached: true,
				});
			}

			query = `
				query GetPosts($first: Int) {
					posts(first: $first, where: {status: PUBLISH}) {
						nodes {
							id
							title
							slug
							date
							excerpt
							featuredImage {
								node {
									sourceUrl
								}
							}
						}
					}
				}
			`;
			variables = { first: parseInt(first) };
		}

		const response = await fetch(wordpressUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				query,
				variables,
			}),
		});

		const result = await response.json();

		if (result.errors) {
			return res.status(500).json({ errors: result.errors });
		}

		const data = type === 'single' ? result.data.post : result.data.posts.nodes;

		if (!type || type !== 'single') {
			cache.posts = data;
			cache.timestamp = Date.now();
		}

		res.status(200).json({
			data: data,
			cached: false,
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
}
