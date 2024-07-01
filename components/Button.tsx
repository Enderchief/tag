import { ReactNode } from 'react';
import { Pressable, Text } from 'react-native';

export default function Button({
	onPress,
	className,
	title,
	children,
}: {
	onPress: VoidFunction;
	className: string;
	title?: string;
	children?: ReactNode;
}) {
	return (
		<Pressable className={className} onPress={onPress}>
			<Text className='text-base'>{title || children}</Text>
		</Pressable>
	);
}
