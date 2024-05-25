import type { APIRoute } from 'astro';
import { supabase } from '$lib/db';
import { isAdmin } from '$lib/utils';

export const POST: APIRoute = async ({ redirect, request }) => {
	const formData = await request.formData();
	const id = formData.get('id');
	const name = formData.get('name');
	const coins = formData.get('coins');
	const role = formData.get('role')?.toString();

	const referer = request.headers.get('referer')
		? new URL(request.headers.get('referer')!).pathname
		: '/dashboard';

	if (!id || (!name && !coins && !role)) {
		return redirect(referer);
	}

	if (!(await isAdmin())) {
		return redirect(referer);
	}

	const updated = removeEmpty({
		name: name ? name.toString() : null,
		coins: coins ? +coins || null : null,
		role: (role || null) as 'runner' | 'chaser' | null,
	});

	if (updated['role'] === 'none') {
		updated['role'] = null;
	}

	const { error } = await supabase
		.from('team')
		.update(updated)
		.eq('id', id.toString());

	console.log({ error });

	return redirect(referer);
};

function removeEmpty<T extends object>(obj: T) {
	return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== null));
}
