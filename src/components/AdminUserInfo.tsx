import { useState, type ReactNode } from 'react';
import type { Database } from '../types';

export default function AdminUserInfo({
	user,
}: {
	user: Database['public']['Tables']['user']['Row'];
}) {
	const [name, setName] = useState(user.name!);

	return (
		<Parent
			className='border rounded-md p-4 grid grid-cols-[2fr_5fr] gap-1.5'
			change={name !== user.name}
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

			<label htmlFor='team'>team id</label>
			<p>{user.team}</p>

			<label htmlFor='admin'>admin</label>
			<p>{user.admin.toString()}</p>

			{name !== user.name && (
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
			<form action='/api/update' method='POST' className={className}>
				{children}
			</form>
		);
	} else {
		return <main className={className}>{children}</main>;
	}
}
