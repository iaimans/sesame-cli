#!/usr/bin/env node

import { SesameApiAdapter } from './infrastructure/adapters/SesameApiAdapter.js';
import { FileConfigAdapter } from './infrastructure/adapters/FileConfigAdapter.js';
import { InkUIAdapter } from './presentation/InkUIAdapter.js';
import { AuthenticateUser } from './application/use-cases/AuthenticateUser.js';
import { CheckInUser } from './application/use-cases/CheckInUser.js';
import { CheckOutUser } from './application/use-cases/CheckOutUser.js';
import { GetUserProjects } from './application/use-cases/GetUserProjects.js';

class SesameCliApplication {
  constructor() {
    // Initialize adapters
    this.sesameApiAdapter = new SesameApiAdapter();
    this.configAdapter = new FileConfigAdapter();
    this.uiAdapter = new InkUIAdapter();
    
    // Initialize use cases
    this.authenticateUser = new AuthenticateUser(this.sesameApiAdapter, this.configAdapter, this.uiAdapter);
    this.checkInUser = new CheckInUser(this.sesameApiAdapter, this.configAdapter);
    this.checkOutUser = new CheckOutUser(this.sesameApiAdapter, this.configAdapter);
    this.getUserProjects = new GetUserProjects(this.sesameApiAdapter);
  }

  async run() {
    try {
      this.uiAdapter.showMessage('🚀 Starting Sesame CLI...', 'info');
      
      // Authenticate user
      const session = await this.authenticateUser.execute();
      if (!session) {
        this.uiAdapter.showError('Authentication failed');
        process.exit(1);
      }

      // Ensure session is set in API adapter
      this.sesameApiAdapter.setSession(session);

      // Check if user info is available
      if (!session.user || !session.user.firstName) {
        this.uiAdapter.showError('User information not available - may need fresh login');
        process.exit(1);
      }

      this.uiAdapter.showMessage('🎉 Authentication successful!', 'success');

      // Get projects for menu
      let projects = [];
      try {
        projects = await this.getUserProjects.execute();
      } catch (error) {
        this.uiAdapter.showMessage('⚠️ Could not load projects', 'warning');
      }

      // Main application loop
      while (true) {
        const action = await this.uiAdapter.showWorkTimeWithActions(session.user, projects);

        if (action === 'checkout') {
          const success = await this.checkOutUser.execute();
          if (success) {
            this.uiAdapter.showMessage('🎉 Successfully checked out!', 'success');
            // Update session user
            const updatedSession = await this.configAdapter.loadSession();
            if (updatedSession) {
              this.sesameApiAdapter.setSession(updatedSession);
              session.user = updatedSession.user;
            }
          } else {
            this.uiAdapter.showMessage('💥 Check out failed', 'error');
          }
        } else if (action && action !== 'checkin') {
          // This is a project ID for check-in
          const success = await this.checkInUser.execute(action);
          if (success) {
            this.uiAdapter.showMessage('🎉 Successfully checked in!', 'success');
            // Update session user
            const updatedSession = await this.configAdapter.loadSession();
            if (updatedSession) {
              this.sesameApiAdapter.setSession(updatedSession);
              session.user = updatedSession.user;
            }
          } else {
            this.uiAdapter.showMessage('💥 Check in failed', 'error');
          }
        }

        // Brief pause before next iteration
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      this.uiAdapter.showError(error);
      process.exit(1);
    }
  }
}

// Run the application
const app = new SesameCliApplication();
app.run().catch(console.error);