# QuickSecure Mobile App

A React Native mobile application for teacher safety and emergency response management.

## Features

- **Secure Authentication**
  - Username/password login
  - Biometric authentication (Face ID/Touch ID)
  - Secure credential storage
  - Automatic session management

- **Emergency Response System**
  - Quick emergency activation
  - Multiple emergency types support
  - Real-time status updates
  - Room status management

- **User Profile Management**
  - Profile customization
  - Role-based access control
  - Department management
  - Profile image support

- **Security Features**
  - Biometric authentication
  - Secure token storage
  - Encrypted credential management
  - Session timeout handling

## Prerequisites

- Node.js >= 14
- npm or yarn
- iOS development environment (for iOS)
- Android development environment (for Android)
- Expo CLI

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd QuickSecureMobile
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

## Environment Setup

The app uses different API endpoints for development and production. Configure the endpoints in `src/config/api.ts`:

```typescript
const LOCAL_API = 'http://localhost:3002/api';
const NETWORK_API = 'http://10.10.0.124:3002/api';
const USE_LOCAL_API = false; // Set to true for local development
```

## Running the App

- **iOS Simulator:**
```bash
npm run ios
```

- **Android Emulator:**
```bash
npm run android
```

- **Physical Device:**
  - Install Expo Go app
  - Scan QR code from terminal
  - Or run through respective IDE

## Security Features

### Biometric Authentication
- Uses device's native biometric authentication
- Fallback to password authentication
- Secure credential storage using `expo-secure-store`
- Automatic biometric prompt on app launch

### API Authentication
- Token-based authentication
- Secure header management
- Automatic token refresh
- Session timeout handling

## Project Structure

```
QuickSecureMobile/
├── src/
│   ├── components/      # Reusable UI components
│   ├── screens/         # Screen components
│   ├── services/        # API and business logic
│   ├── context/         # React Context providers
│   ├── config/          # Configuration files
│   └── assets/          # Static assets
├── App.tsx             # Main application component
└── package.json        # Project dependencies
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is proprietary and confidential. All rights reserved by QuickSecure LLC.

## Support

For support, please contact support@quicksecurellc.com 