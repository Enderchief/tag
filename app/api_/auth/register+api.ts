import { supabase } from '@/lib/db';
import { redirect } from '@/lib/utils';

export const POST = async (request: Request): Promise<Response> => {
	const url = new URL(request.url);
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
