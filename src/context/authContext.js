import { createContext } from 'react'

// Split into its own module so both AuthContext.jsx (provider) and hooks/useAuth.js
// (consumer hook) can import it without mixing a non-component export into a
// component-only file (keeps React Fast Refresh happy).
export const AuthContext = createContext(null)
