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

export function formatTime(s: number) {
	const minutes = Math.floor(s / 60);
	const seconds = s - minutes * 60;
	return `${minutes.toString().padStart(2, '0')}:${seconds
		.toString()
		.padStart(2, '0')}`;
}
