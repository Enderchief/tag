import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/db.ts';

export const POST: APIRoute = async ({ redirect, url }) => {
	const redir = `${url.origin}/api/auth/callback`;

	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: 'discord',
		options: {
			redirectTo: redir,
		},
	});

	if (error) {
		return new Response(error.message, { status: 500 });
	}

	return redirect(data.url);
};
