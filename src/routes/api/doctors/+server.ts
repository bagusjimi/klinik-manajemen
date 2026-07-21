import { getDB, json, error, generateId } from '$lib/db';

export async function GET({ platform }) {
	const db = getDB(platform);
	const results = await db.prepare('SELECT * FROM doctors ORDER BY name ASC').all();
	return json(results.results);
}

export async function POST({ request, platform }) {
	const db = getDB(platform);
	const data = await request.json();

	const maxResult = await db.prepare('SELECT MAX(CAST(SUBSTR(id, 5) AS INTEGER)) as max_id FROM doctors').first();
	const nextId = generateId('DOC', (maxResult?.max_id as number ?? 0) + 1);

	await db.prepare(
		`INSERT INTO doctors (id, name, specialty, phone, schedule, status, avatar)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`
	).bind(nextId, data.name, data.specialty, data.phone, data.schedule, data.status ?? 'Active', data.avatar ?? '').run();

	return json({ id: nextId, ...data }, 201);
}

export async function PUT({ request, platform }) {
	const db = getDB(platform);
	const data = await request.json();

	await db.prepare(
		`UPDATE doctors SET name=?, specialty=?, phone=?, schedule=?, status=?, avatar=? WHERE id=?`
	).bind(data.name, data.specialty, data.phone, data.schedule, data.status, data.avatar, data.id).run();

	return json({ success: true });
}

export async function DELETE({ url, platform }) {
	const db = getDB(platform);
	const id = url.searchParams.get('id');

	if (!id) return error('Missing id parameter');

	await db.prepare('DELETE FROM doctors WHERE id=?').bind(id).run();
	return json({ success: true });
}
