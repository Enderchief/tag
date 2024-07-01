import { supabase } from '@/lib/db';
import { isAdmin, redirect } from '@/lib/utils';

export const POST = async (request: Request): Promise<Response> => {
	const formData = await request.formData();
	const id = formData.get('id');
	const name = formData.get('name');
	const team = formData.get('team')?.toString();

	const referer = request.headers.get('referer')
		? new URL(request.headers.get('referer')!).pathname
		: '/dashboard';

	if (!id || !name || !team) {
		return redirect(referer);
	}

	if (!(await isAdmin())) {
		return redirect(referer);
	}

	await supabase
		.from('user')
		.update({ name: name.toString(), team: team === '0' ? null : +team })
		.eq('id', id.toString());

	return redirect(referer);
};
