import { useEffect, useState } from 'react';
import type { Database } from '../types';
import { supabase } from '$lib/db';
import { formatTime } from '$lib/utils';
import Timer from './Timer';

type Team = Database['public']['Tables']['team']['Row'];
type Challenge = Database['public']['Tables']['challenges']['Row'];

export default function RunnerDashboard({ team }: { team: Team }) {
	const [vetoTime, setVetoSince] = useState<Date | undefined>(
		team.veto_until ? new Date(team.veto_until) : undefined
	);

	useEffect(() => {
		if (!vetoTime || vetoTime.valueOf() > Date.now()) return;
		console.log('yes', vetoTime);

		supabase
			.from('team')
			.update({ veto_until: null })
			.eq('id', team.id)
			.then(({ error }) => {
				console.log('error', error);
			});
	}, [vetoTime]);

	return (
		<section className='max-w-[40rem] m-auto mt-16 flex flex-col'>
			{team.role === 'runner' && (
				<>
					<CoinInfo
						team={team}
						vetoTime={vetoTime}
						setVetoTime={setVetoSince}
					/>
					<div className='mt-10'>
						<ChallengeInfo
							team={team}
							vetoSince={vetoTime}
							setVetoSince={setVetoSince}
						/>
					</div>
				</>
			)}
		</section>
	);
}

function CoinInfo({
	team,
	vetoTime,
	setVetoTime,
}: {
	team: Team;
	vetoTime: Date | undefined;
	setVetoTime: React.Dispatch<React.SetStateAction<Date | undefined>>;
}) {
	const [coins, setCoins] = useState(team.coins || 0);
	const [started, setStarted] = useState(false);
	const [seconds, setSeconds] = useState(60);
	const [startTime, setStartTime] = useState<number>(0);
	const [id, setId] = useState<number>();

	useEffect(() => {
		if (vetoTime) return;
		supabase
			.from('team')
			.select('veto_until')
			.eq('id', team.id)
			.limit(1)
			.then(({ data, error }) => {
				if (error || !data[0]?.veto_until) return;

				const date = new Date(data[0].veto_until);
				console.log({ date, data: data[0].veto_until });
				setVetoTime(date);
			});
	}, [vetoTime]);

	function startCount() {
		if (coins <= 0) return;
		setStarted(true);
		setStartTime(Date.now());
		setSeconds(coins * 60);
		setId(
			setInterval(() => {
				setSeconds((curr) => curr - 1);
			}, 1000) as unknown as number
		);
	}

	useEffect(() => {
		if (!started && id) {
			clearInterval(id);
		}
	}, [started]);

	function stopCount() {
		clearTimeout(id);
		setStarted(false);
		const coinCount = coins! - (Date.now() - startTime) / 1000 / 60;
		const updated = Math.round(Math.floor(coinCount));

		setCoins(updated);

		const formData = new FormData();
		formData.append('id', team.id.toString());
		formData.append('coins', updated.toString());
		fetch('/api/team/update', { method: 'post', body: formData });
	}

	function click() {
		if (started) stopCount();
		else startCount();
	}

	if (vetoTime) {
		return (
			<div>
				<p>Veto'd, no transit until {vetoTime.toLocaleTimeString()}</p>
				<p>
					<Timer
						time={vetoTime}
						then={() => {
							supabase
								.from('team')
								.update({ veto_until: null })
								.eq('id', team.id);
							setVetoTime(undefined);
						}}
					/>{' '}
					remain
				</p>
			</div>
		);
	}

	return (
		<div className='grid grid-cols-2'>
			<p className=''>
				Coin count: {started ? formatTime(seconds) : coins} minutes
			</p>

			<button
				onClick={click}
				className={`max-w-fit mx-auto border border-transparent p-2 rounded-lg ${
					started
						? 'bg-red-100 hover:bg-red-200 active:bg-red-100'
						: 'bg-green-100 hover:bg-green-200 active:bg-green-100'
				} transition-all`}
			>
				{started ? 'Stop' : 'Start'} Transit Count
			</button>
		</div>
	);
}

function ChallengeInfo({
	team,
	vetoSince,
	setVetoSince,
}: {
	team: Team;
	vetoSince: Date | undefined;
	setVetoSince: (v: Date | undefined) => void;
}) {
	const [hasChallenge, setHasChallenge] = useState(false);

	const [challenge, setChallenge] = useState<Challenge>();
	const [winnable, setWinnable] = useState<number>(0);

	useEffect(() => {
		setWinnable(challenge?.min_coins || 0);
	}, [challenge]);

	useEffect(() => {
		if (!team.current_challenge || challenge) return;
		newChallenge();
	}, [challenge]);

	function newChallenge() {
		setHasChallenge(true);

		(async function () {
			const { error, data } = await supabase
				.from('challenges')
				.select('*')
				.not('id', 'in', `(${team.challenges_completed.join(',')})`);
			// console.log({ error, data, count });
			if (!data || !data?.length || error) return;
			if (team.current_challenge) {
				setChallenge(data.find((c) => c.id === team.current_challenge));
				return;
			}
			let c = data[Math.floor(Math.random() * data.length)]!;
			// console.log(c);
			// team.challenges_completed.push(c.id);

			await supabase
				.from('team')
				.update({
					// challenges_completed: team.challenges_completed,
					current_challenge: c.id,
				})
				.eq('id', team.id);
			setChallenge(c);
		})();
	}
	function doneChallenge() {
		setHasChallenge(false);

		(async function () {
			team.challenges_completed.push(challenge!.id);
			const { error } = await supabase
				.from('team')
				.update({
					coins: (team.coins || 0) + winnable,
					current_challenge: null,
					challenges_completed: team.challenges_completed,
				})
				.eq('id', team.id);
			console.log({ error, winnable });
		})();
	}

	function vetoChallenge() {
		const date = new Date(Date.now() + 10 * 60000);
		console.log('vetoChallenge', date);

		setVetoSince(date);
		team.challenges_completed = team.challenges_completed.filter(
			(c) => c !== team.current_challenge
		);
		supabase
			.from('team')
			.update({
				veto_until: date.toISOString(),
				challenges_completed: team.challenges_completed,
				current_challenge: null,
			})
			.eq('id', team.id);
	}

	useEffect(() => {
		// console.log('vetoEffect', vetoSince, team.veto_until);

		if (vetoSince && !team.veto_until) {
			console.log('update');

			supabase
				.from('team')
				.update({ veto_until: vetoSince!.toISOString() })
				.eq('id', team.id)
				.then(({ error }) => {
					console.log('vetoEffect error', error);
				});
		}
	}, [vetoSince]);

	if (vetoSince) {
		return <p>No Challenges yet...</p>;
	}

	if (hasChallenge && challenge)
		return (
			<div className='flex flex-col'>
				<h3 className='text-lg'>{challenge.name}</h3>
				<p
					dangerouslySetInnerHTML={{
						__html: challenge.description.replaceAll(
							/\[(.*)\]\((.*)\)/g,
							(_, ...args) => {
								// console.log({ substring, args });
								return `
                                    <a class="text-blue-600 underline hover:text-blue-500"
                                    target="_blank"
                                    href=${args[1]}>${args[0]}</a>`;
							}
						),
					}}
				></p>
				<div className='flex justify-center gap-20 mt-4'>
					<button
						className='border border-transparent rounded-lg py-2 px-4 bg-green-100 hover:bg-green-200 active:bg-green-300'
						onClick={doneChallenge}
					>
						Done
					</button>
					<button
						className='border border-transparent rounded-lg py-2 px-4 bg-red-100 hover:bg-red-200 active:bg-red-300'
						onClick={vetoChallenge}
					>
						Veto
					</button>
					<button
						className='border border-transparent rounded-lg py-2 px-4 bg-yellow-100 hover:bg-yellow-200 active:bg-yellow-300'
						onClick={() => {}}
					>
						Pass
					</button>
				</div>
				<div className='inline-block mx-auto'>
					<span className='inline-block mr-4'>Win </span>
					<input
						type='number'
						min={challenge.min_coins}
						max={challenge.max_coins}
						defaultValue={challenge.min_coins}
						disabled={challenge.min_coins === challenge.max_coins}
						onChange={(e) => {
							setWinnable(e.target.valueAsNumber);
						}}
						className='border mt-10'
						placeholder='Coin Count'
					/>
					<span className='ml-2'>{''} Coins</span>
				</div>
			</div>
		);

	return (
		<button
			className='p-2 border border-transparent rounded-lg bg-blue-200'
			onClick={newChallenge}
		>
			New Challenge
		</button>
	);
}
