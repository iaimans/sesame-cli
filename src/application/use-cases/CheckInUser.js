export class CheckInUser {
  constructor(sesameApiAdapter, configAdapter) {
    this.sesameApiAdapter = sesameApiAdapter;
    this.configAdapter = configAdapter;
  }

  async execute(projectId) {
    const success = await this.sesameApiAdapter.checkIn(projectId);
    
    if (success) {
      // Refresh user info after successful check-in
      const updatedUser = await this.sesameApiAdapter.refreshUserInfo();
      if (updatedUser) {
        const session = await this.configAdapter.loadSession();
        if (session) {
          session.updateUser(updatedUser);
          await this.configAdapter.saveSession(session);
        }
      }
    }
    
    return success;
  }
}