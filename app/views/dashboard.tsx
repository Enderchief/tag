import { View, Text, Pressable, Alert } from 'react-native';
import { Team, User, supabase } from '@/lib/db';
import Name from '@/components/Name';
import RunnerDashboard from '@/components/RunnerDashboard';
import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';

interface PartialUser extends Pick<User, 'id' | 'name'> {
	team: Team | null;
}

export default function Dashboard({ session }: { session: Session }) {
	const [team, setTeam] = useState<Team | null>();
	const [partialUser, setPartialUser] = useState<PartialUser>();

	useEffect(() => {
		if (session) load();
	}, [session]);

	async function load() {
		const { data, error } = await supabase
			.from('user')
			.select('id,name,team(*)')
			.eq('id', session!.user.id);

		setTeam(data![0]?.team);
		setPartialUser(data![0]!);
		return;
	}

	if (!partialUser) return <Text>Loading...</Text>;

	function signOut() {
		Alert.alert('Signing Out', 'Got it?');
		supabase.auth
			.signOut()
			.then(() => Alert.alert('Done', 'You are signed out'));
	}

	return (
		<>
			<View className='px-8 w-full flex flex-row justify-between'>
				<Name user={partialUser} />
				<Pressable className='w-fit p-4' onPress={signOut}>
					<Text className='text-gray-700 hover:underline hover:text-gray-600 w-fit'>
						Sign Out
					</Text>
				</Pressable>
			</View>

			{team && (
				<View className='p-4'>
					<Text className='text-center text-2xl font-semibold'>
						{team.name}{' '}(
						{team.role ? (
							<Text className='font-medium text-2xl'>
								{team.role[0]?.toUpperCase() + team.role.slice(1)}
							</Text>
						) : (
							'No role assigned yet'
						)}
						)
					</Text>
					<View className='m-4'>
						<RunnerDashboard team={team} />
					</View>
				</View>
			)}
		</>
	);
}
