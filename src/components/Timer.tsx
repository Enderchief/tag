import { formatTime } from '$lib/utils';
import { useEffect, useState } from 'react';

export default function Timer({
	time,
	then,
}: {
	time: Date;
	then?: VoidFunction;
}) {
	const [ms, setMilli] = useState(0);
	const [id, setId] = useState(0);

	useEffect(() => {
		if (id) return;
		setId(
			setInterval(() => {
				setMilli(time.valueOf() - Date.now());
			}, 500) as any as number
		);
	});

	useEffect(() => {
		// console.log('effect', ms > 1000, id, ms);

		if (ms > 1000 || ms === 0) return;
		clearInterval(id);
		then?.call(null);
	}, [ms]);

	return <>{formatTime(Math.floor(ms / 1000))}</>;
}
