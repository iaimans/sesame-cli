export class CheckOutUser {
  constructor(sesameApiAdapter, configAdapter) {
    this.sesameApiAdapter = sesameApiAdapter;
    this.configAdapter = configAdapter;
  }

  async execute() {
    const success = await this.sesameApiAdapter.checkOut();
    
    if (success) {
      // Refresh user info after successful check-out
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