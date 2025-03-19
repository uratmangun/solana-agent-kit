import Loki from 'lokijs';

// Create a new Loki instance
const db = new Loki('user-shares.json', {
  persistenceMethod: 'fs',
  autosave: true,
  autosaveInterval: 5000
});

// Create a collection for user shares
const userShares = db.addCollection('userShares', {
  indices: ['email'],
  unique: ['email']
});

export { db, userShares }; 