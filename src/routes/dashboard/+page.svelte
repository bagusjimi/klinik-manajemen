<script lang="ts">
	import { clinicStore, type Patient, type Doctor, type Appointment, type MedicalRecord, type Invoice, type InvoiceItem } from '$lib/store.svelte.ts';
	import {
		Users,
		Calendar,
		DollarSign,
		Activity,
		FileText,
		Stethoscope,
		LogOut,
		Search,
		Plus,
		Edit,
		Trash2,
		Check,
		X,
		Printer,
		Clock,
		ChevronRight,
		CreditCard,
		AlertTriangle,
		UserCheck,
		Filter,
		Heart,
		ClipboardList,
		UserPlus
	} from 'lucide-svelte';
	import Toast from '$lib/components/Toast.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { toast } from '$lib/components/toast-store';

	// Loading & Error state for async operations
	let isLoading = $state(false);
	let errorMessage = $state('');

	// Svelte 5 reactive state for active tab
	let activeTab = $state('overview'); // overview, patients, doctors, appointments, records, billing

	// Search & Filters state
	let patientSearchQuery = $state('');
	let doctorSearchQuery = $state('');
	let appointmentStatusFilter = $state('All'); // All, Pending, Confirmed, Completed, Cancelled
	let recordsSearchQuery = $state('');
	let invoiceStatusFilter = $state('All'); // All, Paid, Unpaid

	// Modal toggle states
	let showPatientModal = $state(false);
	let editingPatient = $state<Patient | null>(null);

	let showDoctorModal = $state(false);
	let editingDoctor = $state<Doctor | null>(null);

	// Diagnose / Complete Appointment Modal (Advanced Combined Workflow)
	let showDiagnoseModal = $state(false);
	let activeDiagnoseApt = $state<Appointment | null>(null);
	let diagnosisText = $state('');
	let prescriptionText = $state('');
	let treatmentText = $state('');
	let invoiceItems = $state<InvoiceItem[]>([
		{ name: 'Jasa Konsultasi Spesialis', price: 150000 },
		{ name: 'Penyediaan Resep Obat-obatan', price: 100000 }
	]);
	let newInvoiceItemName = $state('');
	let newInvoiceItemPrice = $state(0);

	// Invoice View Modal
	let showInvoiceModal = $state(false);
	let selectedInvoice = $state<Invoice | null>(null);

	// Patient Modal form fields
	let patName = $state('');
	let patNik = $state('');
	let patDob = $state('');
	let patGender = $state('Laki-laki');
	let patPhone = $state('');
	let patAddress = $state('');
	let patAllergies = $state('');

	// Doctor Modal form fields
	let docName = $state('');
	let docSpecialty = $state('');
	let docPhone = $state('');
	let docSchedule = $state('');
	let docStatus = $state<'Active' | 'Inactive'>('Active');
	let docAvatar = $state('👨‍⚕️');

	// Local taxRate for two-way binding (synced with store via async update)
	let localTaxRate = $state(clinicStore.taxRate);

	async function handleTaxRateChange(newValue: number) {
		localTaxRate = newValue;
		try {
			await clinicStore.updateTaxRate(newValue);
		} catch (err: any) {
			localTaxRate = clinicStore.taxRate;
			toast.error(err?.message || 'Gagal memperbarui tarif pajak.');
		}
	}

	// Confirm Dialog state
	let confirmOpen = $state(false);
	let confirmTitle = $state('Konfirmasi');
	let confirmMessage = $state('');
	let confirmType: 'default' | 'danger' = $state('default');
	let confirmText = $state('Ya');
	let cancelText = $state('Batal');
	let confirmResolve: ((value: boolean) => void) | null = null;

	function showConfirm(title: string, message: string, type: 'default' | 'danger' = 'default', text = 'Ya', cancel = 'Batal'): Promise<boolean> {
		confirmTitle = title;
		confirmMessage = message;
		confirmType = type;
		confirmText = text;
		cancelText = cancel;
		confirmOpen = true;
		return new Promise((resolve) => {
			confirmResolve = resolve;
		});
	}

	async function handleConfirmAction() {
		confirmOpen = false;
		confirmResolve?.(true);
	}

	// Computed Metrics for Dashboard Overview
	const totalPatientsCount = $derived(clinicStore.patients.length);
	const totalAppointmentsCount = $derived(clinicStore.appointments.length);
	const pendingAptsCount = $derived(clinicStore.appointments.filter(a => a.status === 'Pending').length);
	const confirmedAptsCount = $derived(clinicStore.appointments.filter(a => a.status === 'Confirmed').length);
	const activeDoctorsCount = $derived(clinicStore.doctors.filter(d => d.status === 'Active').length);
	const totalRevenueSum = $derived(
		clinicStore.invoices
			.filter(inv => inv.status === 'Paid')
			.reduce((sum, inv) => sum + inv.total, 0)
	);

	// $derived billing preview — reaktif terhadap perubahan invoiceItems & taxRate
	const previewSubtotal = $derived(invoiceItems.reduce((s, i) => s + i.price, 0));
	const previewTax      = $derived(Math.round(previewSubtotal * (clinicStore.taxRate / 100)));
	const previewTotal    = $derived(previewSubtotal + previewTax);

	// Format currency helper
	function formatRupiah(amount: number): string {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		}).format(amount);
	}

	// Filtered lists
	const filteredPatients = $derived(
		clinicStore.patients.filter(p => 
			p.name.toLowerCase().includes(patientSearchQuery.toLowerCase()) ||
			p.nik.includes(patientSearchQuery) ||
			p.phone.includes(patientSearchQuery)
		)
	);

	const filteredDoctors = $derived(
		clinicStore.doctors.filter(d => 
			d.name.toLowerCase().includes(doctorSearchQuery.toLowerCase()) ||
			d.specialty.toLowerCase().includes(doctorSearchQuery.toLowerCase())
		)
	);

	const filteredAppointments = $derived(
		clinicStore.appointments.filter(a => {
			const matchesStatus = appointmentStatusFilter === 'All' || a.status === appointmentStatusFilter;
			return matchesStatus;
		})
	);

	const appointmentsByDoctor = $derived.by(() => {
		const grouped: Record<string, { doctorId: string; doctorName: string; apts: Appointment[] }> = {};
		for (const apt of filteredAppointments) {
			if (!grouped[apt.doctorId]) {
				grouped[apt.doctorId] = { doctorId: apt.doctorId, doctorName: apt.doctorName, apts: [] };
			}
			grouped[apt.doctorId].apts.push(apt);
		}
		// Urutkan berdasarkan nama dokter secara alfabetis
		return Object.values(grouped).sort((a, b) => a.doctorName.localeCompare(b.doctorName));
	});

	const filteredRecords = $derived(
		clinicStore.medicalRecords.filter(r => 
			r.patientName.toLowerCase().includes(recordsSearchQuery.toLowerCase()) ||
			r.doctorName.toLowerCase().includes(recordsSearchQuery.toLowerCase()) ||
			r.diagnosis.toLowerCase().includes(recordsSearchQuery.toLowerCase())
		)
	);

	const filteredInvoices = $derived(
		clinicStore.invoices.filter(inv => {
			const matchesStatus = invoiceStatusFilter === 'All' || inv.status === invoiceStatusFilter;
			return matchesStatus;
		})
	);

	// Patient Actions
	function openAddPatient() {
		editingPatient = null;
		patName = '';
		patNik = '';
		patDob = '';
		patGender = 'Laki-laki';
		patPhone = '';
		patAddress = '';
		patAllergies = '';
		showPatientModal = true;
	}

	function openEditPatient(patient: Patient) {
		editingPatient = patient;
		patName = patient.name;
		patNik = patient.nik;
		patDob = patient.dob;
		patGender = patient.gender;
		patPhone = patient.phone;
		patAddress = patient.address;
		patAllergies = patient.allergies;
		showPatientModal = true;
	}

	async function savePatient(e: Event) {
		e.preventDefault();
		if (!patName || !patNik || !patDob || !patPhone) {
			toast.warning('Harap isi semua kolom wajib!');
			return;
		}

		isLoading = true;
		errorMessage = '';
		try {
			if (editingPatient) {
				await clinicStore.updatePatient({
					...editingPatient,
					name: patName,
					nik: patNik,
					dob: patDob,
					gender: patGender,
					phone: patPhone,
					address: patAddress,
					allergies: patAllergies
				});
			} else {
				await clinicStore.addPatient({
					name: patName,
					nik: patNik,
					dob: patDob,
					gender: patGender,
					phone: patPhone,
					address: patAddress,
					allergies: patAllergies || 'Tidak Ada'
				});
			}
			showPatientModal = false;
		} catch (err: any) {
			errorMessage = err?.message || 'Gagal menyimpan data pasien.';
			toast.error(errorMessage);
		} finally {
			isLoading = false;
		}
	}

	// Doctor Actions
	function openAddDoctor() {
		editingDoctor = null;
		docName = '';
		docSpecialty = '';
		docPhone = '';
		docSchedule = '';
		docStatus = 'Active';
		docAvatar = '👨‍⚕️';
		showDoctorModal = true;
	}

	function openEditDoctor(doctor: Doctor) {
		editingDoctor = doctor;
		docName = doctor.name;
		docSpecialty = doctor.specialty;
		docPhone = doctor.phone;
		docSchedule = doctor.schedule;
		docStatus = doctor.status;
		docAvatar = doctor.avatar;
		showDoctorModal = true;
	}

	async function saveDoctor(e: Event) {
		e.preventDefault();
		if (!docName || !docSpecialty || !docSchedule || !docPhone) {
			toast.warning('Harap isi semua kolom wajib!');
			return;
		}

		isLoading = true;
		errorMessage = '';
		try {
			if (editingDoctor) {
				await clinicStore.updateDoctor({
					...editingDoctor,
					name: docName,
					specialty: docSpecialty,
					phone: docPhone,
					schedule: docSchedule,
					status: docStatus,
					avatar: docAvatar
				});
			} else {
				await clinicStore.addDoctor({
					name: docName,
					specialty: docSpecialty,
					phone: docPhone,
					schedule: docSchedule,
					status: docStatus,
					avatar: docAvatar
				});
			}
			showDoctorModal = false;
		} catch (err: any) {
			errorMessage = err?.message || 'Gagal menyimpan data dokter.';
			toast.error(errorMessage);
		} finally {
			isLoading = false;
		}
	}

	// Offline Registration Modal Toggle & Form inputs
	let showOfflineRegisterModal = $state(false);
	let offlinePatientType = $state('existing'); // existing or new
	let offlineSelectedPatientId = $state('');
	let offlineSelectedDoctorId = $state('');
	let offlineSelectedTimeSlot = $state('');
	let offlineSymptoms = $state('');

	// Fields if it is a NEW patient registered offline
	let offlineNewPatName = $state('');
	let offlineNewPatNik = $state('');
	let offlineNewPatDob = $state('');
	let offlineNewPatGender = $state('Laki-laki');
	let offlineNewPatPhone = $state('');
	let offlineNewPatAddress = $state('');
	let offlineNewPatAllergies = $state('');

	// Available time slots for offline
	const timeSlots = [
		'08:00 - 08:30', '08:30 - 09:00', '09:00 - 09:30', '09:30 - 10:00',
		'10:00 - 10:30', '10:30 - 11:00', '11:00 - 11:30', '11:30 - 12:00',
		'13:00 - 13:30', '13:30 - 14:00', '14:00 - 14:30', '14:30 - 15:00',
		'15:00 - 15:30', '15:30 - 16:00', '16:00 - 16:30', '16:30 - 17:00'
	];

	function openOfflineRegisterModal() {
		offlinePatientType = 'existing';
		offlineSelectedPatientId = '';
		offlineSelectedDoctorId = '';
		offlineSelectedTimeSlot = '';
		offlineSymptoms = '';
		offlineNewPatName = '';
		offlineNewPatNik = '';
		offlineNewPatDob = '';
		offlineNewPatGender = 'Laki-laki';
		offlineNewPatPhone = '';
		offlineNewPatAddress = '';
		offlineNewPatAllergies = '';
		showOfflineRegisterModal = true;
	}

	async function saveOfflineRegistration(e: Event) {
		e.preventDefault();
		if (!offlineSelectedDoctorId || !offlineSelectedTimeSlot) {
			toast.warning('Harap pilih dokter dan slot waktu!');
			return;
		}

		isLoading = true;
		errorMessage = '';
		try {
			let patient: Patient;

			if (offlinePatientType === 'new') {
				if (!offlineNewPatName || !offlineNewPatNik || !offlineNewPatPhone) {
					toast.warning('Harap lengkapi data wajib pasien baru offline (Nama, NIK, No. Telp)!');
					return;
				}
				patient = await clinicStore.addPatient({
					name: offlineNewPatName,
					nik: offlineNewPatNik,
					dob: offlineNewPatDob || new Date().toISOString().split('T')[0],
					gender: offlineNewPatGender,
					phone: offlineNewPatPhone,
					address: offlineNewPatAddress || 'Registrasi Offline (Langsung)',
					allergies: offlineNewPatAllergies || 'Tidak Ada'
				});
			} else {
				if (!offlineSelectedPatientId) {
					toast.warning('Harap pilih pasien terdaftar!');
					return;
				}
				const found = clinicStore.patients.find(p => p.id === offlineSelectedPatientId);
				if (!found) {
					toast.error('Pasien tidak ditemukan!');
					return;
				}
				patient = found;
			}

			// Create Appointment
			const doc = clinicStore.doctors.find(d => d.id === offlineSelectedDoctorId);
			const todayDate = new Date().toISOString().split('T')[0];

			const newApt = await clinicStore.addAppointment({
				patientId: patient.id,
				patientName: patient.name,
				patientPhone: patient.phone,
				doctorId: offlineSelectedDoctorId,
				doctorName: doc ? doc.name : 'Dokter Medika',
				date: todayDate,
				timeSlot: offlineSelectedTimeSlot,
				symptoms: offlineSymptoms || 'Registrasi Offline (Pemeriksaan Umum)'
			});

			// Confirm offline registrations immediately
			await clinicStore.updateAppointmentStatus(newApt.id, 'Confirmed');

			showOfflineRegisterModal = false;
			toast.success(`Pendaftaran offline pasien ${patient.name} berhasil! Nomor antrean: ${newApt.queueNumber}`);
		} catch (err: any) {
			errorMessage = err?.message || 'Gagal mendaftarkan pasien offline.';
			toast.error(errorMessage);
		} finally {
			isLoading = false;
		}
	}

	// Advanced Combined Complete & Diagnose Appointment Workflow
	function openDiagnoseModal(apt: Appointment) {
		activeDiagnoseApt = apt;
		diagnosisText = '';
		prescriptionText = '';
		treatmentText = 'Istirahat cukup, hindari makanan manis/berlemak';
		invoiceItems = [
			{ name: 'Jasa Konsultasi Dokter Spesialis', price: 150000 },
			{ name: 'Penyediaan Resep Obat-obatan', price: 80000 }
		];
		showDiagnoseModal = true;
	}

	function addInvoiceItem() {
		if (!newInvoiceItemName || newInvoiceItemPrice <= 0) return;
		invoiceItems = [...invoiceItems, { name: newInvoiceItemName, price: newInvoiceItemPrice }];
		newInvoiceItemName = '';
		newInvoiceItemPrice = 0;
	}

	function removeInvoiceItem(index: number) {
		invoiceItems = invoiceItems.filter((_, i) => i !== index);
	}

	async function saveDiagnosisAndBill() {
		if (!activeDiagnoseApt) return;
		if (!diagnosisText || !prescriptionText) {
			toast.warning('Mohon isi Diagnosis dan Resep Obat!');
			return;
		}

		isLoading = true;
		errorMessage = '';
		try {
			const todayDate = new Date().toISOString().split('T')[0];

			// 1. Create Medical Record
			await clinicStore.addMedicalRecord({
				patientId: activeDiagnoseApt.patientId,
				patientName: activeDiagnoseApt.patientName,
				doctorId: activeDiagnoseApt.doctorId,
				doctorName: activeDiagnoseApt.doctorName,
				date: todayDate,
				diagnosis: diagnosisText,
				symptoms: activeDiagnoseApt.symptoms,
				prescription: prescriptionText,
				treatment: treatmentText,
				notes: 'Selesai periksa via antrean online.'
			});

			// 2. Create Invoice
			await clinicStore.addInvoice({
				appointmentId: activeDiagnoseApt.id,
				patientId: activeDiagnoseApt.patientId,
				patientName: activeDiagnoseApt.patientName,
				date: todayDate,
				items: invoiceItems,
				status: 'Unpaid'
			});

			// 3. Mark appointment as completed
			await clinicStore.updateAppointmentStatus(activeDiagnoseApt.id, 'Completed');

			showDiagnoseModal = false;
			activeDiagnoseApt = null;
			toast.success('Pemeriksaan berhasil diselesaikan! Rekam medis dan tagihan baru telah dibuat.');
			activeTab = 'billing'; // Jump to cashier to see invoice!
		} catch (err: any) {
			errorMessage = err?.message || 'Gagal menyelesaikan pemeriksaan.';
			toast.error(errorMessage);
		} finally {
			isLoading = false;
		}
	}

	function printInvoice() {
		const printContents = document.getElementById('receipt-print-area')?.innerHTML;
		if (!printContents) return;
		const originalContents = document.body.innerHTML;
		
		document.body.innerHTML = `
			<html>
			<head>
				<title>Kwitansi Pembayaran - Medika Utama</title>
				<style>
					body { font-family: 'Courier New', monospace; padding: 40px; color: #000; font-size: 14px; }
					.receipt { border: 1px solid #000; padding: 30px; max-width: 500px; margin: 0 auto; background: white; }
					.text-center { text-align: center; }
					.bold { font-weight: bold; }
					.divider { border-top: 1px dashed #000; margin: 15px 0; }
					.row { display: flex; justify-content: space-between; margin: 6px 0; }
					.items-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
					.items-table th, .items-table td { text-align: left; padding: 6px 0; }
					.items-table th { border-bottom: 1px solid #000; }
					.text-right { text-align: right; }
					.stamp { border: 3px double #15803d; color: #15803d; font-size: 20px; font-weight: bold; padding: 8px 15px; display: inline-block; transform: rotate(-8deg); margin-top: 15px; text-transform: uppercase; }
				</style>
			</head>
			<body>
				<div class="receipt">
					${printContents}
				</div>
				<script>
					window.onload = function() { window.print(); window.close(); }
				<\/script>
			</body>
			</html>
		`;
		
		window.print();
		document.body.innerHTML = originalContents;
		window.location.reload(); // Restore Svelte
	}
</script>

<!-- Global Toast Notification -->
<Toast />

<!-- Confirm Dialog -->
<ConfirmDialog
	{confirmOpen}
	{confirmTitle}
	{confirmMessage}
	{confirmType}
	{confirmText}
	{cancelText}
	onconfirm={handleConfirmAction}
	oncancel={() => { confirmOpen = false; confirmResolve?.(false); }}
/>

<!-- Global Loading State -->
{#if clinicStore.loading}
	<div class="global-loading-overlay">
		<div class="spinner"></div>
		<p>Memuat data...</p>
	</div>
{/if}

<div class="dashboard-container">
	<!-- SIDEBAR PANEL -->
	<aside class="dashboard-sidebar">
		<div class="sidebar-logo">
			<div class="logo-icon bg-primary animate-glow">
				<Heart size={20} color="white" />
			</div>
			<div>
				<h4>Medika<span class="text-teal">Portal</span></h4>
				<p>Sistem Informasi Klinik</p>
			</div>
		</div>

		<nav class="sidebar-nav">
			<button 
				type="button" 
				class="nav-item {activeTab === 'overview' ? 'active' : ''}" 
				onclick={() => { activeTab = 'overview'; }}
			>
				<Activity size={18} />
				<span>Ringkasan Klinik</span>
			</button>
			
			<button 
				type="button" 
				class="nav-item {activeTab === 'patients' ? 'active' : ''}" 
				onclick={() => { activeTab = 'patients'; }}
			>
				<Users size={18} />
				<span>Manajemen Pasien</span>
			</button>

			<button 
				type="button" 
				class="nav-item {activeTab === 'doctors' ? 'active' : ''}" 
				onclick={() => { activeTab = 'doctors'; }}
			>
				<Stethoscope size={18} />
				<span>Manajemen Dokter</span>
			</button>

			<button 
				type="button" 
				class="nav-item {activeTab === 'appointments' ? 'active' : ''}" 
				onclick={() => { activeTab = 'appointments'; }}
			>
				<Calendar size={18} />
				<span>Janji Temu</span>
				{#if pendingAptsCount > 0}
					<span class="nav-badge bg-warning text-white">{pendingAptsCount}</span>
				{/if}
			</button>

			<button 
				type="button" 
				class="nav-item {activeTab === 'records' ? 'active' : ''}" 
				onclick={() => { activeTab = 'records'; }}
			>
				<ClipboardList size={18} />
				<span>Rekam Medis</span>
			</button>

			<button 
				type="button" 
				class="nav-item {activeTab === 'billing' ? 'active' : ''}" 
				onclick={() => { activeTab = 'billing'; }}
			>
				<CreditCard size={18} />
				<span>Kasir & Tagihan</span>
			</button>
		</nav>

		<div class="sidebar-footer">
			<a href="/" class="nav-item btn-logout">
				<LogOut size={18} />
				<span>Keluar ke Landing Page</span>
			</a>
		</div>
	</aside>

	<!-- MAIN CONTENT PANEL -->
	<main class="dashboard-main-content">
		<!-- HEADER BAR -->
		<header class="dashboard-header glass">
			<div>
				<h2 class="page-title">
					{activeTab === 'overview' ? 'Ringkasan & Analitik Klinik' : ''}
					{activeTab === 'patients' ? 'Daftar Pasien Terdaftar' : ''}
					{activeTab === 'doctors' ? 'Manajemen Jadwal Dokter' : ''}
					{activeTab === 'appointments' ? 'Kelola Jadwal Janji Temu' : ''}
					{activeTab === 'records' ? 'Histori Rekam Medis Pasien' : ''}
					{activeTab === 'billing' ? 'Transaksi Kasir & Pembayaran' : ''}
				</h2>
				<p class="page-subtitle">Portal Administrator & Dokter Medika Utama • {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
			</div>
			
			<div class="header-user-badge animate-glow">
				<span class="user-avatar-small">🩺</span>
				<div>
					<h5>Administrator</h5>
					<p>Sistem Klinik Aktif</p>
				</div>
			</div>
		</header>

		<!-- CONTENT BODY -->
		<div class="dashboard-body-scroll">
			
			<!-- TAB 1: OVERVIEW -->
			{#if activeTab === 'overview'}
				<div class="tab-content overview-tab animate-fade-in">
					<!-- Statistics cards grid -->
					<div class="metrics-grid">
						<div class="metric-card card-premium">
							<div class="metric-header">
								<span class="metric-title">Total Pasien Terdaftar</span>
								<div class="metric-icon p-umum"><Users size={20} /></div>
							</div>
							<h2 class="metric-value">{totalPatientsCount}</h2>
							<span class="metric-note text-success">Pasien terdaftar secara permanen</span>
						</div>

						<div class="metric-card card-premium">
							<div class="metric-header">
								<span class="metric-title">Antrean Hari Ini</span>
								<div class="metric-icon p-dalam"><Clock size={20} /></div>
							</div>
							<h2 class="metric-value">{confirmedAptsCount + pendingAptsCount}</h2>
							<span class="metric-note text-success">{pendingAptsCount} menunggu persetujuan admin</span>
						</div>

						<div class="metric-card card-premium">
							<div class="metric-header">
								<span class="metric-title">Total Pendapatan (Lunas)</span>
								<div class="metric-icon p-jantung"><DollarSign size={20} /></div>
							</div>
							<h2 class="metric-value text-teal">{formatRupiah(totalRevenueSum)}</h2>
							<span class="metric-note text-success">Total pembayaran lunas di kasir</span>
						</div>

						<div class="metric-card card-premium">
							<div class="metric-header">
								<span class="metric-title">Dokter Spesialis Aktif</span>
								<div class="metric-icon p-gigi"><Stethoscope size={20} /></div>
							</div>
							<h2 class="metric-value">{activeDoctorsCount}</h2>
							<span class="metric-note text-success">Dokter bersedia melayani hari ini</span>
						</div>
					</div>

					<!-- Visual charts and lists -->
					<div class="overview-charts-grid">
						<!-- Custom SVG Chart of Weekly Visits -->
						<div class="card-premium chart-card">
							<h3>Kunjungan Pasien (7 Hari Terakhir)</h3>
							<p class="chart-subtitle">Frekuensi janji temu yang diselesaikan minggu ini</p>
							
							<div class="svg-chart-container">
								<svg class="visits-chart" viewBox="0 0 500 200">
									<!-- Background lines -->
									<line x1="0" y1="50" x2="500" y2="50" stroke="#f1f5f9" stroke-width="1" />
									<line x1="0" y1="100" x2="500" y2="100" stroke="#f1f5f9" stroke-width="1" />
									<line x1="0" y1="150" x2="500" y2="150" stroke="#f1f5f9" stroke-width="1" />
									
									<!-- Graph Path Area -->
									<path d="M 10 160 Q 90 80, 170 120 T 330 60 T 490 140 L 490 200 L 10 200 Z" fill="url(#tealGradient)" opacity="0.15" />
									
									<!-- Graph Path Line -->
									<path d="M 10 160 Q 90 80, 170 120 T 330 60 T 490 140" fill="none" stroke="#0d9488" stroke-width="3" />
									
									<!-- Dots on chart peaks -->
									<circle cx="90" cy="80" r="5" fill="#0d9488" />
									<circle cx="170" cy="120" r="5" fill="#0d9488" />
									<circle cx="250" cy="90" r="5" fill="#0d9488" />
									<circle cx="330" cy="60" r="5" fill="#0d9488" />
									
									<!-- Gradient definition -->
									<defs>
										<linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
											<stop offset="0%" stop-color="#0d9488" />
											<stop offset="100%" stop-color="#ffffff" />
										</linearGradient>
									</defs>
								</svg>
								<div class="chart-labels">
									<span>Senin</span>
									<span>Selasa</span>
									<span>Rabu</span>
									<span>Kamis</span>
									<span>Jumat</span>
									<span>Sabtu</span>
									<span>Minggu</span>
								</div>
							</div>
						</div>

						<!-- Recent Actions Panel -->
						<div class="card-premium activity-card">
							<h3>Antrean & Agenda Mendatang</h3>
							<p class="chart-subtitle">Tindakan cepat pada antrean hari ini</p>
							
							<div class="activity-list">
								{#if clinicStore.appointments.filter(a => a.status === 'Pending' || a.status === 'Confirmed').length === 0}
									<p class="empty-state">Tidak ada janji temu aktif hari ini.</p>
								{:else}
									{#each clinicStore.appointments.filter(a => a.status === 'Pending' || a.status === 'Confirmed').slice(0, 5) as apt}
										<div class="agenda-item border-{apt.status.toLowerCase()}">
											<div class="agenda-desc">
												<h5>{apt.patientName}</h5>
												<p class="apt-time">{apt.timeSlot} • {apt.doctorName}</p>
												<span class="status-pill status-{apt.status.toLowerCase()}">{apt.status}</span>
											</div>
											<div class="agenda-actions">
												{#if apt.status === 'Pending'}
													<button
														class="action-icon-btn approve"
														title="Setujui Janji Temu"
														onclick={async () => await clinicStore.updateAppointmentStatus(apt.id, 'Confirmed')}
													>
														<Check size={16} />
													</button>
												{/if}
												{#if apt.status === 'Confirmed'}
													<button 
														class="btn btn-primary btn-sm btn-action-check" 
														onclick={() => openDiagnoseModal(apt)}
													>
														Periksa Pasien
													</button>
												{/if}
											</div>
										</div>
									{/each}
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- TAB 2: PATIENTS -->
			{#if activeTab === 'patients'}
				<div class="tab-content patients-tab animate-fade-in">
					<div class="search-bar-row">
						<div class="search-input-wrapper">
							<Search size={18} class="search-icon" />
							<input 
								type="text" 
								placeholder="Cari pasien berdasarkan nama, NIK, atau no. HP..." 
								bind:value={patientSearchQuery}
							/>
						</div>
						<button class="btn btn-primary" onclick={openAddPatient}>
							<UserPlus size={18} />
							<span>Tambah Pasien</span>
						</button>
					</div>

					<div class="card-premium table-card">
						<table class="dashboard-table">
							<thead>
								<tr>
									<th>ID Pasien</th>
									<th>Nama Lengkap</th>
									<th>NIK</th>
									<th>Lahir</th>
									<th>L/P</th>
									<th>No. Telp</th>
									<th>Alergi</th>
									<th>Aksi</th>
								</tr>
							</thead>
							<tbody>
								{#if filteredPatients.length === 0}
									<tr>
										<td colspan="8" class="text-center py-4">Pasien tidak ditemukan.</td>
									</tr>
								{:else}
									{#each filteredPatients as patient}
										<tr>
											<td class="font-mono text-primary font-bold">{patient.id}</td>
											<td><span class="font-bold">{patient.name}</span></td>
											<td>{patient.nik}</td>
											<td>{patient.dob}</td>
											<td>{patient.gender}</td>
											<td>{patient.phone}</td>
											<td>
												<span class="allergy-badge {patient.allergies.toLowerCase() !== 'tidak ada' ? 'allergy-alert' : 'allergy-none'}">
													{patient.allergies}
												</span>
											</td>
											<td>
												<div class="action-buttons-cell">
													<button class="action-icon-btn edit" onclick={() => openEditPatient(patient)}>
														<Edit size={14} />
													</button>
													<button class="action-icon-btn delete" onclick={async () => {
														if(await showConfirm('Hapus Pasien', `Hapus pasien ${patient.name}? Data tidak dapat dikembalikan.`, 'danger', 'Hapus')) {
															await clinicStore.deletePatient(patient.id);
															toast.success('Pasien berhasil dihapus.');
														}
													}}>
														<Trash2 size={14} />
													</button>
												</div>
											</td>
										</tr>
									{/each}
								{/if}
							</tbody>
						</table>
					</div>
				</div>
			{/if}

			<!-- TAB 3: DOCTORS -->
			{#if activeTab === 'doctors'}
				<div class="tab-content doctors-tab animate-fade-in">
					<div class="search-bar-row">
						<div class="search-input-wrapper">
							<Search size={18} class="search-icon" />
							<input 
								type="text" 
								placeholder="Cari dokter berdasarkan nama atau spesialisasi..." 
								bind:value={doctorSearchQuery}
							/>
						</div>
						<button class="btn btn-primary" onclick={openAddDoctor}>
							<Plus size={18} />
							<span>Tambah Dokter</span>
						</button>
					</div>

					<div class="doctors-dashboard-grid">
						{#if filteredDoctors.length === 0}
							<p class="empty-state">Dokter tidak ditemukan.</p>
						{:else}
							{#each filteredDoctors as doctor}
								<div class="card-premium doc-admin-card {doctor.status === 'Inactive' ? 'card-inactive' : ''}">
									<div class="doc-avatar-box-small">
										<span class="emoji-avatar">{doctor.avatar}</span>
										<span class="status-dot {doctor.status === 'Active' ? 'bg-success' : 'bg-danger'}"></span>
									</div>
									<div class="doc-admin-info">
										<h4>{doctor.name}</h4>
										<p class="spec-label">{doctor.specialty}</p>
										
										<div class="doc-detail-line">
											<Clock size={12} />
											<span>{doctor.schedule}</span>
										</div>

										<div class="doc-detail-line">
											<Users size={12} />
											<span>Tlp: {doctor.phone}</span>
										</div>
									</div>

									<div class="doc-admin-footer">
										<button
											class="status-toggle-btn {doctor.status === 'Active' ? 'btn-active-status' : 'btn-inactive-status'}"
											onclick={async () => {
												doctor.status = doctor.status === 'Active' ? 'Inactive' : 'Active';
												await clinicStore.updateDoctor(doctor);
											}}
										>
											{doctor.status === 'Active' ? '🔴 Non-aktifkan' : '🟢 Aktifkan'}
										</button>
										<div class="row-actions-right">
											<button class="action-icon-btn edit" onclick={() => openEditDoctor(doctor)}>
												<Edit size={14} />
											</button>
											<button class="action-icon-btn delete" onclick={async () => {
												if(await showConfirm('Hapus Dokter', `Hapus dokter ${doctor.name}?`, 'danger', 'Hapus')) {
													await clinicStore.deleteDoctor(doctor.id);
													toast.success('Dokter berhasil dihapus.');
												}
											}}>
												<Trash2 size={14} />
											</button>
										</div>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			{/if}

			<!-- TAB 4: APPOINTMENTS (JANJI TEMU) -->
			{#if activeTab === 'appointments'}
				<div class="tab-content appointments-tab animate-fade-in">
					<div class="search-bar-row mb-4" style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; background-color: white; padding: 1rem 1.5rem; border-radius: var(--radius-lg); border: 1px solid hsl(var(--border) / 0.6);">
						<div style="display: flex; align-items: center; gap: 0.75rem;">
							<span style="font-size: 1.5rem;">🏥</span>
							<div>
								<h4 style="margin: 0; font-size: 0.95rem; font-weight: 800;">Layanan Pasien Langsung (Go-Show / Walk-In)</h4>
								<p style="margin: 0; font-size: 0.75rem; color: hsl(var(--muted-foreground)); font-weight: 600;">Daftarkan pasien yang datang langsung ke klinik secara offline hari ini.</p>
							</div>
						</div>
						<button type="button" class="btn btn-primary" onclick={openOfflineRegisterModal}>
							<Plus size={18} />
							<span>Daftar Pasien Offline</span>
						</button>
					</div>
					<div class="filter-strip">
						<div class="filter-label">
							<Filter size={16} />
							<span>Filter Status:</span>
						</div>
						<div class="filter-tabs">
							{#each ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'] as status}
								<button 
									type="button" 
									class="filter-tab-btn {appointmentStatusFilter === status ? 'active' : ''}"
									onclick={() => { appointmentStatusFilter = status; }}
								>
									{status}
								</button>
							{/each}
						</div>
					</div>

					<div class="doctor-boards-container">
						{#if appointmentsByDoctor.length === 0}
							<div class="card-premium table-card text-center py-4" style="padding: 3rem;">
								<span style="font-size: 2.5rem; display: block; margin-bottom: 1rem;">📭</span>
								<h3 style="margin: 0; color: hsl(var(--foreground));">Tidak ada janji temu terdaftar.</h3>
								<p style="color: hsl(var(--muted-foreground)); font-size: 0.85rem; margin-top: 0.5rem;">Coba ubah filter status atau daftarkan pasien secara offline.</p>
							</div>
						{:else}
							{#each appointmentsByDoctor as doctorGroup}
								<div class="doctor-board card-premium mb-4" style="margin-bottom: 2rem; border-top: 4px solid hsl(var(--primary)); border-radius: var(--radius-lg); overflow: hidden;">
									<div class="doctor-board-header" style="background-color: hsl(var(--muted) / 0.3); padding: 1rem 1.5rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid hsl(var(--border));">
										<div style="display: flex; align-items: center; gap: 1rem;">
											<div style="background-color: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); padding: 0.6rem; border-radius: 50%;">
												<Stethoscope size={24} />
											</div>
											<div>
												<h3 style="margin: 0; font-weight: 800; font-size: 1.15rem; color: hsl(var(--foreground));">{doctorGroup.doctorName}</h3>
												<p style="margin: 0; font-size: 0.8rem; font-weight: 600; color: hsl(var(--muted-foreground));">
													Total Antrean Saat Ini: <span class="font-bold text-teal">{doctorGroup.apts.length} Pasien</span>
												</p>
											</div>
										</div>
									</div>
									<div class="table-responsive">
										<table class="dashboard-table">
											<thead>
												<tr>
													<th style="width: 90px; text-align: center;">No. Antrean</th>
													<th>Kode</th>
													<th>Nama Pasien</th>
													<th>No. Telp</th>
													<th>Tanggal</th>
													<th>Waktu</th>
													<th>Gejala/Keluhan</th>
													<th>Status</th>
													<th>Aksi Tindakan</th>
												</tr>
											</thead>
											<tbody>
												{#each doctorGroup.apts as apt}
													<tr>
														<td class="font-bold text-teal" style="font-size: 1.25rem; letter-spacing: 0.5px; text-align: center; background-color: hsl(var(--muted) / 0.2); border-right: 1px solid hsl(var(--border) / 0.5);">{apt.queueNumber || '-'}</td>
														<td class="font-mono text-primary font-bold">{apt.id}</td>
														<td><span class="font-bold">{apt.patientName}</span></td>
														<td>{apt.patientPhone}</td>
														<td>{apt.date}</td>
														<td><span class="font-bold">{apt.timeSlot}</span></td>
														<td class="symptoms-td" title={apt.symptoms}>{apt.symptoms}</td>
														<td>
															<span class="status-pill status-{apt.status.toLowerCase()}">
																{apt.status}
															</span>
														</td>
														<td>
															<div class="appointment-actions-cell">
																{#if apt.status === 'Pending'}
																	<button
																		class="btn btn-outline btn-sm py-1 px-2"
																		onclick={async () => await clinicStore.updateAppointmentStatus(apt.id, 'Confirmed')}
																	>
																		<Check size={12} /> Setujui
																	</button>
																{/if}
																
																{#if apt.status === 'Confirmed'}
																	<button 
																		class="btn btn-primary btn-sm py-1 px-2"
																		onclick={() => openDiagnoseModal(apt)}
																	>
																		<Stethoscope size={12} /> Periksa
																	</button>
																{/if}

																{#if apt.status === 'Pending' || apt.status === 'Confirmed'}
																	<button
																		class="btn-text-danger text-danger btn-sm"
																		onclick={async () => {
																			if(await showConfirm('Batalkan Janji Temu', `Batalkan janji temu ${apt.id}?`, 'danger', 'Batalkan')) {
																				await clinicStore.updateAppointmentStatus(apt.id, 'Cancelled');
																				toast.info('Janji temu dibatalkan.');
																			}
																		}}
																	>
																		Batalkan
																	</button>
																{/if}
																{#if apt.status === 'Completed' || apt.status === 'Cancelled'}
																	<span class="text-muted text-xs">Selesai/Tutup</span>
																{/if}
															</div>
														</td>
													</tr>
												{/each}
											</tbody>
										</table>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			{/if}

			<!-- TAB 5: MEDICAL RECORDS (REKAM MEDIS) -->
			{#if activeTab === 'records'}
				<div class="tab-content records-tab animate-fade-in">
					<div class="search-bar-row">
						<div class="search-input-wrapper">
							<Search size={18} class="search-icon" />
							<input 
								type="text" 
								placeholder="Cari rekam medis berdasarkan nama pasien, dokter, atau diagnosis..." 
								bind:value={recordsSearchQuery}
							/>
						</div>
					</div>

					<div class="records-dashboard-list">
						{#if filteredRecords.length === 0}
							<p class="empty-state">Rekam medis tidak ditemukan.</p>
						{:else}
							{#each filteredRecords as record}
								<div class="card-premium medical-record-card">
									<div class="record-header-strip">
										<div class="rec-title-block">
											<span class="record-id">{record.id}</span>
											<h4>{record.patientName}</h4>
										</div>
										<span class="record-date">{record.date}</span>
									</div>

									<div class="record-body-grid">
										<div class="rec-column">
											<label>Dokter Pemeriksa</label>
											<p>{record.doctorName}</p>
										</div>
										<div class="rec-column">
											<label>Gejala Utama (Anamnesi)</label>
											<p class="text-italic">"{record.symptoms}"</p>
										</div>
										<div class="rec-column border-highlight">
											<label>Diagnosis Utama</label>
											<p class="font-bold text-teal">{record.diagnosis}</p>
										</div>
										<div class="rec-column prescription-box">
											<label>Resep Obat (Terapi)</label>
											<p class="font-mono text-dark">{record.prescription}</p>
										</div>
									</div>

									<div class="record-footer-notes">
										<label>Tindakan/Tatalaksana:</label>
										<p>{record.treatment}</p>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			{/if}

			<!-- TAB 6: BILLING & CASHIER -->
			{#if activeTab === 'billing'}
				<div class="tab-content billing-tab animate-fade-in">
					<div class="search-bar-row mb-4" style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; background-color: white; padding: 1rem 1.5rem; border-radius: var(--radius-lg); border: 1px solid hsl(var(--border) / 0.6);">
						<div style="display: flex; align-items: center; gap: 0.75rem;">
							<span style="font-size: 1.5rem;">⚙️</span>
							<div>
								<h4 style="margin: 0; font-size: 0.95rem; font-weight: 800;">Pengaturan Pajak Penagihan (PPN)</h4>
								<p style="margin: 0; font-size: 0.75rem; color: hsl(var(--muted-foreground)); font-weight: 600;">Atur besaran persentase pajak PPN yang otomatis dihitung pada setiap transaksi baru.</p>
							</div>
						</div>
						<div style="display: flex; align-items: center; gap: 0.5rem; background-color: hsl(var(--muted) / 0.5); padding: 0.35rem 0.75rem; border-radius: var(--radius-md); border: 1.5px solid hsl(var(--border));">
							<input 
								type="number"
								min="0"
								max="100"
								style="width: 60px; border: none; background: transparent; font-weight: 800; text-align: right; font-size: 0.95rem; outline: none; padding: 0;"
								value={localTaxRate}
								onchange={(e) => handleTaxRateChange(Number((e.target as HTMLInputElement).value))}
							/>
							<span style="font-weight: 800; font-size: 0.95rem; color: hsl(var(--muted-foreground));">% PPN</span>
						</div>
					</div>

					<div class="filter-strip">
						<div class="filter-label">
							<Filter size={16} />
							<span>Filter Status Pembayaran:</span>
						</div>
						<div class="filter-tabs">
							{#each ['All', 'Paid', 'Unpaid'] as status}
								<button 
									type="button" 
									class="filter-tab-btn {invoiceStatusFilter === status ? 'active' : ''}"
									onclick={() => { invoiceStatusFilter = status; }}
								>
									{status === 'All' ? 'Semua Tagihan' : status === 'Paid' ? 'Lunas (Paid)' : 'Belum Lunas (Unpaid)'}
								</button>
							{/each}
						</div>
					</div>

					<div class="card-premium table-card">
						<table class="dashboard-table">
							<thead>
								<tr>
									<th>No. Tagihan</th>
									<th>Nama Pasien</th>
									<th>Tanggal</th>
									<th>Subtotal</th>
									<th>Pajak ({clinicStore.taxRate}%)</th>
									<th>Grand Total</th>
									<th>Status Tagihan</th>
									<th>Aksi</th>
								</tr>
							</thead>
							<tbody>
								{#if filteredInvoices.length === 0}
									<tr>
										<td colspan="8" class="text-center py-4">Tidak ada tagihan billing terdaftar.</td>
									</tr>
								{:else}
									{#each filteredInvoices as inv}
										<tr>
											<td class="font-mono text-primary font-bold">{inv.id}</td>
											<td><span class="font-bold">{inv.patientName}</span></td>
											<td>{inv.date}</td>
											<td>{formatRupiah(inv.subtotal)}</td>
											<td>
												{formatRupiah(
													inv.status === 'Unpaid' 
														? Math.round(inv.subtotal * (clinicStore.taxRate / 100)) 
														: inv.tax
												)}
											</td>
											<td>
												<span class="font-bold text-teal">
													{formatRupiah(
														inv.status === 'Unpaid' 
															? inv.subtotal + Math.round(inv.subtotal * (clinicStore.taxRate / 100)) 
															: inv.total
													)}
												</span>
											</td>
											<td>
												<span class="status-pill invoice-status-{inv.status.toLowerCase()}">
													{inv.status === 'Paid' ? 'LUNAS (Paid)' : 'BELUM BAYAR'}
												</span>
											</td>
											<td>
												<div class="billing-actions-cell">
													{#if inv.status === 'Unpaid'}
														<button
															class="btn btn-outline btn-sm py-1 px-2"
															onclick={async () => {
																if(await showConfirm('Konfirmasi Pembayaran', `Konfirmasi pembayaran tagihan ${inv.id} sebagai lunas?`)) {
																	await clinicStore.updateInvoiceStatus(inv.id, 'Paid');
																	toast.success(`Tagihan ${inv.id} ditandai lunas.`);
																}
															}}
														>
															<Check size={12} /> Tandai Lunas
														</button>
													{/if}
													
													<button 
														class="btn btn-secondary btn-sm py-1 px-2"
														onclick={() => {
															selectedInvoice = inv;
															showInvoiceModal = true;
														}}
													>
														<Printer size={12} /> Detail Struk
													</button>
												</div>
											</td>
										</tr>
									{/each}
								{/if}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		</div>
	</main>
</div>

<!-- MODAL: ADD/EDIT PATIENT -->
{#if showPatientModal}
	<div class="modal-backdrop" onclick={() => showPatientModal = false}>
		<div class="modal-content animate-scale-up" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3>{editingPatient ? 'Ubah Data Pasien' : 'Registrasi Pasien Baru'}</h3>
				<button class="close-modal-btn" onclick={() => showPatientModal = false}>&times;</button>
			</div>
			<form onsubmit={savePatient}>
				<div class="modal-body">
					<div class="actual-booking-form">
						<div class="form-grid-2">
							<div class="form-group">
								<label for="m-nik">NIK Pasien *</label>
								<input type="text" id="m-nik" bind:value={patNik} required placeholder="16 Digit NIK KTP" />
							</div>
							<div class="form-group">
								<label for="m-name">Nama Lengkap Pasien *</label>
								<input type="text" id="m-name" bind:value={patName} required placeholder="Nama Lengkap" />
							</div>
						</div>

						<div class="form-grid-3">
							<div class="form-group">
								<label for="m-dob">Tanggal Lahir *</label>
								<input type="date" id="m-dob" bind:value={patDob} required />
							</div>
							<div class="form-group">
								<label for="m-gender">Jenis Kelamin *</label>
								<select id="m-gender" bind:value={patGender} required>
									<option value="Laki-laki">Laki-laki</option>
									<option value="Perempuan">Perempuan</option>
								</select>
							</div>
							<div class="form-group">
								<label for="m-phone">No. Telp *</label>
								<input type="text" id="m-phone" bind:value={patPhone} required placeholder="Contoh: 0812345" />
							</div>
						</div>

						<div class="form-group">
							<label for="m-allergies">Daftar Alergi</label>
							<input type="text" id="m-allergies" bind:value={patAllergies} placeholder="Alergi Obat/Makanan (jika ada)" />
						</div>

						<div class="form-group">
							<label for="m-address">Alamat Domisili Pasien</label>
							<textarea id="m-address" bind:value={patAddress} rows="2" placeholder="Alamat lengkap tempat tinggal"></textarea>
						</div>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" onclick={() => showPatientModal = false}>Batal</button>
					<button type="submit" class="btn btn-primary">Simpan Pasien</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MODAL: ADD/EDIT DOCTOR -->
{#if showDoctorModal}
	<div class="modal-backdrop" onclick={() => showDoctorModal = false}>
		<div class="modal-content animate-scale-up" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3>{editingDoctor ? 'Ubah Profil Dokter' : 'Tambah Dokter Baru'}</h3>
				<button class="close-modal-btn" onclick={() => showDoctorModal = false}>&times;</button>
			</div>
			<form onsubmit={saveDoctor}>
				<div class="modal-body">
					<div class="actual-booking-form">
						<div class="form-grid-2">
							<div class="form-group">
								<label for="md-name">Nama Dokter *</label>
								<input type="text" id="md-name" bind:value={docName} required placeholder="Contoh: dr. Adrian Sp.PD" />
							</div>
							<div class="form-group">
								<label for="md-spec">Spesialisasi *</label>
								<input type="text" id="md-spec" bind:value={docSpecialty} required placeholder="Contoh: Spesialis Anak" />
							</div>
						</div>

						<div class="form-grid-2">
							<div class="form-group">
								<label for="md-phone">No. Telp Dokter *</label>
								<input type="text" id="md-phone" bind:value={docPhone} required placeholder="No. Handphone" />
							</div>
							<div class="form-group">
								<label for="md-emoji">Avatar Emoji *</label>
								<select id="md-emoji" bind:value={docAvatar} required>
									<option value="👨‍⚕️">👨‍⚕️ Dokter Laki-laki</option>
									<option value="👩‍⚕️">👩‍⚕️ Dokter Perempuan</option>
								</select>
							</div>
						</div>

						<div class="form-group">
							<label for="md-sched">Jadwal Praktik Mingguan *</label>
							<input type="text" id="md-sched" bind:value={docSchedule} required placeholder="Contoh: Senin - Rabu (08:00 - 12:00)" />
						</div>

						<div class="form-group">
							<label for="md-status">Status Ketersediaan</label>
							<select id="md-status" bind:value={docStatus}>
								<option value="Active">Active (Praktik)</option>
								<option value="Inactive">Inactive (Cuti)</option>
							</select>
						</div>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" onclick={() => showDoctorModal = false}>Batal</button>
					<button type="submit" class="btn btn-primary">Simpan Dokter</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- COMBINED DIAGNOSE & BILLING MODAL (ADVANCED WORKFLOW) -->
{#if showDiagnoseModal && activeDiagnoseApt}
	<div class="modal-backdrop" onclick={() => { showDiagnoseModal = false; activeDiagnoseApt = null; }}>
		<div class="modal-content md-width animate-scale-up" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3>Form Pemeriksaan & Billing Pasien</h3>
				<button class="close-modal-btn" onclick={() => { showDiagnoseModal = false; activeDiagnoseApt = null; }}>&times;</button>
			</div>
			<div class="modal-body double-modal-layout">
				<div class="diagnose-section">
					<h4 class="form-section-title">1. Rekam Medis (Medication File)</h4>
					<div class="diagnose-patient-info mt-2">
						<p><strong>Pasien:</strong> {activeDiagnoseApt.patientName}</p>
						<p><strong>Pemeriksa:</strong> {activeDiagnoseApt.doctorName}</p>
						<p class="text-italic"><strong>Keluhan Utama:</strong> "{activeDiagnoseApt.symptoms}"</p>
					</div>
					
					<div class="actual-booking-form mt-3">
						<div class="form-group">
							<label for="dia-diag">Diagnosis Utama *</label>
							<input 
								type="text" 
								id="dia-diag" 
								bind:value={diagnosisText} 
								required 
								placeholder="Contoh: Gastroesophageal Reflux Disease (GERD)"
							/>
						</div>
						
						<div class="form-group">
							<label for="dia-presc">Resep Obat & Dosis Terapi *</label>
							<textarea 
								id="dia-presc" 
								rows="3" 
								bind:value={prescriptionText}
								required
								placeholder="Contoh: Omeprazole 20mg 2x1 cap (Sebelum makan), Antasida syrup 3x1 C (Sebelum makan)"></textarea>
						</div>

						<div class="form-group">
							<label for="dia-treat">Instruksi & Tindakan Medis</label>
							<input 
								type="text" 
								id="dia-treat" 
								bind:value={treatmentText}
								placeholder="Contoh: Hindari kopi/asam/pedas, kontrol ulang bila belum reda"
							/>
						</div>
					</div>
				</div>

				<div class="billing-creation-section border-left">
					<h4 class="form-section-title">2. Billing Transaksi Kasir</h4>
					
					<div class="items-list-billing mt-2">
						<label>Rincian Tagihan Pemeriksaan:</label>
						{#each invoiceItems as item, idx}
							<div class="invoice-item-row">
								<span>{item.name}</span>
								<div class="price-action">
									<span class="font-bold text-teal">{formatRupiah(item.price)}</span>
									<button class="remove-btn" onclick={() => removeInvoiceItem(idx)}>&times;</button>
								</div>
							</div>
						{/each}
					</div>

					<div class="add-billing-item-box mt-3">
						<label>Tambah Item Layanan/Tindakan Tambahan</label>
						<div class="add-item-inputs">
							<input type="text" placeholder="Nama Tindakan/Obat" bind:value={newInvoiceItemName} />
							<input type="number" placeholder="Harga (Rp)" bind:value={newInvoiceItemPrice} />
							<button class="btn btn-secondary btn-sm" onclick={addInvoiceItem}>
								<Plus size={14} />
							</button>
						</div>
					</div>

					<div class="billing-totals-preview mt-4">
						<div class="total-row-preview">
							<span>Subtotal:</span>
							<span class="font-bold">{formatRupiah(previewSubtotal)}</span>
						</div>
						<div class="total-row-preview text-danger">
							<span>Pajak PPN ({clinicStore.taxRate}%):</span>
							<span>{formatRupiah(previewTax)}</span>
						</div>
						<div class="total-row-preview text-teal font-bold border-top-line">
							<span>Grand Total Tagihan:</span>
							<span>{formatRupiah(previewTotal)}</span>
						</div>
					</div>
				</div>
			</div>
			<div class="modal-footer">
				<button class="btn btn-secondary" onclick={() => { showDiagnoseModal = false; activeDiagnoseApt = null; }}>Batal</button>
				<button class="btn btn-primary" onclick={saveDiagnosisAndBill}>
					<Check size={16} />
					<span>Selesaikan Pemeriksaan & Tagih</span>
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- MODAL: DETAILED INVOICE STRUK (RECEIPT PREVIEW) -->
{#if showInvoiceModal && selectedInvoice}
	<div class="modal-backdrop" onclick={() => { showInvoiceModal = false; selectedInvoice = null; }}>
		<div class="modal-content animate-scale-up" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3>Kwitansi Struk Billing</h3>
				<button class="close-modal-btn" onclick={() => { showInvoiceModal = false; selectedInvoice = null; }}>&times;</button>
			</div>
			<div class="modal-body">
				<div class="receipt-print-wrapper">
					<!-- Styled receipt card -->
					<div id="receipt-print-area" class="card-premium receipt-printed">
						<div class="text-center font-mono">
							<h2>KLINIK MEDIKA UTAMA</h2>
							<p class="text-xs">Jl. Merdeka Raya No. 10, Jakarta Pusat</p>
							<p class="text-xs">Tlp: +62 812-3456-7890</p>
							<div class="receipt-dashed-line"></div>
						</div>
						
						<div class="font-mono text-xs text-left receipt-metadata">
							<p><strong>No. Tagihan :</strong> {selectedInvoice.id}</p>
							<p><strong>Pasien      :</strong> {selectedInvoice.patientName}</p>
							<p><strong>Tanggal     :</strong> {selectedInvoice.date}</p>
							<p><strong>Kode Booking :</strong> {selectedInvoice.appointmentId}</p>
							<div class="receipt-dashed-line"></div>
						</div>

						<table class="receipt-table font-mono text-xs">
							<thead>
								<tr>
									<th>Layanan / Obat</th>
									<th class="text-right">Biaya (Rp)</th>
								</tr>
							</thead>
							<tbody>
								{#each selectedInvoice.items as item}
									<tr>
										<td>{item.name}</td>
										<td class="text-right">{item.price.toLocaleString('id-ID')}</td>
									</tr>
								{/each}
							</tbody>
						</table>

						<div class="receipt-dashed-line"></div>
						
						<div class="font-mono text-xs totals-box">
							<div class="r-row">
								<span>Subtotal :</span>
								<span>Rp {selectedInvoice.subtotal.toLocaleString('id-ID')}</span>
							</div>
							<div class="r-row">
								<span>PPN ({selectedInvoice.status === 'Unpaid' ? clinicStore.taxRate : (selectedInvoice.subtotal > 0 ? Math.round((selectedInvoice.tax / selectedInvoice.subtotal) * 100) : clinicStore.taxRate)}%) :</span>
								<span>Rp {(selectedInvoice.status === 'Unpaid' ? Math.round(selectedInvoice.subtotal * (clinicStore.taxRate / 100)) : selectedInvoice.tax).toLocaleString('id-ID')}</span>
							</div>
							<div class="r-row font-bold text-teal text-lg">
								<span>TOTAL    :</span>
								<span>Rp {(selectedInvoice.status === 'Unpaid' ? selectedInvoice.subtotal + Math.round(selectedInvoice.subtotal * (clinicStore.taxRate / 100)) : selectedInvoice.total).toLocaleString('id-ID')}</span>
							</div>
						</div>

						<div class="receipt-dashed-line"></div>
						
						<div class="text-center mt-3">
							{#if selectedInvoice.status === 'Paid'}
								<span class="paid-stamp">LUNAS / PAID</span>
							{:else}
								<span class="unpaid-stamp">BELUM LUNAS</span>
							{/if}
							<p class="text-xxs text-muted mt-2">Terima kasih atas kepercayaan Anda terhadap layanan kami.</p>
						</div>
					</div>
				</div>
			</div>
			<div class="modal-footer">
				<button class="btn btn-secondary" onclick={() => { showInvoiceModal = false; selectedInvoice = null; }}>Tutup</button>
				<button class="btn btn-primary" onclick={printInvoice}>
					<Printer size={16} />
					<span>Cetak Kwitansi</span>
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- MODAL: REGISTRASI OFFLINE (WALK-IN / GO-SHOW) -->
{#if showOfflineRegisterModal}
	<div class="modal-backdrop" onclick={() => showOfflineRegisterModal = false}>
		<div class="modal-content animate-scale-up" style="max-width: 650px;" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3>Registrasi Pasien Offline (Go-Show / Walk-In)</h3>
				<button type="button" class="close-modal-btn" onclick={() => showOfflineRegisterModal = false}>&times;</button>
			</div>
			<form onsubmit={saveOfflineRegistration}>
				<div class="modal-body">
					<!-- Selektor Tipe Pasien (Terdaftar vs Baru) -->
					<div class="form-group mb-4" style="margin-bottom: 1.5rem;">
						<label style="font-weight: 800; font-size: 0.75rem; text-transform: uppercase; color: hsl(var(--muted-foreground)); display: block; margin-bottom: 0.5rem;">Tipe Kunjungan Pasien</label>
						<div class="patient-type-selector" style="display: flex; background-color: hsl(var(--muted)); padding: 0.35rem; border-radius: var(--radius-md);">
							<button 
								type="button" 
								class="selector-btn {offlinePatientType === 'existing' ? 'active' : ''}" 
								onclick={() => offlinePatientType = 'existing'}
								style="flex: 1; padding: 0.6rem; border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 700; text-align: center; color: offlinePatientType === 'existing' ? hsl(var(--primary)) : hsl(var(--muted-foreground)); border: none; background: offlinePatientType === 'existing' ? 'white' : 'transparent'; cursor: pointer;"
							>
								Pasien Sudah Terdaftar
							</button>
							<button 
								type="button" 
								class="selector-btn {offlinePatientType === 'new' ? 'active' : ''}" 
								onclick={() => offlinePatientType = 'new'}
								style="flex: 1; padding: 0.6rem; border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 700; text-align: center; color: offlinePatientType === 'new' ? hsl(var(--primary)) : hsl(var(--muted-foreground)); border: none; background: offlinePatientType === 'new' ? 'white' : 'transparent'; cursor: pointer;"
							>
								Pasien Baru (Belum Terdaftar)
							</button>
						</div>
					</div>

					<!-- AREA 1: PILIH PASIEN TERDAFTAR -->
					{#if offlinePatientType === 'existing'}
						<div class="form-group" style="margin-bottom: 1.25rem;">
							<label for="offline-select-patient">Pilih Pasien Dari Database</label>
							<select 
								id="offline-select-patient" 
								bind:value={offlineSelectedPatientId}
								required
								style="width: 100%; padding: 0.65rem 1rem; border-radius: var(--radius-sm); border: 1.5px solid hsl(var(--border)); background-color: white;"
							>
								<option value="" disabled>-- Pilih Pasien Terdaftar --</option>
								{#each clinicStore.patients as pat}
									<option value={pat.id}>{pat.name} ({pat.id}) - NIK: {pat.nik}</option>
								{/each}
							</select>
						</div>
					{:else}
						<!-- AREA 2: INPUT PASIEN BARU -->
						<div class="form-grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
							<div class="form-group">
								<label for="offline-pat-name">Nama Lengkap Pasien *</label>
								<input type="text" id="offline-pat-name" bind:value={offlineNewPatName} placeholder="Contoh: Andi Wijaya" required style="padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1.5px solid hsl(var(--border));" />
							</div>
							<div class="form-group">
								<label for="offline-pat-nik">Nomor NIK KTP (16 Digit) *</label>
								<input type="text" id="offline-pat-nik" bind:value={offlineNewPatNik} maxlength="16" placeholder="Contoh: 317101XXXXXXXXXX" required style="padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1.5px solid hsl(var(--border));" />
							</div>
						</div>

						<div class="form-grid-3" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
							<div class="form-group">
								<label for="offline-pat-phone">Nomor Telepon/WA *</label>
								<input type="text" id="offline-pat-phone" bind:value={offlineNewPatPhone} placeholder="Contoh: 0812XXXXXXXX" required style="padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1.5px solid hsl(var(--border));" />
							</div>
							<div class="form-group">
								<label for="offline-pat-dob">Tanggal Lahir</label>
								<input type="date" id="offline-pat-dob" bind:value={offlineNewPatDob} style="padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1.5px solid hsl(var(--border));" />
							</div>
							<div class="form-group">
								<label for="offline-pat-gender">Jenis Kelamin</label>
								<select id="offline-pat-gender" bind:value={offlineNewPatGender} style="padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1.5px solid hsl(var(--border)); background-color: white;">
									<option value="Laki-laki">Laki-laki</option>
									<option value="Perempuan">Perempuan</option>
								</select>
							</div>
						</div>

						<div class="form-group" style="margin-bottom: 1rem;">
							<label for="offline-pat-allergies">Riwayat Alergi Obat/Makanan (Opsional)</label>
							<input type="text" id="offline-pat-allergies" bind:value={offlineNewPatAllergies} placeholder="Tulis alergi obat/makanan jika ada, jika tidak kosongkan" style="padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1.5px solid hsl(var(--border));" />
						</div>

						<div class="form-group" style="margin-bottom: 1.25rem;">
							<label for="offline-pat-address">Alamat Tempat Tinggal</label>
							<textarea id="offline-pat-address" bind:value={offlineNewPatAddress} rows="2" placeholder="Alamat lengkap pasien..." style="padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1.5px solid hsl(var(--border)); font-family: inherit; resize: vertical;"></textarea>
						</div>
					{/if}

					<hr style="border: none; border-top: 1.5px solid hsl(var(--border) / 0.8); margin: 1.5rem 0;" />

					<!-- AREA 3: TUJUAN MEDIS -->
					<h4 style="font-size: 0.9rem; font-weight: 800; margin-bottom: 1rem; color: hsl(var(--primary));">Tujuan Konsultasi & Jadwal Hari Ini</h4>

					<div class="form-grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
						<div class="form-group">
							<label for="offline-select-doctor">Pilih Dokter Spesialis *</label>
							<select 
								id="offline-select-doctor" 
								bind:value={offlineSelectedDoctorId}
								required
								style="padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1.5px solid hsl(var(--border)); background-color: white;"
							>
								<option value="" disabled>-- Pilih Dokter --</option>
								{#each clinicStore.doctors.filter(d => d.status === 'Active') as doc}
									<option value={doc.id}>{doc.name} ({doc.specialty})</option>
								{/each}
							</select>
						</div>
						<div class="form-group">
							<label for="offline-select-time">Pilih Slot Waktu Kunjungan *</label>
							<select 
								id="offline-select-time" 
								bind:value={offlineSelectedTimeSlot}
								required
								style="padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1.5px solid hsl(var(--border)); background-color: white;"
							>
								<option value="" disabled>-- Pilih Waktu --</option>
								{#each timeSlots as slot}
									<option value={slot}>{slot}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="form-group" style="margin-bottom: 0;">
						<label for="offline-symptoms">Keluhan Utama / Gejala Awal Pasien</label>
						<textarea 
							id="offline-symptoms" 
							bind:value={offlineSymptoms} 
							rows="2" 
							placeholder="Tulis keluhan utama pasien yang dirasakan saat ini..." 
							style="padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1.5px solid hsl(var(--border)); font-family: inherit; resize: vertical;"
						></textarea>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" onclick={() => showOfflineRegisterModal = false}>Batal</button>
					<button type="submit" class="btn btn-primary">
						<Check size={16} />
						<span>Konfirmasi & Daftarkan</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	/* Global Loading Overlay */
	.global-loading-overlay {
		position: fixed;
		inset: 0;
		background: rgba(248, 250, 252, 0.85);
		backdrop-filter: blur(4px);
		z-index: 9998;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
	}

	.global-loading-overlay .spinner {
		width: 40px;
		height: 40px;
		border: 4px solid hsl(var(--muted));
		border-top-color: hsl(var(--primary));
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.global-loading-overlay p {
		font-size: 0.875rem;
		color: hsl(var(--muted-foreground));
		font-weight: 500;
	}

	/* Universal Admin Dashboard Styling */
	.text-teal { color: #0d9488; }
	.py-4 { padding: 1.5rem 0; }
	.py-1 { padding: 0.25rem 0; }
	.px-2 { padding: 0 0.5rem; }
	.font-mono { font-family: monospace; }
	.font-bold { font-weight: 700; }
	.text-center { text-align: center; }
	.bg-primary { background-color: hsl(var(--primary)); }
	.bg-warning { background-color: hsl(var(--warning)); }
	.bg-danger { background-color: hsl(var(--danger)); }
	.bg-success { background-color: hsl(var(--success)); }
	.text-white { color: white; }
	.border-left { border-left: 1px solid hsl(var(--border) / 0.8); }

	/* Layout structure */
	.dashboard-container {
		display: grid;
		grid-template-columns: 260px 1fr;
		height: 100vh;
		overflow: hidden;
		background-color: hsl(var(--background));
	}

	/* Sidebar Panel */
	.dashboard-sidebar {
		background-color: #0f172a; /* Deep Slate Gray */
		color: #94a3b8;
		display: flex;
		flex-direction: column;
		border-right: 1px solid rgba(255, 255, 255, 0.05);
	}
	.sidebar-logo {
		padding: 1.5rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}
	.sidebar-logo h4 {
		color: white;
		font-size: 1.1rem;
		font-weight: 800;
		line-height: 1.2;
	}
	.sidebar-logo p {
		font-size: 0.65rem;
		font-weight: 700;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	.sidebar-nav {
		padding: 1.5rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		flex-grow: 1;
		overflow-y: auto;
	}
	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.75rem 1rem;
		border-radius: var(--radius-md);
		color: #94a3b8;
		font-weight: 700;
		font-size: 0.9rem;
		transition: var(--transition-fast);
		text-align: left;
		width: 100%;
	}
	.nav-item:hover {
		color: white;
		background-color: rgba(255, 255, 255, 0.04);
	}
	.nav-item.active {
		color: white;
		background-color: hsl(var(--primary));
		box-shadow: 0 10px 15px -3px hsl(var(--primary) / 0.3);
	}
	.nav-badge {
		margin-left: auto;
		font-size: 0.65rem;
		font-weight: 800;
		padding: 0.15rem 0.45rem;
		border-radius: 9999px;
	}
	.sidebar-footer {
		padding: 1rem 0.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}
	.btn-logout {
		color: #ef4444;
	}
	.btn-logout:hover {
		background-color: rgba(239, 68, 68, 0.1);
		color: #f87171;
	}

	/* Main Content Panel */
	.dashboard-main-content {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}
	.dashboard-header {
		padding: 1.25rem 2rem;
		border-bottom: 1px solid hsl(var(--border) / 0.6);
		display: flex;
		justify-content: space-between;
		align-items: center;
		background-color: rgba(255, 255, 255, 0.7);
		z-index: 10;
	}
	.page-title {
		font-size: 1.5rem;
		font-weight: 800;
		letter-spacing: -0.5px;
	}
	.page-subtitle {
		font-size: 0.8rem;
		color: hsl(var(--muted-foreground));
		font-weight: 600;
	}
	.header-user-badge {
		background-color: white;
		border: 1px solid hsl(var(--border) / 0.8);
		padding: 0.5rem 1rem;
		border-radius: var(--radius-lg);
		display: flex;
		align-items: center;
		gap: 0.75rem;
		box-shadow: var(--shadow-sm);
	}
	.user-avatar-small {
		font-size: 1.5rem;
	}
	.header-user-badge h5 {
		font-size: 0.85rem;
		font-weight: 700;
		line-height: 1.2;
	}
	.header-user-badge p {
		font-size: 0.65rem;
		color: hsl(var(--primary));
		font-weight: 700;
	}

	.dashboard-body-scroll {
		flex-grow: 1;
		overflow-y: auto;
		padding: 2rem;
	}

	/* TAB CONTENT METRICS (OVERVIEW) */
	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1.5rem;
		margin-bottom: 2rem;
	}
	.metric-card {
		padding: 1.5rem;
		background-color: white;
	}
	.metric-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}
	.metric-title {
		font-size: 0.8rem;
		font-weight: 700;
		color: hsl(var(--muted-foreground));
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	.metric-icon {
		width: 2.25rem;
		height: 2.25rem;
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.p-umum { background-color: #ecfeff; color: #0891b2; }
	.p-dalam { background-color: #e0f2fe; color: #0369a1; }
	.p-jantung { background-color: #fee2e2; color: #b91c1c; }
	.p-gigi { background-color: #f0fdf4; color: #15803d; }
	
	.metric-value {
		font-size: 2rem;
		font-weight: 800;
		color: hsl(var(--foreground));
		line-height: 1;
		margin-bottom: 0.5rem;
	}
	.metric-note {
		font-size: 0.7rem;
		font-weight: 700;
	}

	/* Overview charts grid */
	.overview-charts-grid {
		display: grid;
		grid-template-columns: 1.2fr 0.8fr;
		gap: 1.5rem;
	}
	.chart-card, .activity-card {
		background-color: white;
		padding: 1.75rem;
	}
	.chart-card h3, .activity-card h3 {
		font-size: 1.1rem;
		font-weight: 800;
	}
	.chart-subtitle {
		font-size: 0.75rem;
		color: hsl(var(--muted-foreground));
		margin-bottom: 1.5rem;
	}
	.visits-chart {
		width: 100%;
		height: auto;
	}
	.chart-labels {
		display: flex;
		justify-content: space-between;
		font-size: 0.7rem;
		font-weight: 700;
		color: hsl(var(--muted-foreground));
		margin-top: 0.5rem;
		padding: 0 10px;
	}

	/* Agenda Action lists */
	.activity-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.agenda-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background-color: hsl(var(--muted) / 0.3);
		border-left: 4px solid #cbd5e1;
		border-radius: var(--radius-md);
	}
	.agenda-item.border-pending { border-left-color: hsl(var(--warning)); }
	.agenda-item.border-confirmed { border-left-color: hsl(var(--primary)); }
	
	.agenda-desc h5 {
		font-size: 0.85rem;
		font-weight: 700;
		line-height: 1.2;
	}
	.apt-time {
		font-size: 0.7rem;
		color: hsl(var(--muted-foreground));
		font-weight: 600;
	}
	.status-pill {
		display: inline-block;
		font-size: 0.65rem;
		font-weight: 800;
		padding: 0.15rem 0.5rem;
		border-radius: var(--radius-sm);
		text-transform: uppercase;
	}
	.status-pending { background-color: #fef3c7; color: #d97706; }
	.status-confirmed { background-color: #ccfbf1; color: #0d9488; }
	.status-completed { background-color: #dcfce7; color: #15803d; }
	.status-cancelled { background-color: #fee2e2; color: #b91c1c; }
	
	.agenda-actions {
		display: flex;
		gap: 0.35rem;
	}
	.action-icon-btn {
		width: 1.75rem;
		height: 1.75rem;
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: white;
		border: 1px solid hsl(var(--border));
	}
	.action-icon-btn.approve { color: hsl(var(--success)); }
	.action-icon-btn.approve:hover { background-color: #dcfce7; }
	.btn-action-check {
		padding: 0.35rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 700;
	}

	/* Search & Filters row */
	.search-bar-row {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}
	.search-input-wrapper {
		flex: 1;
		position: relative;
	}
	.search-input-wrapper input {
		width: 100%;
		padding: 0.65rem 1rem 0.65rem 2.5rem;
		border-radius: var(--radius-md);
		border: 1.5px solid hsl(var(--border));
		background-color: white;
	}
	.search-icon {
		position: absolute;
		left: 10px;
		top: 50%;
		transform: translateY(-50%);
		color: hsl(var(--muted-foreground));
	}

	/* Table premium card */
	.table-card {
		background-color: white;
		overflow-x: auto;
	}
	.dashboard-table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
		font-size: 0.85rem;
	}
	.dashboard-table th {
		background-color: hsl(var(--muted) / 0.4);
		padding: 0.85rem 1rem;
		font-weight: 800;
		color: hsl(var(--foreground));
		text-transform: uppercase;
		font-size: 0.7rem;
		letter-spacing: 0.5px;
		border-bottom: 1.5px solid hsl(var(--border));
	}
	.dashboard-table td {
		padding: 1rem;
		border-bottom: 1px solid hsl(var(--border) / 0.6);
		color: hsl(var(--muted-foreground));
		font-weight: 600;
	}
	.dashboard-table tr:hover {
		background-color: hsl(var(--muted) / 0.15);
	}
	.allergy-badge {
		font-size: 0.7rem;
		font-weight: 800;
		padding: 0.2rem 0.5rem;
		border-radius: var(--radius-sm);
	}
	.allergy-alert { background-color: #fee2e2; color: #ef4444; }
	.allergy-none { background-color: #f1f5f9; color: #64748b; }
	
	.action-buttons-cell {
		display: flex;
		gap: 0.35rem;
	}
	.action-icon-btn.edit { color: hsl(var(--primary)); }
	.action-icon-btn.edit:hover { background-color: hsl(var(--primary-light)); }
	.action-icon-btn.delete { color: hsl(var(--danger)); }
	.action-icon-btn.delete:hover { background-color: #fee2e2; }

	/* Doctors Dashboard Panel */
	.doctors-dashboard-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
	}
	.doc-admin-card {
		background-color: white;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		position: relative;
	}
	.card-inactive {
		opacity: 0.65;
		background-color: hsl(var(--muted) / 0.2);
	}
	.doc-avatar-box-small {
		width: 4rem;
		height: 4rem;
		border-radius: var(--radius-md);
		background-color: hsl(var(--muted));
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}
	.emoji-avatar { font-size: 2.25rem; }
	.status-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		position: absolute;
		bottom: -2px;
		right: -2px;
		border: 2px solid white;
	}
	.doc-admin-info h4 {
		font-size: 1.05rem;
		font-weight: 800;
	}
	.spec-label {
		font-size: 0.75rem;
		font-weight: 800;
		color: hsl(var(--primary));
		text-transform: uppercase;
		margin-bottom: 0.5rem;
	}
	.doc-detail-line {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: hsl(var(--muted-foreground));
		font-weight: 600;
	}
	.doc-admin-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-top: 1px solid hsl(var(--border) / 0.6);
		padding-top: 1rem;
		margin-top: auto;
	}
	.status-toggle-btn {
		font-size: 0.75rem;
		font-weight: 800;
		padding: 0.35rem 0.75rem;
		border-radius: var(--radius-sm);
	}
	.btn-active-status { background-color: #fee2e2; color: #b91c1c; }
	.btn-inactive-status { background-color: #dcfce7; color: #15803d; }
	.row-actions-right {
		display: flex;
		gap: 0.25rem;
	}

	/* Filter Strip */
	.filter-strip {
		display: flex;
		align-items: center;
		gap: 1rem;
		background-color: white;
		padding: 0.75rem 1.25rem;
		border-radius: var(--radius-lg);
		border: 1px solid hsl(var(--border) / 0.6);
		margin-bottom: 1.5rem;
	}
	.filter-label {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.8rem;
		font-weight: 800;
		color: hsl(var(--muted-foreground));
	}
	.filter-tabs {
		display: flex;
		gap: 0.5rem;
	}
	.filter-tab-btn {
		padding: 0.35rem 0.85rem;
		font-size: 0.75rem;
		font-weight: 700;
		border-radius: var(--radius-sm);
		color: hsl(var(--muted-foreground));
	}
	.filter-tab-btn.active {
		background-color: hsl(var(--primary-light));
		color: hsl(var(--primary));
	}

	/* Appointment actions cell */
	.appointment-actions-cell {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.symptoms-td {
		max-width: 150px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Medical Records Dashboard style */
	.records-dashboard-list {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	.medical-record-card {
		background-color: white;
		padding: 1.75rem;
	}
	.record-header-strip {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid hsl(var(--border) / 0.6);
		padding-bottom: 1rem;
		margin-bottom: 1.25rem;
	}
	.rec-title-block {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.record-id {
		background-color: hsl(var(--muted));
		color: hsl(var(--muted-foreground));
		font-family: monospace;
		font-size: 0.75rem;
		font-weight: 800;
		padding: 0.2rem 0.5rem;
		border-radius: var(--radius-sm);
	}
	.rec-title-block h4 {
		font-size: 1.15rem;
		font-weight: 800;
	}
	.record-date {
		font-size: 0.8rem;
		font-weight: 700;
		color: hsl(var(--muted-foreground));
	}
	.record-body-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1.5rem;
		margin-bottom: 1.25rem;
	}
	.rec-column label, .record-footer-notes label {
		font-size: 0.65rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: hsl(var(--muted-foreground));
		display: block;
		margin-bottom: 0.25rem;
	}
	.rec-column p {
		font-size: 0.85rem;
		font-weight: 700;
		color: hsl(var(--foreground));
	}
	.text-italic { font-style: italic; color: hsl(var(--muted-foreground)); }
	.border-highlight {
		background-color: hsl(var(--primary-light));
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-sm);
		border-left: 3px solid hsl(var(--primary));
	}
	.prescription-box {
		background-color: hsl(var(--muted) / 0.4);
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-sm);
	}
	.record-footer-notes {
		background-color: hsl(var(--secondary));
		padding: 0.75rem 1rem;
		border-radius: var(--radius-md);
	}
	.record-footer-notes p {
		font-size: 0.85rem;
		font-weight: 600;
	}

	/* Cashier tagihan style */
	.invoice-status-paid { background-color: #dcfce7; color: #166534; }
	.invoice-status-unpaid { background-color: #fee2e2; color: #b91c1c; }
	.billing-actions-cell {
		display: flex;
		gap: 0.5rem;
	}

	/* Form Booking Multi Grid */
	.actual-booking-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.form-grid-2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	.form-grid-3 {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 1rem;
	}
	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.form-group label {
		font-size: 0.75rem;
		font-weight: 800;
		color: hsl(var(--foreground));
	}
	.form-group input, .form-group select, .form-group textarea {
		padding: 0.6rem 0.85rem;
		border-radius: var(--radius-sm);
		border: 1.5px solid hsl(var(--border));
		background-color: white;
	}
	
	/* Diagnose Modal Specific Styling */
	.md-width {
		max-width: 850px;
	}
	.double-modal-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
	}
	.diagnose-patient-info {
		background-color: hsl(var(--muted) / 0.5);
		padding: 0.75rem 1rem;
		border-radius: var(--radius-md);
		font-size: 0.8rem;
		line-height: 1.5;
	}
	.invoice-item-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.4rem 0;
		border-bottom: 1px dashed hsl(var(--border));
		font-size: 0.75rem;
		font-weight: 700;
	}
	.price-action {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.remove-btn {
		color: #ef4444;
		font-weight: bold;
		font-size: 1.1rem;
	}
	.add-billing-item-box {
		background-color: hsl(var(--muted) / 0.3);
		padding: 0.75rem;
		border-radius: var(--radius-sm);
	}
	.add-billing-item-box label {
		font-size: 0.7rem;
		font-weight: 800;
		display: block;
		margin-bottom: 0.35rem;
	}
	.add-item-inputs {
		display: flex;
		gap: 0.35rem;
	}
	.add-item-inputs input {
		padding: 0.35rem;
		font-size: 0.75rem;
		border: 1px solid hsl(var(--border));
		border-radius: var(--radius-sm);
	}
	.add-item-inputs input:first-child { flex: 2; }
	.add-item-inputs input:nth-child(2) { flex: 1; }

	.billing-totals-preview {
		background-color: hsl(var(--secondary));
		padding: 0.85rem;
		border-radius: var(--radius-md);
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.75rem;
		font-weight: 700;
	}
	.total-row-preview {
		display: flex;
		justify-content: space-between;
	}
	.border-top-line {
		border-top: 1.5px solid hsl(var(--border));
		padding-top: 0.35rem;
		font-size: 0.85rem;
	}

	/* Cashier Invoice Printed Struk */
	.receipt-printed {
		padding: 2rem;
		background: white;
		border: 2px solid #000;
		color: #000;
	}
	.receipt-dashed-line {
		border-bottom: 1.5px dashed #000;
		margin: 1rem 0;
	}
	.receipt-table {
		width: 100%;
		margin: 1rem 0;
		border-collapse: collapse;
	}
	.receipt-table th {
		border-bottom: 1.5px solid #000;
		padding-bottom: 0.4rem;
		background: transparent;
		color: #000;
	}
	.receipt-table td {
		padding: 0.4rem 0;
		color: #000;
		border: none;
	}
	.r-row {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.35rem;
	}
	.paid-stamp {
		border: 4px double #16a34a;
		color: #16a34a;
		font-size: 1.5rem;
		font-weight: 900;
		padding: 0.5rem 1.5rem;
		display: inline-block;
		transform: rotate(-6deg);
		letter-spacing: 2px;
		margin: 1rem 0;
	}
	.unpaid-stamp {
		border: 4px double #ef4444;
		color: #ef4444;
		font-size: 1.5rem;
		font-weight: 900;
		padding: 0.5rem 1.5rem;
		display: inline-block;
		transform: rotate(-6deg);
		letter-spacing: 2px;
		margin: 1rem 0;
	}

	/* Responsive Admin Panel */
	@media (max-width: 1024px) {
		.dashboard-container {
			grid-template-columns: 1fr;
		}
		.dashboard-sidebar {
			display: none; /* In real, could use mobile drawer. For high-fidelity local mockup we prioritize screen size */
		}
		.metrics-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		.overview-charts-grid {
			grid-template-columns: 1fr;
		}
		.double-modal-layout {
			grid-template-columns: 1fr;
		}
		.border-left {
			border-left: none;
			border-top: 1px solid hsl(var(--border) / 0.8);
			padding-top: 1.5rem;
		}
	}
	@media (max-width: 768px) {
		.metrics-grid {
			grid-template-columns: 1fr;
		}
		.doctors-dashboard-grid {
			grid-template-columns: 1fr;
		}
		.form-grid-2, .form-grid-3 {
			grid-template-columns: 1fr;
		}
	}
</style>
