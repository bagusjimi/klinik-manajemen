import { getDB, json } from '$lib/db';

export async function GET({ platform, url }) {
	const db = getDB(platform);
	const key = url.searchParams.get('key');

	if (key) {
		const result = await db.prepare('SELECT value FROM settings WHERE key=?').bind(key).first();
		return json({ key, value: result?.value });
	}

	const results = await db.prepare('SELECT * FROM settings').all();
	return json(results.results);
}

export async function PUT({ request, platform }) {
	const db = getDB(platform);
	const data = await request.json();

	await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind(data.key, String(data.value)).run();
	return json({ success: true });
}
