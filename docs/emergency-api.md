# QuickSecure Emergency API Documentation

## Overview
This document outlines the emergency-related API endpoints for the QuickSecure Mobile App. These endpoints handle emergency alerts, lockdown procedures, and status management.

## Base URL
```
http://184.73.75.174:3000/api
```

## Authentication
All endpoints require Bearer token authentication.

**Headers**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>"
}
```

## Endpoints

### 1. Trigger Emergency Alert
Initiates an emergency alert from a teacher's device.

**Endpoint:** `POST /emergency/alert`

**Request Body**
```json
{
  "alertType": "panic",
  "teacherName": "string",
  "timestamp": 1716486112
}
```

| Field | Type | Description |
|-------|------|-------------|
| alertType | string | Type of alert (currently only "panic" supported) |
| teacherName | string | Name of teacher initiating alert |
| timestamp | number | Unix timestamp in milliseconds |

**Success Response** (200 OK)
```json
{
  "success": true,
  "message": "Emergency alert initiated"
}
```

**Error Response** (400/401/500)
```json
{
  "error": "Error message",
  "details": "Optional detailed error information"
}
```

### 2. Trigger Lockdown
Initiates a building-wide lockdown procedure.

**Endpoint:** `POST /emergency/lockdown`

**Request Body**
```json
{
  "timestamp": 1716486112
}
```

**Success Response** (200 OK)
```json
{
  "success": true,
  "message": "Lockdown initiated"
}
```

### 3. Get Emergency Status
Retrieves current emergency status.

**Endpoint:** `GET /emergency/status`

**Success Response** (200 OK)
```json
{
  "success": true,
  "status": "active",
  "type": "panic",
  "timestamp": 1716486112
}
```

| Field | Type | Description |
|-------|------|-------------|
| status | string | Current status ("active" or "inactive") |
| type | string\|null | Type of active emergency if any |
| timestamp | number\|null | When the emergency was initiated |

### 4. Cancel Emergency
Cancels an active emergency.

**Endpoint:** `POST /emergency/cancel`

**Request Body**
```json
{
  "timestamp": 1716486112
}
```

**Success Response** (200 OK)
```json
{
  "success": true,
  "message": "Emergency cancelled"
}
```

## Error Handling

### HTTP Status Codes
- 200: Success
- 400: Bad Request (invalid payload)
- 401: Unauthorized (invalid/missing token)
- 403: Forbidden (insufficient permissions)
- 500: Server Error

### Error Response Format
```json
{
  "error": "Human readable error message",
  "details": "Technical details if available"
}
```

## Client Implementation

### Example: Triggering Emergency Alert
```typescript
async function triggerEmergency(teacherName: string) {
  const response = await fetch('${API_BASE_URL}/emergency/alert', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      alertType: 'panic',
      teacherName,
      timestamp: Date.now()
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to trigger emergency');
  }

  return await response.json();
}
```

### Example: Checking Emergency Status
```typescript
async function checkEmergencyStatus() {
  const response = await fetch('${API_BASE_URL}/emergency/status', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get status');
  }

  return await response.json();
}
```

## Testing

### cURL Examples

1. Test Alert Endpoint
```bash
curl -X POST http://184.73.75.174:3000/api/emergency/alert \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "alertType": "panic",
    "teacherName": "Test Teacher",
    "timestamp": 1716486112
  }'
```

2. Test Lockdown Endpoint
```bash
curl -X POST http://184.73.75.174:3000/api/emergency/lockdown \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "timestamp": 1716486112
  }'
```

3. Check Status
```bash
curl http://184.73.75.174:3000/api/emergency/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Offline Handling
The client implements offline queuing for failed emergency alerts:

1. Failed alerts are stored in AsyncStorage
2. Retry attempts occur every 30 seconds
3. Successful alerts are removed from queue
4. Queue persists across app restarts

## Security Considerations

1. **Authentication**
   - All requests require valid Bearer token
   - Tokens expire after 24 hours
   - Invalid tokens return 401 Unauthorized

2. **Rate Limiting**
   - Emergency alerts are rate-limited
   - Minimum 5 seconds between alerts
   - Prevents accidental duplicate alerts

3. **Validation**
   - All timestamps must be within reasonable range
   - Teacher name required for alerts
   - Alert type must be valid

## Push Notifications
Emergency alerts trigger push notifications to all registered devices:

```json
{
  "aps": {
    "alert": {
      "title": "Emergency Alert",
      "body": "Emergency alert triggered by [Teacher Name]"
    },
    "sound": "default",
    "content-available": 1
  },
  "eventType": "emergency",
  "timestamp": 1716486112
}
``` 