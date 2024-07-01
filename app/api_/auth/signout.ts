import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ cookies, redirect, url }) => {
	cookies.delete('sb-access-token', { path: '/' });
	cookies.delete('sb-refresh-token', { path: '/' });
	return redirect('/' + url.search);
};
