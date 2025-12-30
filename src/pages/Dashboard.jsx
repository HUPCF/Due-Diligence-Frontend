import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Dashboard = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [checklistCategories, setChecklistCategories] = useState([]);
  const [userResponses, setUserResponses] = useState({});
  const [selectedFiles, setSelectedFiles] = useState({});

  const fetchChecklistData = useCallback(async () => {
    if (!user) return;
    try {
      const categoriesResponse = await api.get('/checklist/categories');
      const categories = categoriesResponse.data;

      const responsesResponse = await api.get(`/responses/user/${user.id}`);
      const responses = responsesResponse.data;
      
      console.log('Fetched responses:', responses);
      
      const responsesMap = responses.reduce((acc, res) => {
        if (res.item_id) {
          acc[res.item_id] = {
            ...res,
            response: res.response, // Ensure response is preserved
            item_id: res.item_id,
            id: res.id,
            user_id: res.user_id, // Ensure user_id is preserved
            responder_email: res.responder_email // Ensure responder_email is preserved
          };
        }
        return acc;
      }, {});
      
      console.log('Responses map:', responsesMap);
      setUserResponses(responsesMap);

      const categoriesWithItems = await Promise.all(
        categories.map(async (category) => {
          const itemsResponse = await api.get(`/checklist/categories/${category.id}/items`);
          return { ...category, items: itemsResponse.data };
        })
      );
      setChecklistCategories(categoriesWithItems);
    } catch (error) {
      console.error('Error fetching checklist data:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && user) {
      fetchChecklistData();
    }
  }, [user, loading, fetchChecklistData]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleResponseChange = (itemId, responseValue) => {
    setUserResponses((prevResponses) => {
      const existingResponse = prevResponses[itemId] || {};
      return {
        ...prevResponses,
        [itemId]: { 
          ...existingResponse, 
          response: responseValue,
          item_id: itemId, // Ensure item_id is set
          user_id: existingResponse.user_id || user.id // Preserve or set user_id to current user
        },
      };
    });
    if (responseValue !== 'Yes') {
      setSelectedFiles((prevFiles) => {
        const newFiles = { ...prevFiles };
        delete newFiles[itemId];
        return newFiles;
      });
    }
  };

  const handleFileChange = (itemId, files) => {
    const fileArray = Array.from(files || []);
    setSelectedFiles((prevFiles) => ({
      ...prevFiles,
      [itemId]: fileArray,
    }));
  };

  const handleSubmitResponse = async (itemId) => {
    const responseData = userResponses[itemId];
    const files = selectedFiles[itemId] || [];

    // Check if response is selected (either from state or from radio button)
    const selectedResponse = responseData?.response;
    
    if (!selectedResponse) {
      alert('Please select a response for the item.');
      return;
    }

    const formData = new FormData();
    // userId is not needed - backend uses authenticated user from token
    formData.append('itemId', itemId.toString());
    formData.append('response', selectedResponse);
    
    files.forEach((file) => {
      if (file instanceof File) {
        formData.append('files', file);
      }
    });

    try {
      console.log('Submitting response:', { itemId, response: selectedResponse, filesCount: files.length, currentUserId: user.id });
      const response = await api.post('/responses', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('Response submitted successfully:', response.data);
      
      // Immediately update the local state with the new response to avoid showing it as read-only
      if (response.data) {
        setUserResponses((prevResponses) => ({
          ...prevResponses,
          [itemId]: {
            ...prevResponses[itemId],
            id: response.data.id,
            user_id: user.id, // Ensure user_id is set to current user
            response: selectedResponse,
            file_paths: response.data.file_paths || [],
            item_id: itemId
          }
        }));
      }
      
      alert('Response submitted successfully!');
      setSelectedFiles((prevFiles) => {
        const newFiles = { ...prevFiles };
        delete newFiles[itemId];
        return newFiles;
      });
      fetchChecklistData(); // Re-fetch data to get the latest from server
    } catch (error) {
      console.error('Error submitting response:', error);
      console.error('Error response:', error.response?.data);
      alert(`Failed to submit response: ${error.response?.data?.message || error.message || 'Please try again.'}`);
    }
  };

  const handleDeleteChecklistFile = async (responseId, storedFileName) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        await api.delete(`/responses/${responseId}/file`, {
          data: { storedFileName },
        });
        alert('File deleted successfully.');
        fetchChecklistData(); // Re-fetch to update the UI
      } catch (error) {
        console.error('Error deleting file:', error);
        alert('Failed to delete file.');
      }
    }
  };

// ... (handleDeleteChecklistFile and other functions)

  if (loading) {
    // ... loading spinner ...
  }

  return (
    <div className="min-h-screen bg-gray-50">


      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {checklistCategories.map((category) => (
            <div key={category.id} className="mb-8 p-4 bg-white shadow rounded-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{category.name}</h2>
              {category.items.map((item) => {
                const currentResponse = userResponses[item.id];
                const hasFiles = currentResponse && currentResponse.file_paths && Array.isArray(currentResponse.file_paths) && currentResponse.file_paths.length > 0;
                
                // Check if this response belongs to the current user
                // Compare as numbers to avoid string/number type mismatch
                const currentUserId = user?.id ? parseInt(user.id, 10) : null;
                let responseUserId = null;
                let isOwnResponse = false;
                let isReadOnly = false;
                
                if (currentResponse) {
                  // There is a response - check if it belongs to current user
                  if (currentResponse.user_id !== undefined && currentResponse.user_id !== null) {
                    // Response has a user_id - check ownership
                    responseUserId = parseInt(currentResponse.user_id, 10);
                    if (isNaN(responseUserId)) {
                      responseUserId = null;
                    }
                    isOwnResponse = responseUserId === currentUserId;
                    isReadOnly = !isOwnResponse;
                  } else {
                    // Response exists but no user_id - treat as user's own (they're creating/editing it)
                    isOwnResponse = true;
                    isReadOnly = false;
                  }
                } else {
                  // No response yet - user can create one (not read-only)
                  isOwnResponse = false;
                  isReadOnly = false;
                }

                return (
                  <div key={item.id} className="mb-6 border-b pb-4 last:border-b-0">
                    <p className="text-lg font-medium text-gray-800 mb-2">{item.text}</p>
                    
                    {/* Show read-only indicator if response is from another user */}
                    {isReadOnly && (
                      <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-blue-700">
                          <span className="font-medium">Response submitted by: {currentResponse.responder_email || 'Another user'}</span>
                          <span className="ml-2 text-xs">(Read-only)</span>
                        </p>
                      </div>
                    )}
                    
                    {/* Debugging: Check if currentResponse is available */}
                    {!currentResponse && <p className="text-red-500 text-xs">No response yet for this item.</p>}
                    
                    {/* Radio Buttons - Only show if user can edit */}
                    {!isReadOnly && (
                      <div className="flex items-center space-x-4 mb-2">
                      {['Yes', 'No', 'Need Help', 'N/A'].map((option) => {
                        const isChecked = currentResponse?.response === option;
                        return (
                          <label key={option} className="inline-flex items-center cursor-pointer">
                            <input
                              type="radio"
                              className="form-radio h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                              name={`response-${item.id}`}
                              value={option}
                              checked={isChecked}
                              onChange={(e) => {
                                console.log(`Radio changed for item ${item.id}: ${option}`);
                                handleResponseChange(item.id, option);
                              }}
                            />
                            <span className="ml-2 text-gray-700">{option}</span>
                          </label>
                        );
                      })}
                      </div>
                    )}
                    
                    {/* Show read-only response if from another user */}
                    {isReadOnly && currentResponse?.response && (
                      <div className="mb-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Response: </span>
                          <span className="text-gray-800">{currentResponse.response}</span>
                        </p>
                      </div>
                    )}
                    
                    {/* Uploaded Documents Section - Moved after radio buttons */}
                    {hasFiles && (
                      <div className="mb-2 mt-2">
                        <p className="text-sm font-medium text-gray-600">Uploaded Documents:</p>
                        <ul className="list-disc list-inside ml-4">
                          {currentResponse.file_paths.map((fileInfo, index) => (
                            <li key={index} className="text-sm flex items-center">
                              <a href={`/api/responses/download/${encodeURIComponent(fileInfo.storedFileName)}`} download={fileInfo.originalName} className="text-indigo-600 hover:underline">
                                {fileInfo.originalName}
                              </a>
                              {/* Only show delete button if it's the user's own response */}
                              {isOwnResponse && (
                                <button
                                  onClick={() => handleDeleteChecklistFile(currentResponse.id, fileInfo.storedFileName)}
                                  className="ml-2 text-red-500 hover:text-red-700 text-xs"
                                >
                                  Delete
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* File upload and submit button - Only show if user can edit */}
                    {!isReadOnly && (
                      <>
                        {currentResponse?.response === 'Yes' && (
                          <div className="mt-2">
                            <label htmlFor={`file-${item.id}`} className="block text-sm font-medium text-gray-700">
                              Upload More Documents (if Yes)
                            </label>
                            <input
                              type="file"
                              id={`file-${item.id}`}
                              multiple
                              onChange={(e) => handleFileChange(item.id, e.target.files)}
                              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                            />
                            {selectedFiles[item.id] && selectedFiles[item.id].length > 0 && (
                              <div className="mt-2 text-sm text-gray-600">
                                <p>New files selected: {selectedFiles[item.id].length}</p>
                              </div>
                            )}
                          </div>
                        )}
                        <button
                          onClick={() => handleSubmitResponse(item.id)}
                          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          Submit Response
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
