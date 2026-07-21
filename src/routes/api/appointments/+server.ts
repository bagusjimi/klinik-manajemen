import { getDB, json, error, generateId } from '$lib/db';

export async function GET({ platform, url }) {
	const db = getDB(platform);
	const date = url.searchParams.get('date');
	const doctorId = url.searchParams.get('doctor_id');
	const patientId = url.searchParams.get('patient_id');
	const status = url.searchParams.get('status');

	let query = 'SELECT * FROM appointments';
	const conditions: string[] = [];
	const params: unknown[] = [];

	if (date) { conditions.push('date=?'); params.push(date); }
	if (doctorId) { conditions.push('doctor_id=?'); params.push(doctorId); }
	if (patientId) { conditions.push('patient_id=?'); params.push(patientId); }
	if (status) { conditions.push('status=?'); params.push(status); }

	if (conditions.length > 0) {
		query += ' WHERE ' + conditions.join(' AND ');
	}
	query += ' ORDER BY date DESC, time_slot ASC';

	const stmt = db.prepare(query);
	const results = await (params.length > 0 ? stmt.bind(...params) : stmt).all();
	return json(results.results);
}

export async function POST({ request, platform }) {
	const db = getDB(platform);
	const data = await request.json();

	const maxResult = await db.prepare('SELECT MAX(CAST(SUBSTR(id, 5) AS INTEGER)) as max_id FROM appointments').first();
	const nextId = generateId('APT', (maxResult?.max_id as number ?? 0) + 1);
	const createdAt = new Date().toISOString().split('T')[0];

	// Generate queue number
	const doctor = await db.prepare('SELECT specialty FROM doctors WHERE id=?').bind(data.doctor_id).first();
	const prefix = doctor ? (doctor.specialty as string).substring(0, 1).toUpperCase() : 'A';
	const sameDayCount = await db.prepare(
		'SELECT COUNT(*) as count FROM appointments WHERE date=? AND doctor_id=?'
	).bind(data.date, data.doctor_id).first();
	const queueNumber = `${prefix}-${String((sameDayCount?.count as number ?? 0) + 1).padStart(3, '0')}`;

	await db.prepare(
		`INSERT INTO appointments (id, patient_id, doctor_id, date, time_slot, symptoms, status, queue_number, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).bind(nextId, data.patient_id, data.doctor_id, data.date, data.time_slot, data.symptoms ?? '', 'Pending', queueNumber, createdAt).run();

	// Return with joined names for convenience
	const patient = await db.prepare('SELECT name, phone FROM patients WHERE id=?').bind(data.patient_id).first();
	const doctorInfo = await db.prepare('SELECT name FROM doctors WHERE id=?').bind(data.doctor_id).first();

	return json({
		id: nextId,
		patient_id: data.patient_id,
		patient_name: patient?.name,
		patient_phone: patient?.phone,
		doctor_id: data.doctor_id,
		doctor_name: doctorInfo?.name,
		date: data.date,
		time_slot: data.time_slot,
		symptoms: data.symptoms ?? '',
		status: 'Pending',
		queue_number: queueNumber,
		created_at: createdAt
	}, 201);
}

export async function PATCH({ request, platform }) {
	const db = getDB(platform);
	const data = await request.json();

	if (!data.id || !data.status) return error('Missing id or status');

	await db.prepare('UPDATE appointments SET status=? WHERE id=?').bind(data.status, data.id).run();
	return json({ success: true });
}

export async function DELETE({ url, platform }) {
	const db = getDB(platform);
	const id = url.searchParams.get('id');

	if (!id) return error('Missing id parameter');

	await db.prepare('DELETE FROM appointments WHERE id=?').bind(id).run();
	return json({ success: true });
}
