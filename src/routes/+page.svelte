<script lang="ts">
	import { clinicStore, type Appointment, type Patient } from '$lib/store.svelte.ts';
	import { 
		Activity, 
		Calendar, 
		Clock, 
		User, 
		Phone, 
		Shield, 
		HeartPulse, 
		MapPin, 
		Users, 
		CheckCircle2, 
		ArrowRight, 
		Printer, 
		Download, 
		Stethoscope, 
		Award, 
		Smile,
		AlertCircle,
		Search,
		BookOpen
	} from 'lucide-svelte';

	// Booking form state
	let selectedDoctorId = $state('');
	let bookingDate = $state('');
	let bookingTimeSlot = $state('');
	let patientName = $state('');
	let patientPhone = $state('');
	let patientDob = $state('');
	let patientGender = $state('Laki-laki');
	let patientNik = $state('');
	let symptoms = $state('');
	let isNewPatient = $state(true);

	// Existing patient lookup
	let searchNik = $state('');
	let lookupSuccessMessage = $state('');
	let lookupErrorMessage = $state('');

	// Booking outcome
	let isBooking = $state(false);
	let bookingError = $state('');
	let bookingSuccess = $state(false);
	let createdAppointment = $state<any>(null);
	let createdPatient = $state<any>(null);
	let queueNumber = $state('');

	// Doctor detail modal state
	let selectedModalDoctor = $state<any>(null);

	// Current date string for datepicker restriction
	const todayStr = new Date().toISOString().split('T')[0];

	// Available time slots
	const timeSlots = [
		'08:00 - 08:30', '08:30 - 09:00', '09:00 - 09:30', '09:30 - 10:00',
		'10:00 - 10:30', '10:30 - 11:00', '11:00 - 11:30', '11:30 - 12:00',
		'13:00 - 13:30', '13:30 - 14:00', '14:00 - 14:30', '14:30 - 15:00',
		'15:00 - 15:30', '15:30 - 16:00', '16:00 - 16:30', '16:30 - 17:00'
	];

	// Derived: get selected doctor info
	const selectedDoctor = $derived(
		clinicStore.doctors.find(d => d.id === selectedDoctorId)
	);

	function handleLookup() {
		lookupErrorMessage = '';
		lookupSuccessMessage = '';
		if (!searchNik) {
			lookupErrorMessage = 'Silakan masukkan NIK terlebih dahulu.';
			return;
		}

		const found = clinicStore.patients.find(p => p.nik.trim() === searchNik.trim());
		if (found) {
			patientName = found.name;
			patientPhone = found.phone;
			patientDob = found.dob;
			patientGender = found.gender;
			patientNik = found.nik;
			lookupSuccessMessage = `Pasien ditemukan: ${found.name}`;
		} else {
			lookupErrorMessage = 'Pasien dengan NIK tersebut tidak ditemukan. Silakan isi formulir sebagai Pasien Baru.';
		}
	}

	async function handleBooking(e: Event) {
		e.preventDefault();

		if (!selectedDoctorId || !bookingDate || !bookingTimeSlot || !patientName || !patientPhone || !patientNik) {
			alert('Harap isi semua kolom yang wajib diisi!');
			return;
		}

		isBooking = true;
		bookingError = '';

		try {
			let targetPatient: any;

			// 1. Check or create Patient
			const existing = clinicStore.patients.find(p => p.nik.trim() === patientNik.trim());
			if (existing) {
				targetPatient = existing;
				// Update patient details just in case
				existing.name = patientName;
				existing.phone = patientPhone;
				existing.dob = patientDob;
				existing.gender = patientGender;
				await clinicStore.updatePatient(existing);
			} else {
				targetPatient = await clinicStore.addPatient({
					name: patientName,
					nik: patientNik,
					dob: patientDob,
					gender: patientGender,
					phone: patientPhone,
					address: 'Daftar Online (Alamat belum diisi)',
					allergies: 'Tidak diketahui (Daftar Online)'
				});
			}

			// 2. Create Appointment
			const doc = clinicStore.doctors.find(d => d.id === selectedDoctorId);
			const newApt = await clinicStore.addAppointment({
				patientId: targetPatient.id,
				patientName: targetPatient.name,
				patientPhone: targetPatient.phone,
				doctorId: selectedDoctorId,
				doctorName: doc ? doc.name : 'Dokter Medika',
				date: bookingDate,
				timeSlot: bookingTimeSlot,
				symptoms: symptoms || 'Pemeriksaan Kesehatan Umum'
			});

			// 3. Generate queue number (e.g. A-12, B-03 depending on doctor specialty)
			const docPrefix = doc ? doc.specialty.includes('Anak') ? 'A' : doc.specialty.includes('Dalam') ? 'B' : doc.specialty.includes('Jantung') ? 'C' : 'G' : 'M';
			const dailyIndex = clinicStore.appointments.filter(a => a.date === bookingDate && a.doctorId === selectedDoctorId).length;
			queueNumber = `${docPrefix}-${String(dailyIndex).padStart(2, '0')}`;

			// 4. Set Success state
			createdPatient = targetPatient;
			createdAppointment = newApt;
			bookingSuccess = true;

			// Scroll to success card
			setTimeout(() => {
				document.getElementById('booking-result')?.scrollIntoView({ behavior: 'smooth' });
			}, 100);
		} catch (err: any) {
			bookingError = err?.message || 'Terjadi kesalahan saat memproses pendaftaran. Silakan coba lagi.';
		} finally {
			isBooking = false;
		}
	}

	function resetBooking() {
		selectedDoctorId = '';
		bookingDate = '';
		bookingTimeSlot = '';
		patientName = '';
		patientPhone = '';
		patientDob = '';
		patientGender = 'Laki-laki';
		patientNik = '';
		symptoms = '';
		searchNik = '';
		lookupSuccessMessage = '';
		lookupErrorMessage = '';
		isBooking = false;
		bookingError = '';
		bookingSuccess = false;
		createdAppointment = null;
		createdPatient = null;
	}

	function printTicket() {
		const printContents = document.getElementById('ticket-print-area')?.innerHTML;
		if (!printContents) return;
		const originalContents = document.body.innerHTML;
		
		document.body.innerHTML = `
			<html>
			<head>
				<title>Tiket Antrean - Medika Utama</title>
				<style>
					body { font-family: sans-serif; padding: 40px; text-align: center; color: #333; }
					.ticket { border: 2px dashed #0d9488; border-radius: 12px; padding: 30px; max-width: 400px; margin: 0 auto; background: white; }
					.header { border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 20px; }
					.title { font-size: 24px; font-weight: bold; color: #0d9488; margin: 0; }
					.subtitle { font-size: 12px; color: #64748b; margin-top: 5px; }
					.queue-label { font-size: 14px; text-transform: uppercase; color: #64748b; margin-top: 15px; }
					.queue-number { font-size: 48px; font-weight: 800; color: #0f172a; margin: 5px 0; letter-spacing: 2px; }
					.details { text-align: left; margin-top: 20px; font-size: 14px; line-height: 1.6; }
					.details-row { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 6px 0; }
					.label { color: #64748b; }
					.val { font-weight: 600; color: #0f172a; }
					.barcode { margin-top: 25px; height: 50px; background: repeating-linear-gradient(90deg, #000, #000 2px, transparent 2px, transparent 6px); width: 80%; margin-left: 10%; }
					.footer { margin-top: 25px; font-size: 11px; color: #94a3b8; }
				</style>
			</head>
			<body>
				<div class="ticket">
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
		window.location.reload(); // Reload to restore Svelte state
	}
</script>

<!-- HEADER / NAVIGATION -->
<header class="main-header glass">
	<div class="container header-container">
		<a href="/" class="logo-area">
			<div class="logo-icon animate-glow">
				<HeartPulse size={24} color="white" />
			</div>
			<div class="logo-text">
				<span class="brand-name">Medika<span class="brand-accent">Utama</span></span>
				<span class="brand-sub">Klinik Kesehatan Utama</span>
			</div>
		</a>
		<nav class="nav-menu">
			<a href="#layanan" class="nav-link">Layanan</a>
			<a href="#dokter" class="nav-link">Dokter Kami</a>
			<a href="#booking" class="nav-link booking-highlight">Daftar Online</a>
			<a href="/dashboard" class="dashboard-btn">
				<Activity size={16} />
				<span>Panel Dashboard</span>
			</a>
		</nav>
	</div>
</header>

<!-- HERO SECTION -->
<section class="hero-section">
	<div class="container hero-grid">
		<div class="hero-content animate-fade-in">
			<div class="promo-badge">
				<span class="badge-dot"></span>
				<span class="badge-text">Pendaftaran Online Dibuka 24 Jam</span>
			</div>
			<h1 class="hero-title">Layanan Kesehatan Profesional & Terpercaya</h1>
			<p class="hero-description">
				Komitmen kami adalah menghadirkan pelayanan medis terbaik dengan teknologi modern, dokter spesialis berpengalaman, dan sistem manajemen yang ramah, cepat, serta transparan demi kenyamanan keluarga Anda.
			</p>
			<div class="hero-actions">
				<a href="#booking" class="btn btn-primary btn-lg">
					<Calendar size={18} />
					<span>Buat Janji Temu</span>
				</a>
				<a href="#layanan" class="btn btn-secondary btn-lg">
					<span>Pelajari Layanan</span>
					<ArrowRight size={18} />
				</a>
			</div>
			
			<!-- Statistics -->
			<div class="hero-stats">
				<div class="stat-item">
					<span class="stat-num">15+</span>
					<span class="stat-label">Dokter Spesialis</span>
				</div>
				<div class="stat-divider"></div>
				<div class="stat-item">
					<span class="stat-num">10k+</span>
					<span class="stat-label">Pasien Puas</span>
				</div>
				<div class="stat-divider"></div>
				<div class="stat-item">
					<span class="stat-num">24/7</span>
					<span class="stat-label">Layanan Informasi</span>
				</div>
			</div>
		</div>
		
		<div class="hero-visual animate-scale-up">
			<div class="visual-card main-visual-card animate-glow">
				<div class="visual-header">
					<div class="pulse-icon"><Activity size={24} color="#0d9488" /></div>
					<div>
						<h4>Klinik Terakreditasi Paripurna</h4>
						<p>Kementerian Kesehatan RI</p>
					</div>
				</div>
				<div class="visual-body">
					<div class="schedule-quick-info">
						<Clock size={16} class="text-primary" />
						<span>Buka Setiap Hari: 08:00 - 21:00 WIB</span>
					</div>
					<div class="location-quick-info">
						<MapPin size={16} class="text-primary" />
						<span>Jl. Merdeka Raya No. 10, Jakarta</span>
					</div>
				</div>
				<div class="visual-footer">
					<span class="avatar-group">
						<span>👨‍⚕️</span>
						<span>👩‍⚕️</span>
						<span>👨‍⚕️</span>
					</span>
					<span class="avatar-text">Ditangani Tim Dokter Terbaik</span>
				</div>
			</div>
			<div class="visual-decor-circle"></div>
			<div class="visual-decor-dots"></div>
		</div>
	</div>
</section>

<!-- HIGHLIGHTS / BENEFIT STRIP -->
<section class="benefits-strip">
	<div class="container benefits-grid">
		<div class="benefit-card">
			<div class="benefit-icon"><Shield size={22} /></div>
			<div class="benefit-info">
				<h5>Keamanan Data Medis</h5>
				<p>Rekam medis pasien tersimpan aman dan terintegrasi dengan standar privasi tinggi.</p>
			</div>
		</div>
		<div class="benefit-card">
			<div class="benefit-icon"><Stethoscope size={22} /></div>
			<div class="benefit-info">
				<h5>Dokter Ahli & Berpengalaman</h5>
				<p>Dokter spesialis kami memiliki jam terbang tinggi dan tersertifikasi nasional.</p>
			</div>
		</div>
		<div class="benefit-card">
			<div class="benefit-icon"><Award size={22} /></div>
			<div class="benefit-info">
				<h5>Layanan Modern & Bersih</h5>
				<p>Fasilitas gedung klinik yang higienis, steril, nyaman, dan ramah anak.</p>
			</div>
		</div>
	</div>
</section>

<!-- LAYANAN / SERVICES SECTION -->
<section id="layanan" class="services-section">
	<div class="container">
		<div class="section-header">
			<span class="section-tag">Layanan Kami</span>
			<h2 class="section-title">Spesialisasi Medis Terbaik Untuk Anda</h2>
			<p class="section-subtitle">Kami menyediakan berbagai spesialisasi klinis yang siap melayani segala kebutuhan kesehatan jasmani keluarga Anda dengan sepenuh hati.</p>
		</div>

		<div class="services-grid">
			<!-- Service 1 -->
			<div class="card-premium service-card">
				<div class="service-icon-wrapper p-dalam"><Stethoscope size={24} /></div>
				<h3>Penyakit Dalam</h3>
				<p>Pemeriksaan dan diagnosis organ dalam secara komprehensif, dari diabetes, hipertensi, hingga gangguan metabolik.</p>
				<a href="#booking" onclick={() => { selectedDoctorId = 'DOC-001'; }} class="service-link">
					<span>Konsultasi</span>
					<ArrowRight size={14} />
				</a>
			</div>

			<!-- Service 2 -->
			<div class="card-premium service-card">
				<div class="service-icon-wrapper p-anak"><Smile size={24} /></div>
				<h3>Kesehatan Anak (Pediatri)</h3>
				<p>Tumbuh kembang anak, imunisasi terjadwal, pengobatan demam, serta konsultasi nutrisi balita tepercaya.</p>
				<a href="#booking" onclick={() => { selectedDoctorId = 'DOC-002'; }} class="service-link">
					<span>Konsultasi</span>
					<ArrowRight size={14} />
				</a>
			</div>

			<!-- Service 3 -->
			<div class="card-premium service-card">
				<div class="service-icon-wrapper p-jantung"><HeartPulse size={24} /></div>
				<h3>Jantung & Pembuluh Darah</h3>
				<p>Deteksi dini penyakit jantung koroner, cek EKG, aritmia, hipertensi berat, serta kesehatan pembuluh darah.</p>
				<a href="#booking" onclick={() => { selectedDoctorId = 'DOC-003'; }} class="service-link">
					<span>Konsultasi</span>
					<ArrowRight size={14} />
				</a>
			</div>

			<!-- Service 4 -->
			<div class="card-premium service-card">
				<div class="service-icon-wrapper p-kandungan"><Users size={24} /></div>
				<h3>Kebidanan & Kandungan (Obgyn)</h3>
				<p>Pemeriksaan rutin kehamilan, USG abdomen, program kehamilan, KB, hingga konsultasi kesehatan reproduksi wanita.</p>
				<a href="#booking" onclick={() => { selectedDoctorId = 'DOC-004'; }} class="service-link">
					<span>Konsultasi</span>
					<ArrowRight size={14} />
				</a>
			</div>

			<!-- Service 5 -->
			<div class="card-premium service-card">
				<div class="service-icon-wrapper p-gigi"><Activity size={24} /></div>
				<h3>Kesehatan Gigi & Mulut</h3>
				<p>Perawatan saluran akar, pencabutan gigi, pembersihan karang gigi (scaling), tambal gigi, serta estetika gigi.</p>
				<a href="#booking" onclick={() => { selectedDoctorId = 'DOC-005'; }} class="service-link">
					<span>Konsultasi</span>
					<ArrowRight size={14} />
				</a>
			</div>

			<!-- Service 6 -->
			<div class="card-premium service-card">
				<div class="service-icon-wrapper p-umum"><Shield size={24} /></div>
				<h3>Pemeriksaan Umum (MCU)</h3>
				<p>Paket Medical Check-Up rutin tahunan untuk deteksi dini masalah kesehatan jasmani menyeluruh.</p>
				<a href="#booking" class="service-link">
					<span>Pelajari Paket</span>
					<ArrowRight size={14} />
				</a>
			</div>
		</div>
	</div>
</section>

<!-- DOKTER / DOCTORS SECTION -->
<section id="dokter" class="doctors-section">
	<div class="container">
		<div class="section-header">
			<span class="section-tag">Dokter Spesialis</span>
			<h2 class="section-title">Kenali Tim Dokter Profesional Kami</h2>
			<p class="section-subtitle">Dokter spesialis kami tidak hanya kompeten di bidangnya, tetapi juga ramah dan siap mendengar keluhan kesehatan Anda.</p>
		</div>

		<div class="doctors-grid">
			{#each clinicStore.doctors as doctor}
				<div class="card-premium doctor-card">
					<div class="doctor-avatar-box">
						<span class="doctor-emoji">{doctor.avatar}</span>
						<span class="doctor-badge {doctor.status === 'Active' ? 'badge-active' : 'badge-inactive'}">
							{doctor.status === 'Active' ? 'Praktik' : 'Cuti'}
						</span>
					</div>
					<div class="doctor-info">
						<h4>{doctor.name}</h4>
						<p class="doc-spec">{doctor.specialty}</p>
						
						<div class="doc-schedule-strip">
							<Clock size={14} />
							<span>{doctor.schedule}</span>
						</div>
						
						<div class="doctor-card-footer">
							<button 
								type="button"
								class="btn btn-outline btn-sm"
								onclick={() => selectedModalDoctor = doctor}
							>
								Lihat Profil
							</button>
							<a 
								href="#booking" 
								class="btn btn-primary btn-sm"
								onclick={() => { selectedDoctorId = doctor.id; }}
							>
								Pilih Dokter
							</a>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- DOCTOR DETAIL MODAL -->
{#if selectedModalDoctor}
	<div class="modal-backdrop" onclick={() => selectedModalDoctor = null}>
		<div class="modal-content animate-scale-up" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3>Detail Profil Dokter</h3>
				<button class="close-modal-btn" onclick={() => selectedModalDoctor = null}>&times;</button>
			</div>
			<div class="modal-body doctor-profile-modal">
				<div class="profile-avatar-area">
					<span class="profile-emoji">{selectedModalDoctor.avatar}</span>
					<h2>{selectedModalDoctor.name}</h2>
					<span class="profile-badge">{selectedModalDoctor.specialty}</span>
				</div>
				<div class="profile-details-area">
					<div class="detail-group">
						<label>Kontak Informasi</label>
						<p>{selectedModalDoctor.phone}</p>
					</div>
					<div class="detail-group">
						<label>Jadwal Praktik Mingguan</label>
						<p class="highlight-schedule">{selectedModalDoctor.schedule}</p>
					</div>
					<div class="detail-group">
						<label>Status Ketersediaan</label>
						<p class="status-badge-text {selectedModalDoctor.status === 'Active' ? 'text-success' : 'text-danger'}">
							{selectedModalDoctor.status === 'Active' ? '🟢 Aktif / Melayani Konsultasi' : '🔴 Cuti Sementara'}
						</p>
					</div>
					<div class="detail-group">
						<label>Biografi Ringkas</label>
						<p class="bio-text">
							Beliau memiliki pengalaman lebih dari 10 tahun melayani pasien dengan dedikasi tinggi. Terkenal sangat komunikatif dalam memberikan edukasi pencegahan penyakit kepada pasien.
						</p>
					</div>
				</div>
			</div>
			<div class="modal-footer">
				<button class="btn btn-secondary" onclick={() => selectedModalDoctor = null}>Tutup</button>
				<a 
					href="#booking" 
					class="btn btn-primary" 
					onclick={() => { selectedDoctorId = selectedModalDoctor.id; selectedModalDoctor = null; }}
				>
					Buat Janji Temu
				</a>
			</div>
		</div>
	</div>
{/if}

<!-- TESTIMONIALS SECTION -->
<section class="testimonials-section">
	<div class="container">
		<div class="section-header">
			<span class="section-tag">Testimoni Pasien</span>
			<h2 class="section-title">Apa Kata Mereka Tentang Kami?</h2>
			<p class="section-subtitle">Kepuasan dan kesembuhan pasien adalah prioritas utama pelayanan kami. Berikut adalah tanggapan jujur dari pasien yang telah berobat.</p>
		</div>

		<div class="testimonials-grid">
			<div class="testimonial-card card-premium">
				<div class="stars-row">⭐⭐⭐⭐⭐</div>
				<p class="testi-text">"Pelayanan pendaftaran online di Medika Utama sangat memudahkan! Saya tidak perlu mengantre berjam-jam di klinik. Cukup datang sesuai jam di tiket, langsung diperiksa oleh dr. Adrian yang sangat ramah."</p>
				<div class="testi-user">
					<span class="user-avatar">👨</span>
					<div>
						<h5>Hendra Wijaya</h5>
						<p>Pasien Penyakit Dalam</p>
					</div>
				</div>
			</div>
			
			<div class="testimonial-card card-premium">
				<div class="stars-row">⭐⭐⭐⭐⭐</div>
				<p class="testi-text">"Fasilitas kliniknya sangat bersih dan nyaman, anak saya sama sekali tidak takut saat diperiksa oleh dr. Sarah. Beliau sangat lembut dan sabar dalam menjelaskan tumbuh kembang balita."</p>
				<div class="testi-user">
					<span class="user-avatar">👩</span>
					<div>
						<h5>Rina Kartika</h5>
						<p>Ibu dari Balita (Pasien Anak)</p>
					</div>
				</div>
			</div>
			
			<div class="testimonial-card card-premium">
				<div class="stars-row">⭐⭐⭐⭐⭐</div>
				<p class="testi-text">"Saya mengantarkan ayah saya untuk rekam EKG jantung dengan dr. Handoko. Penjelasannya sangat detail dan logis. Sistem penagihan kasir juga transparan, struk cetak lengkap dan langsung dikirim."</p>
				<div class="testi-user">
					<span class="user-avatar">👨</span>
					<div>
						<h5>Aris Nugroho</h5>
						<p>Pasien Jantung</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- INTERACTIVE APPOINTMENT BOOKING SECTION -->
<section id="booking" class="booking-section">
	<div class="container">
		<div class="booking-box card-premium">
			{#if !bookingSuccess}
				<div class="booking-grid">
					<!-- Form side -->
					<div class="booking-form-area">
						<div class="booking-header">
							<span class="booking-eyebrow">Booking online</span>
							<div class="icon-title">
								<Calendar size={28} class="text-primary" />
								<h2>Buat janji temu</h2>
							</div>
							<p>Isi data singkat berikut. Nomor antrean dibuat setelah pendaftaran dikonfirmasi.</p>
						</div>

						<ol class="booking-steps" aria-label="Tahapan pendaftaran">
							<li class="is-current"><span>1</span>Data pasien</li>
							<li><span>2</span>Pilih jadwal</li>
							<li><span>3</span>Konfirmasi</li>
						</ol>

						<div class="patient-type-selector">
							<button 
								type="button" 
								class="selector-btn {isNewPatient ? 'active' : ''}" 
								onclick={() => { isNewPatient = true; }}
							>
								Pasien Baru
							</button>
							<button 
								type="button" 
								class="selector-btn {!isNewPatient ? 'active' : ''}" 
								onclick={() => { isNewPatient = false; }}
							>
								Pasien Lama (Punya NIK)
							</button>
						</div>

						{#if !isNewPatient}
							<!-- NIK Lookup Form -->
							<div class="lookup-box">
								<label for="search-nik">Cari Data Pasien (Masukkan NIK Anda)</label>
								<div class="search-input-group">
									<input 
										type="text" 
										id="search-nik" 
										placeholder="Contoh: 3171012345670001" 
										bind:value={searchNik}
									/>
									<button type="button" class="btn btn-secondary btn-search" onclick={handleLookup}>
										<Search size={16} />
										<span>Cari</span>
									</button>
								</div>
								{#if lookupErrorMessage}
									<p class="lookup-err"><AlertCircle size={14} /> {lookupErrorMessage}</p>
								{/if}
								{#if lookupSuccessMessage}
									<p class="lookup-ok"><CheckCircle2 size={14} /> {lookupSuccessMessage}</p>
								{/if}
							</div>
						{/if}

						<form onsubmit={handleBooking} class="actual-booking-form">
							<section class="booking-form-card">
								<div class="form-section-heading">
									<span class="form-section-icon"><User size={17} /></span>
									<div><h3>Data pasien</h3><p>Gunakan data yang sesuai dengan identitas Anda.</p></div>
								</div>
							<div class="form-grid-2">
								<div class="form-group">
									<label for="p-nik">NIK Pasien *</label>
									<input 
										type="text" 
										id="p-nik" 
										placeholder="16 Digit NIK KTP/KK" 
										bind:value={patientNik} 
										required 
									/>
								</div>
								<div class="form-group">
									<label for="p-name">Nama Lengkap Pasien *</label>
									<input 
										type="text" 
										id="p-name" 
										placeholder="Sesuai KTP" 
										bind:value={patientName} 
										required 
									/>
								</div>
							</div>

							<div class="form-grid-3">
								<div class="form-group">
									<label for="p-dob">Tanggal Lahir *</label>
									<input 
										type="date" 
										id="p-dob" 
										bind:value={patientDob} 
										required 
									/>
								</div>
								<div class="form-group">
									<label for="p-gender">Jenis Kelamin *</label>
									<select id="p-gender" bind:value={patientGender} required>
										<option value="Laki-laki">Laki-laki</option>
										<option value="Perempuan">Perempuan</option>
									</select>
								</div>
								<div class="form-group">
									<label for="p-phone">No. Handphone (WhatsApp) *</label>
									<input 
										type="tel" 
										id="p-phone" 
										placeholder="Contoh: 08123456789" 
										bind:value={patientPhone} 
										required 
									/>
								</div>
							</div>
							</section>

							<section class="booking-form-card">
								<div class="form-section-heading">
									<span class="form-section-icon"><HeartPulse size={17} /></span>
									<div><h3>Jadwal dan keluhan</h3><p>Pilih dokter dan waktu kunjungan yang paling sesuai.</p></div>
								</div>
							<div class="form-group">
								<label for="booking-doc">Pilih Dokter Spesialis *</label>
								<select id="booking-doc" bind:value={selectedDoctorId} required>
									<option value="" disabled selected>-- Pilih Dokter --</option>
									{#each clinicStore.doctors as doctor}
										<option value={doctor.id} disabled={doctor.status !== 'Active'}>
											{doctor.name} - {doctor.specialty} ({doctor.status === 'Active' ? 'Tersedia' : 'Cuti'})
										</option>
									{/each}
								</select>
								{#if selectedDoctor}
									<p class="selection-hint"><CheckCircle2 size={14} /> {selectedDoctor.name} tersedia sesuai jadwal praktik.</p>
								{/if}
							</div>

							<div class="form-grid-2">
								<div class="form-group">
									<label for="booking-date">Tanggal Kunjungan *</label>
									<input 
										type="date" 
										id="booking-date" 
										min={todayStr}
										bind:value={bookingDate} 
										required 
									/>
								</div>
								<div class="form-group">
									<label for="booking-time">Pilih Jam / Slot Waktu *</label>
									<select id="booking-time" bind:value={bookingTimeSlot} required>
										<option value="" disabled selected>-- Pilih Slot Waktu --</option>
										{#each timeSlots as slot}
											<option value={slot}>{slot}</option>
										{/each}
									</select>
								</div>
							</div>

							<div class="form-group">
								<label for="p-symptoms">Keluhan Utama / Alasan Kunjungan</label>
								<textarea 
									id="p-symptoms" 
									rows="3" 
									placeholder="Tuliskan keluhan atau gejala yang dirasakan (misal: demam 3 hari, sakit kepala)" 
									bind:value={symptoms}
								></textarea>
							</div>
							</section>

							{#if bookingError}
								<p class="booking-err"><AlertCircle size={14} /> {bookingError}</p>
							{/if}

							<button type="submit" class="btn btn-primary btn-block btn-lg booking-submit" disabled={isBooking}>
								{#if isBooking}
									<span>Memproses Pendaftaran...</span>
								{:else}
									<CheckCircle2 size={18} />
									<span>Konfirmasi Pendaftaran Janji Temu</span>
								{/if}
							</button>
						</form>
					</div>

					<!-- Sidebar info -->
					<div class="booking-info-sidebar">
						<div>
							<span class="sidebar-eyebrow">Mudah dan cepat</span>
							<h3>Tiga langkah sampai antrean</h3>
						</div>
						<div class="booking-guide">
							<div><span>1</span><p><strong>Pilih tipe pasien</strong>Pasien lama cukup cari dengan NIK.</p></div>
							<div><span>2</span><p><strong>Tentukan jadwal</strong>Pilih dokter, tanggal, dan slot kunjungan.</p></div>
							<div><span>3</span><p><strong>Simpan tiket</strong>Cetak tiket setelah nomor antrean muncul.</p></div>
						</div>
						<div class="sidebar-schedule-wrap">
							<h4>Dokter yang melayani</h4>
							<div class="sidebar-schedule-list">
								{#each clinicStore.doctors as doc}
									{#if doc.status === 'Active'}
										<div class="sidebar-doc-item">
											<span class="doc-emoji-small">{doc.avatar}</span>
											<div class="doc-desc">
												<h5>{doc.name}</h5>
												<p>{doc.specialty}</p>
												<span class="time-label">{doc.schedule}</span>
											</div>
										</div>
									{/if}
								{/each}
							</div>
						</div>
						
						<div class="sidebar-alert-card">
							<AlertCircle size={20} class="text-primary" />
							<div>
								<h5>Penting untuk Diketahui!</h5>
								<p>Harap datang ke klinik Medika Utama minimal 15 menit sebelum waktu slot janji temu Anda untuk melakukan konfirmasi ulang di meja pendaftaran dengan membawa KTP/KK asli.</p>
							</div>
						</div>
					</div>
				</div>
			{:else}
				<!-- BOOKING SUCCESS SCREEN (TICKET DISPLAY) -->
				<div id="booking-result" class="booking-success-container animate-fade-in">
					<div class="success-alert-header">
						<div class="check-success-badge"><CheckCircle2 size={48} color="white" /></div>
						<h2>Pendaftaran Berhasil!</h2>
						<p>Nomor antrean dan slot janji temu Anda telah dikonfirmasi oleh sistem klinik.</p>
					</div>

					<div class="ticket-wrapper">
						<!-- Printable Area -->
						<div id="ticket-print-area" class="ticket-card animate-glow">
							<div class="ticket-header">
								<span class="ticket-brand">MEDIKA UTAMA</span>
								<span class="ticket-tag">TIKET JANJI TEMU ONLINE</span>
							</div>
							
							<div class="ticket-body">
								<div class="queue-section">
									<span class="queue-label">NOMOR ANTREAN</span>
									<h1 class="queue-number">{queueNumber}</h1>
									<span class="queue-time-slot">Estimasi Waktu: {bookingTimeSlot} WIB</span>
								</div>

								<div class="ticket-divider">
									<div class="circle-notch left"></div>
									<div class="dash-line"></div>
									<div class="circle-notch right"></div>
								</div>

								<div class="ticket-details">
									<div class="detail-row">
										<span class="lbl">Pasien:</span>
										<span class="val">{createdPatient?.name}</span>
									</div>
									<div class="detail-row">
										<span class="lbl">NIK:</span>
										<span class="val">{createdPatient?.nik}</span>
									</div>
									<div class="detail-row">
										<span class="lbl">Dokter Spesialis:</span>
										<span class="val">{createdAppointment?.doctorName}</span>
									</div>
									<div class="detail-row">
										<span class="lbl">Tanggal Kunjungan:</span>
										<span class="val">{createdAppointment?.date}</span>
									</div>
									<div class="detail-row">
										<span class="lbl">Kode Booking:</span>
										<span class="val font-mono text-primary">{createdAppointment?.id}</span>
									</div>
								</div>

								<div class="ticket-barcode-wrapper">
									<div class="simulated-barcode"></div>
									<span class="barcode-text">*{createdAppointment?.id}*</span>
								</div>
							</div>

							<div class="ticket-footer">
								<p>Tunjukkan tiket ini saat melakukan pendaftaran di resepsionis.</p>
								<p class="footer-small">Dicetak otomatis oleh Sistem Medika Utama</p>
							</div>
						</div>
					</div>

					<div class="success-actions">
						<button class="btn btn-outline" onclick={printTicket}>
							<Printer size={18} />
							<span>Cetak Struk Antrean</span>
						</button>
						<button class="btn btn-primary" onclick={resetBooking}>
							<span>Buat Janji Baru</span>
							<ArrowRight size={18} />
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</section>

<!-- CONTACT & INFO SECTION -->
<section id="kontak" class="contact-section">
	<div class="container contact-grid">
		<div class="contact-info-block">
			<span class="section-tag">Kontak & Alamat</span>
			<h2>Hubungi Kami Kapan Saja</h2>
			<p class="contact-desc">Tim pelayanan medis kami siap membantu memberikan informasi seputar jadwal dokter, ketersediaan kamar, dan tarif layanan.</p>
			
			<div class="contact-details-list">
				<div class="contact-detail-item">
					<div class="icon-circle"><MapPin size={20} /></div>
					<div>
						<h5>Alamat Klinik</h5>
						<p>Jl. Merdeka Raya No. 10, Kel. Mekarwangi, Kec. Sumur Bandung, Kota Bandung, Jawa Barat 40111</p>
					</div>
				</div>
				
				<div class="contact-detail-item">
					<div class="icon-circle"><Phone size={20} /></div>
					<div>
						<h5>Telepon / WhatsApp</h5>
						<p>+62 812-3456-7890 (Info & Booking)<br>+62 (022) 456-7890 (Layanan 24 Jam)</p>
					</div>
				</div>
				
				<div class="contact-detail-item">
					<div class="icon-circle"><Clock size={20} /></div>
					<div>
						<h5>Jam Kerja Klinik</h5>
						<p>Senin - Minggu: 08:00 - 21:00 WIB<br>Unit Darurat (UGD): Buka 24 Jam Non-stop</p>
					</div>
				</div>
			</div>
		</div>

		<div class="map-mockup-card card-premium">
			<div class="map-header">
				<MapPin size={18} class="text-primary" />
				<h5>Peta Lokasi Klinik Medika Utama</h5>
			</div>
			<!-- Elegant Mock Map -->
			<div class="mock-map">
				<div class="map-center-pin">
					<HeartPulse size={20} color="white" />
					<div class="sonar-wave"></div>
				</div>
				<div class="map-road-1"></div>
				<div class="map-road-2"></div>
				<div class="map-landmark green-zone">Taman Kota</div>
				<div class="map-landmark hotel">Medika Utama</div>
			</div>
			<div class="map-footer-note">
				<p>🚗 Tersedia area parkir luas untuk mobil dan sepeda motor. Akses ramah kursi roda di pintu masuk utama.</p>
			</div>
		</div>
	</div>
</section>

<!-- FOOTER -->
<footer class="main-footer-area">
	<div class="container footer-grid">
		<div class="footer-brand-column">
			<div class="logo-area">
				<div class="logo-icon bg-white">
					<HeartPulse size={20} class="text-teal" />
				</div>
				<div class="logo-text text-white">
					<span class="brand-name">Medika<span class="text-accent">Utama</span></span>
				</div>
			</div>
			<p class="footer-about">Medika Utama berkomitmen menyediakan layanan kesehatan paripurna dengan mengutamakan kenyamanan, profesionalitas medis, dan kemudahan akses digital.</p>
		</div>

		<div class="footer-links-column">
			<h4>Pintasan</h4>
			<a href="#layanan">Layanan Medis</a>
			<a href="#dokter">Tim Dokter</a>
			<a href="#booking">Pendaftaran Online</a>
			<a href="/dashboard">Portal Admin Klinik</a>
		</div>

		<div class="footer-links-column">
			<h4>Layanan Unggulan</h4>
			<a href="#booking">Spesialis Penyakit Dalam</a>
			<a href="#booking">Klinik Kesehatan Anak</a>
			<a href="#booking">Pemeriksaan Jantung</a>
			<a href="#booking">Kebidanan & Kehamilan</a>
		</div>

		<div class="footer-newsletter-column">
			<h4>Jam Operasional</h4>
			<p>Poli Spesialis: 08:00 - 21:00 WIB</p>
			<p>Instalasi Gawat Darurat: 24 Jam</p>
			<p>Laboratorium & Apotek: 08:00 - 22:00 WIB</p>
		</div>
	</div>
	<div class="footer-bottom">
		<div class="container bottom-row">
			<p>&copy; 2026 Medika Utama. Hak Cipta Dilindungi Undang-Undang.</p>
			<div class="bottom-links">
				<a href="#booking">Syarat & Ketentuan</a>
				<span>&bull;</span>
				<a href="#booking">Kebijakan Privasi</a>
			</div>
		</div>
	</div>
</footer>

<style>
	/* Landing Page Specific Styling */
	.text-primary { color: hsl(var(--primary)); }
	.text-success { color: hsl(var(--success)); }
	.text-danger { color: hsl(var(--danger)); }
	.text-teal { color: #0d9488; }
	.bg-white { background-color: #fff; }
	.text-white { color: #fff; }
	.text-accent { color: hsl(var(--accent)); }
	
	/* Main Header */
	.main-header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		box-shadow: var(--shadow-sm);
		transition: var(--transition-smooth);
	}
	.header-container {
		display: flex;
		justify-content: space-between;
		align-items: center;
		height: 4.5rem;
	}
	.logo-area {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.logo-icon {
		background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)));
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: var(--shadow-md);
	}
	.logo-icon.bg-white {
		background: #fff;
	}
	.logo-text {
		display: flex;
		flex-direction: column;
		line-height: 1.1;
	}
	.brand-name {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 1.25rem;
		letter-spacing: -0.5px;
	}
	.brand-accent {
		color: hsl(var(--primary));
	}
	.brand-sub {
		font-size: 0.7rem;
		color: hsl(var(--muted-foreground));
		font-weight: 500;
	}
	.nav-menu {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}
	.nav-link {
		font-weight: 600;
		font-size: 0.95rem;
		color: hsl(var(--muted-foreground));
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-sm);
	}
	.nav-link:hover {
		color: hsl(var(--foreground));
		background-color: hsl(var(--muted) / 0.4);
	}
	.booking-highlight {
		color: hsl(var(--primary));
	}
	.booking-highlight:hover {
		color: hsl(var(--primary-hover));
		background-color: hsl(var(--primary-light));
	}
	.dashboard-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: hsl(var(--primary) / 0.1);
		color: hsl(var(--primary));
		padding: 0.6rem 1.2rem;
		border-radius: var(--radius-md);
		font-weight: 700;
		font-size: 0.9rem;
		border: 1px solid hsl(var(--primary) / 0.2);
	}
	.dashboard-btn:hover {
		background: hsl(var(--primary));
		color: white;
		border-color: transparent;
	}

	/* Hero Section */
	.hero-section {
		padding: 8.5rem 0 4.5rem;
		background: radial-gradient(circle at top right, hsl(var(--primary-light) / 0.7), transparent 45%),
		            radial-gradient(circle at bottom left, hsl(var(--secondary)), transparent 35%);
		overflow: hidden;
	}
	.hero-grid {
		display: grid;
		grid-template-columns: 1.1fr 0.9fr;
		gap: 3.5rem;
		align-items: center;
	}
	.promo-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: white;
		border: 1px solid hsl(var(--border));
		padding: 0.4rem 1rem;
		border-radius: 9999px;
		margin-bottom: 1.5rem;
		box-shadow: var(--shadow-sm);
	}
	.badge-dot {
		width: 8px;
		height: 8px;
		background-color: hsl(var(--primary));
		border-radius: 50%;
		display: inline-block;
		animation: pulseGlow 1.5s infinite;
	}
	.badge-text {
		font-size: 0.8rem;
		font-weight: 700;
		color: hsl(var(--muted-foreground));
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	.hero-title {
		font-size: 3rem;
		font-weight: 800;
		letter-spacing: -1.5px;
		line-height: 1.15;
		margin-bottom: 1.25rem;
		background: linear-gradient(135deg, hsl(var(--foreground)), hsl(var(--primary)));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}
	.hero-description {
		font-size: 1.1rem;
		color: hsl(var(--muted-foreground));
		margin-bottom: 2.25rem;
		line-height: 1.7;
	}
	.hero-actions {
		display: flex;
		gap: 1rem;
		margin-bottom: 3.5rem;
	}
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border-radius: var(--radius-md);
		font-weight: 700;
		font-size: 0.95rem;
		transition: var(--transition-smooth);
	}
	.btn-lg {
		padding: 0.9rem 2rem;
		font-size: 1.05rem;
		border-radius: var(--radius-lg);
	}
	.btn-sm {
		padding: 0.45rem 1rem;
		font-size: 0.8rem;
		border-radius: var(--radius-sm);
	}
	.btn-primary {
		background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-hover)));
		color: white;
		box-shadow: 0 10px 20px -10px hsl(var(--primary) / 0.5);
	}
	.btn-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 15px 25px -10px hsl(var(--primary) / 0.6);
	}
	.btn-secondary {
		background-color: white;
		color: hsl(var(--foreground));
		border: 1px solid hsl(var(--border));
		box-shadow: var(--shadow-sm);
	}
	.btn-secondary:hover {
		background-color: hsl(var(--muted) / 0.4);
		transform: translateY(-2px);
	}
	.btn-outline {
		background-color: transparent;
		color: hsl(var(--primary));
		border: 1.5px solid hsl(var(--primary));
	}
	.btn-outline:hover {
		background-color: hsl(var(--primary-light));
		color: hsl(var(--primary-hover));
	}
	.btn-block {
		width: 100%;
	}
	.hero-stats {
		display: flex;
		align-items: center;
		gap: 2rem;
	}
	.stat-item {
		display: flex;
		flex-direction: column;
	}
	.stat-num {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 2.25rem;
		color: hsl(var(--primary));
		line-height: 1;
	}
	.stat-label {
		font-size: 0.85rem;
		color: hsl(var(--muted-foreground));
		font-weight: 600;
	}
	.stat-divider {
		width: 1px;
		height: 2.5rem;
		background-color: hsl(var(--border));
	}
	.hero-visual {
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.main-visual-card {
		background: rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.6);
		padding: 2.25rem;
		border-radius: var(--radius-xl);
		width: 100%;
		max-width: 420px;
		position: relative;
		z-index: 10;
		box-shadow: var(--shadow-lg);
	}
	.visual-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		border-bottom: 1px solid hsl(var(--border));
		padding-bottom: 1.5rem;
		margin-bottom: 1.5rem;
	}
	.pulse-icon {
		background-color: hsl(var(--primary-light));
		width: 3.25rem;
		height: 3.25rem;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.visual-header h4 {
		font-size: 1.05rem;
		font-weight: 700;
		color: hsl(var(--foreground));
	}
	.visual-header p {
		font-size: 0.75rem;
		color: hsl(var(--muted-foreground));
		font-weight: 600;
	}
	.visual-body {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1.75rem;
	}
	.schedule-quick-info, .location-quick-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.9rem;
		font-weight: 600;
		color: hsl(var(--muted-foreground));
	}
	.visual-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background-color: hsl(var(--muted) / 0.4);
		padding: 0.75rem 1.25rem;
		border-radius: var(--radius-md);
	}
	.avatar-group {
		display: flex;
		align-items: center;
		font-size: 1.2rem;
		letter-spacing: -5px;
	}
	.avatar-text {
		font-size: 0.8rem;
		font-weight: 700;
		color: hsl(var(--foreground));
	}
	.visual-decor-circle {
		position: absolute;
		top: -10%;
		right: -10%;
		width: 12rem;
		height: 12rem;
		border-radius: 50%;
		background: linear-gradient(135deg, hsl(var(--accent) / 0.1), transparent);
		z-index: 1;
	}
	.visual-decor-dots {
		position: absolute;
		bottom: -5%;
		left: -5%;
		width: 6rem;
		height: 6rem;
		background-image: radial-gradient(hsl(var(--primary) / 0.2) 2px, transparent 2px);
		background-size: 10px 10px;
		z-index: 1;
	}

	/* Benefits Strip */
	.benefits-strip {
		background-color: white;
		border-top: 1px solid hsl(var(--border) / 0.6);
		border-bottom: 1px solid hsl(var(--border) / 0.6);
		padding: 3rem 0;
	}
	.benefits-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 2rem;
	}
	.benefit-card {
		display: flex;
		gap: 1.25rem;
		align-items: flex-start;
	}
	.benefit-icon {
		background-color: hsl(var(--primary-light));
		color: hsl(var(--primary));
		width: 3rem;
		height: 3rem;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.benefit-info h5 {
		font-size: 1.05rem;
		font-weight: 700;
		margin-bottom: 0.35rem;
	}
	.benefit-info p {
		font-size: 0.85rem;
		color: hsl(var(--muted-foreground));
		line-height: 1.5;
	}

	/* Sections General */
	.services-section, .doctors-section, .testimonials-section, .booking-section, .contact-section {
		padding: 5.5rem 0;
	}
	.section-header {
		text-align: center;
		max-width: 650px;
		margin: 0 auto 4rem;
	}
	.section-tag {
		font-size: 0.8rem;
		font-weight: 800;
		text-transform: uppercase;
		color: hsl(var(--primary));
		letter-spacing: 1.5px;
		display: inline-block;
		margin-bottom: 0.75rem;
		background-color: hsl(var(--primary-light));
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
	}
	.section-title {
		font-size: 2.25rem;
		font-weight: 800;
		letter-spacing: -0.75px;
		margin-bottom: 1rem;
	}
	.section-subtitle {
		font-size: 1rem;
		color: hsl(var(--muted-foreground));
	}

	/* Services Grid */
	.services-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 2rem;
	}
	.service-card {
		padding: 2.25rem;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}
	.service-icon-wrapper {
		width: 3.5rem;
		height: 3.5rem;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1.5rem;
	}
	.service-icon-wrapper.p-dalam { background-color: #e0f2fe; color: #0369a1; }
	.service-icon-wrapper.p-anak { background-color: #fdf2f8; color: #be185d; }
	.service-icon-wrapper.p-jantung { background-color: #fee2e2; color: #b91c1c; }
	.service-icon-wrapper.p-kandungan { background-color: #faf5ff; color: #6b21a8; }
	.service-icon-wrapper.p-gigi { background-color: #f0fdf4; color: #15803d; }
	.service-icon-wrapper.p-umum { background-color: #ecfeff; color: #0891b2; }

	.service-card h3 {
		font-size: 1.25rem;
		font-weight: 700;
		margin-bottom: 0.75rem;
	}
	.service-card p {
		font-size: 0.9rem;
		color: hsl(var(--muted-foreground));
		line-height: 1.6;
		margin-bottom: 1.5rem;
		flex-grow: 1;
	}
	.service-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 700;
		font-size: 0.85rem;
		color: hsl(var(--primary));
	}
	.service-link:hover {
		color: hsl(var(--primary-hover));
	}

	/* Doctors Section */
	.doctors-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 1.25rem;
	}
	.doctor-card {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		background-color: white;
	}
	.doctor-avatar-box {
		background-color: hsl(var(--muted) / 0.5);
		border-radius: var(--radius-md);
		height: 10rem;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		margin-bottom: 1rem;
		overflow: hidden;
	}
	.doctor-emoji {
		font-size: 4rem;
	}
	.doctor-badge {
		position: absolute;
		top: 8px;
		right: 8px;
		font-size: 0.65rem;
		font-weight: 800;
		padding: 0.2rem 0.5rem;
		border-radius: var(--radius-sm);
		text-transform: uppercase;
	}
	.badge-active { background-color: #dcfce7; color: #166534; }
	.badge-inactive { background-color: #fee2e2; color: #991b1b; }
	.doctor-info h4 {
		font-size: 1rem;
		font-weight: 700;
		margin-bottom: 0.15rem;
	}
	.doc-spec {
		font-size: 0.75rem;
		color: hsl(var(--primary));
		font-weight: 700;
		margin-bottom: 0.75rem;
	}
	.doc-schedule-strip {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.7rem;
		color: hsl(var(--muted-foreground));
		font-weight: 600;
		margin-bottom: 1rem;
	}
	.doctor-card-footer {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
		margin-top: auto;
	}

	/* Modal Styling */
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(15, 23, 42, 0.4);
		backdrop-filter: blur(4px);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
	}
	.modal-content {
		background-color: white;
		border-radius: var(--radius-xl);
		max-width: 550px;
		width: 100%;
		box-shadow: var(--shadow-lg);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid hsl(var(--border));
	}
	.close-modal-btn {
		font-size: 1.75rem;
		color: hsl(var(--muted-foreground));
	}
	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
		max-height: 70vh;
	}
	.doctor-profile-modal {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		align-items: center;
		text-align: center;
	}
	.profile-emoji {
		font-size: 5rem;
		display: block;
		margin-bottom: 0.5rem;
	}
	.profile-badge {
		background-color: hsl(var(--primary-light));
		color: hsl(var(--primary));
		font-size: 0.85rem;
		font-weight: 700;
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		margin-top: 0.5rem;
		display: inline-block;
	}
	.profile-details-area {
		width: 100%;
		text-align: left;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.detail-group label {
		font-size: 0.75rem;
		color: hsl(var(--muted-foreground));
		font-weight: 700;
		text-transform: uppercase;
		display: block;
		margin-bottom: 0.25rem;
	}
	.detail-group p {
		font-size: 0.95rem;
		font-weight: 600;
		color: hsl(var(--foreground));
	}
	.detail-group p.highlight-schedule {
		background-color: hsl(var(--muted));
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-sm);
	}
	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid hsl(var(--border));
		background-color: hsl(var(--muted) / 0.3);
	}

	/* Testimonials */
	.testimonials-section {
		background-color: hsl(var(--muted) / 0.4);
	}
	.testimonials-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 2rem;
	}
	.testimonial-card {
		background-color: white;
		padding: 2.25rem;
		display: flex;
		flex-direction: column;
	}
	.stars-row {
		margin-bottom: 1rem;
		font-size: 1.1rem;
	}
	.testi-text {
		font-size: 0.92rem;
		color: hsl(var(--muted-foreground));
		line-height: 1.6;
		font-style: italic;
		margin-bottom: 1.75rem;
		flex-grow: 1;
	}
	.testi-user {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}
	.user-avatar {
		width: 2.5rem;
		height: 2.5rem;
		background-color: hsl(var(--secondary));
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
	}
	.testi-user h5 {
		font-size: 0.92rem;
		font-weight: 700;
		line-height: 1.2;
	}
	.testi-user p {
		font-size: 0.75rem;
		color: hsl(var(--primary));
		font-weight: 700;
	}

	/* Booking Section */
	.booking-box {
		background-color: white;
		box-shadow: 0 30px 60px -20px rgba(13, 148, 136, 0.12);
		border-radius: var(--radius-xl);
		overflow: hidden;
	}
	.booking-grid {
		display: grid;
		grid-template-columns: 1.2fr 0.8fr;
	}
	.booking-form-area {
		padding: 3.5rem;
		border-right: 1px solid hsl(var(--border) / 0.6);
	}
	.booking-info-sidebar {
		padding: 3.5rem;
		background-color: hsl(var(--secondary) / 0.5);
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}
	.booking-header {
		margin-bottom: 1.25rem;
	}
	.booking-eyebrow, .sidebar-eyebrow {
		display: inline-block;
		margin-bottom: 0.5rem;
		color: hsl(var(--primary));
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	.icon-title {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}
	.icon-title h2 {
		font-size: 1.75rem;
		font-weight: 800;
		letter-spacing: -0.5px;
	}
	.booking-header p {
		font-size: 0.9rem;
		color: hsl(var(--muted-foreground));
	}
	.booking-steps {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
		list-style: none;
		margin: 0 0 1.5rem;
		padding: 0;
	}
	.booking-steps li {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: hsl(var(--muted-foreground));
		font-size: 0.72rem;
		font-weight: 700;
	}
	.booking-steps span {
		display: grid;
		width: 1.35rem;
		height: 1.35rem;
		place-items: center;
		border-radius: 50%;
		background: hsl(var(--muted));
		font-size: 0.68rem;
	}
	.booking-steps .is-current { color: hsl(var(--primary)); }
	.booking-steps .is-current span { background: hsl(var(--primary)); color: white; }
	.patient-type-selector {
		display: flex;
		background-color: hsl(var(--muted));
		padding: 0.35rem;
		border-radius: var(--radius-md);
		margin-bottom: 1.5rem;
	}
	.selector-btn {
		flex: 1;
		padding: 0.6rem;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		font-weight: 700;
		text-align: center;
		color: hsl(var(--muted-foreground));
	}
	.selector-btn.active {
		background-color: white;
		color: hsl(var(--primary));
		box-shadow: var(--shadow-sm);
	}
	
	/* Lookup Box */
	.lookup-box {
		background-color: hsl(var(--primary-light));
		border: 1px solid hsl(var(--primary) / 0.15);
		padding: 1.25rem;
		border-radius: var(--radius-md);
		margin-bottom: 1.5rem;
	}
	.lookup-box label {
		font-size: 0.85rem;
		font-weight: 700;
		color: hsl(var(--primary-hover));
		display: block;
		margin-bottom: 0.5rem;
	}
	.search-input-group {
		display: flex;
		gap: 0.5rem;
	}
	.search-input-group input {
		flex: 1;
		padding: 0.5rem 1rem;
		border-radius: var(--radius-sm);
		border: 1px solid hsl(var(--primary) / 0.2);
		background-color: white;
	}
	.btn-search {
		padding: 0.5rem 1.25rem;
		border-radius: var(--radius-sm);
	}
	.lookup-err, .lookup-ok {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.75rem;
		font-weight: 700;
		margin-top: 0.5rem;
	}
	.lookup-err { color: hsl(var(--danger)); }
	.lookup-ok { color: hsl(var(--success)); }

	/* Form Styling */
	.actual-booking-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.booking-form-card {
		padding: 1.25rem;
		border: 1px solid hsl(var(--border) / 0.8);
		border-radius: var(--radius-md);
		background: linear-gradient(135deg, hsl(var(--secondary) / 0.45), white 45%);
	}
	.booking-form-card > * + * { margin-top: 1rem; }
	.form-section-heading {
		display: flex;
		align-items: flex-start;
		gap: 0.7rem;
	}
	.form-section-icon {
		display: grid;
		width: 2rem;
		height: 2rem;
		place-items: center;
		flex: 0 0 auto;
		border-radius: var(--radius-sm);
		background: hsl(var(--primary-light));
		color: hsl(var(--primary));
	}
	.form-section-heading h3 {
		font-size: 0.95rem;
		font-weight: 800;
	}
	.form-section-heading p {
		margin-top: 0.1rem;
		color: hsl(var(--muted-foreground));
		font-size: 0.75rem;
	}
	.form-grid-2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	.form-grid-3 {
		display: grid;
		grid-template-columns: 1fr 1fr 1.2fr;
		gap: 1rem;
	}
	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.form-group label {
		font-size: 0.8rem;
		font-weight: 700;
		color: hsl(var(--foreground));
	}
	.form-group input, .form-group select, .form-group textarea {
		padding: 0.65rem 1rem;
		border-radius: var(--radius-sm);
		border: 1.5px solid hsl(var(--border));
		background-color: white;
		transition: var(--transition-fast);
	}
	.form-group input:focus, .form-group select:focus, .form-group textarea:focus {
		border-color: hsl(var(--primary));
		outline: none;
		box-shadow: 0 0 0 3px hsl(var(--primary-light));
	}
	.selection-hint {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin-top: 0.45rem;
		color: hsl(var(--success));
		font-size: 0.72rem;
		font-weight: 700;
	}
	.booking-submit { margin-top: 0.35rem; }
	.booking-submit:disabled { opacity: 0.7; cursor: not-allowed; }
	.booking-err {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.85rem;
		font-weight: 700;
		color: hsl(var(--danger));
		margin-top: 0.5rem;
		padding: 0.75rem 1rem;
		border-radius: var(--radius-sm);
		background-color: #fee2e2;
		border: 1px solid hsl(var(--danger) / 0.2);
	}
	
	/* Booking Sidebar */
	.booking-info-sidebar h3 {
		font-size: 1.25rem;
		font-weight: 800;
		border-bottom: 1.5px solid hsl(var(--border));
		padding-bottom: 0.5rem;
	}
	.booking-guide {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.booking-guide > div {
		display: flex;
		align-items: flex-start;
		gap: 0.7rem;
	}
	.booking-guide span {
		display: grid;
		width: 1.5rem;
		height: 1.5rem;
		place-items: center;
		flex: 0 0 auto;
		border-radius: 50%;
		background: hsl(var(--primary));
		color: white;
		font-size: 0.7rem;
		font-weight: 800;
	}
	.booking-guide p {
		color: hsl(var(--muted-foreground));
		font-size: 0.75rem;
		line-height: 1.45;
	}
	.booking-guide strong {
		display: block;
		color: hsl(var(--foreground));
		font-size: 0.8rem;
	}
	.sidebar-schedule-wrap h4 {
		margin-bottom: 0.75rem;
		font-size: 0.8rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: hsl(var(--muted-foreground));
	}
	.sidebar-schedule-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.sidebar-doc-item {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		background-color: white;
		padding: 0.75rem 1rem;
		border-radius: var(--radius-md);
		border: 1px solid hsl(var(--border) / 0.5);
	}
	.doc-emoji-small {
		font-size: 1.75rem;
	}
	.doc-desc h5 {
		font-size: 0.85rem;
		font-weight: 700;
		line-height: 1.2;
	}
	.doc-desc p {
		font-size: 0.7rem;
		color: hsl(var(--primary));
		font-weight: 700;
	}
	.time-label {
		font-size: 0.65rem;
		color: hsl(var(--muted-foreground));
		font-weight: 600;
	}
	.sidebar-alert-card {
		background-color: hsl(var(--primary-light));
		border: 1px solid hsl(var(--primary) / 0.15);
		padding: 1.25rem;
		border-radius: var(--radius-lg);
		display: flex;
		gap: 0.85rem;
		align-items: flex-start;
	}
	.sidebar-alert-card h5 {
		font-size: 0.85rem;
		font-weight: 800;
		color: hsl(var(--primary-hover));
		margin-bottom: 0.25rem;
	}
	.sidebar-alert-card p {
		font-size: 0.75rem;
		color: hsl(var(--muted-foreground));
		line-height: 1.4;
	}

	/* Success State & Ticket */
	.booking-success-container {
		padding: 4rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}
	.success-alert-header {
		margin-bottom: 2.5rem;
	}
	.check-success-badge {
		background-color: hsl(var(--success));
		width: 5rem;
		height: 5rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 1.5rem;
		box-shadow: 0 10px 25px -5px rgba(22, 101, 52, 0.4);
	}
	.success-alert-header h2 {
		font-size: 2rem;
		font-weight: 800;
		color: hsl(var(--foreground));
	}
	.success-alert-header p {
		font-size: 0.95rem;
		color: hsl(var(--muted-foreground));
		margin-top: 0.25rem;
	}
	.ticket-wrapper {
		width: 100%;
		max-width: 380px;
		margin-bottom: 3rem;
	}
	.ticket-card {
		background: white;
		border: 1px solid hsl(var(--border));
		border-radius: var(--radius-xl);
		overflow: hidden;
		box-shadow: var(--shadow-lg);
	}
	.ticket-header {
		background-color: hsl(var(--foreground));
		color: white;
		padding: 1.25rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.ticket-brand {
		font-weight: 800;
		font-size: 0.9rem;
		letter-spacing: 0.5px;
	}
	.ticket-tag {
		font-size: 0.65rem;
		font-weight: 700;
		background-color: hsl(var(--primary));
		padding: 0.2rem 0.5rem;
		border-radius: var(--radius-sm);
	}
	.ticket-body {
		padding: 2rem 1.5rem;
	}
	.queue-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 1.5rem;
	}
	.queue-label {
		font-size: 0.75rem;
		font-weight: 800;
		color: hsl(var(--muted-foreground));
		letter-spacing: 1px;
	}
	.queue-number {
		font-size: 4rem;
		font-weight: 900;
		color: hsl(var(--foreground));
		line-height: 1.1;
		margin: 0.25rem 0;
		letter-spacing: 1px;
	}
	.queue-time-slot {
		font-size: 0.8rem;
		font-weight: 700;
		color: hsl(var(--primary));
	}
	.ticket-divider {
		display: flex;
		align-items: center;
		margin: 1.5rem 0;
		position: relative;
	}
	.circle-notch {
		background-color: hsl(var(--card));
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		border: 1.5px solid hsl(var(--border));
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		z-index: 2;
	}
	.circle-notch.left { left: -2.25rem; }
	.circle-notch.right { right: -2.25rem; }
	.dash-line {
		width: 100%;
		height: 1px;
		border-bottom: 1.5px dashed hsl(var(--border));
	}
	.ticket-details {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		text-align: left;
		margin-bottom: 1.75rem;
	}
	.detail-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.8rem;
		border-bottom: 1px solid hsl(var(--muted));
		padding-bottom: 0.4rem;
	}
	.detail-row .lbl {
		color: hsl(var(--muted-foreground));
		font-weight: 600;
	}
	.detail-row .val {
		font-weight: 700;
		color: hsl(var(--foreground));
	}
	.ticket-barcode-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}
	.simulated-barcode {
		height: 2.5rem;
		width: 80%;
		background: repeating-linear-gradient(90deg, #000, #000 1px, transparent 1px, transparent 4px, #000 4px, #000 6px, transparent 6px, transparent 8px);
	}
	.barcode-text {
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 2px;
		color: hsl(var(--muted-foreground));
	}
	.ticket-footer {
		background-color: hsl(var(--secondary) / 0.7);
		border-top: 1px solid hsl(var(--border) / 0.6);
		padding: 1rem;
		font-size: 0.7rem;
		color: hsl(var(--muted-foreground));
		font-weight: 600;
		line-height: 1.3;
	}
	.footer-small {
		font-size: 0.6rem;
		color: hsl(var(--muted-foreground) / 0.7);
		margin-top: 0.25rem;
	}
	.success-actions {
		display: flex;
		gap: 1rem;
	}

	/* Contact & Map Mockup */
	.contact-section {
		background-color: white;
		border-top: 1px solid hsl(var(--border) / 0.6);
	}
	.contact-grid {
		display: grid;
		grid-template-columns: 1.1fr 0.9fr;
		gap: 3.5rem;
		align-items: center;
	}
	.contact-desc {
		color: hsl(var(--muted-foreground));
		font-size: 1rem;
		margin-bottom: 2rem;
	}
	.contact-details-list {
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
	}
	.contact-detail-item {
		display: flex;
		gap: 1.25rem;
		align-items: flex-start;
	}
	.icon-circle {
		background-color: hsl(var(--primary-light));
		color: hsl(var(--primary));
		width: 3.25rem;
		height: 3.25rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.contact-detail-item h5 {
		font-size: 1.05rem;
		font-weight: 700;
		margin-bottom: 0.25rem;
	}
	.contact-detail-item p {
		font-size: 0.85rem;
		color: hsl(var(--muted-foreground));
		line-height: 1.5;
	}

	/* Map Mockup */
	.map-mockup-card {
		background-color: white;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
	.map-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid hsl(var(--border) / 0.6);
	}
	.map-header h5 {
		font-size: 0.85rem;
		font-weight: 700;
	}
	.mock-map {
		background-color: #f1f5f9;
		height: 16rem;
		position: relative;
		overflow: hidden;
	}
	.map-road-1 {
		position: absolute;
		top: 50%;
		left: 0;
		width: 100%;
		height: 2rem;
		background-color: #cbd5e1;
		transform: translateY(-50%) rotate(-10deg);
	}
	.map-road-2 {
		position: absolute;
		top: 0;
		left: 45%;
		width: 2rem;
		height: 100%;
		background-color: #cbd5e1;
	}
	.map-landmark {
		position: absolute;
		padding: 0.35rem 0.75rem;
		font-size: 0.65rem;
		font-weight: 800;
		border-radius: var(--radius-sm);
	}
	.green-zone { background-color: #dcfce7; color: #166534; top: 15%; left: 10%; }
	.hotel { background-color: #e0f2fe; color: #0369a1; bottom: 15%; right: 10%; }
	.map-center-pin {
		position: absolute;
		top: 42%;
		left: 42%;
		z-index: 5;
		background-color: hsl(var(--primary));
		width: 2.75rem;
		height: 2.75rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 10px rgba(0,0,0,0.15);
	}
	.sonar-wave {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: hsl(var(--primary));
		border-radius: 50%;
		opacity: 0.4;
		animation: pulseGlow 2s infinite ease-out;
		z-index: -1;
	}
	.map-footer-note {
		padding: 1rem 1.25rem;
		background-color: hsl(var(--secondary) / 0.5);
		font-size: 0.75rem;
		color: hsl(var(--muted-foreground));
		font-weight: 600;
	}

	/* Footer Area */
	.main-footer-area {
		background-color: #0f172a;
		color: #94a3b8;
		padding: 4.5rem 0 0;
		border-top: 1px solid rgba(255,255,255,0.05);
	}
	.footer-grid {
		display: grid;
		grid-template-columns: 1.5fr 1fr 1fr 1.2fr;
		gap: 3rem;
		margin-bottom: 4rem;
	}
	.footer-brand-column {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	.footer-about {
		font-size: 0.85rem;
		line-height: 1.6;
		color: #94a3b8;
	}
	.footer-links-column {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.footer-links-column h4, .footer-newsletter-column h4 {
		color: white;
		font-size: 0.95rem;
		font-weight: 800;
		margin-bottom: 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	.footer-links-column a {
		font-size: 0.85rem;
		color: #94a3b8;
	}
	.footer-links-column a:hover {
		color: white;
		transform: translateX(3px);
	}
	.footer-newsletter-column {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.footer-newsletter-column p {
		font-size: 0.85rem;
		border-bottom: 1px solid rgba(255,255,255,0.05);
		padding-bottom: 0.4rem;
	}
	.footer-bottom {
		border-top: 1px solid rgba(255,255,255,0.05);
		padding: 1.5rem 0;
	}
	.bottom-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.75rem;
	}
	.bottom-links {
		display: flex;
		gap: 0.5rem;
	}
	.bottom-links a:hover {
		color: white;
	}

	/* Responsive Adaptations */
	@media (max-width: 1024px) {
		.hero-grid, .booking-grid, .contact-grid {
			grid-template-columns: 1fr;
			gap: 2.5rem;
		}
		.hero-visual {
			order: -1;
		}
		.services-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		.doctors-grid {
			grid-template-columns: repeat(3, 1fr);
		}
		.testimonials-grid {
			grid-template-columns: 1fr;
		}
		.footer-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (max-width: 768px) {
		.services-grid, .doctors-grid, .footer-grid {
			grid-template-columns: 1fr;
		}
		.hero-title {
			font-size: 2.25rem;
		}
		.benefits-grid {
			grid-template-columns: 1fr;
		}
		.booking-form-area, .booking-info-sidebar {
			padding: 1.5rem;
		}
		.booking-grid {
			grid-template-columns: 1fr;
		}
		.booking-form-area {
			border-right: none;
			border-bottom: 1px solid hsl(var(--border) / 0.6);
		}
		.form-grid-2, .form-grid-3 {
			grid-template-columns: 1fr;
		}
		.booking-steps { gap: 0.25rem; }
		.booking-steps li { font-size: 0.65rem; }
		.booking-form-card { padding: 1rem; }
		.nav-menu {
			display: none; /* Mobile menu collapsed for simplicity, accessible via CTAs */
		}
		.bottom-row {
			flex-direction: column;
			gap: 0.75rem;
			text-align: center;
		}
	}
</style>
