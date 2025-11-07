import { Server, Client } from './index.js';

const server = new Server('./database.rdb', { port: 8080 }); // Use .rdb for compressed JSON

setTimeout(() => {
  const client = new Client('ws://localhost:8080', server.authToken);

  client.on('connect', () => {
    console.log('Connected');
    const database = client.database;

    database.array = {};
    database.array.key = 'nested_value';
    database.key = 'root_value';
    
    console.log(database);
    console.log(database.array.key);
    console.log(database.key);
  });
}, 100);
