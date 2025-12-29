import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const response = await api.get('/auth/me');
          console.log('User data from /auth/me:', response.data);
          setUser({ ...response.data, token });
        } catch (error) {
          console.error('Failed to fetch user data:', error)
          localStorage.removeItem('token')
          setUser(null)
        }
      }
      setLoading(false)
    }
    fetchUser()
  }, [])

  const login = async (email, password) => {
    try {
      console.log('Attempting login for:', email);
      const response = await api.post('/auth/login', { email, password })
      const { token, user: userData } = response.data
      
      if (!token) {
        console.error('No token received from server');
        return {
          success: false,
          error: 'Login failed: No token received'
        }
      }
      
      if (!userData) {
        console.error('No user data received from server');
        return {
          success: false,
          error: 'Login failed: No user data received'
        }
      }
      
      console.log('Login successful, storing token and user data');
      console.log('User data:', userData);
      localStorage.setItem('token', token)
      const userWithToken = { ...userData, token }
      setUser(userWithToken)
      
      // Return user data so Login component can use it for redirect
      return { 
        success: true, 
        user: userWithToken 
      }
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Login failed. Please try again.'
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  const value = {
    user,
    login,
    logout,
    loading
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

