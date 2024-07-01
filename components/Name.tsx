import { supabase } from '@/lib/db';
import { useState } from 'react';
import { TextInput, Text, Pressable, View, Alert } from 'react-native';

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

		await supabase.from('user').update({ name: name }).eq('id', user.id);

		setTimeout(() => {
			setCooldown(false);
		}, 5000);
	}

	const [cooldown, setCooldown] = useState(false);
	const [name, setName] = useState(user.name!);
	const [editable, setEditable] = useState(false);

	if (!editable) {
		return (
			<Text
				className='w-fit text-base p-4'
				onLongPress={() => {
					Alert.alert('Long Press', 'You pressed');
					setEditable(true);
				}}
			>
				{name}
			</Text>
		);
	} else {
		return (
			<View className='w-fit p-4'>
				<TextInput
					value={name}
					onChangeText={(text) => setName(text)}
					className='border p-1 text-base max-w-[15ch] sm:text-base sm:max-w-fit'
					placeholder='Change your name'
				/>
				<Pressable
					className='border border-transparent px-3 py-2 rounded-md bg-green-100 hover:bg-green-200'
					onPress={submit}
				>
					<Text>done</Text>
				</Pressable>
			</View>
		);
	}
}
