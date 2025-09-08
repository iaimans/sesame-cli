export class User {
  constructor(id, firstName, companyId, workStatus = 'offline', currentProject = null) {
    this.id = id;
    this.firstName = firstName;
    this.companyId = companyId;
    this.workStatus = workStatus;
    this.currentProject = currentProject;
    this.accumulatedSeconds = 0;
    this.dailySchedule = 0;
  }

  isOffline() {
    return this.workStatus === 'offline';
  }

  isWorking() {
    return this.workStatus !== 'offline';
  }

  updateWorkStatus(status, project = null) {
    this.workStatus = status;
    this.currentProject = project;
  }

  updateWorkTime(accumulatedSeconds, dailySchedule) {
    this.accumulatedSeconds = accumulatedSeconds || 0;
    this.dailySchedule = dailySchedule || 0;
  }
}