import '../global.css';

import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/db';
import Dashboard from './views/dashboard';

WebBrowser.maybeCompleteAuthSession(); // required for web only
const redirectTo = makeRedirectUri();

const createSessionFromUrl = async (url: string) => {
	const { params, errorCode } = QueryParams.getQueryParams(url);

	if (errorCode) throw new Error(errorCode);
	const { access_token, refresh_token } = params;

	if (!access_token) return;

	const { data, error } = await supabase.auth.setSession({
		access_token,
		refresh_token,
	});
	if (error) throw error;
	return data.session;
};

const performOAuth = async () => {
	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: 'discord',
		options: {
			redirectTo,
			skipBrowserRedirect: true,
		},
	});
	if (error) throw error;

	const res = await WebBrowser.openAuthSessionAsync(
		data?.url ?? '',
		redirectTo
	);

	if (res.type === 'success') {
		const { url } = res;
		await createSessionFromUrl(url);
	}
};

export default function Index() {
	const [session, setSession] = useState<Session | null>(null);

	const url = Linking.useURL();
	if (url) createSessionFromUrl(url).then((s) => s && setSession(s));

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
		});

		supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
		});
	}, []);
	return (
		<View className='h-full mt-20 w-full'>
			{session && session.user ? (
				<Dashboard key={session.user.id} session={session} />
			) : (
				<Login />
			)}
		</View>
	);
}

function Login() {
	async function signUp() {
		console.log('signup');
		await performOAuth();
	}

	return (
		<View className='m-auto max-w-md h-[70%] flex justify-center items-center flex-col gap-6'>
			<Text className='text-3xl'>Welcome to Tag</Text>
			<Pressable className='rounded-md p-2 bg-[#5865F2] h-fit' onPress={signUp}>
				<Text className='text-lg text-white font-semibold'>
					Sign Up with Discord
				</Text>
			</Pressable>
		</View>
	);
}
