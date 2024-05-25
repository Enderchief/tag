import type { APIRoute } from 'astro';
import { supabase } from '$lib/db';
import { isAdmin } from '$lib/utils';

export const POST: APIRoute = async ({ redirect, request }) => {
	const formData = await request.formData();
	const name = formData.get('name');
	const coins = formData.get('coins');
	const members = formData.getAll('members');

	const referer = request.headers.get('referer')
		? new URL(request.headers.get('referer')!).pathname
		: '/dashboard';

	if (!name || !coins || !members) {
		return redirect(referer);
	}

	if (!(await isAdmin())) {
		return redirect(referer);
	}

	const { error, data } = await supabase
		.from('team')
		.insert({
			name: name.toString(),
			challenges_completed: [],
			coins: +coins.toString() || 20,
		})
		.select('id');

	if (error || !data || !data.length) return redirect(referer);

	for (const member of members) {
		const { error } = await supabase
			.from('user')
			.update({ team: data[0]!.id })
			.eq('id', member.toString());
		if (error) {
			console.log(error);
			return redirect(referer);
		}
	}

	return redirect(referer);
};
