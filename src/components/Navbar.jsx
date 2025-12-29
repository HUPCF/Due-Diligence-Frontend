import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to={user && user.role === 'admin' ? "/home" : "/dashboard"} className="text-2xl font-bold text-indigo-600">
              Due Diligence
            </Link>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {user && user.role === 'admin' && (
                <Link
                  to="/home"
                  className="text-gray-700 hover:bg-gray-200 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Home
                </Link>
                )}
                {user && user.role !== 'admin' && (
                <Link
                  to="/dashboard"
                  className="text-gray-700 hover:bg-gray-200 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                )}
                {user && user.role === 'admin' && (
                  <>
                    <Link
                      to="/admin/users"
                      className="text-gray-700 hover:bg-gray-200 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      User Management
                    </Link>
                    <Link
                      to="/admin/companies"
                      className="text-gray-700 hover:bg-gray-200 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Company Management
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              <div className="flex flex-col items-end">
                <span className="text-gray-700 text-sm">
                  Welcome, {user ? user.email : 'Guest'}
                </span>
                <span className="text-gray-500 text-xs">
                  {user ? user.company_name : ''}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="ml-4 bg-red-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
