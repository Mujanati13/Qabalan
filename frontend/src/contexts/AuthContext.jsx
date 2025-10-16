import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/authService'
import { permissionService } from '../services/permissionService'
import toast from 'react-hot-toast'

const AuthContext = createContext({})

export const useAuthContext = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('admin_token'))
  const [permissions, setPermissions] = useState([])
  const [userRoles, setUserRoles] = useState([])

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('admin_token')
        if (storedToken) {
          // Set token in service
          authService.setAuthToken(storedToken)
          
          // Get user profile
          const userData = await authService.getProfile()
          
          // Check if user is admin or staff
          if (userData.user_type === 'admin' || userData.user_type === 'staff') {
            setUser(userData)
            setToken(storedToken)
            
            // Load permissions for staff users
            if (userData.user_type === 'staff') {
              await loadUserPermissions()
            }
          } else {
            // Clear invalid user type
            logout()
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        logout()
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  // Load user permissions
  const loadUserPermissions = async () => {
    try {
      const permissionData = await permissionService.getUserPermissions()
      
      // Convert database permissions to readable format
      // Database format: {module: 'products', can_read: true, can_create: false, ...}
      // Convert to: ['products.view', 'products.create', ...]
      const formattedPermissions = []
      
      if (permissionData.permissions && Array.isArray(permissionData.permissions)) {
        permissionData.permissions.forEach(perm => {
          const module = perm.module
          
          // Map database actions to permission names
          if (perm.can_read) formattedPermissions.push(`${module}.view`)
          if (perm.can_create) formattedPermissions.push(`${module}.create`)
          if (perm.can_update) formattedPermissions.push(`${module}.edit`)
          if (perm.can_delete) formattedPermissions.push(`${module}.delete`)
          if (perm.can_export) formattedPermissions.push(`${module}.export`)
          if (perm.can_manage) formattedPermissions.push(`${module}.manage`)
        })
      }
      
      console.log('Loaded permissions:', formattedPermissions)
      setPermissions(formattedPermissions)
      setUserRoles(permissionData.roles)
    } catch (error) {
      console.error('Failed to load permissions:', error)
      setPermissions([])
      setUserRoles([])
    }
  }

  const login = async (credentials) => {
    try {
      setLoading(true)
      const response = await authService.login(credentials)
      
      const { user: userData, tokens } = response.data
      
      // Check if user is admin or staff
      if (userData.user_type !== 'admin' && userData.user_type !== 'staff') {
        throw new Error('Access denied. Admin privileges required.')
      }

      // Store tokens
      localStorage.setItem('admin_token', tokens.accessToken)
      localStorage.setItem('admin_refresh_token', tokens.refreshToken)
      
      // Set auth token in service
      authService.setAuthToken(tokens.accessToken)
      
      // Update state
      setUser(userData)
      setToken(tokens.accessToken)
      
      // Load permissions for staff users
      if (userData.user_type === 'staff') {
        await loadUserPermissions()
      }
      
      toast.success('Login successful!')
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Login failed'
      toast.error(message)
      return { success: false, error: message }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('admin_refresh_token')
      if (refreshToken) {
        await authService.logout({ refresh_token: refreshToken })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local storage
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_refresh_token')
      
      // Clear auth token in service
      authService.setAuthToken(null)
      
      // Clear permissions
      permissionService.clearPermissions()
      
      // Clear state
      setUser(null)
      setToken(null)
      setPermissions([])
      setUserRoles([])
      
      toast.success('Logged out successfully')
    }
  }

  const refreshToken = async () => {
    try {
      const storedRefreshToken = localStorage.getItem('admin_refresh_token')
      if (!storedRefreshToken) {
        throw new Error('No refresh token available')
      }

      const response = await authService.refreshToken({
        refresh_token: storedRefreshToken
      })

      const { tokens } = response.data
      
      // Update stored tokens
      localStorage.setItem('admin_token', tokens.accessToken)
      localStorage.setItem('admin_refresh_token', tokens.refreshToken)
      
      // Set new auth token in service
      authService.setAuthToken(tokens.accessToken)
      setToken(tokens.accessToken)
      
      return tokens.accessToken
    } catch (error) {
      console.error('Token refresh error:', error)
      logout()
      throw error
    }
  }

  const updateProfile = async (profileData) => {
    try {
      const response = await authService.updateProfile(profileData)
      setUser(response.data.user)
      toast.success('Profile updated successfully!')
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const changePassword = async (passwordData) => {
    try {
      await authService.changePassword(passwordData)
      toast.success('Password changed successfully!')
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Password change failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const forgotPassword = async (email) => {
    try {
      await authService.forgotPassword({ email })
      toast.success('Password reset instructions sent to your email!')
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send reset instructions'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const resetPassword = async (resetData) => {
    try {
      await authService.resetPassword(resetData)
      toast.success('Password reset successfully!')
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Password reset failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const value = {
    user,
    token,
    loading,
    permissions,
    userRoles,
    login,
    logout,
    refreshToken,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    loadUserPermissions,
    isAuthenticated: !!user,
    isAdmin: user?.user_type === 'admin',
    isStaff: user?.user_type === 'staff',
    hasPermission: (permission) => {
      if (user?.user_type === 'admin') return true
      const hasIt = permissions.includes(permission)
      // Debug logging
      if (!hasIt && permissions.length > 0) {
        console.log(`Permission check failed for "${permission}". Available:`, permissions)
      }
      return hasIt
    },
    hasAnyPermission: (permissionList) => {
      if (user?.user_type === 'admin') return true
      const hasAny = permissionList.some(permission => permissions.includes(permission))
      // Debug logging
      if (!hasAny && permissions.length > 0) {
        console.log(`Permission check failed for any of:`, permissionList, 'Available:', permissions)
      }
      return hasAny
    },
    hasAllPermissions: (permissionList) => {
      if (user?.user_type === 'admin') return true
      return permissionList.every(permission => permissions.includes(permission))
    }
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
