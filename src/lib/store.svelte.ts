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

function mapPatient(row: any): Patient {
	return {
		id: row.id,
		name: row.name,
		nik: row.nik,
		dob: row.dob,
		gender: row.gender,
		phone: row.phone,
		address: row.address,
		allergies: row.allergies,
		registeredAt: row.registered_at ?? row.registeredAt
	};
}

function mapDoctor(row: any): Doctor {
	return {
		id: row.id,
		name: row.name,
		specialty: row.specialty,
		phone: row.phone,
		schedule: row.schedule,
		status: row.status,
		avatar: row.avatar
	};
}

function mapAppointment(row: any): Appointment {
	return {
		id: row.id,
		patientId: row.patient_id ?? row.patientId,
		patientName: row.patient_name ?? row.patientName ?? '',
		patientPhone: row.patient_phone ?? row.patientPhone ?? '',
		doctorId: row.doctor_id ?? row.doctorId,
		doctorName: row.doctor_name ?? row.doctorName ?? '',
		date: row.date,
		timeSlot: row.time_slot ?? row.timeSlot ?? '',
		symptoms: row.symptoms,
		status: row.status,
		createdAt: row.created_at ?? row.createdAt ?? '',
		queueNumber: row.queue_number ?? row.queueNumber
	};
}

function mapMedicalRecord(row: any): MedicalRecord {
	return {
		id: row.id,
		patientId: row.patient_id ?? row.patientId,
		patientName: row.patient_name ?? row.patientName ?? '',
		doctorId: row.doctor_id ?? row.doctorId,
		doctorName: row.doctor_name ?? row.doctorName ?? '',
		date: row.date,
		diagnosis: row.diagnosis,
		symptoms: row.symptoms,
		prescription: row.prescription,
		treatment: row.treatment,
		notes: row.notes
	};
}

function mapInvoice(row: any): Invoice {
	return {
		id: row.id,
		appointmentId: row.appointment_id ?? row.appointmentId,
		patientId: row.patient_id ?? row.patientId,
		patientName: row.patient_name ?? row.patientName ?? '',
		date: row.date,
		items: row.items?.map((i: any) => ({ name: i.name, price: i.price })) ?? [],
		subtotal: row.subtotal,
		tax: row.tax,
		total: row.total,
		status: row.status
	};
}

class ClinicStore {
	patients = $state<Patient[]>([]);
	doctors = $state<Doctor[]>([]);
	appointments = $state<Appointment[]>([]);
	medicalRecords = $state<MedicalRecord[]>([]);
	invoices = $state<Invoice[]>([]);
	taxRate = $state<number>(10);
	loading = $state<boolean>(false);
	error = $state<string | null>(null);

	constructor() {
		if (browser) this.loadAll();
	}

	async loadAll() {
		this.loading = true;
		this.error = null;
		try {
			await Promise.all([
				this.fetchPatients(),
				this.fetchDoctors(),
				this.fetchAppointments(),
				this.fetchMedicalRecords(),
				this.fetchInvoices(),
				this.fetchTaxRate()
			]);
		} catch (e: any) {
			this.error = e.message;
		} finally {
			this.loading = false;
		}
	}

	private async api<T>(url: string, options?: RequestInit): Promise<T> {
		const res = await fetch(url, {
			...options,
			headers: { 'Content-Type': 'application/json' }
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({ error: res.statusText }));
			throw new Error(err.error ?? res.statusText);
		}
		return res.json();
	}

	// ---- Patients ----
	async fetchPatients() {
		const data = await this.api<any[]>('/api/patients');
		this.patients = data.map(mapPatient);
	}

	async addPatient(patientData: Omit<Patient, 'id' | 'registeredAt'>): Promise<Patient> {
		const data = await this.api<any>('/api/patients', {
			method: 'POST',
			body: JSON.stringify(patientData)
		});
		const newPatient = mapPatient(data);
		this.patients = [newPatient, ...this.patients];
		return newPatient;
	}

	async updatePatient(updatedPatient: Patient) {
		await this.api('/api/patients', {
			method: 'PUT',
			body: JSON.stringify(updatedPatient)
		});
		this.patients = this.patients.map(p => p.id === updatedPatient.id ? updatedPatient : p);
	}

	async deletePatient(id: string) {
		await this.api(`/api/patients?id=${id}`, { method: 'DELETE' });
		this.patients = this.patients.filter(p => p.id !== id);
	}

	// ---- Doctors ----
	async fetchDoctors() {
		const data = await this.api<any[]>('/api/doctors');
		this.doctors = data.map(mapDoctor);
	}

	async addDoctor(doctorData: Omit<Doctor, 'id'>): Promise<Doctor> {
		const data = await this.api<any>('/api/doctors', {
			method: 'POST',
			body: JSON.stringify(doctorData)
		});
		const newDoctor = mapDoctor(data);
		this.doctors = [...this.doctors, newDoctor];
		return newDoctor;
	}

	async updateDoctor(updatedDoctor: Doctor) {
		await this.api('/api/doctors', {
			method: 'PUT',
			body: JSON.stringify(updatedDoctor)
		});
		this.doctors = this.doctors.map(d => d.id === updatedDoctor.id ? updatedDoctor : d);
	}

	async deleteDoctor(id: string) {
		await this.api(`/api/doctors?id=${id}`, { method: 'DELETE' });
		this.doctors = this.doctors.filter(d => d.id !== id);
	}

	// ---- Appointments ----
	async fetchAppointments() {
		const data = await this.api<any[]>('/api/appointments');
		this.appointments = data.map(mapAppointment);
	}

	async addAppointment(aptData: Omit<Appointment, 'id' | 'createdAt' | 'status' | 'queueNumber'>): Promise<Appointment> {
		const payload = {
			patient_id: aptData.patientId,
			doctor_id: aptData.doctorId,
			date: aptData.date,
			time_slot: aptData.timeSlot,
			symptoms: aptData.symptoms
		};
		const data = await this.api<any>('/api/appointments', {
			method: 'POST',
			body: JSON.stringify(payload)
		});
		const newApt = mapAppointment(data);
		this.appointments = [newApt, ...this.appointments];
		return newApt;
	}

	async updateAppointmentStatus(id: string, status: Appointment['status']) {
		await this.api('/api/appointments', {
			method: 'PATCH',
			body: JSON.stringify({ id, status })
		});
		this.appointments = this.appointments.map(a => a.id === id ? { ...a, status } : a);
	}

	async deleteAppointment(id: string) {
		await this.api(`/api/appointments?id=${id}`, { method: 'DELETE' });
		this.appointments = this.appointments.filter(a => a.id !== id);
	}

	// ---- Medical Records ----
	async fetchMedicalRecords() {
		const data = await this.api<any[]>('/api/medical-records');
		this.medicalRecords = data.map(mapMedicalRecord);
	}

	async addMedicalRecord(recordData: Omit<MedicalRecord, 'id'>): Promise<MedicalRecord> {
		const payload = {
			patient_id: recordData.patientId,
			doctor_id: recordData.doctorId,
			date: recordData.date,
			diagnosis: recordData.diagnosis,
			symptoms: recordData.symptoms,
			prescription: recordData.prescription,
			treatment: recordData.treatment,
			notes: recordData.notes
		};
		const data = await this.api<any>('/api/medical-records', {
			method: 'POST',
			body: JSON.stringify(payload)
		});
		const newRecord = mapMedicalRecord(data);
		this.medicalRecords = [newRecord, ...this.medicalRecords];
		return newRecord;
	}

	// ---- Invoices ----
	async fetchInvoices() {
		const data = await this.api<any[]>('/api/invoices');
		this.invoices = data.map(mapInvoice);
	}

	async addInvoice(invoiceData: Omit<Invoice, 'id' | 'subtotal' | 'tax' | 'total'>): Promise<Invoice> {
		const payload = {
			appointment_id: invoiceData.appointmentId,
			patient_id: invoiceData.patientId,
			date: invoiceData.date,
			items: invoiceData.items
		};
		const data = await this.api<any>('/api/invoices', {
			method: 'POST',
			body: JSON.stringify(payload)
		});
		const newInvoice = mapInvoice(data);
		this.invoices = [newInvoice, ...this.invoices];
		return newInvoice;
	}

	async updateInvoiceStatus(id: string, status: Invoice['status']) {
		await this.api('/api/invoices', {
			method: 'PATCH',
			body: JSON.stringify({ id, status })
		});
		this.invoices = this.invoices.map(inv => inv.id === id ? { ...inv, status } : inv);
	}

	// ---- Settings ----
	async fetchTaxRate() {
		const data = await this.api<any>('/api/settings?key=tax_rate');
		this.taxRate = Number(data.value ?? 10);
	}

	async updateTaxRate(rate?: number) {
		if (rate !== undefined) this.taxRate = rate;
		await this.api('/api/settings', {
			method: 'PUT',
			body: JSON.stringify({ key: 'tax_rate', value: rate ?? this.taxRate })
		});
	}
}

export const clinicStore = new ClinicStore();
