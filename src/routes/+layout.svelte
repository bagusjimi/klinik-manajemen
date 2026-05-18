<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import './app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Medika Utama - Sistem Manajemen Klinik & Janji Temu Online</title>
</svelte:head>

{@render children()}
