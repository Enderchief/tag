import { useState, type ReactNode } from 'react';
import type { Team, User } from '@/lib/db';

export default function AdminUserInfo({
	user,
	teams,
}: {
	user: User;
	teams: Array<Team>;
}) {
	const [name, setName] = useState(user.name!);
	const [team, setTeam] = useState(user.team);

	return (
		<Parent
			className='border rounded-md p-4 grid grid-cols-[2fr_5fr] gap-1.5'
			change={name !== user.name || team !== user.team}
		>
			<label htmlFor='id'>id</label>
			<input name='id' type='hidden' id='id' value={user.id} />
			<p>{user.id}</p>

			<label htmlFor='name'>name</label>
			<input
				id='name'
				name='name'
				type='text'
				value={name}
				onChange={(e) => setName(e.target.value)}
			></input>

			<label htmlFor='created'>created at</label>
			<p>{new Date(user.created_at).toDateString()}</p>

			<label htmlFor='team'>team</label>
			<select
				name='team'
				className={!team ? `font-bold` : ''}
				onChange={(e) => setTeam(+e.target.value)}
				value={team || 0}
			>
				{teams.map((t) => (
					<option value={t.id} key={t.id}>
						{t.name}
					</option>
				))}
				<option value='0'>None</option>
			</select>

			<label htmlFor='admin'>admin</label>
			<p>{user.admin.toString()}</p>
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
			<form action='/api/update' method='POST' className={className}>
				{children}
				<button
					type='submit'
					className='border rounded-md w-36 mx-auto mt-2 p-2 bg-green-100 hover:bg-green-200 transition-all text-gray-900 col-[1/-1]'
				>
					Submit Change
				</button>
			</form>
		);
	} else {
		return <main className={className}>{children}</main>;
	}
}
