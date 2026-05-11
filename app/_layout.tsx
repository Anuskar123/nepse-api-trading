import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="stock/[symbol]" options={{ headerShown: true, title: 'Stock Details', headerBackTitle: 'Back' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
