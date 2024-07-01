import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

type Rows<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Row'];

export type User = Rows<'user'>;
export type Challenges = Rows<'challenges'>;
export type Team = Rows<'team'>;

export const supabase = createClient<Database>(
	process.env.EXPO_PUBLIC_DB_URL!,
	process.env.EXPO_PUBLIC_DB_PUBLIC_KEY!,
	{
		auth: {
			storage: AsyncStorage,
			autoRefreshToken: true,
			persistSession: true,
			detectSessionInUrl: false,
		},
	}
);
