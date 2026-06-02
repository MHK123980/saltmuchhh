import Dexie from 'dexie';

export const db = new Dexie('HostingAppCache');

// Define tables and indexes
// 'products' stores your list, '++id' is the primary key
db.version(1).stores({
  products: '++id, name, price', 
});