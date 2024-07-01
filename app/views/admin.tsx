import { Text, View } from 'react-native';
import AdminUserInfo from '@/components/AdminUserInfo';
import { Team, User, supabase } from '@/lib/db';
import { getTokens, isAdmin } from '@/lib/utils';
import AdminSection from '@/components/AdminSection';
import { useState } from 'react';

export default function Admin() {

	const [userData, setUserData] = useState<User[]>([]);
	const [teamData, setTeamData] = useState<Team[]>([]);


	getTokens().then(async ([refreshToken, accessToken]) => {
		if (!refreshToken || !accessToken) throw Error("no token")
		else if (!(await isAdmin())) throw Error("not admin");

		const { error: userError, data: data0 } = await supabase
			.from('user')
			.select('*');
		if (userError) throw userError
		else setUserData(data0);

		const { error: teamError, data: data1 } = await supabase
			.from('team')
			.select('*');

		if (teamError) throw teamError
		else setTeamData(data1);
	});

	return (
		<View className='max-w-3xl p-7 m-auto'>
			<View className='mb-8'>
				<Text className='text-2xl'>Players</Text>
				{userData.map((user) => (
					<AdminUserInfo key={user.id} user={user} teams={teamData} />
				))}
				<AdminSection title='Teams' userData={userData} teamData={teamData} />
			</View>
		</View>
	);
}
