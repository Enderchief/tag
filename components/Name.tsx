import { useState } from 'react';

export default function Name({
	user,
}: {
	user: { name: string | null; id: string };
}) {
	async function submit() {
		if (cooldown) return;
		setCooldown(true);
		setEditable(false);

		const formData = new FormData();
		formData.append('id', user.id);
		formData.append('name', name);

		await fetch('/api/update', { method: 'post', body: formData });
		setTimeout(() => {
			setCooldown(false);
		}, 5000);
	}

	const [cooldown, setCooldown] = useState(false);
	const [name, setName] = useState(user.name!);
	const [editable, setEditable] = useState(false);

	if (!editable) {
		return <p onDoubleClick={() => setEditable(true)}>{name}</p>;
	} else {
		return (
			<>
				<input
					type='text'
					name='name'
					value={name}
					onChange={(e) => setName(e.target.value)}
					className='border text-sm max-w-[15ch] sm:text-base sm:max-w-fit'
					title='Change your name'
				/>
				<button
					className='border px-3 rounded-md bg-green-100 hover:bg-green-200'
					onClick={submit}
				>
					Done
				</button>
			</>
		);
	}
}
