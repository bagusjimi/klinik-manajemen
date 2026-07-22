<script lang="ts">
	import { AlertTriangle } from 'lucide-svelte';

	let {
		open = false,
		title = 'Konfirmasi',
		message = 'Apakah Anda yakin?',
		confirmText = 'Ya',
		cancelText = 'Batal',
		type = 'default' as 'default' | 'danger',
		onconfirm = () => {},
		oncancel = () => {}
	}: {
		open: boolean;
		title?: string;
		message?: string;
		confirmText?: string;
		cancelText?: string;
		type?: 'default' | 'danger';
		onconfirm?: () => void;
		oncancel?: () => void;
	} = $props();

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) oncancel();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') oncancel();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div class="confirm-backdrop" onclick={handleBackdropClick} onkeydown={handleKeydown}>
		<div class="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
			<div class="confirm-icon">
				<AlertTriangle size={28} />
			</div>
			<h3 id="confirm-title" class="confirm-title">{title}</h3>
			<p class="confirm-message">{message}</p>
			<div class="confirm-actions">
				<button class="btn-cancel" onclick={oncancel}>{cancelText}</button>
				<button class="btn-confirm {type === 'danger' ? 'btn-danger' : 'btn-primary-confirm'}" onclick={onconfirm}>
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.confirm-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.5);
		backdrop-filter: blur(4px);
		z-index: 10000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		animation: fadeIn 0.15s ease;
	}

	.confirm-dialog {
		background: white;
		border-radius: 1.25rem;
		max-width: 400px;
		width: 100%;
		padding: 2rem;
		text-align: center;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
		animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.confirm-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: #fef3c7;
		color: #d97706;
		margin-bottom: 1rem;
	}

	.confirm-title {
		font-size: 1.125rem;
		font-weight: 700;
		color: #0f172a;
		margin-bottom: 0.5rem;
	}

	.confirm-message {
		font-size: 0.875rem;
		color: #64748b;
		line-height: 1.5;
		margin-bottom: 1.5rem;
	}

	.confirm-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
	}

	.btn-cancel,
	.btn-confirm {
		padding: 0.625rem 1.5rem;
		border-radius: 0.75rem;
		font-size: 0.875rem;
		font-weight: 600;
		border: none;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-cancel {
		background: #f1f5f9;
		color: #475569;
	}

	.btn-cancel:hover {
		background: #e2e8f0;
	}

	.btn-primary-confirm {
		background: #0d9488;
		color: white;
	}

	.btn-primary-confirm:hover {
		background: #0f766e;
	}

	.btn-danger {
		background: #ef4444;
		color: white;
	}

	.btn-danger:hover {
		background: #dc2626;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes scaleUp {
		from { transform: scale(0.9); opacity: 0; }
		to { transform: scale(1); opacity: 1; }
	}
</style>
