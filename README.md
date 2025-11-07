# RemoDB

A lightweight, real-time remote database system that syncs data between clients and a server using WebSockets and MessagePack for efficient serialization. Supports nested objects with automatic syncing.

## Features

- **Real-time Sync**: Changes to the database are automatically synced across connected clients.
- **Nested Objects**: Supports setting and getting nested properties like `database.user.profile.name`.
- **Event-Driven**: Server and Client emit events for connection states and errors.
- **Efficient**: Uses MessagePack for fast serialization and WebSockets for low-latency communication.
- **Persistent**: Data is saved to a file (JSON or compressed RDB format).
- **Authentication**: Token-based authentication for secure connections.

## Installation

```bash
npm install remodb
```

## Quick Start

### Server

```javascript
import { Server } from 'remodb';

const server = new Server('./data.rdb', { port: 8080 });
server.on('start', (event) => {
  console.log(`Server running on port ${event.port} with token: ${event.authToken}`);
});
```

### Client

```javascript
import { Client } from 'remodb';

const client = new Client('ws://localhost:8080', serverAuthToken);
client.on('connect', () => {
  const db = client.database;
  db.key = 'value';
  console.log(db.key); // 'value'
});
```

## API

### Server

#### Constructor
```javascript
new Server(filePath, options)
```
- `filePath`: Path to the data file (`.json` or `.rdb` for compressed).
- `options`: Object with `port` (default 8080) and `authToken` (auto-generated if not provided).

#### Events
- `'start'`: Emitted when the server starts. Payload: `{ port, authToken }`
- Server extends EventEmitter.

### Client

#### Constructor
```javascript
new Client(host, authToken)
```
- `host`: WebSocket URL (default `'ws://localhost:8080'`).
- `authToken`: Authentication token from the server.

#### Properties
- `database`: Proxy object for database operations. Acts like a regular JavaScript object but syncs changes.

#### Events
- `'connect'`: Emitted when connected to the server.
- `'disconnect'`: Emitted when disconnected.
- `'error'`: Emitted on connection errors. Payload: error object.
- Client extends EventEmitter.

### Database Operations

The `database` proxy supports standard object operations:

```javascript
const db = client.database;

// Set values
db.simple = 'value';
db.nested = { key: 'value' };
db.nested.key = 'updated';

// Get values
console.log(db.simple); // 'value'
console.log(db.nested.key); // 'updated'
```

Changes are automatically synced to the server and persisted.

## Example

See `example.js` for a complete example of starting a server and client, and performing nested operations.

```javascript
import { Server, Client } from 'remodb';

const server = new Server('./database.rdb', { port: 8080 });

setTimeout(() => {
  const client = new Client('ws://localhost:8080', server.authToken);

  client.on('connect', () => {
    const db = client.database;
    db.array = {};
    db.array.key = 'nested_value';
    db.key = 'root_value';
  });
}, 100);
```

## Data Persistence

- Data is saved to the specified file in JSON or compressed MessagePack (.rdb) format.
- On server start, existing data is loaded.
- Changes are saved immediately after each write.

## Security

- Use HTTPS/WebSocket Secure (wss://) in production.
- The auth token should be kept secret; transmit securely.
- Connections are validated with the token on each message.

## Dependencies

- `ws`: WebSocket implementation
- `msgpackr`: MessagePack serialization

## License

MIT
