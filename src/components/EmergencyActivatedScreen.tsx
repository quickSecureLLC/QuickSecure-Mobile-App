import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');
const EMERGENCY_RED = '#FF3B30';

interface EmergencyActivatedScreenProps {
  onMinimize: () => void;
  onCancel: () => void;
}

export const EmergencyActivatedScreen: React.FC<EmergencyActivatedScreenProps> = ({
  onMinimize,
  onCancel,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 0.4,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]);

    Animated.loop(pulse).start();

    return () => {
      pulse.stop();
    };
  }, []);

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={onMinimize}
    >
      <View style={styles.background} />
      <Animated.View
        style={[
          styles.pulse,
          {
            opacity: pulseAnim,
          },
        ]}
      />
      <View style={styles.messageContainer}>
        <Text style={styles.messagePrimary}>
          EMERGENCY RESPONDERS{'\n'}DISPATCHED
        </Text>
        <Text style={styles.messageSecondary}>
          Administration has been notified
        </Text>
      </View>
      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Cancel Emergency</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  pulse: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: EMERGENCY_RED,
  },
  messageContainer: {
    alignItems: 'center',
    padding: 20,
    zIndex: 1,
  },
  messagePrimary: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 20,
  },
  messageSecondary: {
    color: '#FFFFFF',
    fontSize: 20,
    textAlign: 'center',
    opacity: 0.8,
  },
  cancelButton: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 