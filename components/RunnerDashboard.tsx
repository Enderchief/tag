import { useEffect, useState, useReducer } from 'react';
import { Picker } from '@react-native-picker/picker';
import type { Database } from '@/lib/types';
import { supabase } from '@/lib/db';
import { formatTime } from '@/lib/utils';
import Timer from './Timer';
import {
	Alert,
	Keyboard,
	Modal,
	Pressable,
	Text,
	TextInput,
	TouchableWithoutFeedback,
	View,
} from 'react-native';
import Button from './Button';

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
	  }
	| {
			type: 'transit';
			on_transit: boolean;
	  }
	| {
			type: 'transit_end';
			coins: number;
	  };

interface Model {
	team: Team;
	challenge?: Challenge | undefined;
	veto?: Date | undefined;
	transit: boolean;
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
				transit: model.transit,
			};
		case 'new':
			return {
				team: { ...model.team },
				challenge: action.challenge,
				veto: model.team.veto_until
					? new Date(model.team.veto_until)
					: undefined,
				transit: model.transit,
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
				transit: model.transit,
			};
		case 'pass':
			return {
				team: { ...model.team, current_challenge: null, veto_until: null },
				veto: undefined,
				transit: model.transit,
			};
		case 'transit':
			return {
				...model,
				transit: action.on_transit,
			};
		case 'transit_end':
			return {
				...model,
				team: { ...model.team, coins: action.coins },
				transit: false,
			};
		default:
			return model;
	}
}

export default function RunnerDashboard({ team }: { team: Team }) {
	const [state, dispatch] = useReducer(stateReducer, { team, transit: false });

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

	function handleTransitEnd(coins: number) {
		dispatch({ type: 'transit_end', coins: coins });
	}

	function handleOnTransit(v: boolean) {
		dispatch({ type: 'transit', on_transit: v });
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
		<View className='max-w-[40rem] m-auto mt-16 flex flex-col'>
			{team.role === 'runner' && (
				<>
					<CoinInfo
						state={state}
						onEndVeto={handleEndVeto}
						onTransitEnd={handleTransitEnd}
						onTransit={handleOnTransit}
					/>
					<View className='mt-10 flex flex-row justify-center'>
						<ChallengeInfo
							state={state}
							onNewChallenge={handleNewChallenge}
							onDoneChallenge={handleDoneChallenge}
							onVetoChallenge={handleVetoChallenge}
							onPassChallenge={handlePassChallenge}
						/>
					</View>
					<View className='mt-10'>
						<Text className='text-xs md:text-sm'>
							Completed:{' '}
							{team.challenges_completed.sort((a, b) => a - b).join(', ')}
						</Text>
					</View>
				</>
			)}
		</View>
	);
}

function CoinInfo({
	state,
	onEndVeto,
	onTransitEnd,
	onTransit,
}: {
	state: Model;
	onEndVeto: VoidFunction;
	onTransitEnd: (v: number) => void;
	onTransit: (v: boolean) => void;
}) {
	const [coins, setCoins] = useState(state.team.coins!);
	const [started, setStarted] = useState(state.transit);
	const [seconds, setSeconds] = useState(60);
	const [startTime, setStartTime] = useState<number>(0);
	const [id, setId] = useState<number>();

	function startCount() {
		if (coins <= 0) return;
		setStarted(true);
		Alert.alert(
			'Start GO!',
			"Don't forget to start GO on Transit, and to show the camera your GO page before you get off and stop it!",
			[
				{
					text: 'Ok',
					onPress: () => {
						console.log('GO ACK');
					},
				},
			]
		);
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

		onTransitEnd(updated);

		supabase
			.from('team')
			.update({ coins: updated })
			.eq('id', state.team.id)
			.then(() => {});
	}

	function click() {
		if (started) stopCount();
		else startCount();
	}

	useEffect(() => {
		setCoins(state.team.coins || 0);
		console.log('coinsup:', state.team);
	}, [state]);

	useEffect(() => {
		onTransit(started);
	}, [started]);

	if (state.veto) {
		return (
			<View>
				<Text>Veto'd, no transit until {state.veto.toLocaleTimeString()}</Text>
				<Text>
					<Timer time={state.veto} then={onEndVeto} /> remain
				</Text>
			</View>
		);
	}

	return (
		<View className='grid grid-cols-2 text-sm sm:text-base'>
			<Text className='text-sm sm:text-base'>
				Coin count: {started ? formatTime((coins - seconds) * 60, 6) : coins}{' '}
				minutes
			</Text>

			<Button
				onPress={click}
				className={`max-w-fit mx-auto border border-transparent p-2 rounded-lg text-base ${
					started
						? 'bg-red-100 hover:bg-red-200 active:bg-red-100'
						: 'bg-green-100 hover:bg-green-200 active:bg-green-100'
				} transition-all p-2`}
				title={`${started ? 'Stop' : 'Start'} Transit Count`}
			/>
		</View>
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
	const [options, setOptions] = useState<number[]>([]);
	const [modalIsVisible, setModalVisibility] = useState(false);

	useEffect(() => {
		console.log('Challenges: ', state.challenge);

		if (!state.challenge) return;
		let o = [];
		for (
			let i = state.challenge.min_coins;
			i <= state.challenge.max_coins;
			i++
		) {
			o.push(i);
		}
		setOptions(o);
	}, [state.challenge]);

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
		return <Text>No Challenges yet...</Text>;
	}

	if (hasChallenge && state.challenge)
		return (
			<View className='flex flex-col text-sm sm:text-base'>
				<Text className='text-base sm:text-lg'>
					#{state.challenge.id} {state.challenge.name}
				</Text>
				<Text
					className='text-sm max-w-[45ch] sm:max-w-96'
					// dangerouslySetInnerHTML={{
					// 	__html: state.challenge.description.replaceAll(
					// 		/\[(.*)\]\((.*)\)/g,
					// 		(_, ...args) => {
					// 			// console.log({ substring, args });
					// 			return `
					//                 <a class="text-blue-600 underline hover:text-blue-500"
					//                 target="_blank"
					//                 href=${args[1]}>${args[0]}</a>`;
					// 		}
					// 	),
					// }}
				>
					{state.challenge.description}
				</Text>
				{state.transit ? (
					<Text className='text-sm italic mt-4'>
						Wait until off transit to complete the challenge.
					</Text>
				) : (
					<View className='flex flex-row justify-between mt-4 px-4'>
						<Button
							className='border border-transparent rounded-lg py-2 px-4 bg-green-100 hover:bg-green-200 active:bg-green-300'
							onPress={doneChallenge}
							title='Done'
						/>

						<Button
							className='border border-transparent rounded-lg py-2 px-4 bg-red-100 hover:bg-red-200 active:bg-red-300'
							onPress={onVetoChallenge}
							title='Veto'
						/>

						<Button
							className='border border-transparent rounded-lg py-2 px-4 bg-yellow-100 hover:bg-yellow-200 active:bg-yellow-300'
							onPress={passChallenge}
							title='Pass'
						/>
					</View>
				)}

				<View className='flex flex-row align-middle mx-auto my-6'>
					<Text className='mr-4'>Win </Text>
					{!modalIsVisible && (
						<Pressable onPress={() => setModalVisibility(true)}>
							<Text>{winnable}</Text>
						</Pressable>
					)}
					<WinnableSelector
						isVisible={modalIsVisible}
						options={options}
						onClose={(coin) => {
							setWinnable(coin);
							setModalVisibility(false);
						}}
					/>
					<Text className='ml-2'>{''} Coins</Text>
				</View>
			</View>
		);

	return (
		<Button
			className='p-1 border border-transparent rounded-lg bg-blue-200 self-center'
			onPress={onNewChallenge}
			title='New Challenge'
		/>
	);
}

function WinnableSelector({
	isVisible,
	onClose,
	options,
}: {
	isVisible: boolean;
	onClose: (v: number) => void;
	options: number[];
}) {
	const [winnable, setWinnable] = useState(Math.min(...options) || 0);

	return (
		<Modal visible={isVisible} animationType='fade'>
			<View className='absolute bottom-0 h-2/3 w-full lg:w-full lg:items-center gap-8'>
				<Text className='text-center text-xl'>
					Select the amount of coins you have won.
				</Text>
				<View className='min-w-10'>
					<Picker
						selectedValue={winnable}
						onValueChange={(value) => setWinnable(value)}
						className='font-sm'
					>
						{options.map((coin) => (
							<Picker.Item key={coin} label={coin.toString()} value={coin} />
						))}
					</Picker>
				</View>
				<Button
					onPress={() => onClose(winnable)}
					className='text-lg border p-2 border-transparent bg-green-100 rounded-md'
				>
					Done
				</Button>
			</View>
		</Modal>
	);
}
