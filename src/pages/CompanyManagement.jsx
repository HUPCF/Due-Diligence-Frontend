import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import Spinner from '../components/Spinner';

// Modal Component
const Modal = ({ show, onClose, children }) => {
  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
        {children}
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl leading-none">
          &times;
        </button>
      </div>
    </div>
  );
};

// CreateCompanyModal Component
const CreateCompanyModal = ({ show, onClose, onCompanyCreated }) => {
  const [newCompanyName, setNewCompanyName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    setLoading(true);
    try {
      await api.post('/companies', { name: newCompanyName });
      setNewCompanyName('');
      onCompanyCreated();
      onClose();
    } catch (error) {
      console.error('Error creating company:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onClose={onClose}>
      <h2 className="text-2xl font-bold mb-4">Create New Company</h2>
      <form onSubmit={handleCreateCompany}>
        <div className="mb-4">
          <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Company Name</label>
          <input
            id="companyName"
            type="text"
            placeholder="Enter company name"
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        <div className="flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Cancel</button>
          <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center">
            {loading && <Spinner />}
            <span className={loading ? 'ml-2' : ''}>Create</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

// EditCompanyModal Component
const EditCompanyModal = ({ show, onClose, company, onCompanyUpdated }) => {
  const [editedCompanyName, setEditedCompanyName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (company) {
      setEditedCompanyName(company.name);
    }
  }, [company]);

  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    if (!editedCompanyName.trim()) return;
    setLoading(true);
    try {
      await api.put(`/companies/${company.id}`, { name: editedCompanyName });
      onCompanyUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating company:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onClose={onClose}>
      <h2 className="text-2xl font-bold mb-4">Edit Company</h2>
      <form onSubmit={handleUpdateCompany}>
        <div className="mb-4">
          <label htmlFor="editCompanyName" className="block text-sm font-medium text-gray-700">Company Name</label>
          <input
            id="editCompanyName"
            type="text"
            value={editedCompanyName}
            onChange={(e) => setEditedCompanyName(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        <div className="flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Cancel</button>
          <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center">
            {loading && <Spinner />}
            <span className={loading ? 'ml-2' : ''}>Save Changes</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

// DeleteCompanyModal Component
const DeleteCompanyModal = ({ show, onClose, company, onCompanyDeleted }) => {
  const [loading, setLoading] = useState(false);

  const handleDeleteCompany = async () => {
    setLoading(true);
    try {
      await api.delete(`/companies/${company.id}`);
      onCompanyDeleted();
      onClose();
    } catch (error) {
      console.error('Error deleting company:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onClose={onClose}>
      <h2 className="text-2xl font-bold mb-4">Delete Company</h2>
      <p>Are you sure you want to delete <span className="font-semibold">{company?.name}</span>? This action cannot be undone.</p>
      <div className="flex justify-end space-x-2 mt-4">
        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Cancel</button>
        <button onClick={handleDeleteCompany} disabled={loading} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center">
          {loading && <Spinner />}
          <span className={loading ? 'ml-2' : ''}>Delete</span>
        </button>
      </div>
    </Modal>
  );
};


const CompanyManagement = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const response = await api.get('/companies');
      setCompanies(response.data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Company Management</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Company
            </button>
            <button
              onClick={() => navigate('/admin/users')}
              className="bg-purple-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-purple-700"
            >
              Go to User Management
            </button>
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by company name..."
            className="w-full px-4 py-2 border rounded-md"
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Loading companies...</p>
        ) : filteredCompanies.length === 0 ? (
          <div className="text-center bg-white p-12 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-700">No Companies Found</h2>
            <p className="text-gray-500 mt-2">Get started by creating a new company.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company) => (
              <div key={company.id} className="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300">
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{company.name}</h3>
                  <p className="text-gray-500 text-sm">ID: {company.id}</p>
                </div>
                <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setSelectedCompany(company);
                      setShowEditModal(true);
                    }}
                    className="text-gray-500 hover:text-indigo-600"
                    title="Edit"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCompany(company);
                      setShowDeleteModal(true);
                    }}
                    className="text-gray-500 hover:text-red-600"
                    title="Delete"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateCompanyModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCompanyCreated={fetchCompanies}
      />

      {selectedCompany && (
        <>
          <EditCompanyModal
            show={showEditModal}
            onClose={() => setShowEditModal(false)}
            company={selectedCompany}
            onCompanyUpdated={fetchCompanies}
          />
          <DeleteCompanyModal
            show={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            company={selectedCompany}
            onCompanyDeleted={fetchCompanies}
          />
        </>
      )}
    </div>
  );
};

export default CompanyManagement;