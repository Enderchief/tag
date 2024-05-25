import { supabase } from './db';

export async function isAdmin(): Promise<boolean> {
	const {
		data: { session },
		error: err,
	} = await supabase.auth.getSession();

	if (err || !session) {
		return false;
	}

	const { error: errorAdmin, data: admins } = await supabase
		.from('user')
		.select('admin')
		.eq('id', session.user.id);

	if (errorAdmin || !admins || !admins[0]?.admin) {
		console.log(errorAdmin);
		return false;
	}
	return true;
}
