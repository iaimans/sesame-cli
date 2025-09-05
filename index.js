#!/usr/bin/env node

import axios from 'axios';
import prompts from 'prompts';
import React from 'react';
import { render, Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import logUpdate from 'log-update';

const CONFIG_DIR = path.join(os.homedir(), '.sesame-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

class SesameAPI {
  constructor() {
    this.baseURL = 'https://back-eu4.sesametime.com/api/v3';
    this.appURL = 'https://app.sesametime.com';
    this.csid = null;
    this.esid = null;
    this.cookies = null;
    this.userName = null;
    this.workStatus = null;
    this.currentProject = null;
    this.accumulatedSeconds = null;
    this.dailySchedule = null;
  }

  async login(email, password) {
    try {
      console.log(chalk.cyan.bold('🚀 Logging in to Sesame Time...'));
      
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
          'accept': 'application/json, text/plain, */*',
          'accept-language': 'es',
          'content-type': 'application/json',
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
        }
      });

      if (loginResponse.data && loginResponse.data.data) {
        const loginToken = loginResponse.data.data;
        console.log(chalk.magenta.bold('🎯 Login token received:'), chalk.yellow(loginToken));
        
        // Create the proper USID cookie format
        this.cookies = `USID=${loginToken}`;
        console.log(chalk.green.bold('💚 USID cookie created'));
        
        // Get user info with the USID cookie to extract csid and esid
        console.log(chalk.yellow.bold('⚡ Getting session IDs from /security/me...'));
        
        try {
          const meResponse = await axios.get(`${this.baseURL}/security/me`, {
            headers: {
              'accept': 'application/json, text/plain, */*',
              'accept-language': 'es',
              'origin': this.appURL,
              'referer': `${this.appURL}/`,
              'rsrc': '31',
              'Cookie': this.cookies
            }
          });
          
          if (meResponse.data && meResponse.data.data && meResponse.data.data.length > 0) {
            // Extract session IDs and user info from the response
            const userData = meResponse.data.data[0];
            this.csid = userData.companyId;      // Company ID becomes csid
            this.esid = userData.id;             // User ID becomes esid
            this.userName = userData.firstName;   // User's first name
            this.workStatus = userData.workStatus; // Work status (offline when not working)
            
            // Extract current project if user is working
            if (userData.lastCheck && userData.lastCheck.workCheckTypeName) {
              this.currentProject = userData.lastCheck.workCheckTypeName;
            } else {
              this.currentProject = null;
            }
            
            // Extract work time information
            this.accumulatedSeconds = userData.accumulatedSeconds || 0;
            this.dailySchedule = userData.dailySchedule || 0;
            
            console.log(chalk.green.bold('🎉 Session IDs extracted successfully!'));
          }
          
        } catch (error) {
          console.log(chalk.red.bold(`💥 /security/me failed:`), chalk.redBright(error.response?.status));
          if (error.response?.data) {
            console.log(chalk.red('Error details:'), JSON.stringify(error.response.data, null, 2));
          }
          return false;
        }
        
        this.saveConfig();
        console.log(chalk.green.bold('🎊 Authentication complete!'));
        return true;
      }
    } catch (error) {
      console.error(chalk.red.bold('💥 Login failed:'), chalk.redBright(error.response?.data?.message || error.message));
      if (error.response?.data) {
        console.error(chalk.red('Response:'), JSON.stringify(error.response.data, null, 2));
      }
      return false;
    }
  }

  async refreshUserInfo() {
    try {
      const meResponse = await axios.get(`${this.baseURL}/security/me`, {
        headers: {
          'accept': 'application/json, text/plain, */*',
          'accept-language': 'es',
          'origin': this.appURL,
          'referer': `${this.appURL}/`,
          'rsrc': '31',
          'Cookie': this.cookies
        }
      });
      
      if (meResponse.data && meResponse.data.data && meResponse.data.data.length > 0) {
        const userData = meResponse.data.data[0];
        this.userName = userData.firstName;
        this.workStatus = userData.workStatus;
        
        // Extract current project if user is working
        if (userData.lastCheck && userData.lastCheck.workCheckTypeName) {
          this.currentProject = userData.lastCheck.workCheckTypeName;
        } else {
          this.currentProject = null;
        }
        
        // Extract work time information
        this.accumulatedSeconds = userData.accumulatedSeconds || 0;
        this.dailySchedule = userData.dailySchedule || 0;
        
        // If user is online and has a lastCheck with checkInDatetime, add elapsed time
        if (this.workStatus !== 'offline' && userData.lastCheck && userData.lastCheck.checkInDatetime) {
          const checkInTime = new Date(userData.lastCheck.checkInDatetime).getTime();
          const currentTime = Date.now();
          const elapsedSeconds = Math.floor((currentTime - checkInTime) / 1000);
          
          // Add elapsed time to accumulated seconds
          this.accumulatedSeconds += elapsedSeconds;
        }
        
        // Save the updated config
        this.saveConfig();
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  extractCookies(setCookieHeaders) {
    if (!setCookieHeaders) return '';
    return setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
  }

  generateUUID() {
    return crypto.randomUUID();
  }

  formatSecondsToTime(seconds) {
    if (seconds === null || seconds === undefined) return '0h 0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  formatSecondsToTimeWithSeconds(seconds) {
    if (seconds === null || seconds === undefined) return '0h 0m 0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  }


  getWorkTimeSummary() {
    const worked = this.accumulatedSeconds || 0;
    const scheduled = this.dailySchedule || 0;
    const remaining = Math.max(0, scheduled - worked);
    
    return {
      worked: this.formatSecondsToTime(worked),
      scheduled: this.formatSecondsToTime(scheduled),
      remaining: this.formatSecondsToTime(remaining),
      isComplete: worked >= scheduled,
      percentage: scheduled > 0 ? Math.min(100, Math.round((worked / scheduled) * 100)) : 0
    };
  }


  async showWorkTimeWithActions() {
    return new Promise((resolve) => {
      let sessionStartTime = null;
      let interval = null;
      
      if (this.workStatus !== 'offline') {
        sessionStartTime = Date.now();
      }

      // Build menu choices
      const menuChoices = [];
      if (this.workStatus === 'offline') {
        menuChoices.push({ label: '⭐ Check In', value: 'checkin' });
      } else {
        if (this.currentProject) {
          menuChoices.push({ label: `🏁 Check Out from "${this.currentProject}"`, value: 'checkout' });
        } else {
          menuChoices.push({ label: '🏁 Check Out', value: 'checkout' });
        }
      }
      menuChoices.push({ label: '🚪 Quit', value: 'quit' });

      let clearApp = null;
      let currentMenuState = {
        options: menuChoices,
        title: 'Select Action'
      };

      const WorkTimeApp = () => {
        const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
        const [menuOptions, setMenuOptions] = React.useState(currentMenuState.options);
        const [menuTitle, setMenuTitle] = React.useState(currentMenuState.title);
        const [statusMessage, setStatusMessage] = React.useState('');
        const [isLoading, setIsLoading] = React.useState(false);
        const [spinnerFrame, setSpinnerFrame] = React.useState(0);
        
        const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        
        React.useEffect(() => {
          if (this.workStatus !== 'offline') {
            interval = setInterval(() => {
              const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
              setElapsedSeconds(elapsed);
            }, 1000);
          }
          
          return () => {
            if (interval) clearInterval(interval);
          };
        }, []);

        React.useEffect(() => {
          let spinnerInterval;
          if (isLoading) {
            spinnerInterval = setInterval(() => {
              setSpinnerFrame(frame => (frame + 1) % spinnerFrames.length);
            }, 100);
          }
          return () => {
            if (spinnerInterval) clearInterval(spinnerInterval);
          };
        }, [isLoading]);

        const getStatusContent = () => {
          const lines = [];
          
          lines.push(`Hello, ${this.userName}!`);
          lines.push('');
          
          // Show work status
          if (this.workStatus === 'offline') {
            lines.push('🔴 You are currently offline (not checked in)');
            
            // Show static work time summary when offline
            const staticSummary = this.getWorkTimeSummary();
            lines.push('');
            lines.push('📊 Work Time Summary:');
            lines.push(`   📅 Scheduled: ${staticSummary.scheduled}`);
            lines.push(`   💼 Worked: ${staticSummary.worked} (${staticSummary.percentage}%)`);
            
            if (staticSummary.isComplete) {
              lines.push(`   🏆 Complete! You've finished your scheduled hours`);
            } else {
              lines.push(`   ⏳ Remaining: ${staticSummary.remaining}`);
            }
          } else {
            lines.push(`🟢 Work Status: ${this.workStatus}`);
            if (this.currentProject) {
              lines.push(`📋 Current Project: ${this.currentProject}`);
            }
            
            // Show live work time summary when working
            const worked = (this.accumulatedSeconds || 0) + elapsedSeconds;
            const scheduled = this.dailySchedule || 0;
            const remaining = Math.max(0, scheduled - worked);
            
            const workedTime = this.formatSecondsToTimeWithSeconds(worked);
            const scheduledTime = this.formatSecondsToTime(scheduled);
            const remainingTime = this.formatSecondsToTimeWithSeconds(remaining);
            const percentage = scheduled > 0 ? Math.min(100, Math.round((worked / scheduled) * 100)) : 0;
            
            lines.push('');
            lines.push('📊 Live Work Time Summary:');
            lines.push(`   📅 Scheduled: ${scheduledTime}`);
            lines.push(`   💼 Worked: ${workedTime} (${percentage}%)`);
            
            if (worked >= scheduled) {
              lines.push(`   🏆 Complete! You've finished your scheduled hours`);
            } else {
              lines.push(`   ⏳ Remaining: ${remainingTime}`);
            }
            
            // Show session timer
            const sessionTime = this.formatSecondsToTimeWithSeconds(elapsedSeconds);
            lines.push('');
            lines.push(`🕐 Session time: ${sessionTime}`);
          }
          
          return lines.join('\n');
        };

        const handleMenuSelect = async (item) => {
          if (item.value === 'quit') {
            if (interval) clearInterval(interval);
            if (clearApp) clearApp();
            process.exit(0);
          } else if (item.value === 'checkin') {
            try {
              setIsLoading(true);
              setStatusMessage('🔍 Getting your assigned projects...');
              
              const projects = await this.getAssignedProjects();
              let projectsArray;
              
              if (Array.isArray(projects)) {
                projectsArray = projects;
              } else if (projects.data && Array.isArray(projects.data)) {
                projectsArray = projects.data;
              } else {
                setStatusMessage('💥 No projects data received');
                setIsLoading(false);
                return;
              }

              if (projectsArray.length === 0) {
                setStatusMessage('💥 No assigned projects found');
                setIsLoading(false);
                return;
              }

              const projectChoices = projectsArray.map(project => ({
                label: `📋 ${project.name}`,
                value: project.id
              }));
              
              projectChoices.push({ label: '⬅️ Back', value: 'back' });

              setMenuOptions(projectChoices);
              setMenuTitle('Select Project');
              setStatusMessage('✨ Projects loaded successfully');
              setIsLoading(false);
            } catch (error) {
              setStatusMessage('💥 Failed to get projects');
              setIsLoading(false);
            }
          } else if (item.value === 'back') {
            setMenuOptions(menuChoices);
            setMenuTitle('Select Action');
            setStatusMessage('');
          } else if (item.value === 'checkout') {
            setIsLoading(true);
            setStatusMessage('🏁 Checking out...');
            if (interval) clearInterval(interval);
            if (clearApp) clearApp();
            resolve('checkout');
          } else {
            // This is a project selection
            setIsLoading(true);
            setStatusMessage('✨ Checking in...');
            if (interval) clearInterval(interval);
            if (clearApp) clearApp();
            resolve(item.value);
          }
        };

        return React.createElement(Box, { flexDirection: "column", height: "100%", width: "100%" },
          React.createElement(Box, {
            borderStyle: "round",
            borderColor: "gray",
            flexGrow: 1,
            padding: 1,
            marginBottom: 1,
            width: "100%"
          },
            React.createElement(Text, { wrap: "wrap" }, getStatusContent())
          ),
          React.createElement(Box, {
            borderStyle: "round",
            borderColor: "gray",
            padding: 1,
            marginBottom: 1,
            width: "100%"
          },
            React.createElement(Box, { flexDirection: "column" },
              React.createElement(Text, { bold: true, color: "white", marginBottom: 1 }, menuTitle),
              React.createElement(SelectInput, {
                items: menuOptions.map(choice => ({
                  label: choice.label,
                  value: choice.value
                })),
                onSelect: handleMenuSelect
              })
            )
          ),
          statusMessage ? React.createElement(Box, {
            padding: 1,
            width: "100%"
          },
            React.createElement(Text, { 
              color: isLoading ? "yellow" : statusMessage.includes('💥') ? "red" : "green"
            }, 
              `${isLoading ? spinnerFrames[spinnerFrame] + ' ' : ''}${statusMessage}`
            )
          ) : null
        );
      };

      // Render the ink app
      const { clear } = render(React.createElement(WorkTimeApp), {
        exitOnCtrlC: true
      });
      clearApp = clear;
      
      // Handle cleanup
      process.on('SIGINT', () => {
        if (interval) clearInterval(interval);
        if (clearApp) clearApp();
        console.log(chalk.cyan.bold('🌟 Goodbye!'));
        process.exit(0);
      });
    });
  }

  async showActionMenu() {    
    // Build choices based on work status
    const choices = [];
    
    if (this.workStatus === 'offline') {
      choices.push({
        title: '✨ Check In',
        value: 'checkin'
      });
    } else {
      if (this.currentProject) {
        choices.push({
          title: `🏁 Check Out from "${this.currentProject}"`,
          value: 'checkout'
        });
      } else {
        choices.push({
          title: '🏁 Check Out',
          value: 'checkout'
        });
      }
    }
    
    choices.push({
      title: '🚪 Quit',
      value: 'quit'
    });

    try {
      const response = await prompts({
        type: 'select',
        name: 'action',
        message: '\nWhat would you like to do?',
        choices: choices,
        initial: this.workStatus === 'offline' ? 0 : 0
      });

      if (response.action === 'quit' || !response.action) {
        console.log(chalk.cyan.bold('🌟 Goodbye!'));
        process.exit(0);
      } else {
        return response.action;
      }
    } catch (error) {
      console.log(chalk.cyan.bold('\n🌟 Goodbye!'));
      process.exit(0);
    }
  }


  async getAssignedProjects() {
    try {
      const response = await axios.get(
        `${this.baseURL}/employees/${this.esid}/assigned-work-check-types?isTrusted=true`,
        {
          headers: {
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'es,es-ES;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
            'csid': this.csid,
            'esid': this.esid,
            'origin': this.appURL,
            'referer': `${this.appURL}/`,
            'rsrc': '31',
            'Cookie': this.cookies
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error(chalk.red.bold('💥 Failed to get projects:'), chalk.redBright(error.response?.data?.message || error.message));
      return null;
    }
  }

  async checkIn(projectId) {
    try {
      const response = await axios.post(
        `${this.baseURL}/employees/${this.esid}/check-in`,
        {
          origin: "web",
          coordinates: {},
          workCheckTypeId: projectId
        },
        {
          headers: {
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'es,es-ES;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
            'content-type': 'application/json',
            'csid': this.csid,
            'esid': this.esid,
            'origin': this.appURL,
            'referer': `${this.appURL}/`,
            'rsrc': '31',
            'sec-ch-ua': '"Not;A=Brand";v="99", "Microsoft Edge";v="139", "Chromium";v="139"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0',
            'Cookie': this.cookies
          }
        }
      );

      return response.status === 200 || response.status === 201;
    } catch (error) {
      return false;
    }
  }

  async checkOut() {
    try {
      const response = await axios.post(
        `${this.baseURL}/employees/${this.esid}/check-out`,
        {
          origin: "web",
          coordinates: {},
          workCheckTypeId: null
        },
        {
          headers: {
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'es,es-ES;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
            'content-type': 'application/json',
            'csid': this.csid,
            'esid': this.esid,
            'origin': this.appURL,
            'referer': `${this.appURL}/`,
            'rsrc': '31',
            'sec-ch-ua': '"Not;A=Brand";v="99", "Microsoft Edge";v="139", "Chromium";v="139"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0',
            'Cookie': this.cookies
          }
        }
      );

      return response.status === 200 || response.status === 201;
    } catch (error) {
      return false;
    }
  }

  saveConfig() {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    const config = {
      csid: this.csid,
      esid: this.esid,
      cookies: this.cookies,
      userName: this.userName,
      workStatus: this.workStatus,
      currentProject: this.currentProject,
      accumulatedSeconds: this.accumulatedSeconds,
      dailySchedule: this.dailySchedule,
      timestamp: Date.now()
    };

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  }

  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        
        // Session stored indefinitely
        if (config.csid && config.esid && config.cookies) {
          this.csid = config.csid;
          this.esid = config.esid;
          this.cookies = config.cookies;
          this.userName = config.userName;
          this.workStatus = config.workStatus;
          this.currentProject = config.currentProject;
          this.accumulatedSeconds = config.accumulatedSeconds;
          this.dailySchedule = config.dailySchedule;
          return true;
        }
      }
    } catch (error) {
      console.error(chalk.yellow.bold('🔶 Could not load saved config'));
    }
    return false;
  }

  clearConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }
  }
}

async function main() {
  const sesame = new SesameAPI();
  
  if (!sesame.loadConfig()) {
    console.log(chalk.yellow.bold('🔐 Authentication required'));
    
    const email = await prompts({
      type: 'text',
      name: 'value',
      message: 'Email:',
      validate: (input) => input.includes('@') || 'Please enter a valid email'
    });
    
    const password = await prompts({
      type: 'password',
      name: 'value',
      message: 'Password:'
    });
    
    const credentials = {
      email: email.value,
      password: password.value
    };

    const loginSuccess = await sesame.login(credentials.email, credentials.password);
    if (!loginSuccess) {
      process.exit(1);
    }
  } else {
    // Refresh user information to get current work status
    await sesame.refreshUserInfo();
  }

  // Check if user info is available
  if (!sesame.userName) {
    console.log(chalk.yellow.bold('🔶 User name not available - may need fresh login'));
    process.exit(1);
  }

  // Main application loop
  while (true) {
    // Show work time with actions
    const action = await sesame.showWorkTimeWithActions();

    if (action === 'checkout') {
      // For checkout, we don't need to select a project
      const success = await sesame.checkOut();
      
      // After checkout, refresh user info
      await sesame.refreshUserInfo();
    } else if (action !== 'checkin') {
      // This means a project ID was returned directly from the Ink interface
      const success = await sesame.checkIn(action);
      
      // After check-in attempt, refresh user info
      await sesame.refreshUserInfo();
    }

    // Brief pause before next iteration
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

main().catch(console.error);