# QuickSecure Mobile App - API Documentation

## Overview
The QuickSecure mobile app communicates with the backend server to manage room statuses, handle emergency situations, and maintain real-time security information. All API interactions are handled through the `RoomService` class located in `src/services/RoomService.ts`.

## Base Configuration
```typescript
const API_BASE_URL = 'https://api.quicksecure.example'; // Replace with your actual API URL
```

## API Endpoints

### 1. Room Status Management

#### Get Room Statuses
```typescript
GET ${API_BASE_URL}/rooms
```

**Response Format:**
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

**Implementation:**
```typescript
static async getRoomStatuses(): Promise<RoomResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms`);
    if (!response.ok) throw new Error('Failed to fetch room statuses');
    return await response.json();
  } catch (error) {
    // Fallback data provided if API fails
    return {
      rooms: [
        { name: 'Gym', status: 'Locked' },
        { name: 'Office 6', status: 'Unsafe' },
        { name: 'S2', status: 'Unsafe' },
        { name: 'Cafeteria', status: 'Locked' }
      ],
      stats: {
        locked: 11,
        safeHavens: 3,
        unlocked: 3
      }
    };
  }
}
```

#### Update Room Status
```typescript
PUT ${API_BASE_URL}/rooms/${roomName}
```

**Request Body:**
```json
{
  "status": "Locked" | "Unlocked" | "Unsafe"
}
```

**Implementation:**
```typescript
static async updateRoomStatus(
  roomName: string, 
  status: RoomStatus
): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/rooms/${roomName}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      }
    );
    return response.ok;
  } catch (error) {
    return false;
  }
}
```

### 2. Emergency Actions

#### Trigger Emergency Procedure
```typescript
POST ${API_BASE_URL}/emergency/${actionType}
```

**Action Types:**
- `lockdown`: Initiates building lockdown
- `fireEvac`: Triggers fire evacuation protocol
- `medical`: Activates medical emergency response

**Implementation:**
```typescript
static async triggerEmergencyAction(
  actionType: 'lockdown' | 'fireEvac' | 'medical'
): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/emergency/${actionType}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.ok;
  } catch (error) {
    return false;
  }
}
```

## Error Handling

The service implements comprehensive error handling:

1. **Network Errors:**
   - All API calls are wrapped in try-catch blocks
   - Failed requests return appropriate fallback data or false
   - Errors are logged to console for debugging
   - User-friendly error messages via Alert component

2. **Response Validation:**
   - HTTP response status checked via `response.ok`
   - Invalid responses trigger error handling
   - Type safety enforced through TypeScript interfaces

## Data Types

```typescript
export type RoomStatus = 'Locked' | 'Unlocked' | 'Unsafe';

export interface Room {
  name: string;
  status: RoomStatus;
}

export interface RoomStats {
  locked: number;
  safeHavens: number;
  unlocked: number;
}

export interface RoomResponse {
  rooms: Room[];
  stats: RoomStats;
}
```

## Usage in Components

### Fetching Room Data
```typescript
const [rooms, setRooms] = useState<Room[]>([]);
const [stats, setStats] = useState<RoomStats>({
  locked: 0,
  safeHavens: 0,
  unlocked: 0
});

useEffect(() => {
  // Initial fetch
  fetchRoomStatuses();
  
  // Auto-refresh every 30 seconds
  const interval = setInterval(fetchRoomStatuses, 30000);
  return () => clearInterval(interval);
}, []);

const fetchRoomStatuses = async () => {
  const response = await RoomService.getRoomStatuses();
  setRooms(response.rooms);
  setStats(response.stats);
};
```

### Updating Room Status
```typescript
const handleRoomStatusUpdate = async (
  roomName: string, 
  newStatus: RoomStatus
) => {
  const success = await RoomService.updateRoomStatus(roomName, newStatus);
  if (success) {
    fetchRoomStatuses(); // Refresh data after successful update
  }
};
```

### Triggering Emergency Actions
```typescript
const handleEmergencyAction = async (
  actionType: 'lockdown' | 'fireEvac' | 'medical'
) => {
  const success = await RoomService.triggerEmergencyAction(actionType);
  if (success) {
    Alert.alert('Success', `${actionType} procedure initiated`);
  }
};
```

## Integration Testing

To test the API integration:

1. Replace `API_BASE_URL` with your actual API endpoint
2. Ensure all required endpoints are implemented on the backend
3. Test error scenarios by temporarily disabling network connectivity
4. Verify fallback data appears when API is unavailable
5. Test auto-refresh functionality with network state changes

## Security Considerations

1. **API Authentication:**
   - Implement token-based authentication
   - Add authorization headers to requests
   - Handle token refresh and expiration

2. **Data Protection:**
   - Use HTTPS for all API calls
   - Implement request timeout
   - Add request retry logic for failed calls

3. **Error Recovery:**
   - Implement exponential backoff for retries
   - Cache critical data for offline access
   - Provide clear user feedback on connection issues

## Future Improvements

1. **Real-time Updates:**
   - Implement WebSocket connection for instant updates
   - Add push notification support
   - Reduce polling interval load

2. **Offline Support:**
   - Implement local storage caching
   - Add offline queue for status updates
   - Sync when connection restored

3. **Performance:**
   - Add request debouncing
   - Implement response caching
   - Optimize data payload size 