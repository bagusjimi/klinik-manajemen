import { getDB, json, error, generateId } from '$lib/db';

export async function GET({ platform }) {
	const db = getDB(platform);
	const results = await db.prepare('SELECT * FROM patients ORDER BY registered_at DESC').all();
	return json(results.results);
}

export async function POST({ request, platform }) {
	const db = getDB(platform);
	const data = await request.json();

	const maxResult = await db.prepare('SELECT MAX(CAST(SUBSTR(id, 5) AS INTEGER)) as max_id FROM patients').first();
	const nextId = generateId('PAT', (maxResult?.max_id as number ?? 0) + 1);
	const registeredAt = new Date().toISOString().split('T')[0];

	await db.prepare(
		`INSERT INTO patients (id, name, nik, dob, gender, phone, address, allergies, registered_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).bind(nextId, data.name, data.nik, data.dob, data.gender, data.phone, data.address, data.allergies, registeredAt).run();

	return json({ id: nextId, ...data, registeredAt }, 201);
}

export async function PUT({ request, platform }) {
	const db = getDB(platform);
	const data = await request.json();

	await db.prepare(
		`UPDATE patients SET name=?, nik=?, dob=?, gender=?, phone=?, address=?, allergies=? WHERE id=?`
	).bind(data.name, data.nik, data.dob, data.gender, data.phone, data.address, data.allergies, data.id).run();

	return json({ success: true });
}

export async function DELETE({ url, platform }) {
	const db = getDB(platform);
	const id = url.searchParams.get('id');

	if (!id) return error('Missing id parameter');

	await db.prepare('DELETE FROM patients WHERE id=?').bind(id).run();
	return json({ success: true });
}
