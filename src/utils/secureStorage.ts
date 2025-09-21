// Secure storage utility to replace unsafe localStorage usage

interface SecureSession {
  collaboratorId: string;
  name: string;
  role: string;
  loginTime: string;
  expires: string;
}

export class SecureStorage {
  private static readonly SESSION_KEY = 'collaborator_session';
  
  // Store session with expiration
  static setSession(sessionData: Omit<SecureSession, 'expires'>): void {
    const session: SecureSession = {
      ...sessionData,
      expires: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 hours
    };
    
    const encrypted = btoa(JSON.stringify(session));
    sessionStorage.setItem(this.SESSION_KEY, encrypted);
  }
  
  // Get session if valid and not expired
  static getSession(): SecureSession | null {
    try {
      const encrypted = sessionStorage.getItem(this.SESSION_KEY);
      if (!encrypted) return null;
      
      const session: SecureSession = JSON.parse(atob(encrypted));
      
      // Check if session is expired
      if (new Date() > new Date(session.expires)) {
        this.clearSession();
        return null;
      }
      
      return session;
    } catch (error) {
      console.error('Error reading session:', error);
      this.clearSession();
      return null;
    }
  }
  
  // Clear session
  static clearSession(): void {
    sessionStorage.removeItem(this.SESSION_KEY);
  }
  
  // Check if user is authenticated
  static isAuthenticated(): boolean {
    return this.getSession() !== null;
  }
  
  // Get user info if authenticated
  static getCurrentUser(): { id: string; name: string; role: string } | null {
    const session = this.getSession();
    if (!session) return null;
    
    return {
      id: session.collaboratorId,
      name: session.name,
      role: session.role
    };
  }
}