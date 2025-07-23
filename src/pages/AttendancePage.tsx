// src/pages/AttendancePage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../api/axiosConfig';
import { format } from 'date-fns';

// UPDATED: Interface for Attendance Record from Backend (AttendanceResponseDTO)
interface AttendanceRecordDisplay { // Renamed for clarity in frontend
  attendanceId: number;
  userId: string;     // The actual user ID
  userName: string;   // The name of the user
  checkInTime: string; // ISO String format
}

interface User { // Basic user info for display in dropdowns, or for map
  userId: string;
  name: string;
}

const AttendancePage: React.FC = () => {
  const [userIdInput, setUserIdInput] = useState<string>('');
  const [checkInMessage, setCheckInMessage] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [loadingCheckIn, setLoadingCheckIn] = useState<boolean>(false);

  // UPDATED: Use the new interface for attendanceRecords state
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecordDisplay[]>([]);
  const [usersMap, setUsersMap] = useState<Map<string, string>>(new Map()); // Map userId to userName for display
  const [loadingLogs, setLoadingLogs] = useState<boolean>(true);
  const [errorLogs, setErrorLogs] = useState<string | null>(null);

  const fetchUsersMap = useCallback(async () => {
    try {
      const response = await axiosInstance.get<User[]>('/users');
      const map = new Map<string, string>();
      response.data.forEach(user => map.set(user.userId, user.name));
      setUsersMap(map);
      setErrorLogs(null);
    } catch (err) {
      console.error("Failed to fetch users for map:", err);
      setErrorLogs("Failed to load user names for attendance records.");
    }
  }, []);

  // MODIFIED: Fetch attendance logs - now expects AttendanceResponseDTO
  const fetchAttendanceLogs = useCallback(async () => {
    try {
      setLoadingLogs(true);
      // This endpoint now returns AttendanceResponseDTO
      const response = await axiosInstance.get<AttendanceRecordDisplay[]>('/attendance/all');
      setAttendanceRecords(response.data);
      setErrorLogs(null);
    } catch (err: any) {
      console.error('Failed to fetch attendance logs:', err);
      if (err.response) {
          setErrorLogs(`Failed to load attendance logs: ${err.response.status} - ${err.response.statusText}`);
      } else {
          setErrorLogs('Failed to load attendance logs. Network error or backend down.');
      }
    } finally {
      setLoadingLogs(false);
    }
  }, []);


  // Combined useEffect for initial data fetching
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchUsersMap(); // First, fetch users to ensure map is populated
      await fetchAttendanceLogs(); // Then, fetch logs. fetchAttendanceLogs will now find usersMap ready.
    };
    loadInitialData();
  }, [fetchUsersMap, fetchAttendanceLogs]); // Dependencies

  const handleCheckIn = async (userId: string) => {
    setCheckInMessage(null);
    setCheckInError(null);
    setLoadingCheckIn(true);

    try {
      const response = await axiosInstance.post('/attendance/checkin', { userId });
      const checkedInUserId = response.data.userId; // Get actual userId from response for message
      const userName = usersMap.get(checkedInUserId) || checkedInUserId.substring(0, 8) + '...'; // Use userId itself if name not found
      setCheckInMessage(`User ${userName} checked in successfully at ${format(new Date(response.data.checkInTime), 'HH:mm:ss')}!`);
      setUserIdInput('');
      fetchAttendanceLogs(); // Refresh logs
    } catch (err: any) {
      console.error('Check-in failed:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setCheckInError(err.response.data.message);
      } else {
        setCheckInError('Failed to check in. Please ensure User ID is valid.');
      }
    } finally {
      setLoadingCheckIn(false);
    }
  };

  const handleManualCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userIdInput.trim()) {
      handleCheckIn(userIdInput.trim());
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Attendance System</h1>

      {/* Manual Check-in Form */}
      <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Manual Check-in</h2>
        <form onSubmit={handleManualCheckInSubmit} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-grow">
            <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">Enter Member User ID:</label>
            <input
              type="text"
              id="userId"
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value)}
              placeholder="e.g., e0a0ca55-986e-..."
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          <button
            type="submit"
            disabled={loadingCheckIn}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out h-10"
          >
            {loadingCheckIn ? 'Checking In...' : 'Check In'}
          </button>
        </form>
        {checkInMessage && <p className="text-green-600 mt-2">{checkInMessage}</p>}
        {checkInError && <p className="text-red-600 mt-2">{checkInError}</p>}
      </div>

      {/* Attendance Logs Table */}
      <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-8">Recent Attendance Logs</h2>
      {errorLogs && (
        <p className="text-red-600 text-center mb-4">{errorLogs}</p>
      )}

      {loadingLogs && !attendanceRecords.length ? (
        <p className="text-center text-gray-600">Loading attendance logs...</p>
      ) : (
        <div className="overflow-x-auto">
          {attendanceRecords.length === 0 ? (
            <p className="text-center text-gray-500">No attendance records found.</p>
          ) : (
            <table className="min-w-full bg-white border border-gray-200 shadow-sm rounded-lg">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Record ID</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Member User ID</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Member Name</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Check-in Time</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record) => (
                  <tr key={record.attendanceId} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700 text-sm">{record.attendanceId}</td>
                    <td className="py-3 px-4 text-gray-700 text-sm">{record.userId ? `${record.userId.substring(0, 8)}...` : 'N/A'}</td>
                    <td className="py-3 px-4 text-gray-700">{record.userName || 'Unknown User'}</td> {/* UPDATED: Use record.userName */}
                    <td className="py-3 px-4 text-gray-700">{format(new Date(record.checkInTime), 'yyyy-MM-dd HH:mm:ss')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendancePage;