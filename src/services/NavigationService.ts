import { NavigationContainerRef, StackActions } from '@react-navigation/native';
import { createRef } from 'react';

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  UserProfile: undefined;
};

export const navigationRef = createRef<NavigationContainerRef<RootStackParamList>>();

export class NavigationService {
  static navigate(name: keyof RootStackParamList) {
    if (navigationRef.current) {
      navigationRef.current.navigate(name);
    }
  }

  static replace(name: keyof RootStackParamList) {
    if (navigationRef.current) {
      navigationRef.current.dispatch(StackActions.replace(name));
    }
  }

  static goBack() {
    if (navigationRef.current?.canGoBack()) {
      navigationRef.current.goBack();
    }
  }
} 