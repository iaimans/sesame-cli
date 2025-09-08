export class WorkTimeSummary {
  constructor(accumulatedSeconds = 0, dailySchedule = 0, sessionSeconds = 0) {
    this.accumulatedSeconds = accumulatedSeconds;
    this.dailySchedule = dailySchedule;
    this.sessionSeconds = sessionSeconds;
  }

  get totalWorkedSeconds() {
    return this.accumulatedSeconds + this.sessionSeconds;
  }

  get remainingSeconds() {
    return Math.max(0, this.dailySchedule - this.totalWorkedSeconds);
  }

  get isComplete() {
    return this.totalWorkedSeconds >= this.dailySchedule;
  }

  get percentage() {
    return this.dailySchedule > 0 ? Math.min(100, Math.round((this.totalWorkedSeconds / this.dailySchedule) * 100)) : 0;
  }

  static formatSecondsToTime(seconds) {
    if (seconds === null || seconds === undefined) return '0h 0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  static formatSecondsToTimeWithSeconds(seconds) {
    if (seconds === null || seconds === undefined) return '0h 0m 0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  }

  getFormattedSummary() {
    return {
      worked: WorkTimeSummary.formatSecondsToTime(this.totalWorkedSeconds),
      scheduled: WorkTimeSummary.formatSecondsToTime(this.dailySchedule),
      remaining: WorkTimeSummary.formatSecondsToTime(this.remainingSeconds),
      isComplete: this.isComplete,
      percentage: this.percentage
    };
  }

  getFormattedSummaryWithSeconds() {
    return {
      worked: WorkTimeSummary.formatSecondsToTimeWithSeconds(this.totalWorkedSeconds),
      scheduled: WorkTimeSummary.formatSecondsToTime(this.dailySchedule),
      remaining: WorkTimeSummary.formatSecondsToTimeWithSeconds(this.remainingSeconds),
      session: WorkTimeSummary.formatSecondsToTimeWithSeconds(this.sessionSeconds),
      isComplete: this.isComplete,
      percentage: this.percentage
    };
  }
}