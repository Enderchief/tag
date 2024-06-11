import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types';

export const supabase = createClient<Database>(
	import.meta.env.PUBLIC_DB_URL,
	import.meta.env.PUBLIC_DB_PUBLIC_KEY,
	{
		auth: {
			flowType: 'pkce',
		},
	}
);
