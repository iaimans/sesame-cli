export class UIPort {
  async showAuthForm() {
    throw new Error('Method not implemented');
  }

  async showWorkTimeWithActions(user, workTimeSummary) {
    throw new Error('Method not implemented');
  }

  showMessage(message, type = 'info') {
    throw new Error('Method not implemented');
  }

  showError(error) {
    throw new Error('Method not implemented');
  }
}