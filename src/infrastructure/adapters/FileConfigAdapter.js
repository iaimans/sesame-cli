import fs from 'fs';
import path from 'path';
import os from 'os';
import { ConfigPort } from '../../application/ports/ConfigPort.js';
import { Session } from '../../domain/entities/Session.js';
import { User } from '../../domain/entities/User.js';

export class FileConfigAdapter extends ConfigPort {
  constructor() {
    super();
    this.configDir = path.join(os.homedir(), '.sesame-cli');
    this.configFile = path.join(this.configDir, 'config.json');
  }

  async saveSession(session) {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }

      const config = {
        csid: session.csid,
        esid: session.esid,
        cookies: session.cookies,
        user: {
          id: session.user.id,
          firstName: session.user.firstName,
          companyId: session.user.companyId,
          workStatus: session.user.workStatus,
          currentProject: session.user.currentProject,
          accumulatedSeconds: session.user.accumulatedSeconds,
          dailySchedule: session.user.dailySchedule
        },
        timestamp: session.timestamp
      };

      fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
      return true;
    } catch (error) {
      return false;
    }
  }

  async loadSession() {
    try {
      if (fs.existsSync(this.configFile)) {
        const config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
        
        if (config.csid && config.esid && config.cookies && config.user) {
          const user = new User(
            config.user.id,
            config.user.firstName,
            config.user.companyId,
            config.user.workStatus,
            config.user.currentProject
          );
          user.updateWorkTime(config.user.accumulatedSeconds, config.user.dailySchedule);
          
          const session = new Session(config.csid, config.esid, config.cookies, user);
          session.timestamp = config.timestamp;
          
          return session;
        }
      }
    } catch (error) {
      // Silent fail - invalid config
    }
    return null;
  }

  async clearSession() {
    try {
      if (fs.existsSync(this.configFile)) {
        fs.unlinkSync(this.configFile);
      }
      return true;
    } catch (error) {
      return false;
    }
  }
}