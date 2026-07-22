export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
	duration: number;
}

let toasts = $state<Toast[]>([]);

let nextId = 0;

export function getToasts() {
	return toasts;
}

export function showToast(message: string, type: ToastType = 'info', duration = 3000) {
	const id = `toast-${nextId++}`;
	const toast: Toast = { id, message, type, duration };
	toasts = [...toasts, toast];

	if (duration > 0) {
		setTimeout(() => removeToast(id), duration);
	}

	return id;
}

export function removeToast(id: string) {
	toasts = toasts.filter(t => t.id !== id);
}

export const toast = {
	success: (msg: string, duration?: number) => showToast(msg, 'success', duration),
	error: (msg: string, duration?: number) => showToast(msg, 'error', duration),
	warning: (msg: string, duration?: number) => showToast(msg, 'warning', duration),
	info: (msg: string, duration?: number) => showToast(msg, 'info', duration)
};
