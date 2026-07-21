import { getDB, json, error, generateId } from '$lib/db';

export async function GET({ platform, url }) {
	const db = getDB(platform);
	const patientId = url.searchParams.get('patient_id');
	const doctorId = url.searchParams.get('doctor_id');

	let query = 'SELECT * FROM medical_records';
	const conditions: string[] = [];
	const params: unknown[] = [];

	if (patientId) { conditions.push('patient_id=?'); params.push(patientId); }
	if (doctorId) { conditions.push('doctor_id=?'); params.push(doctorId); }

	if (conditions.length > 0) {
		query += ' WHERE ' + conditions.join(' AND ');
	}
	query += ' ORDER BY date DESC';

	const stmt = db.prepare(query);
	const results = await (params.length > 0 ? stmt.bind(...params) : stmt).all();
	return json(results.results);
}

export async function POST({ request, platform }) {
	const db = getDB(platform);
	const data = await request.json();

	const maxResult = await db.prepare('SELECT MAX(CAST(SUBSTR(id, 5) AS INTEGER)) as max_id FROM medical_records').first();
	const nextId = generateId('REC', (maxResult?.max_id as number ?? 0) + 1);

	// Look up names before insert
	const patient = await db.prepare('SELECT name FROM patients WHERE id=?').bind(data.patient_id).first();
	const doctor = await db.prepare('SELECT name FROM doctors WHERE id=?').bind(data.doctor_id).first();
	const patientName = (patient?.name as string) ?? '';
	const doctorName = (doctor?.name as string) ?? '';

	await db.prepare(
		`INSERT INTO medical_records (id, patient_id, patient_name, doctor_id, doctor_name, date, diagnosis, symptoms, prescription, treatment, notes)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).bind(nextId, data.patient_id, patientName, data.doctor_id, doctorName, data.date, data.diagnosis ?? '', data.symptoms ?? '', data.prescription ?? '', data.treatment ?? '', data.notes ?? '').run();

	return json({
		id: nextId,
		patient_id: data.patient_id,
		patient_name: patientName,
		doctor_id: data.doctor_id,
		doctor_name: doctorName,
		date: data.date,
		diagnosis: data.diagnosis ?? '',
		symptoms: data.symptoms ?? '',
		prescription: data.prescription ?? '',
		treatment: data.treatment ?? '',
		notes: data.notes ?? ''
	}, 201);
}

export async function DELETE({ url, platform }) {
	const db = getDB(platform);
	const id = url.searchParams.get('id');

	if (!id) return error('Missing id parameter');

	await db.prepare('DELETE FROM medical_records WHERE id=?').bind(id).run();
	return json({ success: true });
}
