import { useState } from 'react';
import type { Database } from '../types';
import AdminTeamInfo from './AdminTeamInfo';

export default function AdminSection({
	title,
	userData,
	teamData,
}: {
	title: string;
	userData: Array<Database['public']['Tables']['user']['Row']>;
	teamData: Array<Database['public']['Tables']['team']['Row']>;
}) {
	const [isAddingTeam, setIsAddingTeam] = useState(false);

	return (
		<section className='max-w-3xl p-7 m-auto'>
			<div className='flex flex-row justify-between'>
				<h3 className='text-2xl'>{title}</h3>
				<button
					className='text-gray-600 hover:text-gray-700 hover:underline transition-all'
					title={`add new ${title.toLowerCase()}`}
					onClick={() => setIsAddingTeam(true)}
				>
					+
				</button>
			</div>
			{isAddingTeam && (
				<form
					action='/api/team/create'
					method='POST'
					className='border rounded-md p-4 grid grid-cols-[2fr_5fr] gap-1.5'
				>
					<label htmlFor='name'>name</label>
					<input type='text' name='name' required className='border' />

					<label htmlFor='coins'>coins</label>
					<input type='number' name='coins' required defaultValue={20} />

					<label htmlFor='members'>members</label>
					<select name='members' multiple className='border'>
						{userData.flatMap((user) => {
							if (user.team) return [];
							return (
								<option key={user.id} value={user.id}>
									{user.name}
								</option>
							);
						})}
					</select>

					<button className='border rounded-md w-36 mx-auto mt-2 p-2 bg-green-100 hover:bg-green-200 transition-all text-gray-900 col-[1/-1]'>
						Submit
					</button>
				</form>
			)}
			{teamData.map((team) => (
				<AdminTeamInfo key={team.id} team={team} />
			))}
		</section>
	);
}
