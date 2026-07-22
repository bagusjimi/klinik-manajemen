<script lang="ts">
	import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-svelte';
	import { getToasts, removeToast } from './toast-store';

	const iconMap = {
		success: CheckCircle2,
		error: XCircle,
		warning: AlertTriangle,
		info: Info
	};

	const colorMap = {
		success: { bg: '#ecfdf5', border: '#10b981', text: '#065f46', icon: '#10b981' },
		error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', icon: '#ef4444' },
		warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e', icon: '#f59e0b' },
		info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', icon: '#3b82f6' }
	};
</script>

<div class="toast-container" aria-live="polite">
	{#each getToasts() as t (t.id)}
		<div
			class="toast-item toast-{t.type}"
			style="background: {colorMap[t.type].bg}; border-color: {colorMap[t.type].border}; color: {colorMap[t.type].text};"
			role="alert"
		>
			{@const Icon = iconMap[t.type]}
			<Icon size={18} style="color: {colorMap[t.type].icon}; flex-shrink: 0;" />
			<span class="toast-message">{t.message}</span>
			<button class="toast-close" onclick={() => removeToast(t.id)} aria-label="Tutup">
				<X size={14} />
			</button>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 9999;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 400px;
		width: 100%;
		pointer-events: none;
	}

	.toast-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		border-radius: 0.75rem;
		border: 1px solid;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
		pointer-events: auto;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.toast-message {
		flex: 1;
		line-height: 1.4;
	}

	.toast-close {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 0.375rem;
		border: none;
		background: rgba(0, 0, 0, 0.06);
		cursor: pointer;
		transition: background 0.15s;
		color: inherit;
		opacity: 0.6;
	}

	.toast-close:hover {
		background: rgba(0, 0, 0, 0.12);
		opacity: 1;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(100%);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	@media (max-width: 480px) {
		.toast-container {
			left: 1rem;
			right: 1rem;
			max-width: none;
		}
	}
</style>
