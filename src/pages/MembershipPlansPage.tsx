// src/pages/MembershipPlansPage.tsx
import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosConfig';
import { format } from 'date-fns';

// Define interfaces for data (matches backend DTOs/Entities)
interface MembershipPlan {
  planId: number;
  planName: string;
  price: number;
  durationMonths: number;
  featuresList: string;
}

interface User { // Basic user interface needed for plan assignment dropdown
  userId: string;
  name: string;
}

// UPDATED: Interface for PlanAssignment from Backend (PlanAssignmentResponseDTO)
interface PlanAssignmentDisplay { // Renamed from PlanAssignment to avoid confusion
  assignmentId: number;
  userName: string; // Now a direct string from DTO
  planName: string; // Now a direct string from DTO
  startDate: string;
  endDate: string;
  userId?: string; // Optional, only if needed by frontend
  planId?: number;  // Optional
}

const MembershipPlansPage: React.FC = () => {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [users, setUsers] = useState<User[]>([]); // To populate user dropdown for assignment
  // UPDATED: Use the new interface for planAssignments state
  const [planAssignments, setPlanAssignments] = useState<PlanAssignmentDisplay[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for Plan CRUD Form
  const [showPlanForm, setShowPlanForm] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [planFormData, setPlanFormData] = useState({
    planName: '',
    price: '',
    durationMonths: '',
    featuresList: '',
  });

  // State for Plan Assignment Form
  const [showAssignForm, setShowAssignForm] = useState<boolean>(false);
  const [assignFormData, setAssignFormData] = useState({
    userId: '',
    planId: '',
    startDate: format(new Date(), 'yyyy-MM-dd'), // Default to today
  });

  useEffect(() => {
    fetchPlans();
    fetchUsersForAssignment(); // Fetch users when component mounts
    fetchAllPlanAssignments(); // Fetch all assignments
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get<MembershipPlan[]>('/plans');
      setPlans(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch plans:', err);
      setError('Failed to load plans. Please ensure the backend is running and you are logged in.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersForAssignment = async () => {
    try {
      const response = await axiosInstance.get<User[]>('/users');
      // Filter to get only userId and name for the dropdown
      setUsers(response.data.map(user => ({ userId: user.userId, name: user.name })));
    } catch (err: any) {
      console.error('Failed to fetch users for assignment:', err);
    }
  };

  const fetchAllPlanAssignments = async () => {
    try {
      setLoading(true);
      const allUsersRes = await axiosInstance.get<User[]>('/users'); // Still need users to loop through

      const assignments: PlanAssignmentDisplay[] = []; // Use the new display interface

      // Fetch assignments for each user
      for (const user of allUsersRes.data) {
          // Endpoint now returns PlanAssignmentResponseDTO, which matches PlanAssignmentDisplay
          const userAssignmentsRes = await axiosInstance.get<PlanAssignmentDisplay[]>(`/plans/user/${user.userId}/assignments`);
          assignments.push(...userAssignmentsRes.data);
      }
      setPlanAssignments(assignments);
    } catch (err: any) {
        console.error('Failed to fetch plan assignments:', err);
        setError('Failed to load plan assignments.');
    } finally {
        setLoading(false);
    }
  };


  // --- Plan CRUD Handlers ---
  const handlePlanInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPlanFormData({ ...planFormData, [name]: value });
  };

  const handlePlanFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const planPayload = {
        ...planFormData,
        price: parseFloat(planFormData.price),
        durationMonths: parseInt(planFormData.durationMonths),
      };

      if (editingPlan) {
        await axiosInstance.put(`/plans/${editingPlan.planId}`, planPayload);
      } else {
        await axiosInstance.post('/plans', planPayload);
      }
      setShowPlanForm(false);
      setEditingPlan(null);
      setPlanFormData({ planName: '', price: '', durationMonths: '', featuresList: '' });
      fetchPlans(); // Refresh plans list
      fetchAllPlanAssignments(); // Refresh assignments in case plan names updated
    } catch (err: any) {
      console.error('Failed to save plan:', err);
      setError('Failed to save plan. Please check your input.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPlanClick = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setPlanFormData({
      planName: plan.planName,
      price: plan.price.toString(),
      durationMonths: plan.durationMonths.toString(),
      featuresList: plan.featuresList,
    });
    setShowPlanForm(true);
  };

  const handleDeletePlanClick = async (planId: number) => {
    if (window.confirm('Are you sure you want to delete this plan? This will also remove associated assignments!')) {
      try {
        setLoading(true);
        await axiosInstance.delete(`/plans/${planId}`);
        fetchPlans(); // Refresh plans list
        fetchAllPlanAssignments(); // Refresh assignments list
      } catch (err: any) {
        console.error('Failed to delete plan:', err);
        setError('Failed to delete plan.');
      } finally {
        setLoading(false);
      }
    }
  };

  // --- Plan Assignment Handlers ---
  const handleAssignInputChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setAssignFormData({ ...assignFormData, [name]: value });
  };

  const handleAssignFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const assignmentPayload = {
        userId: assignFormData.userId,
        planId: parseInt(assignFormData.planId),
        startDate: assignFormData.startDate, // YYYY-MM-DD
      };
      await axiosInstance.post('/plans/assign', assignmentPayload);
      setShowAssignForm(false);
      setAssignFormData({ userId: '', planId: '', startDate: format(new Date(), 'yyyy-MM-dd') }); // Reset form
      fetchAllPlanAssignments(); // Refresh assignments list
      fetchUsersForAssignment(); // Re-fetch users to update their membership status
    } catch (err: any) {
      console.error('Failed to assign plan:', err);
      setError('Failed to assign plan. Ensure user and plan exist.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Membership Plans Management</h1>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => {
            setShowPlanForm(!showPlanForm);
            setEditingPlan(null);
            setPlanFormData({ planName: '', price: '', durationMonths: '', featuresList: '' });
            setShowAssignForm(false); // Hide assign form if showing
          }}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out"
        >
          {showPlanForm ? 'Hide Plan Form' : 'Add/Edit Plans'}
        </button>
        <button
          onClick={() => {
            setShowAssignForm(!showAssignForm);
            setAssignFormData({ userId: '', planId: '', startDate: format(new Date(), 'yyyy-MM-dd') });
            setShowPlanForm(false); // Hide plan form if showing
          }}
          className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out"
        >
          {showAssignForm ? 'Hide Assign Form' : 'Assign Plan to Member'}
        </button>
      </div>

      {error && (
        <p className="text-red-600 text-center mb-4">{error}</p>
      )}

      {/* Plan CRUD Form */}
      {showPlanForm && (
        <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">{editingPlan ? 'Edit Membership Plan' : 'Add New Membership Plan'}</h2>
          <form onSubmit={handlePlanFormSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="planName" className="block text-sm font-medium text-gray-700">Plan Name:</label>
                <input type="text" id="planName" name="planName" value={planFormData.planName} onChange={handlePlanInputChange} required
                       className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price:</label>
                <input type="number" id="price" name="price" value={planFormData.price} onChange={handlePlanInputChange} required step="0.01"
                       className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div>
                <label htmlFor="durationMonths" className="block text-sm font-medium text-gray-700">Duration (Months):</label>
                <input type="number" id="durationMonths" name="durationMonths" value={planFormData.durationMonths} onChange={handlePlanInputChange} required
                       className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div>
                <label htmlFor="featuresList" className="block text-sm font-medium text-gray-700">Features (comma-separated):</label>
                <textarea id="featuresList" name="featuresList" value={planFormData.featuresList} onChange={handlePlanInputChange}
                          rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"></textarea>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button type="submit" disabled={loading}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out">
                {loading ? 'Saving...' : (editingPlan ? 'Update Plan' : 'Add Plan')}
              </button>
              {editingPlan && (
                <button type="button" onClick={() => { setEditingPlan(null); setShowPlanForm(false); setPlanFormData({planName: '', price: '', durationMonths: '', featuresList: ''}); }}
                        className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out">
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Plan Assignment Form */}
      {showAssignForm && (
        <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Assign Plan to Member</h2>
          <form onSubmit={handleAssignFormSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="userId" className="block text-sm font-medium text-gray-700">Select Member:</label>
                <select id="userId" name="userId" value={assignFormData.userId} onChange={handleAssignInputChange} required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white">
                  <option value="">-- Select a Member --</option>
                  {users.map(user => (
                    <option key={user.userId} value={user.userId}>{user.name} ({user.userId.substring(0,8)}...)</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="planId" className="block text-sm font-medium text-gray-700">Select Plan:</label>
                <select id="planId" name="planId" value={assignFormData.planId} onChange={handleAssignInputChange} required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white">
                  <option value="">-- Select a Plan --</option>
                  {plans.map(plan => (
                    <option key={plan.planId} value={plan.planId}>{plan.planName} (${plan.price} / {plan.durationMonths}mo)</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date:</label>
                <input type="date" id="startDate" name="startDate" value={assignFormData.startDate} onChange={handleAssignInputChange} required
                       className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button type="submit" disabled={loading}
                      className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out">
                {loading ? 'Assigning...' : 'Assign Plan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Membership Plans Table */}
      <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-8">All Membership Plans</h2>
      {loading && !plans.length ? (
        <p className="text-center text-gray-600">Loading plans...</p>
      ) : (
        <div className="overflow-x-auto mb-8">
          {plans.length === 0 ? (
            <p className="text-center text-gray-500">No membership plans found. Add one above!</p>
          ) : (
            <table className="min-w-full bg-white border border-gray-200 shadow-sm rounded-lg">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Plan ID</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Plan Name</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Price</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Duration (Months)</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Features</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.planId} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700 text-sm">{plan.planId}</td>
                    <td className="py-3 px-4 text-gray-700">{plan.planName}</td>
                    <td className="py-3 px-4 text-gray-700">${plan.price.toFixed(2)}</td>
                    <td className="py-3 px-4 text-gray-700">{plan.durationMonths}</td>
                    <td className="py-3 px-4 text-gray-700 text-sm">{plan.featuresList}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => handleEditPlanClick(plan)}
                              className="bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-3 rounded-md mr-2">Edit</button>
                      <button onClick={() => handleDeletePlanClick(plan.planId)}
                              className="bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded-md">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Plan Assignments Table */}
      <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-8">All Plan Assignments</h2>
      {loading && !planAssignments.length ? (
        <p className="text-center text-gray-600">Loading assignments...</p>
      ) : (
        <div className="overflow-x-auto">
          {planAssignments.length === 0 ? (
            <p className="text-center text-gray-500">No plan assignments found.</p>
          ) : (
            <table className="min-w-full bg-white border border-gray-200 shadow-sm rounded-lg">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Assignment ID</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Member Name</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Plan Name</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Start Date</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">End Date</th>
                </tr>
              </thead>
              <tbody>
                {planAssignments.map((assignment) => (
                  <tr key={assignment.assignmentId} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700 text-sm">{assignment.assignmentId}</td>
                    <td className="py-3 px-4 text-gray-700">{assignment.userName || 'N/A'}</td> {/* CORRECTED */}
                    <td className="py-3 px-4 text-gray-700">{assignment.planName || 'N/A'}</td> {/* CORRECTED */}
                    <td className="py-3 px-4 text-gray-700">{assignment.startDate}</td>
                    <td className="py-3 px-4 text-gray-700">{assignment.endDate}</td>
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
export default MembershipPlansPage;