import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { AppContent } from '../components/AppContent';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
        <Stack.Screen name="Home" component={AppContent} />
        )}
      </Stack.Navigator>
  );
}; 