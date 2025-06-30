# Call Admin API Issue Report

## Summary
The "Call Admin" feature in the QuickSecure Mobile app is not working due to a server-side validation error. When attempting to post an `admin support` alert, the server responds with a 400 Bad Request, stating that the alert type is invalid—even though the payload matches the documented API requirements.

---

## Error Details
- **HTTP Status:** 400 Bad Request
- **Error Message:**
  > Invalid alert type. Valid types: emergency, warning, info, maintenance, lockdown, evacuation, all-clear, fire, medical, admin support

---

## Request Details
- **Endpoint:** `POST http://184.73.75.174:3000/api/alerts`
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN_STRING>`
  - `Content-Type: application/json`
- **Payload Example:**
```json
{
  "type": "admin support",
  "details": "Admin assistance needed in main office",
  "coordinates": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "accuracy": 5.0,
    "timestamp": 1719859200000
  }
}
```

---

## Evidence from App
- The app is sending the `type` field as **exactly** `"admin support"` (string, lower case, with a single space).
- The error message from the server lists `admin support` as a valid type, but still rejects the request.
- Other alert types (e.g., `emergency`, `fire`, `medical`) work as expected.

---

## Steps to Reproduce
1. Log in as an admin user in the QuickSecure Mobile app.
2. Trigger the "Call Admin" feature (which posts an alert with `type: "admin support"`).
3. Observe the 400 error and the server's error message about invalid alert type.

---

## Conclusion & Request
- The mobile app is sending the correct payload as per the API documentation.
- The server is incorrectly rejecting the `admin support` type, even though it is listed as valid.
- **Please investigate the server-side validation logic for the `type` field in the `/api/alerts` endpoint.**
- Confirm that `admin support` is accepted as a valid type and that there are no typos, case mismatches, or whitespace issues in the server's validation code.

---

**Contact:**
- Mobile App Developer: [Your Name]
- Date: [Today's Date] 