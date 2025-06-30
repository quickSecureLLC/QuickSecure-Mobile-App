# QuickSecure Mobile App

A React Native mobile application for teacher safety and emergency alert management, integrated with the QuickSecure production API.

## Features

- **Emergency Panic Button**: Hold-to-activate emergency alerts with visual feedback
- **Multiple Alert Types**: Support for emergency, fire, medical, and admin support alerts
- **User Authentication**: Secure login with email, password, and school code
- **Biometric Authentication**: Face ID/Touch ID support for quick access
- **Push Notifications**: Real-time emergency alerts and notifications
- **Location Services**: Automatic location tracking for emergency alerts
- **Offline Support**: Queue alerts when offline, retry when connection restored
- **Role-Based Permissions**: Different access levels for teachers, admins, and super admins

## Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development) or Android Studio (for Android development)
- QuickSecure API credentials and school code

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd QuickSecureMobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   - Update `src/config/api.ts` with your API configuration
   - Set your Expo project ID in `app.config.js`
   - Configure push notification settings

4. **Start the development server**
   ```bash
   npm start
   ```

## API Configuration

The app is configured to work with the QuickSecure production API:

- **Production**: `https://api.quicksecurellc.com`
- **Staging**: `https://staging-api.quicksecurellc.com`
- **Development**: `http://localhost:3000`

### Environment Setup

Set the `NODE_ENV` environment variable to control which API endpoint is used:

```bash
# Production
NODE_ENV=production npm start

# Staging
NODE_ENV=staging npm start

# Development (default)
npm start
```

## Authentication

### Login Flow

1. **Email**: User's email address
2. **Password**: User's password
3. **School Code**: 6-character alphanumeric school identifier

### User Roles

- **Teacher**: Can view alerts, cannot create alerts
- **Admin**: Can create and manage alerts
- **Super Admin**: Full administrative access

### Biometric Authentication

The app supports biometric authentication (Face ID/Touch ID) for quick access after initial login.

## Emergency Features

### Emergency Button

- **Hold-to-Activate**: Press and hold for 3 seconds to trigger emergency alert
- **Visual Feedback**: Progress ring animation during hold
- **Permission Check**: Only admin/super admin users can create alerts

### Alert Types

1. **Emergency**: General emergency (critical priority)
2. **Fire**: Fire emergency (critical priority)
3. **Medical**: Medical emergency (high priority)
4. **Admin Support**: Administrative support request (high priority)

### Quick Actions

- **Call Admin**: Direct phone call to administrator
- **Fire Emergency**: Quick fire alert creation
- **Medical Emergency**: Quick medical alert creation

## Push Notifications

### Setup

1. Configure Firebase project for push notifications
2. Add `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
3. Update Expo project ID in configuration

### Notification Types

- **Emergency Alerts**: Real-time emergency notifications
- **System Updates**: App and system notifications

## Location Services

The app automatically tracks user location for emergency alerts:

- **Background Location**: Continuous location tracking
- **Emergency Location**: Location included with emergency alerts
- **Privacy**: Location only used for emergency purposes

## Offline Support

- **Alert Queuing**: Alerts are queued when offline
- **Automatic Retry**: Queued alerts are sent when connection restored
- **Retry Limits**: Maximum 10 alerts in queue, 30-second retry intervals

## Security Features

- **Secure Storage**: Sensitive data stored using Expo SecureStore
- **Token Management**: JWT tokens with automatic refresh
- **Biometric Security**: Hardware-backed biometric authentication
- **Network Security**: TLS 1.2+ required for API communication

## Development

### Project Structure

```
src/
├── components/          # Reusable UI components
├── config/             # API and app configuration
├── context/            # React context providers
├── navigation/         # Navigation configuration
├── screens/            # App screens
├── services/           # API and utility services
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

### Key Services

- **AuthService**: Authentication and user management
- **EmergencyService**: Emergency alert creation and management
- **PushNotificationService**: Push notification handling
- **LocationService**: Location tracking and management
- **SecureStorage**: Secure data storage

### Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Deployment

### iOS

1. **Configure App Store Connect**
   - Create app record
   - Configure certificates and provisioning profiles

2. **Build for production**
   ```bash
   eas build --platform ios --profile production
   ```

3. **Submit to App Store**
   ```bash
   eas submit --platform ios
   ```

### Android

1. **Configure Google Play Console**
   - Create app record
   - Configure signing keys

2. **Build for production**
   ```bash
   eas build --platform android --profile production
   ```

3. **Submit to Google Play**
   ```bash
   eas submit --platform android
   ```

## API Integration

### Authentication Endpoints

- `POST /api/mobile/auth/login` - User login
- `POST /api/mobile/auth/refresh` - Token refresh

### Alert Endpoints

- `POST /api/mobile/alerts` - Create emergency alert
- `GET /api/mobile/alerts/latest` - Get latest alert
- `GET /api/mobile/alerts` - Get all alerts

### User Management

- `PATCH /api/mobile/users/me/push-token` - Update push token
- `DELETE /api/mobile/users/me/push-token` - Remove push token

## Troubleshooting

### Common Issues

1. **Network Connectivity**
   - Check internet connection
   - Verify API endpoint accessibility
   - Check firewall/proxy settings

2. **Authentication Issues**
   - Verify credentials and school code
   - Check token expiration
   - Clear app data and re-login

3. **Push Notifications**
   - Verify device permissions
   - Check Firebase configuration
   - Test with development tokens

4. **Location Services**
   - Check location permissions
   - Verify GPS is enabled
   - Test in different environments

### Debug Mode

Enable debug logging by setting `API_DEBUG_MODE=true` in the environment.

## Support

For technical support and API integration questions:

- **Email**: mobile-support@quicksecurellc.com
- **Documentation**: https://docs.quicksecurellc.com/api
- **Status Page**: https://status.quicksecurellc.com

## License

Copyright © 2024 QuickSecure LLC. All rights reserved.

## Version History

- **v1.0.0**: Initial production release with full API integration
- **v0.9.0**: Beta release with core emergency features
- **v0.8.0**: Alpha release with basic authentication 