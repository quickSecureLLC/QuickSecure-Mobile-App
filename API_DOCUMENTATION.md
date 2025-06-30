# QuickSecure API Documentation

## Table of Contents
- [Overview](#overview)
- [Server Configuration](#server-configuration)
- [Authentication](#authentication)
- [Room Management](#room-management)
- [Emergency Management](#emergency-management)
- [App Data Submission](#app-data-submission)
- [iOS Implementation](#ios-implementation)
  - [API Configuration](#1-api-configuration)
  - [Models](#2-models)
  - [Authentication Service](#3-authentication-service)
  - [Room Service](#4-room-service)
  - [App Data Service](#5-app-data-service)
  - [Usage Examples](#6-usage-examples)
- [Setup Requirements](#setup-requirements)
- [Testing](#testing)
- [Security Considerations](#security-considerations)
- [Best Practices](#best-practices)

## Overview
This documentation covers the complete API integration for the QuickSecure system, including both server endpoints and iOS client implementation. The API now supports comprehensive two-way communication between the mobile app and server.

## Server Configuration
- Base URL: `http://${hostname}:3002/api`
- Authentication: Bearer token
- Data Format: JSON
- Session Management: HTTP-only cookies for web clients, Bearer tokens for mobile apps

## Authentication

### Login Endpoint
```http
POST /api/login
Content-Type: application/json
```

Request Body:
```json
{
  "username": "string",
  "password": "string",
  "client_type": "ios_app"
}
```

Response:
```json
{
  "success": true,
  "user": {
    "id": "string",
    "username": "string",
    "role": "teacher" | "admin" | "staff"
  },
  "token": "64-character-hex-string",
  "expires_at": "2024-04-21T12:34:56.789Z"
}
```

Example curl:
```bash
curl -X POST http://localhost:3002/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "teacher",
    "password": "TeacherPass123!",
    "client_type": "ios_app"
  }'
```

### Authentication Check
```http
GET /api/auth/check
Authorization: Bearer <token>
```

Response:
```json
{
  "authenticated": true,
  "user": {
    "id": "string",
    "username": "string",
    "role": "string"
  }
}
```

## Room Management

### Get Room Status
```http
GET /api/rooms
Authorization: Bearer <token>
```

Response:
```json
{
  "rooms": [
    {
      "name": "string",
      "status": "Locked" | "Unlocked" | "Unsafe"
    }
  ],
  "stats": {
    "locked": number,
    "safeHavens": number,
    "unlocked": number
  }
}
```

### Update Room Status
```http
PUT /api/rooms/:roomName
Authorization: Bearer <token>
Content-Type: application/json
```

Request Body:
```json
{
  "status": "Locked" | "Unlocked" | "Unsafe"
}
```

## Emergency Management

### Trigger Emergency Action
```http
POST /api/emergency/:actionType
Authorization: Bearer <token>
```

Parameters:
- `actionType`: One of `lockdown`, `fireEvac`, `medical`

Response:
```json
{
  "success": true,
  "message": "actionType procedure initiated"
}
```

### Submit Alert
```http
POST /api/alert
Authorization: Bearer <token>
Content-Type: application/json
```

Request Body:
```json
{
  "alertType": "panic" | "lockdown",
  "coordinates": {
    "latitude": number,
    "longitude": number
  }
}
```

Response:
```json
{
  "success": true,
  "alertId": "string",
  "timestamp": "2024-04-21T12:34:56.789Z"
}
```

## App Data Submission

### Submit User Feedback
```http
POST /api/app/feedback
Authorization: Bearer <token>
Content-Type: application/json
```

Request Body:
```json
{
  "feedback_type": "bug" | "feature" | "general",
  "message": "string",
  "metadata": {
    "app_version": "string",
    "device_model": "string",
    "additional_info": "any"
  }
}
```

Response:
```json
{
  "success": true,
  "feedbackId": "string",
  "timestamp": "2024-04-21T12:34:56.789Z"
}
```

### Submit Analytics Data
```http
POST /api/app/analytics
Authorization: Bearer <token>
Content-Type: application/json
```

Request Body:
```json
{
  "event_type": "string",
  "event_data": {
    "screen": "string",
    "action": "string",
    "duration": "number",
    "additional_data": "any"
  }
}
```

Response:
```json
{
  "success": true,
  "eventId": "string",
  "timestamp": "2024-04-21T12:34:56.789Z"
}
```

### Submit Error Reports
```http
POST /api/app/errors
Authorization: Bearer <token>
Content-Type: application/json
```

Request Body:
```json
{
  "error_type": "string",
  "error_message": "string",
  "stack_trace": "string",
  "device_info": {
    "model": "string",
    "os_version": "string",
    "app_version": "string"
  }
}
```

Response:
```json
{
  "success": true,
  "errorId": "string",
  "timestamp": "2024-04-21T12:34:56.789Z"
}
```

### User Settings Management

#### Get Settings
```http
GET /api/app/settings
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "settings": {
    "notifications": {
      "enabled": boolean,
      "types": ["string"]
    },
    "display": {
      "theme": "string",
      "fontSize": "string"
    }
  }
}
```

#### Update Settings
```http
PUT /api/app/settings
Authorization: Bearer <token>
Content-Type: application/json
```

Request Body:
```json
{
  "settings": {
    "notifications": {
      "enabled": boolean,
      "types": ["string"]
    },
    "display": {
      "theme": "string",
      "fontSize": "string"
    }
  }
}
```

Response:
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

## iOS Implementation

### 1. API Configuration
```swift
// APIConfig.swift
struct APIConfig {
    static let baseURL = "http://\(UIDevice.current.hostname):3002/api"
}
```

### 2. Models
```swift
// Models.swift
struct APIResponse<T: Codable>: Codable {
    let success: Bool
    let data: T?
    let error: String?
}

struct FeedbackRequest: Codable {
    let feedback_type: String
    let message: String
    let metadata: [String: Any]?
}

struct AnalyticsEvent: Codable {
    let event_type: String
    let event_data: [String: Any]
}

struct ErrorReport: Codable {
    let error_type: String
    let error_message: String
    let stack_trace: String?
    let device_info: DeviceInfo
}

struct DeviceInfo: Codable {
    let model: String
    let os_version: String
    let app_version: String
}

struct UserSettings: Codable {
    var notifications: NotificationSettings
    var display: DisplaySettings
}
```

### 3. Authentication Service
```swift
class AuthService {
    static func login(username: String, password: String) async throws -> String {
        let url = URL(string: "\(APIConfig.baseURL)/login")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = [
            "username": username,
            "password": password,
            "client_type": "ios_app"
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
        
        let loginResponse = try JSONDecoder().decode(LoginResponse.self, from: data)
        return loginResponse.token
    }
}
```

### 4. Room Service
```swift
class RoomService {
    static func updateRoomStatus(roomName: String, status: RoomStatus) async throws -> Bool {
        let url = URL(string: "\(APIConfig.baseURL)/rooms/\(roomName)")!
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        guard let token = KeychainManager.getToken() else {
            throw APIError.unauthorized
        }
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let body = ["status": status.rawValue]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (_, response) = try await URLSession.shared.data(for: request)
        return (response as? HTTPURLResponse)?.statusCode == 200
    }
}
```

### 5. App Data Service
```swift
class AppDataService {
    static func submitFeedback(_ feedback: FeedbackRequest) async throws {
        let url = URL(string: "\(APIConfig.baseURL)/app/feedback")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        guard let token = KeychainManager.getToken() else {
            throw APIError.unauthorized
        }
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        request.httpBody = try JSONEncoder().encode(feedback)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
    }
    
    static func logAnalytics(_ event: AnalyticsEvent) async throws {
        let url = URL(string: "\(APIConfig.baseURL)/app/analytics")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        guard let token = KeychainManager.getToken() else {
            throw APIError.unauthorized
        }
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        request.httpBody = try JSONEncoder().encode(event)
        
        let (_, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            throw APIError.invalidResponse
        }
    }
    
    static func reportError(_ error: ErrorReport) async throws {
        let url = URL(string: "\(APIConfig.baseURL)/app/errors")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        guard let token = KeychainManager.getToken() else {
            throw APIError.unauthorized
        }
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        request.httpBody = try JSONEncoder().encode(error)
        
        let (_, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            throw APIError.invalidResponse
        }
    }
    
    static func getUserSettings() async throws -> UserSettings {
        let url = URL(string: "\(APIConfig.baseURL)/app/settings")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        
        guard let token = KeychainManager.getToken() else {
            throw APIError.unauthorized
        }
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
        
        let settingsResponse = try JSONDecoder().decode(APIResponse<UserSettings>.self, from: data)
        guard let settings = settingsResponse.data else {
            throw APIError.invalidResponse
        }
        return settings
    }
    
    static func updateUserSettings(_ settings: UserSettings) async throws {
        let url = URL(string: "\(APIConfig.baseURL)/app/settings")!
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        guard let token = KeychainManager.getToken() else {
            throw APIError.unauthorized
        }
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        request.httpBody = try JSONEncoder().encode(["settings": settings])
        
        let (_, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            throw APIError.invalidResponse
        }
    }
}
```

### 6. Usage Examples

#### Submit Feedback
```swift
do {
    let feedback = FeedbackRequest(
        feedback_type: "bug",
        message: "App crashes when opening room map",
        metadata: [
            "app_version": "1.2.3",
            "device_model": "iPhone 15 Pro"
        ]
    )
    try await AppDataService.submitFeedback(feedback)
} catch {
    print("Failed to submit feedback:", error)
}
```

#### Log Analytics
```swift
do {
    let event = AnalyticsEvent(
        event_type: "room_status_change",
        event_data: [
            "room": "Room101",
            "old_status": "unlocked",
            "new_status": "locked",
            "duration": 1.5
        ]
    )
    try await AppDataService.logAnalytics(event)
} catch {
    print("Failed to log analytics:", error)
}
```

#### Report Error
```swift
do {
    let deviceInfo = DeviceInfo(
        model: UIDevice.current.model,
        os_version: UIDevice.current.systemVersion,
        app_version: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown"
    )
    
    let errorReport = ErrorReport(
        error_type: "network_error",
        error_message: "Failed to connect to server",
        stack_trace: "...",
        device_info: deviceInfo
    )
    try await AppDataService.reportError(errorReport)
} catch {
    print("Failed to report error:", error)
}
```

## Setup Requirements

### 1. Info.plist Configuration
Add the following to allow local network requests:
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

### 2. Network Permissions
Ensure the app has the following permissions:
- Local Network Access
- Background Network Access (if needed)

### 3. Error Handling
```swift
enum APIError: LocalizedError {
    case unauthorized
    case invalidResponse
    case networkError
    case serverError(String)
    
    var errorDescription: String? {
        switch self {
        case .unauthorized:
            return "Please log in again"
        case .invalidResponse:
            return "Server returned an invalid response"
        case .networkError:
            return "Network connection error"
        case .serverError(let message):
            return message
        }
    }
}
```

### 4. Token Management
```swift
class KeychainManager {
    static func saveToken(_ token: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: "quicksecure_token",
            kSecValueData as String: token.data(using: .utf8)!
        ]
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }
    
    static func getToken() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: "quicksecure_token",
            kSecReturnData as String: true
        ]
        
        var result: AnyObject?
        SecItemCopyMatching(query as CFDictionary, &result)
        
        if let data = result as? Data {
            return String(data: data, encoding: .utf8)
        }
        return nil
    }
}
```

## Testing

### Network Testing
Test all endpoints with different network conditions:
```swift
class NetworkTests: XCTestCase {
    func testFeedbackSubmission() async throws {
        let feedback = FeedbackRequest(
            feedback_type: "test",
            message: "Test feedback",
            metadata: nil
        )
        try await AppDataService.submitFeedback(feedback)
    }
    
    func testAnalyticsLogging() async throws {
        let event = AnalyticsEvent(
            event_type: "test_event",
            event_data: ["test": true]
        )
        try await AppDataService.logAnalytics(event)
    }
}
```

## Security Considerations

1. **Token Storage**
   - Always use Keychain for token storage
   - Never store tokens in UserDefaults
   - Clear tokens on logout

2. **Network Security**
   - Use HTTPS in production
   - Implement certificate pinning
   - Validate server certificates

3. **Data Privacy**
   - Only collect necessary analytics data
   - Anonymize sensitive information
   - Follow data protection regulations

## Best Practices

1. **API Calls**
   - Use async/await for cleaner code
   - Implement proper error handling
   - Add request timeouts
   - Handle weak network conditions

2. **Data Submission**
   - Batch analytics events when possible
   - Implement retry logic for failed submissions
   - Queue data when offline
   - Compress large payloads

3. **Error Reporting**
   - Include relevant context in error reports
   - Sanitize sensitive information
   - Implement crash reporting
   - Add logging levels

4. **User Settings**
   - Cache settings locally
   - Implement conflict resolution
   - Validate settings before saving
   - Handle migration of settings 