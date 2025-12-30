import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Spinner from '../components/Spinner';

// Helper function to download a file programmatically
const downloadFile = async (fileName, originalName, endpoint = 'responses') => {
  try {
    const token = localStorage.getItem('token');
    
    // Use the same logic as api.js to determine the base URL
    // Note: fetch() doesn't use Vite proxy, so we need the full URL in development
    let apiBaseUrl;
    if (import.meta.env.VITE_API_BASE_URL) {
      apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    } else if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'dd.cp.hupcfl.com' || hostname.includes('hupcfl.com')) {
        apiBaseUrl = 'https://dd-backend.cp.hupcfl.com/api';
      } else {
        // In development, fetch() doesn't use Vite proxy, so use full backend URL
        apiBaseUrl = 'http://localhost:5000/api';
      }
    } else {
      apiBaseUrl = 'http://localhost:5000/api';
    }
    
    const url = `${apiBaseUrl}/${endpoint}/download/${encodeURIComponent(fileName)}`;
    console.log('Downloading file from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to download file');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Error downloading file:', error);
    alert('Failed to download file. Please try again.');
  }
};

const UserDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [checklistResponses, setChecklistResponses] = useState([]);
  const [editingResponseId, setEditingResponseId] = useState(null);
  const [editingResponseValue, setEditingResponseValue] = useState('');
  const [editingResponseFile, setEditingResponseFile] = useState(null); // Existing files from database
  const [editingNewFiles, setEditingNewFiles] = useState(null); // Newly selected files for upload
  const [responseMessage, setResponseMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null); // Used for general document upload
  const [documentMessage, setDocumentMessage] = useState('');
  const [userDocuments, setUserDocuments] = useState([]);
  const [checklistItems, setChecklistItems] = useState({}); // New state for checklist items (id -> item)
  const [allChecklistItems, setAllChecklistItems] = useState([]); // New state to store all checklist items
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); // State for general errors
  const [isUpdatingResponse, setIsUpdatingResponse] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState(null);
  const [deletingChecklistFile, setDeletingChecklistFile] = useState(null);

  // Handlers for editing checklist responses
  const handleEditingResponseChange = (value) => {
    setEditingResponseValue(value);
    // Only clear newly selected files if response is not 'Yes' (keep existing files)
    if (value !== 'Yes') {
      setEditingNewFiles(null);
    }
  };

  const handleEditingFileChange = (files) => {
    // files will be a FileList, convert to array for newly selected files
    setEditingNewFiles(Array.from(files));
  };

  const fetchData = async () => {
    try {
      const userResponse = await api.get(`/users/${userId}`);
      setUser(userResponse.data);

      const responsesResponse = await api.get(`/responses/user/${userId}`);
      setChecklistResponses(responsesResponse.data);

      // Fetch all checklist items
      const allItemsResponse = await api.get(`/checklist/items`);
      setAllChecklistItems(allItemsResponse.data);

      const uniqueItemIds = [...new Set(responsesResponse.data.map(res => res.item_id))];
      const itemsMap = {};
      for (const itemId of uniqueItemIds) {
        // Find the item in allChecklistItems instead of making another API call
        const foundItem = allItemsResponse.data.find(item => item.id === itemId);
        if (foundItem) {
          itemsMap[itemId] = foundItem;
        } else {
          // Fallback if item not found in the full list (shouldn't happen if data is consistent)
          const itemResponse = await api.get(`/checklist/items/${itemId}`);
          itemsMap[itemId] = itemResponse.data;
        }
      }
      setChecklistItems(itemsMap);

      const documentsResponse = await api.get(`/documents/user/${userId}`);
      setUserDocuments(documentsResponse.data);
    } catch (err) {
      console.error('Error fetching user details or responses:', err);
      setError('Failed to load user details or responses.');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchData();
  }, [userId]);

  const handleUpdateResponse = async (responseId, itemId) => {
    setIsUpdatingResponse(true);
    const formData = new FormData();
    
    // If the current user is an admin, they are updating another user's response
    // Send the actual userId (from URL params) and companyId (from the user being viewed)
    if (currentUser && currentUser.role === 'admin') {
      formData.append('targetUserId', userId);
      formData.append('targetCompanyId', user.company_id);
    }
    
    formData.append('itemId', itemId);
    formData.append('response', editingResponseValue);
    
    // Append newly selected files (existing files are already in the database)
    if (editingNewFiles && Array.isArray(editingNewFiles)) {
      editingNewFiles.forEach((file, index) => {
        if (file instanceof File) { // Only append actual File objects
          formData.append(`files`, file);
        }
      });
    }

    try {
      await api.post(`/responses`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setResponseMessage('Response updated successfully!');
      setEditingResponseId(null);
      setEditingResponseValue('');
      setEditingResponseFile(null);
      setEditingNewFiles(null);
      fetchData(); // Re-fetch all data to update the list
    } catch (err) {
      console.error('Error updating response:', err);
      setResponseMessage('Failed to update response.');
    } finally {
      setIsUpdatingResponse(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingResponseId(null);
    setEditingResponseValue('');
    setEditingResponseFile(null);
    setEditingNewFiles(null);
    setResponseMessage('');
  };

  const onFileChange = (e) => {
    // Support multiple file selection
    const files = Array.from(e.target.files || []);
    setSelectedFile(files.length > 0 ? files : null);
  };

  const fetchUserDocuments = async () => {
    try {
      const documentsResponse = await api.get(`/documents/user/${userId}`);
      setUserDocuments(documentsResponse.data);
    } catch (err) {
      console.error('Error fetching user documents:', err);
      setDocumentMessage('Failed to load user documents.');
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedFile || (Array.isArray(selectedFile) && selectedFile.length === 0)) {
      setDocumentMessage('Please select at least one file to upload.');
      return;
    }

    setIsUploading(true);
    setDocumentMessage('Uploading...');
    const files = Array.isArray(selectedFile) ? selectedFile : [selectedFile];
    
    // Upload files one by one (or update backend to handle multiple)
    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('document', file);
        return api.post(`/documents/user/${userId}/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      });
      
      await Promise.all(uploadPromises);
      setDocumentMessage(`${files.length} document(s) uploaded successfully!`);
      setSelectedFile(null); // Clear the selected files
      document.getElementById('document-upload-input').value = ''; // Clear file input
      fetchUserDocuments(); // Re-fetch documents
    } catch (err) {
      console.error('Error uploading document:', err);
      setDocumentMessage('Failed to upload document(s).');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      setDeletingDocId(documentId);
      try {
        await api.delete(`/documents/${documentId}`);
        setDocumentMessage('Document deleted successfully!');
        fetchUserDocuments(); // Re-fetch documents
      } catch (err) {
        console.error('Error deleting document:', err);
        setDocumentMessage('Failed to delete document.');
      } finally {
        setDeletingDocId(null);
      }
    }
  };

  const handleDeleteChecklistFile = async (responseId, storedFileName) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      setDeletingChecklistFile(storedFileName);
      try {
        await api.delete(`/responses/${responseId}/file`, {
          data: { storedFileName },
        });
        // Remove file from local state
        setEditingResponseFile((prevFiles) => 
          prevFiles ? prevFiles.filter(file => file.storedFileName !== storedFileName) : []
        );
        setResponseMessage('File deleted successfully.');
        fetchData(); // Re-fetch to update the list
      } catch (error) {
        console.error('Error deleting file:', error);
        setResponseMessage('Failed to delete file.');
      } finally {
        setDeletingChecklistFile(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading user details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => navigate('/admin/users')}
          className="ml-4 inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Back to User Management
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">User not found.</p>
        <button
          onClick={() => navigate('/admin/users')}
          className="ml-4 inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Back to User Management
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {responseMessage && (
          <div className="rounded-md bg-green-50 p-4 text-sm text-green-800 border border-green-200">
            {responseMessage}
          </div>
        )}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">User Details: {user.email}</h1>
          <button
            onClick={() => navigate('/admin/users')}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Back to User Management
          </button>
        </div>

        <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">User Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <p className="font-medium">ID:</p>
              <p>{user.id}</p>
            </div>
            <div>
              <p className="font-medium">Email:</p>
              <p>{user.email}</p>
            </div>
            <div>
              <p className="font-medium">Role:</p>
              <p>{user.role}</p>
            </div>
            <div>
              <p className="font-medium">Company Name:</p>
              <p>{user.company_name || 'N/A'}</p>
            </div>
            {/* Add more user details as needed */}
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Checklist Responses</h2>
          {allChecklistItems.length > 0 ? (
            <div className="space-y-4">
              {allChecklistItems
                .sort((a, b) => a.id - b.id) // Sort by item ID for consistent order
                .map((item) => {
                  const userResponse = checklistResponses.find(
                    (res) => res.item_id === item.id
                  );
                  const isResponded = !!userResponse;

                  return (
                    <div key={item.id} className="border border-gray-200 rounded-md p-4">
                      {editingResponseId === item.id ? ( // Use item.id for editing
                        <div className="flex flex-col space-y-2">
                          <p><strong>Item:</strong> {item.text}</p>
                          <div className="flex items-center space-x-4 mb-2">
                            {['Yes', 'No', 'Need Help', 'N/A'].map((option) => (
                              <label key={option} className="inline-flex items-center">
                                <input
                                  type="radio"
                                  className="form-radio"
                                  name={`editing-response-${item.id}`}
                                  value={option}
                                  checked={editingResponseValue === option}
                                  onChange={() => handleEditingResponseChange(option)}
                                />
                                <span className="ml-2 text-gray-700">{option}</span>
                              </label>
                            ))}
                          </div>
                          
                          {/* Show existing uploaded files (always visible, regardless of response) */}
                          {editingResponseFile && editingResponseFile.length > 0 && (
                            <div className="mt-2 mb-2">
                              <p className="text-sm font-medium text-gray-600">Uploaded Documents:</p>
                              <ul className="list-disc list-inside ml-4">
                                {editingResponseFile.map((fileInfo, index) => (
                                  <li key={index} className="text-sm flex items-center">
                                    <button
                                      onClick={() => downloadFile(fileInfo.storedFileName, fileInfo.originalName, 'responses')}
                                      className="text-indigo-600 hover:underline bg-transparent border-none cursor-pointer p-0 text-left"
                                    >
                                      {fileInfo.originalName}
                                    </button>
                                    <button
                                      onClick={() => handleDeleteChecklistFile(userResponse?.id, fileInfo.storedFileName)}
                                      disabled={deletingChecklistFile === fileInfo.storedFileName}
                                      className="ml-2 text-red-500 hover:text-red-700 text-xs flex items-center"
                                    >
                                      {deletingChecklistFile === fileInfo.storedFileName && <Spinner />}
                                      <span className={deletingChecklistFile === fileInfo.storedFileName ? 'ml-1' : ''}>Delete</span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* File upload input - only show if response is 'Yes' */}
                          {editingResponseValue === 'Yes' && (
                            <div className="mt-2">
                              <label htmlFor={`editing-file-${item.id}`} className="block text-sm font-medium text-gray-700">
                                Upload More Documents (if Yes)
                              </label>
                              <input
                                type="file"
                                id={`editing-file-${item.id}`}
                                multiple
                                onChange={(e) => handleEditingFileChange(e.target.files)}
                                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                              />
                              {editingNewFiles && editingNewFiles.length > 0 && (
                                <div className="mt-2 text-sm text-gray-600">
                                  <p>New files selected: {editingNewFiles.length}</p>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleUpdateResponse(userResponse?.id, item.id)} // Pass response.id if exists, otherwise null
                              disabled={isUpdatingResponse}
                              className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center"
                            >
                              {isUpdatingResponse && <Spinner />}
                              <span className={isUpdatingResponse ? 'ml-2' : ''}>Save</span>
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p><strong>Item:</strong> {item.text}</p>
                          <p>
                            <strong>Response:</strong>{' '}
                            {isResponded ? (
                              <>
                                {userResponse.response}
                                {userResponse.responder_email && userResponse.responder_email !== user.email && (
                                  <span className="text-sm text-gray-500 ml-2">
                                    (originally by {userResponse.responder_email})
                                  </span>
                                )}
                                {userResponse.file_paths && userResponse.file_paths.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-sm font-medium text-gray-600">Uploaded Documents:</p>
                                    <ul className="list-disc list-inside ml-4 mt-1">
                                      {userResponse.file_paths.map((fileInfo, index) => (
                                        <li key={index} className="text-sm">
                                          <button
                                            onClick={() => downloadFile(fileInfo.storedFileName, fileInfo.originalName, 'responses')}
                                            className="text-indigo-600 hover:underline bg-transparent border-none cursor-pointer p-0 text-left"
                                          >
                                            {fileInfo.originalName}
                                          </button>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-red-600 font-medium">Unresponded</span>
                            )}
                          </p>
                          {currentUser && currentUser.role === 'admin' && (
                            <p className="text-xs text-gray-500 mt-1">
                              As an admin, you can edit this response for {user.email}
                            </p>
                          )}
                          <button
                            onClick={() => {
                              setEditingResponseId(item.id);
                              setEditingResponseValue(userResponse?.response || '');
                              setEditingResponseFile(userResponse?.file_paths || []); // Set existing files for editing
                              setEditingNewFiles(null); // Clear any previously selected new files
                            }}
                            className="mt-2 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                          >
                            {isResponded ? 'Edit Response' : 'Add Response'}
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-gray-600">No checklist items found.</p>
          )}
        </div>

        {/* Section for Document Uploads */}
        <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Documents</h2>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              <input
                type="file"
                multiple
                onChange={onFileChange}
                id="document-upload-input"
                className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100"
              />
              {selectedFile && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>Selected: {Array.isArray(selectedFile) ? selectedFile.length : 1} file(s)</p>
                  {Array.isArray(selectedFile) && (
                    <ul className="list-disc list-inside mt-1">
                      {selectedFile.map((file, index) => (
                        <li key={index}>{file.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <button
                onClick={handleUploadDocument}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center"
                disabled={!selectedFile || (Array.isArray(selectedFile) && selectedFile.length === 0) || isUploading}
              >
                {isUploading && <Spinner />}
                <span className={isUploading ? 'ml-2' : ''}>Upload Document</span>
              </button>
            </div>
            {documentMessage && (
              <p className="text-sm text-gray-600">{documentMessage}</p>
            )}

            {userDocuments.length > 0 ? (
              <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
                {userDocuments.map((doc) => (
                  <li key={doc.id} className="p-4 flex items-center justify-between">
                    <button
                      onClick={() => downloadFile(doc.storedFileName || doc.file_path, doc.file_name, 'documents')}
                      className="text-indigo-600 hover:underline bg-transparent border-none cursor-pointer p-0 text-left flex-grow"
                    >
                      {doc.file_name}
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      disabled={deletingDocId === doc.id}
                      className="ml-4 inline-flex items-center rounded-md border border-transparent bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center"
                    >
                      {deletingDocId === doc.id && <Spinner />}
                      <span className={deletingDocId === doc.id ? 'ml-2' : ''}>Delete</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">No documents uploaded for this user yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetail;
