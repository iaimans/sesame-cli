import prompts from 'prompts';
import React from 'react';
import { render, Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import chalk from 'chalk';
import { UIPort } from '../application/ports/UIPort.js';
import { WorkTimeSummary } from '../domain/value-objects/WorkTimeSummary.js';

export class InkUIAdapter extends UIPort {
  async showAuthForm() {
    console.log(chalk.yellow.bold('🔐 Authentication required'));
    
    const email = await prompts({
      type: 'text',
      name: 'value',
      message: 'Email:',
      validate: (input) => input.includes('@') || 'Please enter a valid email'
    });
    
    if (!email.value) return null;
    
    const password = await prompts({
      type: 'password',
      name: 'value',
      message: 'Password:'
    });
    
    if (!password.value) return null;
    
    return {
      email: email.value,
      password: password.value
    };
  }

  async showWorkTimeWithActions(user, projects = []) {
    return new Promise((resolve) => {
      let sessionStartTime = null;
      let interval = null;
      
      if (user.isWorking()) {
        sessionStartTime = Date.now();
      }

      const menuChoices = this._buildMenuChoices(user);
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
          if (user.isWorking()) {
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
          
          lines.push(`Hello, ${user.firstName}!`);
          lines.push('');
          
          if (user.isOffline()) {
            lines.push('🔴 You are currently offline (not checked in)');
            
            const workTimeSummary = new WorkTimeSummary(user.accumulatedSeconds, user.dailySchedule);
            const summary = workTimeSummary.getFormattedSummary();
            
            lines.push('');
            lines.push('📊 Work Time Summary:');
            lines.push(`   📅 Scheduled: ${summary.scheduled}`);
            lines.push(`   💼 Worked: ${summary.worked} (${summary.percentage}%)`);
            
            if (summary.isComplete) {
              lines.push(`   🏆 Complete! You've finished your scheduled hours`);
            } else {
              lines.push(`   ⏳ Remaining: ${summary.remaining}`);
            }
          } else {
            lines.push(`🟢 Work Status: ${user.workStatus}`);
            if (user.currentProject) {
              lines.push(`📋 Current Project: ${user.currentProject}`);
            }
            
            const workTimeSummary = new WorkTimeSummary(user.accumulatedSeconds, user.dailySchedule, elapsedSeconds);
            const summary = workTimeSummary.getFormattedSummaryWithSeconds();
            
            lines.push('');
            lines.push('📊 Live Work Time Summary:');
            lines.push(`   📅 Scheduled: ${summary.scheduled}`);
            lines.push(`   💼 Worked: ${summary.worked} (${summary.percentage}%)`);
            
            if (summary.isComplete) {
              lines.push(`   🏆 Complete! You've finished your scheduled hours`);
            } else {
              lines.push(`   ⏳ Remaining: ${summary.remaining}`);
            }
            
            lines.push('');
            lines.push(`🕐 Session time: ${summary.session}`);
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
              
              if (projects.length === 0) {
                setStatusMessage('💥 No assigned projects found');
                setIsLoading(false);
                return;
              }

              const projectChoices = projects.map(project => ({
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

  showMessage(message, type = 'info') {
    const colors = {
      info: chalk.cyan.bold,
      success: chalk.green.bold,
      warning: chalk.yellow.bold,
      error: chalk.red.bold
    };
    
    console.log(colors[type] ? colors[type](message) : message);
  }

  showError(error) {
    console.error(chalk.red.bold('💥 Error:'), chalk.redBright(error.message || error));
  }

  _buildMenuChoices(user) {
    const choices = [];
    
    if (user.isOffline()) {
      choices.push({ label: '⭐ Check In', value: 'checkin' });
    } else {
      if (user.currentProject) {
        choices.push({ label: `🏁 Check Out from "${user.currentProject}"`, value: 'checkout' });
      } else {
        choices.push({ label: '🏁 Check Out', value: 'checkout' });
      }
    }
    
    choices.push({ label: '🚪 Quit', value: 'quit' });
    
    return choices;
  }
}