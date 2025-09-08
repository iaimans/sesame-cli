import { Session } from '../../domain/entities/Session.js';

export class AuthenticateUser {
  constructor(sesameApiAdapter, configAdapter, uiAdapter) {
    this.sesameApiAdapter = sesameApiAdapter;
    this.configAdapter = configAdapter;
    this.uiAdapter = uiAdapter;
  }

  async execute() {
    // Try to load existing session
    const existingSession = await this.configAdapter.loadSession();
    if (existingSession && existingSession.isValid()) {
      // Set the session in the API adapter before trying to refresh user info
      this.sesameApiAdapter.setSession(existingSession);
      
      try {
        const user = await this.sesameApiAdapter.refreshUserInfo();
        if (user) {
          existingSession.updateUser(user);
          await this.configAdapter.saveSession(existingSession);
          return existingSession;
        }
      } catch (error) {
        // If refresh fails, continue to login flow
        console.log('Session refresh failed, requiring fresh login');
      }
    }

    // Get credentials from UI
    const credentials = await this.uiAdapter.showAuthForm();
    if (!credentials) {
      return null;
    }

    // Login
    const session = await this.sesameApiAdapter.login(credentials.email, credentials.password);
    if (session) {
      // Set the session in the API adapter for future use
      this.sesameApiAdapter.setSession(session);
      await this.configAdapter.saveSession(session);
      return session;
    }

    return null;
  }
}