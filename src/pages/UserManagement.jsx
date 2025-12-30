import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { PlusIcon, EyeIcon, KeyIcon, PencilIcon, TrashIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import Spinner from '../components/Spinner';

// Modal Component (reusable)
const Modal = ({ show, onClose, children }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-start">
          {children}
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
        </div>
      </div>
    </div>
  );
};

// CreateUserModal Component
const CreateUserModal = ({ show, onClose, onUserCreated, companies }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [companyId, setCompanyId] = useState(companies.length > 0 ? companies[0].id : '');
  const [sendEmailOnCreate, setSendEmailOnCreate] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (companies.length > 0 && !companyId) {
      setCompanyId(companies[0].id);
    }
  }, [companies, companyId]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/users', { email, password, role, companyId });
      const newUserId = response.data.userId;
      
      // Send credentials email if checkbox is checked
      if (sendEmailOnCreate && newUserId) {
        try {
          await api.post(`/users/${newUserId}/send-credentials`, { password });
          alert('User created successfully and credentials email sent!');
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          alert('User created successfully, but failed to send email.');
        }
      } else {
        alert('User created successfully!');
      }
      
      setEmail('');
      setPassword('');
      setRole('user');
      setSendEmailOnCreate(false);
      if (companies.length > 0) setCompanyId(companies[0].id);
      onUserCreated();
      onClose();
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onClose={onClose}>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New User</h2>
        <form onSubmit={handleCreateUser} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Initial Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              placeholder="Min. 8 characters"
              required
            />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">User Role</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700">Assign Company</label>
            <select
              id="company"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md"
              required
            >
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="sendEmailOnCreate"
              checked={sendEmailOnCreate}
              onChange={(e) => setSendEmailOnCreate(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="sendEmailOnCreate" className="ml-2 block text-sm text-gray-700">
              Send credentials email to user
            </label>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md">Cancel</button>
            <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded-md flex items-center">
              {loading && <Spinner />}
              <span className={loading ? 'ml-2' : ''}>Create User</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

// EditUserModal Component
const EditUserModal = ({ show, onClose, onUserUpdated, user, companies }) => {
    const [role, setRole] = useState(user?.role || 'user');
    const [companyId, setCompanyId] = useState(user?.company_id || '');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setRole(user.role);
            setCompanyId(user.company_id);
        }
    }, [user]);

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put(`/users/${user.id}`, { role, companyId });
            onUserUpdated();
            onClose();
        } catch (error) {
            console.error('Error updating user:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onClose={onClose}>
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit User: {user?.email}</h2>
                <form onSubmit={handleUpdateUser} className="space-y-5">
                    <div>
                        <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700">User Role</label>
                        <select
                            id="edit-role"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md"
                        >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="edit-company" className="block text-sm font-medium text-gray-700">Assign Company</label>
                        <select
                            id="edit-company"
                            value={companyId}
                            onChange={(e) => setCompanyId(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md"
                            required
                        >
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md">Cancel</button>
                        <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded-md flex items-center">
                            {loading && <Spinner />}
                            <span className={loading ? 'ml-2' : ''}>Save Changes</span>
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

// DeleteUserModal Component
const DeleteUserModal = ({ show, onClose, onUserDeleted, user }) => {
    const [loading, setLoading] = useState(false);

    const handleDeleteUser = async () => {
        setLoading(true);
        try {
            await api.delete(`/users/${user.id}`);
            onUserDeleted();
            onClose();
        } catch (error) {
            console.error('Error deleting user:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onClose={onClose}>
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Delete User</h2>
                <p>Are you sure you want to delete the user <span className="font-semibold">{user?.email}</span>? This action cannot be undone.</p>
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md">Cancel</button>
                    <button onClick={handleDeleteUser} disabled={loading} className="bg-red-600 text-white px-4 py-2 rounded-md flex items-center">
                        {loading && <Spinner />}
                        <span className={loading ? 'ml-2' : ''}>Delete</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
};


// ResetPasswordModal Component
const ResetPasswordModal = ({ show, onClose, user, onPasswordReset }) => {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      alert('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      await api.put(`/users/${user.id}/password`, { password: newPassword });
      
      // Send email if checkbox is checked
      if (sendEmail) {
        try {
          await api.post(`/users/${user.id}/send-credentials`, { password: newPassword });
          alert('Password reset successfully and credentials email sent!');
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          alert('Password reset successfully, but failed to send email.');
        }
      } else {
        alert('Password reset successfully!');
      }
      
      setNewPassword('');
      setSendEmail(false);
      onPasswordReset();
      onClose();
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onClose={onClose}>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Reset Password for {user?.email}</h2>
        <form onSubmit={handleResetPassword} className="space-y-5">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">New Password</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              placeholder="Enter new password (min. 8 characters)"
              required
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="sendEmail"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="sendEmail" className="ml-2 block text-sm text-gray-700">
              Send credentials email to user
            </label>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md">Cancel</button>
            <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded-md">{loading ? 'Resetting...' : 'Reset Password'}</button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

// SendCredentialsModal Component
const SendCredentialsModal = ({ show, onClose, user, onEmailSent }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      alert('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/users/${user.id}/send-credentials`, { password });
      alert('Credentials email sent successfully!');
      setPassword('');
      onEmailSent();
      onClose();
    } catch (error) {
      console.error('Error sending credentials email:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to send credentials email.';
      alert(`Failed to send credentials email: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onClose={onClose}>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Send Credentials Email to {user?.email}</h2>
        <form onSubmit={handleSendEmail} className="space-y-5">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password to Send</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              placeholder="Enter password to send (min. 8 characters)"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Enter the user's current password to send via email.</p>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md">Cancel</button>
            <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded-md">{loading ? 'Sending...' : 'Send Email'}</button>
          </div>
        </form>
      </div>
    </Modal>
  );
};


const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showSendCredentialsModal, setShowSendCredentialsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, companiesRes] = await Promise.all([
        api.get('/users'),
        api.get('/companies')
      ]);
      setUsers(usersRes.data);
      setCompanies(companiesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.company_name && user.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md shadow-sm"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create User
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by user email or company..."
            className="w-full px-4 py-2 border rounded-md"
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Loading users...</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.company_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">

                      <button onClick={() => { setSelectedUser(user); setShowResetPasswordModal(true); }} className="text-yellow-600 hover:text-yellow-900" title="Reset Password"><KeyIcon className="h-5 w-5 inline" /></button>
                      <button onClick={() => { setSelectedUser(user); setShowSendCredentialsModal(true); }} className="text-green-600 hover:text-green-900" title="Send Credentials Email"><EnvelopeIcon className="h-5 w-5 inline" /></button>
                     
                        <Link to={`/admin/users/${user.id}`} className="text-blue-600 hover:text-blue-900" title="View Details"><EyeIcon className="h-5 w-5 inline" /></Link>
                      
                      <button onClick={() => { setSelectedUser(user); setShowDeleteModal(true); }} className="text-red-600 hover:text-red-900" title="Delete User"><TrashIcon className="h-5 w-5 inline" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateUserModal show={showCreateModal} onClose={() => setShowCreateModal(false)} onUserCreated={fetchData} companies={companies} />
      {selectedUser && (
          <>
            <EditUserModal show={showEditModal} onClose={() => setShowEditModal(false)} onUserUpdated={fetchData} user={selectedUser} companies={companies} />
            <DeleteUserModal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} onUserDeleted={fetchData} user={selectedUser} />
            <ResetPasswordModal show={showResetPasswordModal} onClose={() => setShowResetPasswordModal(false)} user={selectedUser} onPasswordReset={fetchData} />
            <SendCredentialsModal show={showSendCredentialsModal} onClose={() => setShowSendCredentialsModal(false)} user={selectedUser} onEmailSent={fetchData} />
          </>
      )}
    </div>
  );
};

export default UserManagement;