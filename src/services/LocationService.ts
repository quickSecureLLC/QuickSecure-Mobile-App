import * as Location from 'expo-location';
import { AppLog } from '../utils/logger';

interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

class LocationService {
  private static lastKnownLocation: Coordinates | null = null;

  static async init(): Promise<void> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        // Get initial location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        this.lastKnownLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          ...(location.coords.accuracy != null ? { accuracy: location.coords.accuracy } : {}),
          ...(location.timestamp != null ? { timestamp: location.timestamp } : {}),
        };

        // Start watching position
        Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000, // 10 seconds
            distanceInterval: 10, // 10 meters
          },
          (location) => {
            this.lastKnownLocation = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              ...(location.coords.accuracy != null ? { accuracy: location.coords.accuracy } : {}),
              ...(location.timestamp != null ? { timestamp: location.timestamp } : {}),
            };
          }
        );
      }
    } catch (error) {
      AppLog.error('Error initializing location service:', error);
    }
  }

  static async getLastKnownCoords(): Promise<Coordinates | null> {
    try {
      // If we don't have a last known location, try to get current
      if (!this.lastKnownLocation) {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          this.lastKnownLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            ...(location.coords.accuracy != null ? { accuracy: location.coords.accuracy } : {}),
            ...(location.timestamp != null ? { timestamp: location.timestamp } : {}),
          };
        }
      }
      return this.lastKnownLocation;
    } catch (error) {
      AppLog.error('Error getting location:', error);
      return null;
    }
  }

  static async getCurrentLocation(): Promise<Coordinates> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission not granted');
    }
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
    if (!location || !location.coords) {
      throw new Error('Unable to get current location');
    }
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      ...(location.coords.accuracy != null ? { accuracy: location.coords.accuracy } : {}),
      ...(location.timestamp != null ? { timestamp: location.timestamp } : {}),
    };
  }
}

export { LocationService, type Coordinates }; 