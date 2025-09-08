export class GetUserProjects {
  constructor(sesameApiAdapter) {
    this.sesameApiAdapter = sesameApiAdapter;
  }

  async execute() {
    return await this.sesameApiAdapter.getAssignedProjects();
  }
}