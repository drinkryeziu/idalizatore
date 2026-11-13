import { Alert, Platform } from 'react-native';

/** Confirm dialog that works on iPhone (Alert) and on the web (Alert.alert does nothing there). */
export function confirmAsync(title: string, message: string, okLabel: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: okLabel, onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }));
}
