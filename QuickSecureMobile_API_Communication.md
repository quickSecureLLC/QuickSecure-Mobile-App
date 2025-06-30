# QuickSecure Mobile App – API Communication Overview

This document explains how the QuickSecure Mobile app communicates with the backend server for all major features, including authentication, alert posting, push notification token management, and user profile. It details the endpoints, payloads, headers, and code paths for each operation.

---

## 1. Authentication (Login)

- **Endpoint:** `POST http://184.73.75.174:3000/api/mobile/auth/login`
- **Headers:**
  - `Content-Type: application/json`
- **Payload:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "schoolCode": "ABC123"
  }
  ```
- **Code Path:**
  - `src/services/AuthService.ts` → `AuthService.login()`
- **Response:**
  ```json
  {
    "success": true,
    "token": "<JWT_TOKEN_STRING>",
    "user": { ... }
  }
  ```

---

## 2. Post an Alert (All Types)

- **Endpoint:** `POST http://184.73.75.174:3000/api/mobile/alerts`
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN_STRING>`
  - `Content-Type: application/json`
- **Payload (all types, including admin support):**
  ```json
  {
    "type": "<alert_type>",
    "details": "<details_message>",
    "coordinates": {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "accuracy": 5.0,
      "timestamp": 1719859200000
    }
  }
  ```
  - `coordinates` is included if available (all alert types, including admin support).
  - `type` must be one of: `emergency`, `lockdown`, `fire`, `medical`, `admin support`, `warning`, `info`, `maintenance`, `evacuation`, `all-clear`.
- **Code Path:**
  - `src/services/EmergencyService.ts` → `EmergencyService.postEmergencyAlert()`
  - Called from: `HomeScreen.tsx`, `AppContent.tsx`, etc.
- **Example for Admin Support:**
  ```json
  {
    "type": "admin support",
    "details": "Admin assistance needed in main office",
    "coordinates": { ... }
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "alert": { ... }
  }
  ```

---

## 3. Push Notification Token Registration

- **Endpoint:** `PATCH http://184.73.75.174:3000/api/mobile/users/me/push-token`
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN_STRING>`
  - `Content-Type: application/json`
- **Payload:**
  ```json
  {
    "token": "<FCM_OR_APNS_DEVICE_TOKEN>",
    "platform": "ios" | "android",
    "app_version": "1.0.0"
  }
  ```
- **Code Path:**
  - `src/services/PushNotificationService.ts` → `PushNotificationService.registerDeviceToken()`
- **Response:**
  ```json
  {
    "success": true,
    "user": { ... }
  }
  ```

---

## 4. Remove Push Notification Token (Logout)

- **Endpoint:** `DELETE http://184.73.75.174:3000/api/mobile/users/me/push-token`
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN_STRING>`
- **Code Path:**
  - `src/services/PushNotificationService.ts` → `PushNotificationService.removeDeviceToken()`

---

## 5. Get User Profile

- **Endpoint:** `GET http://184.73.75.174:3000/api/mobile/users/me`
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN_STRING>`
- **Code Path:**
  - `src/services/AuthService.ts` → `AuthService.getUserProfile()`

---

## 6. Token Refresh

- **Endpoint:** `POST http://184.73.75.174:3000/api/mobile/auth/refresh`
- **Headers:**
  - `Content-Type: application/json`
- **Payload:**
  ```json
  {
    "refresh_token": "<REFRESH_TOKEN_STRING>"
  }
  ```
- **Code Path:**
  - `src/services/AuthService.ts` → `AuthService.refreshToken()`

---

## 7. Get Alerts (List, Latest)

- **Endpoint (all alerts):** `GET http://184.73.75.174:3000/api/mobile/alerts?limit=20&offset=0`
- **Endpoint (latest):** `GET http://184.73.75.174:3000/api/mobile/alerts/latest`
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN_STRING>`
- **Code Path:**
  - `src/services/EmergencyService.ts` → `EmergencyService.getAllAlerts()`, `EmergencyService.getLatestAlert()`

---

## 8. Health Check

- **Endpoint:** `GET http://184.73.75.174:3000/api/health`
- **Code Path:**
  - `src/config/api.ts` → `API_ENDPOINTS.health`

---

## 9. General Notes

- All API URLs are constructed using `getApiUrl()` in `src/config/api.ts`.
- All requests use the correct headers and JWT authentication where required.
- All alert types, including admin support, are sent with the same payload structure for consistency.
- Error handling is implemented for all endpoints, with user feedback on failure.

---

**For further details, see the relevant service files in `src/services/` and the API config in `src/config/api.ts`.** 