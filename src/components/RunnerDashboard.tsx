import { useEffect, useState, useReducer } from 'react';
import type { Database } from '../types';
import { supabase } from '$lib/db';
import { formatTime } from '$lib/utils';
import Timer from './Timer';

type Team = Database['public']['Tables']['team']['Row'];
type Challenge = Database['public']['Tables']['challenges']['Row'];

type Action =
	| {
			type: 'new';
			challenge: Challenge;
	  }
	| {
			type: 'veto';
			until?: Date;
	  }
	| {
			type: 'done';
			coins?: number;
	  }
	| {
			type: 'pass';
	  };

interface Model {
	team: Team;
	challenge?: Challenge | undefined;
	veto?: Date | undefined;
}

function stateReducer(model: Model, action: Action): Model {
	console.log('reducer: ', { model, action });
	const team = { ...model.team };

	switch (action.type) {
		case 'done':
			return {
				team: {
					...model.team,
					coins: action.coins || 0,
				},
			};
		case 'new':
			return {
				team: { ...model.team },
				challenge: action.challenge,
				veto: model.team.veto_until
					? new Date(model.team.veto_until)
					: undefined,
			};
		case 'veto':
			if (action.until) {
				team.veto_until = action.until.toISOString();
			} else {
				team.veto_until = null;
			}
			return {
				team,
				veto: action.until,
			};
		case 'pass':
			return {
				team: { ...model.team, current_challenge: null, veto_until: null },
				veto: undefined,
			};
		default:
			return model;
	}
}

export default function RunnerDashboard({ team }: { team: Team }) {
	const [state, dispatch] = useReducer(stateReducer, { team });

	function handleDoneChallenge(winnable: number) {
		console.log('handleDoneChallenge');

		(async function () {
			console.log('handleDoneChallenge inner');
			const coins = (state.team.coins || 0) + winnable;

			state.team.challenges_completed.push(state.challenge!.id);
			const { error } = await supabase
				.from('team')
				.update({
					coins: coins,
					current_challenge: null,
					challenges_completed: state.team.challenges_completed,
				})
				.eq('id', state.team.id);
			console.log({ error, winnable });
			dispatch({ type: 'done', coins: coins });
		})();
	}

	function handlePassChallenge() {
		console.log('handlePassChallenge');
		dispatch({ type: 'pass' });

		supabase
			.from('team')
			.update({ current_challenge: null, veto_until: null })
			.eq('id', state.team.id)
			.then(() => {});
	}

	function handleVetoChallenge() {
		console.log('handleVetoChallenge');

		(async () => {
			let date: Date;

			const { data, error } = await supabase
				.from('team')
				.select('veto_until')
				.eq('id', state.team.id);
			console.log('handleVeto', data, error);

			if (!error && data && data.length && data[0]?.veto_until) {
				date = new Date(data[0].veto_until);
			} else {
				date = new Date(Date.now() + 10 * 60000);

				supabase
					.from('team')
					.update({
						veto_until: date.toISOString(),
						challenges_completed: state.team.challenges_completed,
						current_challenge: null,
					})
					.eq('id', state.team.id)
					.then(() => {});
			}

			dispatch({
				type: 'veto',
				until: date,
			});
		})();
	}

	function handleNewChallenge() {
		console.log('handleNewChallenge');
		if (state.challenge) return;

		supabase
			.from('challenges')
			.select('*')
			.not('id', 'in', `(${state.team.challenges_completed.join(',')})`)
			.then(({ data, error }) => {
				if (error || !data.length) return;
				if (state.team.current_challenge) {
					return dispatch({
						type: 'new',
						challenge: data.find((c) => c.id === state.team.current_challenge)!,
					});
				}

				let challenge = data[Math.floor(Math.random() * data.length)]!;
				dispatch({
					type: 'new',
					challenge,
				});

				supabase
					.from('team')
					.update({ current_challenge: challenge!.id })
					.eq('id', state.team.id)
					.then(() => {});
			});
	}

	function handleEndVeto() {
		console.log('handleEndVeto');
		supabase.from('team').update({ veto_until: null });
		dispatch({ type: 'veto' });
	}

	useEffect(() => {
		if (!state.veto || state.veto.valueOf() > Date.now()) return;
		console.log('yes', state.veto);

		supabase
			.from('team')
			.update({ veto_until: null })
			.eq('id', state.team.id)
			.then(({ error }) => {
				console.log('error', error);
			});
	}, [state.veto]);

	useEffect(() => {
		if (state.veto) return;
		supabase
			.from('team')
			.select('veto_until')
			.eq('id', state.team.id)
			.then(({ error, data }) => {
				if (error || !data[0]?.veto_until) return;
				dispatch({ type: 'veto', until: new Date(data[0].veto_until!) });
				return;
			});
	}, [state.veto]);

	return (
		<section className='max-w-[40rem] m-auto mt-16 flex flex-col'>
			{team.role === 'runner' && (
				<>
					<CoinInfo state={state} onEndVeto={handleEndVeto} />
					<div className='mt-10 flex justify-center'>
						<ChallengeInfo
							state={state}
							onNewChallenge={handleNewChallenge}
							onDoneChallenge={handleDoneChallenge}
							onVetoChallenge={handleVetoChallenge}
							onPassChallenge={handlePassChallenge}
						/>
					</div>
				</>
			)}
		</section>
	);
}

function CoinInfo({
	state,
	onEndVeto,
}: {
	state: Model;
	onEndVeto: VoidFunction;
}) {
	const [coins, setCoins] = useState(state.team.coins!);
	const [started, setStarted] = useState(false);
	const [seconds, setSeconds] = useState(60);
	const [startTime, setStartTime] = useState<number>(0);
	const [id, setId] = useState<number>();

	function startCount() {
		if (coins <= 0) return;
		setStarted(true);
		const s = Date.now();
		setStartTime(s);
		setSeconds(0);
		setId(
			setInterval(() => {
				setSeconds(() => (Date.now() - s) / 1000 / 60);
			}, 5) as unknown as number
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
		const t = Date.now() - startTime;
		const sub = t / 1000 / 60;
		const coinCount = coins! - sub;
		const updated = Math.round(Math.floor(coinCount));
		console.log({ t, sub, coinCount, updated });

		setCoins(updated);

		const formData = new FormData();
		formData.append('id', state.team.id.toString());
		formData.append('coins', updated.toString());
		fetch('/api/team/update', { method: 'post', body: formData });
	}

	function click() {
		if (started) stopCount();
		else startCount();
	}

	useEffect(() => {
		setCoins(state.team.coins || 0);
	}, [state]);

	if (state.veto) {
		return (
			<div>
				<p>Veto'd, no transit until {state.veto.toLocaleTimeString()}</p>
				<p>
					<Timer time={state.veto} then={onEndVeto} /> remain
				</p>
			</div>
		);
	}

	return (
		<div className='grid grid-cols-2 text-sm sm:text-base'>
			<p className=''>
				Coin count: {started ? formatTime((coins - seconds) * 60, 6) : coins}{' '}
				minutes
			</p>

			<button
				onClick={click}
				className={`max-w-fit mx-auto border border-transparent p-2 rounded-lg ${
					started
						? 'bg-red-100 hover:bg-red-200 active:bg-red-100'
						: 'bg-green-100 hover:bg-green-200 active:bg-green-100'
				} transition-all p-2`}
			>
				{started ? 'Stop' : 'Start'} Transit Count
			</button>
		</div>
	);
}

function ChallengeInfo({
	state,
	onNewChallenge,
	onDoneChallenge,
	onVetoChallenge,
	onPassChallenge,
}: {
	state: Model;
	onNewChallenge: VoidFunction;
	onDoneChallenge: (winnable: number) => void;
	onVetoChallenge: VoidFunction;
	onPassChallenge: VoidFunction;
}) {
	const [hasChallenge, setHasChallenge] = useState(false);

	const [winnable, setWinnable] = useState<number>(0);

	useEffect(() => {
		setWinnable(state.challenge?.min_coins || 0);
	}, [state.challenge]);

	useEffect(() => {
		if (state.challenge) setHasChallenge(true);
		if (!state.team.current_challenge || state.challenge) return;
		onNewChallenge();
	}, [state.challenge]);

	function doneChallenge() {
		setHasChallenge(false);
		onDoneChallenge(winnable);
	}

	function passChallenge() {
		setHasChallenge(false);
		onPassChallenge();
	}

	useEffect(() => {
		console.log('vetoEffect', state.veto, state.team.veto_until);

		if (state.veto && !state.team.veto_until) {
			console.log('update');

			supabase
				.from('team')
				.update({ veto_until: state.veto!.toISOString() })
				.eq('id', state.team.id)
				.then(({ error }) => {
					console.log('vetoEffect error', error);
				});
		}
	}, [state.veto]);

	if (state.veto) {
		return <p>No Challenges yet...</p>;
	}

	if (hasChallenge && state.challenge)
		return (
			<div className='flex flex-col text-sm sm:text-base'>
				<h3 className='text-base sm:text-lg'>{state.challenge.name}</h3>
				<p
					className='text-sm max-w-[45ch] sm:max-w-96'
					dangerouslySetInnerHTML={{
						__html: state.challenge.description.replaceAll(
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
				<div className='flex justify-center gap-5 mt-4 sm:gap-10 md:gap-20'>
					<button
						className='border border-transparent rounded-lg py-2 px-4 bg-green-100 hover:bg-green-200 active:bg-green-300'
						onClick={doneChallenge}
					>
						Done
					</button>
					<button
						className='border border-transparent rounded-lg py-2 px-4 bg-red-100 hover:bg-red-200 active:bg-red-300'
						onClick={onVetoChallenge}
					>
						Veto
					</button>
					<button
						className='border border-transparent rounded-lg py-2 px-4 bg-yellow-100 hover:bg-yellow-200 active:bg-yellow-300'
						onClick={passChallenge}
					>
						Pass
					</button>
				</div>
				<div className='inline-block mx-auto'>
					<span className='inline-block mr-4'>Win </span>
					<input
						type='number'
						min={state.challenge.min_coins}
						max={state.challenge.max_coins}
						defaultValue={state.challenge.min_coins}
						disabled={state.challenge.min_coins === state.challenge.max_coins}
						onChange={(e) => {
							const num = e.target.valueAsNumber;
							console.log('change', num);
							if (num > state.challenge!.max_coins) {
								e.target.value = `${state.challenge!.max_coins}`;
							} else if (
								num < state.challenge!.min_coins ||
								Number.isNaN(num)
							) {
								e.target.value = `${state.challenge!.min_coins}`;
								return;
							}
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
			className='p-2 border border-transparent rounded-lg bg-blue-200 self-center'
			onClick={onNewChallenge}
		>
			New Challenge
		</button>
	);
}
