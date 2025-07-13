import * as Location from 'expo-location';
import { AppLog } from '../utils/logger';
import { Accelerometer, Gyroscope, Magnetometer, Barometer } from 'expo-sensors';

interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

class LocationService {
  private static lastKnownLocation: Coordinates | null = null;
  private static isInitialized: boolean = false;
  private static locationWatcher: Location.LocationSubscription | null = null;

  static async init(): Promise<void> {
    if (this.isInitialized) {
      AppLog.info('LocationService already initialized');
      return;
    }

    try {
      AppLog.info('Initializing LocationService...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        // Get initial location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
          timeInterval: 3000,
          distanceInterval: 5,
        });
        
        this.lastKnownLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          ...(location.coords.accuracy != null ? { accuracy: location.coords.accuracy } : {}),
          ...(location.timestamp != null ? { timestamp: location.timestamp } : {}),
        };

        AppLog.info('Initial location obtained:', this.lastKnownLocation);

        // Start watching position
        this.locationWatcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Highest,
            timeInterval: 5000, // 5 seconds
            distanceInterval: 5, // 5 meters
          },
          (location) => {
            this.lastKnownLocation = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              ...(location.coords.accuracy != null ? { accuracy: location.coords.accuracy } : {}),
              ...(location.timestamp != null ? { timestamp: location.timestamp } : {}),
            };
            AppLog.info('Location updated via watcher:', this.lastKnownLocation);
          }
        );

        this.isInitialized = true;
        AppLog.info('LocationService initialized successfully');
      } else {
        AppLog.warn('Location permission denied during initialization');
      }
    } catch (error) {
      AppLog.error('Error initializing location service:', error);
      this.isInitialized = false;
    }
  }

  static async getLastKnownCoords(): Promise<Coordinates | null> {
    try {
      // If we don't have a last known location, try to get current
      if (!this.lastKnownLocation) {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
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
    
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
      timeInterval: 3000,
      distanceInterval: 5,
    });

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

  static async getFreshLocationForEmergency(): Promise<Coordinates | null> {
    const startTime = Date.now();
    
    try {
      AppLog.info('Attempting fresh GPS fetch for emergency...');
      
      // Check permissions first
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        AppLog.warn('Location permission denied for emergency alert');
        return null;
      }

      // Check if location services are enabled
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        AppLog.warn('Location services disabled for emergency alert');
        return null;
      }

      // Attempt fresh GPS with 15-second timeout
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        timeInterval: 5000,
        distanceInterval: 5,
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('GPS timeout after 15 seconds')), 15000);
      });

      const location = await Promise.race([locationPromise, timeoutPromise]);

      // Validate coordinates
      if (!location?.coords?.latitude || !location?.coords?.longitude) {
        throw new Error('Invalid GPS coordinates received');
      }

      const freshCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        ...(location.coords.accuracy != null ? { accuracy: location.coords.accuracy } : {}),
        ...(location.timestamp != null ? { timestamp: location.timestamp } : {}),
      };

      // Update cache with fresh data (for other parts of the app)
      this.lastKnownLocation = freshCoords;
      
      const duration = Date.now() - startTime;
      AppLog.info(`Fresh GPS fetch completed in ${duration}ms:`, freshCoords);
      
      return freshCoords;

    } catch (error) {
      const duration = Date.now() - startTime;
      AppLog.error(`Fresh GPS fetch failed after ${duration}ms:`, error);
      return null; // Never fall back to cached data for emergencies
    }
  }

  // PRODUCTION-READY EMERGENCY GPS - ADDRESSES ALL iOS ISSUES
  static async getEmergencyGPS(): Promise<Coordinates> {
    const startTime = Date.now();
    try {
      AppLog.info('=== EMERGENCY GPS: STARTING FRESH SATELLITE FIX ===');
      
      // 1. Check basic permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }
      
      // 2. Note: requestTemporaryFullAccuracyAsync not available in expo-location ~18.1.6
      // Users must manually enable "Precise Location" in iOS Settings for best GPS accuracy
      AppLog.info('Note: For best GPS accuracy, ensure "Precise Location" is enabled in iOS Settings');
      
      // 3. Check if location services are enabled
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        throw new Error('Location services are disabled');
      }
      
      // 4. Log location permissions for debugging iOS precise location issues
      try {
        const permissions = await Location.getForegroundPermissionsAsync();
        AppLog.info('Location permissions for debugging:', JSON.stringify(permissions, null, 2));
        
        // Note: iOS Precise Location status is logged above
        // If user has "Precise Location" OFF in Settings, GPS accuracy may be poor
        // User should manually enable Precise Location in Settings for best emergency GPS results
      } catch (accuracyError) {
        AppLog.warn('Could not check location permissions:', accuracyError);
        // Continue anyway - we'll try to get the best GPS possible
      }
      
              // 4. Use watchPositionAsync to get fresh satellite data (not cached)
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (subscription) {
            subscription.remove();
          }
          reject(new Error('GPS timeout: No fresh satellite fix obtained within 20 seconds'));
        }, 20000); // 20-second timeout for cold starts
        
        let locationCount = 0;
        let bestLocation: any = null;
        let subscription: Location.LocationSubscription | null = null;
        
        Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation, // Force real GPS, not network/WiFi
            timeInterval: 1000, // Update every second
            distanceInterval: 1, // Update every meter
            mayShowUserSettingsDialog: false // Don't show settings dialog during emergency
          },
          (location) => {
            locationCount++;
            AppLog.info(`GPS Update #${locationCount}: Accuracy ${location.coords.accuracy}m`);
            
            // Store the best location we've seen
            if (!bestLocation || (location.coords.accuracy && location.coords.accuracy < bestLocation.coords.accuracy)) {
              bestLocation = location;
            }
            
            // Use second update to ensure fresh data (first might be cached)
            if (locationCount >= 2) {
              clearTimeout(timeout);
              if (subscription) {
                subscription.remove();
              }
              
              if (!bestLocation || !bestLocation.coords) {
                reject(new Error('No valid GPS coordinates received'));
                return;
              }
              
              const freshCoords = {
                latitude: bestLocation.coords.latitude,
                longitude: bestLocation.coords.longitude,
                ...(bestLocation.coords.accuracy != null ? { accuracy: bestLocation.coords.accuracy } : {}),
                ...(bestLocation.timestamp != null ? { timestamp: bestLocation.timestamp } : {}),
              };
              
              const duration = Date.now() - startTime;
              AppLog.info(`=== EMERGENCY GPS OBTAINED IN ${duration}ms ===`);
              AppLog.info(`GPS Quality: ${freshCoords.accuracy}m accuracy`);
              AppLog.info('Fresh GPS coordinates:', JSON.stringify(freshCoords, null, 2));
              
              resolve(freshCoords);
            }
          }
        ).then((sub) => {
          subscription = sub;
        }).catch((error) => {
          clearTimeout(timeout);
          if (subscription) {
            subscription.remove();
          }
          
          // Handle specific iOS errors
          if (error.message?.includes('denied')) {
            reject(new Error('Location permission denied. Please enable location access in Settings.'));
          } else if (error.message?.includes('disabled')) {
            reject(new Error('Location services are disabled. Please enable location services in Settings.'));
          } else if (error.message?.includes('timeout')) {
            reject(new Error('GPS timeout: Device may be in Low Power Mode or poor GPS conditions.'));
          } else {
            reject(new Error(`GPS Error: ${error.message || 'Unknown GPS error'}`));
          }
        });
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      AppLog.error(`=== EMERGENCY GPS FAILED AFTER ${duration}ms ===`);
      AppLog.error('GPS Error:', error);
      throw error;
    }
  }

  // COMPLETELY FRESH GPS - NO CACHING WHATSOEVER (DEPRECATED - use getEmergencyGPS instead)
  static async getCompletelyFreshGPS(): Promise<Coordinates> {
    AppLog.warn('getCompletelyFreshGPS is deprecated - use getEmergencyGPS instead');
    return await this.getEmergencyGPS();
  }

  // Pulls GPS data exactly like the Get Location button
  static async getFreshLocationLikeButton(): Promise<Coordinates> {
    return await this.getCurrentLocation();
  }


  static async validateLocationAccuracy(coords: Coordinates): Promise<{ isValid: boolean; quality: 'excellent' | 'good' | 'poor' | 'unknown' }> {
    if (!coords.accuracy) {
      return { isValid: true, quality: 'unknown' };
    }
    
    // Log accuracy for monitoring
    AppLog.info(`GPS accuracy: ${coords.accuracy}m`);
    
    // Quality assessment
    let quality: 'excellent' | 'good' | 'poor' | 'unknown';
    if (coords.accuracy <= 10) {
      quality = 'excellent';
    } else if (coords.accuracy <= 25) {
      quality = 'good';
    } else {
      quality = 'poor';
    }
    
    // Consider coordinates valid if accuracy < 50m (more lenient for emergency situations)
    const isValid = coords.accuracy < 50;
    
    return { isValid, quality };
  }

  static async refreshLocation(): Promise<void> {
    try {
      AppLog.info('Refreshing location...');
      const location = await this.getCurrentLocation();
      this.lastKnownLocation = location;
      AppLog.info('Location refreshed:', location);
    } catch (error) {
      AppLog.error('Error refreshing location:', error);
    }
  }

  static async requestLocationPermission() {
    return await Location.requestForegroundPermissionsAsync();
  }

  static isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  static getLastKnownLocation(): Coordinates | null {
    return this.lastKnownLocation;
  }
}

// Get latest sensor readings
export async function getSensorFusionData() {
  // Get location
  let location: Coordinates | null = null;
  try {
    location = await LocationService.getCurrentLocation();
  } catch {}

  // Get accelerometer
  const accel = await new Promise(resolve => {
    const sub = Accelerometer.addListener(data => {
      sub.remove();
      resolve(data);
    });
  });

  // Get gyroscope
  const gyro = await new Promise(resolve => {
    const sub = Gyroscope.addListener(data => {
      sub.remove();
      resolve(data);
    });
  });

  // Get magnetometer
  const mag = await new Promise(resolve => {
    const sub = Magnetometer.addListener(data => {
      sub.remove();
      resolve(data);
    });
  });

  // Get barometer
  const baro = await new Promise<{ pressure: number }>(resolve => {
    const sub = Barometer.addListener((data: { pressure: number }) => {
      sub.remove();
      resolve(data);
    });
  });

  return {
    location,
    accelerometer: accel,
    gyroscope: gyro,
    magnetometer: mag,
    barometer: baro,
  };
}

async function getElevation(lat: number, lon: number) {
  try {
    const response = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`);
    const data = await response.json();
    return data.results[0].elevation; // in meters
  } catch (e) {
    return null;
  }
}

function expectedPressureAtElevation(elevation: number) {
  return 1013.25 * Math.exp(-elevation / 8434.5);
}

function estimateFloor(expectedPressure: number, currentPressure: number, avgFloorHeight = 3.0) {
  // Much less sensitive floor detection - requires larger pressure differences
  const pressureDiff = Math.abs(expectedPressure - currentPressure);
  
  // Only detect floor changes if pressure difference is significant (> 5 hPa)
  if (pressureDiff < 5) {
    return 0; // Ground floor or no significant change
  }
  
  // Reduced sensitivity multiplier (was 9.5, now 3.0)
  const deltaH = (expectedPressure - currentPressure) * 3.0;
  const estimatedFloor = Math.round(deltaH / avgFloorHeight);
  
  // Limit floor range to reasonable values (-5 to +20 floors)
  return Math.max(-5, Math.min(20, estimatedFloor));
}

export async function getFloorEstimation() {
  let location = null;
  let baro = null;
  try {
    location = await LocationService.getCurrentLocation();
  } catch {}
  try {
    baro = await new Promise<{ pressure: number }>(resolve => {
      const sub = Barometer.addListener((data: { pressure: number }) => {
        sub.remove();
        resolve(data);
      });
    });
  } catch {}
  if (!location || !baro) return null;
  const elevation = await getElevation(location.latitude, location.longitude);
  const expectedPressure = elevation ? expectedPressureAtElevation(elevation) : null;
  const predictedFloor = (expectedPressure && baro.pressure)
    ? estimateFloor(expectedPressure, baro.pressure)
    : null;
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy,
    timestamp: location.timestamp,
    barometer: baro.pressure,
    elevation,
    expectedPressure,
    predictedFloor,
  };
}

export { LocationService, type Coordinates }; 