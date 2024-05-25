import { useState, type ReactNode } from 'react';
import type { Database } from '../types';

export default function AdminTeamInfo({
	team,
}: {
	team: Database['public']['Tables']['team']['Row'];
}) {
	const [name, setName] = useState(team.name!);
	const [role, setRole] = useState(team.role || 'none');
	const [coins, setCoins] = useState(team.coins! || 0);

	const predicate =
		name !== team.name ||
		(team.role === null ? role !== 'none' : team.role !== role) ||
		coins !== team.coins;

	return (
		<Parent
			className='border rounded-md p-4 grid grid-cols-[2fr_5fr] gap-1.5'
			change={predicate}
		>
			<label htmlFor='id'>id</label>
			<input name='id' type='hidden' id='id' value={team.id} />
			<p>{team.id}</p>

			<label htmlFor='name'>name</label>
			<input
				id='name'
				name='name'
				type='text'
				value={name}
				onChange={(e) => setName(e.target.value)}
			/>

			<label htmlFor='role'>role</label>
			<select
				name='role'
				defaultValue={role!}
				onChange={(e) => setRole(e.target.value as any)}
			>
				<option value='none'>None</option>
				<option value='runner'>Runner</option>
				<option value='chaser'>Chaser</option>
			</select>

			<label htmlFor='coins'>coins</label>
			<input
				name='coins'
				type='number'
				defaultValue={coins || 0}
				onChange={(e) => setCoins(e.target.valueAsNumber)}
			/>

			<label htmlFor='challenges_completed'>challenges_completed</label>
			<p>{team.challenges_completed.join(', ')}</p>

			{predicate && (
				<button
					type='submit'
					className='border rounded-md w-36 mx-auto mt-2 p-2 bg-green-100 hover:bg-green-200 transition-all text-gray-900 col-[1/-1]'
				>
					Submit Change
				</button>
			)}
		</Parent>
	);
}

function Parent({
	change,
	className,
	children,
}: {
	change: boolean;
	className: string;
	children: ReactNode;
}) {
	if (change) {
		return (
			<form action='/api/team/update' method='POST' className={className}>
				{children}
			</form>
		);
	} else {
		return <main className={className}>{children}</main>;
	}
}
