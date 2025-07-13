# GPS Logic Documentation - QuickSecure Mobile App

## Overview
This document describes the GPS location system implementation in the QuickSecure mobile app, focusing on emergency alert functionality and location accuracy.

## Key Changes (Latest Update - Production Ready)
- **Production-ready GPS system addressing all iOS issues**
- **Uses `Accuracy.BestForNavigation` for emergency alerts** - forces real GPS, not network/WiFi
- **Uses `watchPositionAsync` for fresh satellite data** - avoids cached "last known" fixes
- **20-second timeout for cold starts** with clear error messages
- **Uses second GPS update** to ensure fresh data (first might be cached)
- **All GPS functions now use `Accuracy.Highest`** instead of `Balanced`
- **Logs location permissions for debugging iOS precise location issues**
- **Complete removal of caching behavior for emergency alerts**
- **No fallback to cached coordinates** - fresh GPS data is always required
- Alert is only sent after successful fresh GPS acquisition

## Important Notes for Production

### iOS Precise Location
- The app logs location permissions to help debug iOS "Precise Location" issues
- If users have "Precise Location" OFF in Settings, GPS accuracy may be poor
- Users should manually enable Precise Location in Settings for best emergency GPS results
- The `requestTemporaryFullAccuracyAsync` method is not available in expo-location ~18.1.6
- **Production requirement**: Upgrade to newer expo-location version for runtime precise location requests

### Expo Go vs Dev Client
- **Custom plist settings (usage descriptions, accuracy keys) won't apply in stock Expo Go**
- **To use custom iOS location settings, build and install a custom dev client via EAS**
- **Dev client builds will have access to custom Info.plist configurations**
- **For production, use EAS builds instead of Expo Go for full iOS location capabilities**

## Emergency Alert GPS Behavior

### Current Implementation
Emergency alerts now use a **production-ready GPS approach**:

1. **Always fetch fresh satellite GPS data** - no cached coordinates used
2. **Uses `watchPositionAsync` with `Accuracy.BestForNavigation`** - forces real GPS, not network/WiFi
3. **20-second timeout** for GPS acquisition with clear error messages
4. **Uses second GPS update** to ensure fresh data (first might be cached)
5. **Handles iOS restrictions** - Low Power Mode, precise location permissions
6. **No fallback to cached data** - if GPS fails, alert is not sent
7. **Alert only sent after successful GPS acquisition**

### GPS Fetch Process for Emergencies
```typescript
// LocationService.getEmergencyGPS()
1. Check location permissions
2. Check if location services are enabled
3. Use watchPositionAsync with Accuracy.BestForNavigation
4. Wait for second GPS update to ensure fresh data
5. 20-second timeout for cold starts
6. Return fresh satellite coordinates (never cached data)
```

### Emergency Alert Flow
```typescript
// EmergencyService.postEmergencyAlert()
1. Attempt to get fresh GPS data
2. If GPS acquisition fails → throw error, alert not sent
3. If GPS acquisition succeeds → send alert with fresh coordinates
4. No fallback to cached data under any circumstances
```

## Location Service Methods

### `getEmergencyGPS(): Promise<Coordinates>`
- **Purpose**: Get fresh satellite GPS data for emergency alerts
- **Behavior**: Uses watchPositionAsync with Accuracy.BestForNavigation
- **Timeout**: 20 seconds for cold starts
- **Returns**: Fresh satellite coordinates (throws error on failure)
- **Error Handling**: Throws specific error messages for iOS issues

### `getCurrentLocation(): Promise<Coordinates>`
- **Purpose**: Get current location (used by "Get Location" button)
- **Behavior**: Always fetches fresh GPS data
- **Used by**: User interface location requests

### `getLastKnownCoords(): Promise<Coordinates | null>`
- **Purpose**: Get cached location for non-emergency scenarios
- **Behavior**: Returns cached data or attempts fresh fetch if no cache
- **Used by**: Non-emergency features only

## GPS Quality Validation

### Accuracy Assessment
- **Excellent**: ≤ 10m accuracy
- **Good**: 11-25m accuracy  
- **Poor**: > 25m accuracy
- **Valid for emergency**: < 50m accuracy (more lenient for emergencies)

### Validation Process
```typescript
// LocationService.validateLocationAccuracy()
1. Check if accuracy data is available
2. Assess quality level (excellent/good/poor)
3. Determine if coordinates are valid for emergency use
4. Log accuracy information for monitoring
```

## Error Handling

### GPS Acquisition Failures
- **Permission denied**: Alert not sent, user informed
- **Location services disabled**: Alert not sent, user informed
- **GPS timeout (20s)**: Alert not sent, user informed
- **Low Power Mode**: Alert not sent, user informed
- **Poor GPS conditions**: Alert not sent, user informed
- **Invalid coordinates**: Alert not sent, user informed
- **Network/API errors**: Alert not sent, user informed

### User Feedback
- Clear error messages explaining why alert failed
- Instructions to enable location services if needed
- No silent failures - user always knows if alert was sent

## Performance Considerations

### GPS Acquisition Time
- **Target**: < 5 seconds for fresh satellite GPS
- **Timeout**: 20 seconds maximum for cold starts
- **Uses second GPS update** - ensures fresh data
- **No retry logic** - single attempt only
- **No cached fallback** - fresh satellite data required

### Battery Impact
- GPS only activated during emergency trigger
- No continuous background GPS monitoring for emergencies
- Minimal battery impact due to on-demand usage

## Testing and Validation

### Manual Testing
1. **Test GPS Acquisition**: Use "Get Location" button in UserScreen
2. **Test Emergency Alert**: Trigger emergency and verify fresh GPS
3. **Test GPS Failures**: Disable location services and attempt alert
4. **Test Timeout**: Monitor 15-second timeout behavior

### Expected Behaviors
- Emergency alert should always use fresh satellite GPS data
- Alert should fail if GPS cannot be acquired within 20 seconds
- No cached coordinates should ever be used for emergencies
- User should receive clear feedback about GPS status
- GPS coordinates should be displayed in success message

## Code References

### Key Files
- `src/services/LocationService.ts` - GPS logic implementation
- `src/services/EmergencyService.ts` - Emergency alert handling
- `src/screens/UserScreen.tsx` - GPS testing interface

### Key Methods
- `LocationService.getEmergencyGPS()` - Fresh satellite GPS for emergencies
- `LocationService.getCurrentLocation()` - Fresh GPS for UI
- `EmergencyService.postEmergencyAlert()` - Emergency alert with GPS validation

## Troubleshooting

### Common Issues
1. **Alert not sending**: Check location permissions and services
2. **GPS timeout**: Verify device GPS is working properly
3. **Poor accuracy**: Check for GPS interference or indoor usage

### Debug Information
- All GPS operations are logged with timestamps
- Accuracy and quality assessments are logged
- Error conditions are clearly logged with details
- GPS acquisition time is measured and logged

## Current Limitations and Production Requirements

### iOS Precise Location Handling
- **Current**: App logs permissions but cannot programmatically request full accuracy
- **Limitation**: `requestTemporaryFullAccuracyAsync` not available in expo-location ~18.1.6
- **Workaround**: Users must manually enable "Precise Location" in iOS Settings
- **Production**: Upgrade to newer expo-location version for runtime precise location requests

### Expo Go Limitations
- **Current**: Testing in Expo Go with limited iOS location capabilities
- **Limitation**: Custom plist settings don't apply in Expo Go
- **Production**: Must build custom dev client via EAS for full iOS location features
- **Required**: EAS build with custom Info.plist for production deployment

## Future Considerations

### Potential Improvements
- GPS accuracy optimization for indoor environments
- Alternative location methods (WiFi, cell towers) as backup
- Enhanced error recovery mechanisms
- GPS quality metrics and reporting
- Native iOS location API integration for precise location handling

### Monitoring
- Track GPS acquisition success rates
- Monitor GPS accuracy distribution
- Log GPS timeout frequency
- Measure emergency alert GPS performance
- Monitor iOS Precise Location usage patterns 