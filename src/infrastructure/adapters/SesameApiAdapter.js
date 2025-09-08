import axios from 'axios';
import { SesameApiPort } from '../../application/ports/SesameApiPort.js';
import { User } from '../../domain/entities/User.js';
import { Project } from '../../domain/entities/Project.js';
import { Session } from '../../domain/entities/Session.js';

export class SesameApiAdapter extends SesameApiPort {
  constructor() {
    super();
    this.baseURL = 'https://back-eu4.sesametime.com/api/v3';
    this.appURL = 'https://app.sesametime.com';
    this.currentSession = null;
  }

  setSession(session) {
    this.currentSession = session;
  }

  async login(email, password) {
    try {
      const loginResponse = await axios.post(`${this.baseURL}/security/login`, {
        platformData: {
          platformName: "Chrome",
          platformSystem: "Windows 10",
          platformVersion: "139"
        },
        email,
        password
      }, {
        headers: {
          ...this._getDefaultHeaders(),
          'content-type': 'application/json'
        }
      });

      if (loginResponse.data && loginResponse.data.data) {
        const loginToken = loginResponse.data.data;
        const cookies = `USID=${loginToken}`;
        
        // Get user info with the USID cookie
        try {
          const meResponse = await axios.get(`${this.baseURL}/security/me`, {
            headers: {
              ...this._getDefaultHeaders(),
              'Cookie': cookies
            }
          });
          
          if (meResponse.data && meResponse.data.data && meResponse.data.data.length > 0) {
            const userData = meResponse.data.data[0];
            const user = this._createUserFromData(userData);
            return new Session(userData.companyId, userData.id, cookies, user);
          }
        } catch (error) {
          throw new Error(`Failed to get user info: ${error.message}`);
        }
      }
    } catch (error) {
      throw new Error(`Login failed: ${error.response?.data?.message || error.message}`);
    }
    
    return null;
  }

  async refreshUserInfo() {
    if (!this.currentSession || !this.currentSession.isValid()) {
      throw new Error('No valid session available');
    }

    try {
      const meResponse = await axios.get(`${this.baseURL}/security/me`, {
        headers: {
          ...this._getDefaultHeaders(),
          'Cookie': this.currentSession.cookies
        }
      });
      
      if (meResponse.data && meResponse.data.data && meResponse.data.data.length > 0) {
        const userData = meResponse.data.data[0];
        const user = this._createUserFromData(userData);
        
        // If user is online and has a lastCheck with checkInDatetime, add elapsed time
        if (user.workStatus !== 'offline' && userData.lastCheck && userData.lastCheck.checkInDatetime) {
          const checkInTime = new Date(userData.lastCheck.checkInDatetime).getTime();
          const currentTime = Date.now();
          const elapsedSeconds = Math.floor((currentTime - checkInTime) / 1000);
          user.accumulatedSeconds += elapsedSeconds;
        }
        
        return user;
      }
    } catch (error) {
      return null;
    }
  }

  async getAssignedProjects() {
    if (!this.currentSession || !this.currentSession.isValid()) {
      throw new Error('No valid session available');
    }

    try {
      const response = await axios.get(
        `${this.baseURL}/employees/${this.currentSession.esid}/assigned-work-check-types?isTrusted=true`,
        {
          headers: {
            ...this._getDefaultHeaders(),
            'csid': this.currentSession.csid,
            'esid': this.currentSession.esid,
            'Cookie': this.currentSession.cookies
          }
        }
      );

      const projectsData = response.data.data || response.data;
      return projectsData.map(project => new Project(project.id, project.name));
    } catch (error) {
      throw new Error(`Failed to get projects: ${error.response?.data?.message || error.message}`);
    }
  }

  async checkIn(projectId) {
    if (!this.currentSession || !this.currentSession.isValid()) {
      throw new Error('No valid session available');
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/employees/${this.currentSession.esid}/check-in`,
        {
          origin: "web",
          coordinates: {},
          workCheckTypeId: projectId
        },
        {
          headers: {
            ...this._getDefaultHeaders(),
            'content-type': 'application/json',
            'csid': this.currentSession.csid,
            'esid': this.currentSession.esid,
            'Cookie': this.currentSession.cookies
          }
        }
      );

      return response.status === 200 || response.status === 201;
    } catch (error) {
      return false;
    }
  }

  async checkOut() {
    if (!this.currentSession || !this.currentSession.isValid()) {
      throw new Error('No valid session available');
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/employees/${this.currentSession.esid}/check-out`,
        {
          origin: "web",
          coordinates: {},
          workCheckTypeId: null
        },
        {
          headers: {
            ...this._getDefaultHeaders(),
            'content-type': 'application/json',
            'csid': this.currentSession.csid,
            'esid': this.currentSession.esid,
            'Cookie': this.currentSession.cookies
          }
        }
      );

      return response.status === 200 || response.status === 201;
    } catch (error) {
      return false;
    }
  }

  _getDefaultHeaders() {
    return {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'es',
      'origin': this.appURL,
      'referer': `${this.appURL}/`,
      'rsrc': '31',
      'sec-ch-ua': '"Not;A=Brand";v="99", "Microsoft Edge";v="139", "Chromium";v="139"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0'
    };
  }

  _createUserFromData(userData) {
    const user = new User(userData.id, userData.firstName, userData.companyId, userData.workStatus);
    
    if (userData.lastCheck && userData.lastCheck.workCheckTypeName) {
      user.currentProject = userData.lastCheck.workCheckTypeName;
    }
    
    user.updateWorkTime(userData.accumulatedSeconds, userData.dailySchedule);
    
    return user;
  }
}