import AsyncStorage from '@react-native-async-storage/async-storage';

export function signout() {
	return AsyncStorage.multiRemove(['sb-access-token', 'sb-refresh-token']);
}
