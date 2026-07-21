import { getDB, json, error } from '$lib/db';

export async function GET({ platform, url }) {
	const db = getDB(platform);
	const patientId = url.searchParams.get('patient_id');
	const status = url.searchParams.get('status');

	let query = 'SELECT * FROM invoices';
	const conditions: string[] = [];
	const params: unknown[] = [];

	if (patientId) { conditions.push('patient_id=?'); params.push(patientId); }
	if (status) { conditions.push('status=?'); params.push(status); }

	if (conditions.length > 0) {
		query += ' WHERE ' + conditions.join(' AND ');
	}
	query += ' ORDER BY date DESC';

	const stmt = db.prepare(query);
	const invoices = await (params.length > 0 ? stmt.bind(...params) : stmt).all();

	// Fetch items for each invoice
	const invoicesWithItems = await Promise.all(
		invoices.results.map(async (inv) => {
			const items = await db.prepare('SELECT name, price FROM invoice_items WHERE invoice_id=?').bind(inv.id).all();
			return { ...inv, items: items.results };
		})
	);

	return json(invoicesWithItems);
}

export async function POST({ request, platform }) {
	const db = getDB(platform);
	const data = await request.json();

	// Generate invoice ID: INV-YYYYMMDD-001
	const dateCode = data.date.replace(/-/g, '');
	const sameDayCount = await db.prepare(
		'SELECT COUNT(*) as count FROM invoices WHERE date=?'
	).bind(data.date).first();
	const seq = String((sameDayCount?.count as number ?? 0) + 1).padStart(3, '0');
	const id = `INV-${dateCode}-${seq}`;

	// Get tax rate
	const taxSetting = await db.prepare("SELECT value FROM settings WHERE key='tax_rate'").first();
	const taxRate = Number(taxSetting?.value ?? 10);

	const subtotal = data.items.reduce((sum: number, item: { price: number }) => sum + item.price, 0);
	const tax = Math.round(subtotal * (taxRate / 100));
	const total = subtotal + tax;

	// Look up patient name before insert
	const patient = await db.prepare('SELECT name FROM patients WHERE id=?').bind(data.patient_id).first();
	const patientName = (patient?.name as string) ?? '';

	await db.prepare(
		`INSERT INTO invoices (id, appointment_id, patient_id, patient_name, date, subtotal, tax, total, status)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).bind(id, data.appointment_id, data.patient_id, patientName, data.date, subtotal, tax, total, 'Unpaid').run();

	// Insert invoice items
	for (const item of data.items) {
		await db.prepare(
			'INSERT INTO invoice_items (invoice_id, name, price) VALUES (?, ?, ?)'
		).bind(id, item.name, item.price).run();
	}

	return json({
		id,
		appointment_id: data.appointment_id,
		patient_id: data.patient_id,
		patient_name: patientName,
		date: data.date,
		items: data.items,
		subtotal,
		tax,
		total,
		status: 'Unpaid'
	}, 201);
}

export async function PATCH({ request, platform }) {
	const db = getDB(platform);
	const data = await request.json();

	if (!data.id || !data.status) return error('Missing id or status');

	// When marking as Paid, recalculate tax based on current tax rate
	if (data.status === 'Paid') {
		const taxSetting = await db.prepare("SELECT value FROM settings WHERE key='tax_rate'").first();
		const taxRate = Number(taxSetting?.value ?? 10);

		const invoice = await db.prepare('SELECT subtotal FROM invoices WHERE id=?').bind(data.id).first();
		const subtotal = invoice?.subtotal as number ?? 0;
		const tax = Math.round(subtotal * (taxRate / 100));
		const total = subtotal + tax;

		await db.prepare('UPDATE invoices SET status=?, tax=?, total=? WHERE id=?').bind('Paid', tax, total, data.id).run();
	} else {
		await db.prepare('UPDATE invoices SET status=? WHERE id=?').bind(data.status, data.id).run();
	}

	return json({ success: true });
}

export async function DELETE({ url, platform }) {
	const db = getDB(platform);
	const id = url.searchParams.get('id');

	if (!id) return error('Missing id parameter');

	await db.prepare('DELETE FROM invoice_items WHERE invoice_id=?').bind(id).run();
	await db.prepare('DELETE FROM invoices WHERE id=?').bind(id).run();
	return json({ success: true });
}
