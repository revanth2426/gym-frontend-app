// src/pages/UsersPage.tsx
import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosConfig'; // Your configured Axios instance
import { format } from 'date-fns'; // For date formatting

// Define User interface (matches backend User entity structure)
interface User {
  userId: string;
  name: string;
  age: number;
  gender: string;
  contactNumber: string;
  membershipStatus: string;
  joiningDate: string; // Will be in YYYY-MM-DD format from backend
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false); // To toggle add/edit form
  const [editingUser, setEditingUser] = useState<User | null>(null); // User currently being edited

  // Form state for new/editing user
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    contactNumber: '',
    membershipStatus: 'Inactive', // Default status
    joiningDate: format(new Date(), 'yyyy-MM-dd'), // Today's date
  });

  // Fetch users on component mount and when dependencies change
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get<User[]>('/users');
      setUsers(response.data);
      setError(null); // Clear any previous errors
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users. Please ensure the backend is running and you are logged in.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const userPayload = {
        ...formData,
        age: parseInt(formData.age), // Convert age to number
        joiningDate: formData.joiningDate, // Ensure date format
        membershipStatus: formData.membershipStatus,
      };

      if (editingUser) {
        // Update existing user
        await axiosInstance.put(`/users/${editingUser.userId}`, userPayload);
      } else {
        // Add new user
        await axiosInstance.post('/users', userPayload);
      }
      setShowForm(false); // Hide form after submission
      setEditingUser(null); // Clear editing state
      setFormData({ // Reset form
        name: '', age: '', gender: '', contactNumber: '', membershipStatus: 'Inactive', joiningDate: format(new Date(), 'yyyy-MM-dd')
      });
      fetchUsers(); // Refresh list
    } catch (err: any) {
      console.error('Failed to save user:', err);
      setError('Failed to save user. Please check your input.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      age: user.age.toString(), // Convert number to string for input field
      gender: user.gender,
      contactNumber: user.contactNumber,
      membershipStatus: user.membershipStatus,
      joiningDate: user.joiningDate,
    });
    setShowForm(true); // Show the form with user data
  };

  const handleDeleteClick = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        setLoading(true);
        await axiosInstance.delete(`/users/${userId}`);
        fetchUsers(); // Refresh list
      } catch (err: any) {
        console.error('Failed to delete user:', err);
        setError('Failed to delete user.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Members Management</h1>

      <button
        onClick={() => {
          setShowForm(!showForm);
          setEditingUser(null); // Clear editing state when toggling
          setFormData({ // Reset form when toggling
            name: '', age: '', gender: '', contactNumber: '', membershipStatus: 'Inactive', joiningDate: format(new Date(), 'yyyy-MM-dd')
          });
        }}
        className="mb-6 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out"
      >
        {showForm ? 'Hide Form' : 'Add New Member'}
      </button>

      {showForm && (
        <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">{editingUser ? 'Edit Member' : 'Add New Member'}</h2>
          <form onSubmit={handleFormSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name:</label>
                <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} required
                       className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-700">Age:</label>
                <input type="number" id="age" name="age" value={formData.age} onChange={handleInputChange} required
                       className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender:</label>
                <select id="gender" name="gender" value={formData.gender} onChange={handleInputChange} required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white">
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700">Contact Number:</label>
                <input type="text" id="contactNumber" name="contactNumber" value={formData.contactNumber} onChange={handleInputChange} required
                       className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div>
                <label htmlFor="membershipStatus" className="block text-sm font-medium text-gray-700">Membership Status:</label>
                <select id="membershipStatus" name="membershipStatus" value={formData.membershipStatus} onChange={handleInputChange} required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
              <div>
                <label htmlFor="joiningDate" className="block text-sm font-medium text-gray-700">Joining Date:</label>
                <input type="date" id="joiningDate" name="joiningDate" value={formData.joiningDate} onChange={handleInputChange} required
                       className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button type="submit" disabled={loading}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out">
                {loading ? 'Saving...' : (editingUser ? 'Update Member' : 'Add Member')}
              </button>
              {editingUser && (
                <button type="button" onClick={() => { setEditingUser(null); setShowForm(false); setFormData({name: '', age: '', gender: '', contactNumber: '', membershipStatus: 'Inactive', joiningDate: format(new Date(), 'yyyy-MM-dd')}); }}
                        className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out">
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {error && (
        <p className="text-red-600 text-center mb-4">{error}</p>
      )}

      {loading && !users.length ? ( // Show loading only if no users are loaded yet
        <p className="text-center text-gray-600">Loading members...</p>
      ) : (
        <div className="overflow-x-auto">
          {users.length === 0 ? (
            <p className="text-center text-gray-500">No members found. Add one above!</p>
          ) : (
            <table className="min-w-full bg-white border border-gray-200 shadow-sm rounded-lg">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">User ID</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Name</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Age</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Gender</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Contact</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Status</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Joining Date</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.userId} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700 text-sm">{user.userId.substring(0, 8)}...</td> {/* Show truncated ID */}
                    <td className="py-3 px-4 text-gray-700">{user.name}</td>
                    <td className="py-3 px-4 text-gray-700">{user.age}</td>
                    <td className="py-3 px-4 text-gray-700">{user.gender}</td>
                    <td className="py-3 px-4 text-gray-700">{user.contactNumber}</td>
                    <td className={`py-3 px-4 font-semibold ${user.membershipStatus === 'Active' ? 'text-green-600' : user.membershipStatus === 'Expired' ? 'text-red-600' : 'text-yellow-600'}`}>
                      {user.membershipStatus}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{user.joiningDate}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => handleEditClick(user)}
                              className="bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-3 rounded-md mr-2">Edit</button>
                      <button onClick={() => handleDeleteClick(user.userId)}
                              className="bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded-md">Delete</button>
                    </td>
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

export default UsersPage;