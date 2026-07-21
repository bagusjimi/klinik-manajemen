-- Klinik Manajemen D1 Database Schema
-- Cloudflare D1 (SQLite-compatible)

-- ============================================
-- Settings
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL
);

-- ============================================
-- Patients
-- ============================================
CREATE TABLE IF NOT EXISTS patients (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	nik TEXT NOT NULL UNIQUE,
	dob TEXT NOT NULL,
	gender TEXT NOT NULL,
	phone TEXT NOT NULL,
	address TEXT NOT NULL DEFAULT '',
	allergies TEXT NOT NULL DEFAULT '',
	registered_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_nik ON patients(nik);

-- ============================================
-- Doctors
-- ============================================
CREATE TABLE IF NOT EXISTS doctors (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	specialty TEXT NOT NULL,
	phone TEXT NOT NULL,
	schedule TEXT NOT NULL DEFAULT '',
	status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
	avatar TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty);
CREATE INDEX IF NOT EXISTS idx_doctors_status ON doctors(status);

-- ============================================
-- Appointments
-- ============================================
CREATE TABLE IF NOT EXISTS appointments (
	id TEXT PRIMARY KEY,
	patient_id TEXT NOT NULL REFERENCES patients(id),
	patient_name TEXT NOT NULL DEFAULT '',
	patient_phone TEXT NOT NULL DEFAULT '',
	doctor_id TEXT NOT NULL REFERENCES doctors(id),
	doctor_name TEXT NOT NULL DEFAULT '',
	date TEXT NOT NULL,
	time_slot TEXT NOT NULL,
	symptoms TEXT NOT NULL DEFAULT '',
	status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled')),
	queue_number TEXT DEFAULT NULL,
	created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- ============================================
-- Medical Records
-- ============================================
CREATE TABLE IF NOT EXISTS medical_records (
	id TEXT PRIMARY KEY,
	patient_id TEXT NOT NULL REFERENCES patients(id),
	patient_name TEXT NOT NULL DEFAULT '',
	doctor_id TEXT NOT NULL REFERENCES doctors(id),
	doctor_name TEXT NOT NULL DEFAULT '',
	date TEXT NOT NULL,
	diagnosis TEXT NOT NULL DEFAULT '',
	symptoms TEXT NOT NULL DEFAULT '',
	prescription TEXT NOT NULL DEFAULT '',
	treatment TEXT NOT NULL DEFAULT '',
	notes TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor ON medical_records(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_date ON medical_records(date);

-- ============================================
-- Invoices
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
	id TEXT PRIMARY KEY,
	appointment_id TEXT NOT NULL REFERENCES appointments(id),
	patient_id TEXT NOT NULL REFERENCES patients(id),
	patient_name TEXT NOT NULL DEFAULT '',
	date TEXT NOT NULL,
	subtotal INTEGER NOT NULL DEFAULT 0,
	tax INTEGER NOT NULL DEFAULT 0,
	total INTEGER NOT NULL DEFAULT 0,
	status TEXT NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Paid', 'Unpaid'))
);

CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ============================================
-- Invoice Items
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_items (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	invoice_id TEXT NOT NULL REFERENCES invoices(id),
	name TEXT NOT NULL,
	price INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- ============================================
-- Seed: Default Settings
-- ============================================
INSERT INTO settings (key, value) VALUES ('tax_rate', '10');
