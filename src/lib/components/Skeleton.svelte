<script lang="ts">
	let {
		lines = 3,
		variant = 'default' as 'default' | 'table' | 'cards'
	}: {
		lines?: number;
		variant?: 'default' | 'table' | 'cards';
	} = $props();
</script>

{#if variant === 'table'}
	<div class="skeleton-table">
		{#each Array(5) as _}
			<div class="skeleton-row">
				<div class="skeleton-cell skeleton-cell-sm"></div>
				<div class="skeleton-cell skeleton-cell-md"></div>
				<div class="skeleton-cell skeleton-cell-lg"></div>
				<div class="skeleton-cell skeleton-cell-sm"></div>
			</div>
		{/each}
	</div>
{:else if variant === 'cards'}
	<div class="skeleton-cards">
		{#each Array(4) as _}
			<div class="skeleton-card">
				<div class="skeleton-circle"></div>
				<div class="skeleton-line skeleton-line-lg"></div>
				<div class="skeleton-line skeleton-line-md"></div>
			</div>
		{/each}
	</div>
{:else}
	<div class="skeleton-default">
		{#each Array(lines) as _, i}
			<div class="skeleton-line" style="width: {i === lines - 1 ? '60%' : '100%'}"></div>
		{/each}
	</div>
{/if}

<style>
	.skeleton-table,
	.skeleton-cards,
	.skeleton-default {
		animation: pulse 1.5s ease-in-out infinite;
	}

	.skeleton-row {
		display: flex;
		gap: 1rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid #f1f5f9;
	}

	.skeleton-cell {
		height: 1rem;
		border-radius: 0.375rem;
		background: #e2e8f0;
	}

	.skeleton-cell-sm { width: 80px; }
	.skeleton-cell-md { flex: 1; }
	.skeleton-cell-lg { flex: 2; }

	.skeleton-cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
	}

	.skeleton-card {
		padding: 1.25rem;
		border-radius: 0.75rem;
		background: white;
		border: 1px solid #f1f5f9;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.skeleton-circle {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: #e2e8f0;
	}

	.skeleton-line {
		height: 0.875rem;
		border-radius: 0.375rem;
		background: #e2e8f0;
	}

	.skeleton-line-lg { width: 80%; }
	.skeleton-line-md { width: 60%; }

	.skeleton-default {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
</style>
