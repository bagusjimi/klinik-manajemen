import { browser } from '$app/environment';

export interface Patient {
	id: string;
	name: string;
	nik: string;
	dob: string;
	gender: string;
	phone: string;
	address: string;
	allergies: string;
	registeredAt: string;
}

export interface Doctor {
	id: string;
	name: string;
	specialty: string;
	phone: string;
	schedule: string;
	status: 'Active' | 'Inactive';
	avatar: string;
}

export interface Appointment {
	id: string;
	patientId: string;
	patientName: string;
	patientPhone: string;
	doctorId: string;
	doctorName: string;
	date: string;
	timeSlot: string;
	symptoms: string;
	status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
	createdAt: string;
	queueNumber?: string;
}

export interface MedicalRecord {
	id: string;
	patientId: string;
	patientName: string;
	doctorId: string;
	doctorName: string;
	date: string;
	diagnosis: string;
	symptoms: string;
	prescription: string;
	treatment: string;
	notes: string;
}

export interface InvoiceItem {
	name: string;
	price: number;
}

export interface Invoice {
	id: string;
	appointmentId: string;
	patientId: string;
	patientName: string;
	date: string;
	items: InvoiceItem[];
	subtotal: number;
	tax: number;
	total: number;
	status: 'Paid' | 'Unpaid';
}

const defaultPatients: Patient[] = [
	{
		id: 'PAT-001',
		name: 'Budi Santoso',
		nik: '3171012345670001',
		dob: '1985-05-12',
		gender: 'Laki-laki',
		phone: '08123456789',
		address: 'Jl. Merdeka No. 10, Jakarta Pusat',
		allergies: 'Alergi Penicillin',
		registeredAt: '2026-01-15'
	},
	{
		id: 'PAT-002',
		name: 'Siti Aminah',
		nik: '3273012345670002',
		dob: '1990-09-23',
		gender: 'Perempuan',
		phone: '08234567890',
		address: 'Jl. Dago No. 45, Bandung',
		allergies: 'Tidak Ada',
		registeredAt: '2026-02-20'
	},
	{
		id: 'PAT-003',
		name: 'Ahmad Fauzi',
		nik: '3578012345670003',
		dob: '1978-01-15',
		gender: 'Laki-laki',
		phone: '08345678901',
		address: 'Jl. Raya Darmo No. 12, Surabaya',
		allergies: 'Alergi Seafood',
		registeredAt: '2026-03-05'
	},
	{
		id: 'PAT-004',
		name: 'Dewi Lestari',
		nik: '3471012345670004',
		dob: '1995-11-04',
		gender: 'Perempuan',
		phone: '08456789012',
		address: 'Jl. Malioboro No. 8, Yogyakarta',
		allergies: 'Alergi Debu',
		registeredAt: '2026-04-12'
	},
	{
		id: 'PAT-005',
		name: 'Rian Hidayat',
		nik: '1271012345670005',
		dob: '2002-07-30',
		gender: 'Laki-laki',
		phone: '08567890123',
		address: 'Jl. Setia Budi No. 15, Medan',
		allergies: 'Tidak Ada',
		registeredAt: '2026-05-01'
	}
];

const defaultDoctors: Doctor[] = [
	{
		id: 'DOC-001',
		name: 'dr. Adrian Sp.PD',
		specialty: 'Spesialis Penyakit Dalam',
		phone: '08112233445',
		schedule: 'Senin - Rabu (08:00 - 12:00)',
		status: 'Active',
		avatar: '👨‍⚕️'
	},
	{
		id: 'DOC-002',
		name: 'dr. Sarah Sp.A',
		specialty: 'Spesialis Anak',
		phone: '08112233446',
		schedule: 'Kamis - Sabtu (09:00 - 13:00)',
		status: 'Active',
		avatar: '👩‍⚕️'
	},
	{
		id: 'DOC-003',
		name: 'dr. Handoko Sp.JP',
		specialty: 'Spesialis Jantung & Pembuluh Darah',
		phone: '08112233447',
		schedule: 'Selasa & Jumat (14:00 - 18:00)',
		status: 'Active',
		avatar: '👨‍⚕️'
	},
	{
		id: 'DOC-004',
		name: 'dr. Linda Sp.OG',
		specialty: 'Spesialis Kebidanan & Kandungan',
		phone: '08112233448',
		schedule: 'Senin & Kamis (13:00 - 17:00)',
		status: 'Active',
		avatar: '👩‍⚕️'
	},
	{
		id: 'DOC-005',
		name: 'drg. Rian Pratama',
		specialty: 'Dokter Gigi',
		phone: '08112233449',
		schedule: 'Rabu & Sabtu (10:00 - 15:00)',
		status: 'Active',
		avatar: '👨‍⚕️'
	}
];

const todayStr = new Date().toISOString().split('T')[0];
const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

const defaultAppointments: Appointment[] = [
	{
		id: 'APT-001',
		patientId: 'PAT-001',
		patientName: 'Budi Santoso',
		patientPhone: '08123456789',
		doctorId: 'DOC-001',
		doctorName: 'dr. Adrian Sp.PD',
		date: todayStr,
		timeSlot: '09:00 - 09:30',
		symptoms: 'Demam tinggi dan flu selama 3 hari terakhir, disertai pusing kepala.',
		status: 'Confirmed',
		createdAt: yesterdayStr,
		queueNumber: 'P-001'
	},
	{
		id: 'APT-002',
		patientId: 'PAT-002',
		patientName: 'Siti Aminah',
		patientPhone: '08234567890',
		doctorId: 'DOC-002',
		doctorName: 'dr. Sarah Sp.A',
		date: todayStr,
		timeSlot: '10:00 - 10:30',
		symptoms: 'Imunisasi rutin balita usia 18 bulan dan cek tumbuh kembang anak.',
		status: 'Pending',
		createdAt: yesterdayStr,
		queueNumber: 'A-001'
	},
	{
		id: 'APT-003',
		patientId: 'PAT-003',
		patientName: 'Ahmad Fauzi',
		patientPhone: '08345678901',
		doctorId: 'DOC-003',
		doctorName: 'dr. Handoko Sp.JP',
		date: yesterdayStr,
		timeSlot: '15:00 - 15:30',
		symptoms: 'Nyeri dada ringan terutama saat beraktivitas berat.',
		status: 'Completed',
		createdAt: yesterdayStr,
		queueNumber: 'J-001'
	},
	{
		id: 'APT-004',
		patientId: 'PAT-004',
		patientName: 'Dewi Lestari',
		patientPhone: '08456789012',
		doctorId: 'DOC-004',
		doctorName: 'dr. Linda Sp.OG',
		date: tomorrowStr,
		timeSlot: '14:00 - 14:30',
		symptoms: 'Kontrol rutin kehamilan trimester pertama.',
		status: 'Confirmed',
		createdAt: todayStr,
		queueNumber: 'K-001'
	}
];

const defaultMedicalRecords: MedicalRecord[] = [
	{
		id: 'REC-001',
		patientId: 'PAT-003',
		patientName: 'Ahmad Fauzi',
		doctorId: 'DOC-003',
		doctorName: 'dr. Handoko Sp.JP',
		date: yesterdayStr,
		diagnosis: 'Angina Pectoris Stabil Ringan',
		symptoms: 'Nyeri dada menjalar ke bahu kiri saat kelelahan, reda dengan istirahat.',
		prescription: 'Amlodipine 5mg 1x1 tab (pagi), Aspilet 80mg 1x1 tab (setelah makan), Isosorbide Dinitrate 5mg (bila perlu sublingual)',
		treatment: 'Pemeriksaan penunjang EKG, edukasi diet rendah kolesterol, hindari aktivitas fisik berlebihan sementara.',
		notes: 'Pasien kooperatif. Dijadwalkan kontrol ulang 2 minggu lagi.'
	}
];

const defaultInvoices: Invoice[] = [
	{
		id: 'INV-20260517-001',
		appointmentId: 'APT-003',
		patientId: 'PAT-003',
		patientName: 'Ahmad Fauzi',
		date: yesterdayStr,
		items: [
			{ name: 'Jasa Konsultasi Dokter Spesialis Jantung', price: 200000 },
			{ name: 'Pemeriksaan EKG (Elektrokardiogram)', price: 150000 },
			{ name: 'Paket Obat Jantung & Pengencer Darah', price: 120000 }
		],
		subtotal: 470000,
		tax: 47000,
		total: 517000,
		status: 'Paid'
	}
];

class ClinicStore {
	patients = $state<Patient[]>([]);
	doctors = $state<Doctor[]>([]);
	appointments = $state<Appointment[]>([]);
	medicalRecords = $state<MedicalRecord[]>([]);
	invoices = $state<Invoice[]>([]);
	taxRate = $state<number>(10); // Dynamic tax rate in percentage (defaults to 10%)

	constructor() {
		this.loadData();
	}

	private loadData() {
		if (!browser) return;

		try {
			const patientsData = localStorage.getItem('medika_patients');
			this.patients = patientsData ? JSON.parse(patientsData) : defaultPatients;

			const doctorsData = localStorage.getItem('medika_doctors');
			this.doctors = doctorsData ? JSON.parse(doctorsData) : defaultDoctors;

			const appointmentsData = localStorage.getItem('medika_appointments');
			this.appointments = appointmentsData ? JSON.parse(appointmentsData) : defaultAppointments;

			const medicalRecordsData = localStorage.getItem('medika_medical_records');
			this.medicalRecords = medicalRecordsData ? JSON.parse(medicalRecordsData) : defaultMedicalRecords;

			const invoicesData = localStorage.getItem('medika_invoices');
			this.invoices = invoicesData ? JSON.parse(invoicesData) : defaultInvoices;

			const taxRateData = localStorage.getItem('medika_tax_rate');
			this.taxRate = taxRateData ? JSON.parse(taxRateData) : 10;
		} catch (error) {
			console.error('Failed to load clinic data from localStorage:', error);
			this.patients = defaultPatients;
			this.doctors = defaultDoctors;
			this.appointments = defaultAppointments;
			this.medicalRecords = defaultMedicalRecords;
			this.invoices = defaultInvoices;
		}
	}

	private saveData(key: string, data: any) {
		if (!browser) return;
		try {
			localStorage.setItem(key, JSON.stringify(data));
		} catch (error) {
			console.error(`Failed to save ${key} to localStorage:`, error);
		}
	}

	// Patients Actions
	addPatient(patientData: Omit<Patient, 'id' | 'registeredAt'>): Patient {
		const nextIdNum = this.patients.length > 0 
			? Math.max(...this.patients.map(p => parseInt(p.id.split('-')[1]))) + 1 
			: 1;
		const id = `PAT-${String(nextIdNum).padStart(3, '0')}`;
		const registeredAt = new Date().toISOString().split('T')[0];
		
		const newPatient: Patient = {
			id,
			registeredAt,
			...patientData
		};

		this.patients = [newPatient, ...this.patients];
		this.saveData('medika_patients', this.patients);
		return newPatient;
	}

	updatePatient(updatedPatient: Patient) {
		this.patients = this.patients.map(p => p.id === updatedPatient.id ? updatedPatient : p);
		this.saveData('medika_patients', this.patients);
	}

	deletePatient(id: string) {
		this.patients = this.patients.filter(p => p.id !== id);
		this.saveData('medika_patients', this.patients);
	}

	// Doctors Actions
	addDoctor(doctorData: Omit<Doctor, 'id'>): Doctor {
		const nextIdNum = this.doctors.length > 0 
			? Math.max(...this.doctors.map(d => parseInt(d.id.split('-')[1]))) + 1 
			: 1;
		const id = `DOC-${String(nextIdNum).padStart(3, '0')}`;
		
		const newDoctor: Doctor = {
			id,
			...doctorData
		};

		this.doctors = [...this.doctors, newDoctor];
		this.saveData('medika_doctors', this.doctors);
		return newDoctor;
	}

	updateDoctor(updatedDoctor: Doctor) {
		this.doctors = this.doctors.map(d => d.id === updatedDoctor.id ? updatedDoctor : d);
		this.saveData('medika_doctors', this.doctors);
	}

	deleteDoctor(id: string) {
		this.doctors = this.doctors.filter(d => d.id !== id);
		this.saveData('medika_doctors', this.doctors);
	}

	// Appointments Actions
	addAppointment(aptData: Omit<Appointment, 'id' | 'createdAt' | 'status' | 'queueNumber'>): Appointment {
		const nextIdNum = this.appointments.length > 0 
			? Math.max(...this.appointments.map(a => parseInt(a.id.split('-')[1]))) + 1 
			: 1;
		const id = `APT-${String(nextIdNum).padStart(3, '0')}`;
		const createdAt = new Date().toISOString().split('T')[0];

		// Generate Queue Number (Nomor Antrean Pintar)
		const doctor = this.doctors.find(d => d.id === aptData.doctorId);
		const prefix = doctor ? doctor.specialty.substring(0, 1).toUpperCase() : 'A';
		const sameDayDoctorApts = this.appointments.filter(a => a.date === aptData.date && a.doctorId === aptData.doctorId);
		const queueNumber = `${prefix}-${String(sameDayDoctorApts.length + 1).padStart(3, '0')}`;

		const newAppointment: Appointment = {
			id,
			queueNumber,
			createdAt,
			status: 'Pending',
			...aptData
		};

		this.appointments = [newAppointment, ...this.appointments];
		this.saveData('medika_appointments', this.appointments);
		return newAppointment;
	}

	updateAppointmentStatus(id: string, status: Appointment['status']) {
		this.appointments = this.appointments.map(a => a.id === id ? { ...a, status } : a);
		this.saveData('medika_appointments', this.appointments);
	}

	deleteAppointment(id: string) {
		this.appointments = this.appointments.filter(a => a.id !== id);
		this.saveData('medika_appointments', this.appointments);
	}

	// Medical Records Actions
	addMedicalRecord(recordData: Omit<MedicalRecord, 'id'>): MedicalRecord {
		const nextIdNum = this.medicalRecords.length > 0 
			? Math.max(...this.medicalRecords.map(r => parseInt(r.id.split('-')[1]))) + 1 
			: 1;
		const id = `REC-${String(nextIdNum).padStart(3, '0')}`;

		const newRecord: MedicalRecord = {
			id,
			...recordData
		};

		this.medicalRecords = [newRecord, ...this.medicalRecords];
		this.saveData('medika_medical_records', this.medicalRecords);
		return newRecord;
	}

	// Invoices Actions
	addInvoice(invoiceData: Omit<Invoice, 'id' | 'subtotal' | 'tax' | 'total'>): Invoice {
		const dateCode = invoiceData.date.replace(/-/g, '');
		const sameDayInvoices = this.invoices.filter(inv => inv.date === invoiceData.date);
		const seq = String(sameDayInvoices.length + 1).padStart(3, '0');
		const id = `INV-${dateCode}-${seq}`;

		const subtotal = invoiceData.items.reduce((sum, item) => sum + item.price, 0);
		const tax = Math.round(subtotal * (this.taxRate / 100)); // Dynamic tax rate based on settings
		const total = subtotal + tax;

		const newInvoice: Invoice = {
			id,
			...invoiceData,
			subtotal,
			tax,
			total
		};

		this.invoices = [newInvoice, ...this.invoices];
		this.saveData('medika_invoices', this.invoices);
		return newInvoice;
	}

	updateInvoiceStatus(id: string, status: Invoice['status']) {
		this.invoices = this.invoices.map(inv => {
			if (inv.id === id) {
				// Ketika ditandai lunas, bekukan pajak berdasarkan tarif aktif saat ini
				const tax = inv.status === 'Unpaid' && status === 'Paid'
					? Math.round(inv.subtotal * (this.taxRate / 100))
					: inv.tax;
				const total = inv.status === 'Unpaid' && status === 'Paid'
					? inv.subtotal + tax
					: inv.total;
				return { ...inv, status, tax, total };
			}
			return inv;
		});
		this.saveData('medika_invoices', this.invoices);
	}

	updateTaxRate(rate?: number) {
		if (rate !== undefined) this.taxRate = rate;
		this.saveData('medika_tax_rate', this.taxRate);
	}
}

export const clinicStore = new ClinicStore();
