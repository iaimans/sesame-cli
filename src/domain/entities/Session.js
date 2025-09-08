export class Session {
  constructor(csid, esid, cookies, user) {
    this.csid = csid;
    this.esid = esid;
    this.cookies = cookies;
    this.user = user;
    this.timestamp = Date.now();
  }

  isValid() {
    return this.csid && this.esid && this.cookies;
  }

  updateUser(user) {
    this.user = user;
    this.timestamp = Date.now();
  }
}