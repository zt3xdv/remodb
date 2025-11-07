import WebSocket, { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import { pack, unpack } from 'msgpackr';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';

class Server extends EventEmitter {
  constructor(filePath, options = {}) {
    super();
    this.filePath = filePath;
    this.isRDB = path.extname(filePath) === '.rdb';
    this.port = options.port || 8080;
    this.authToken = options.authToken || randomBytes(32).toString('hex');
    this.data = this.loadData();
    this.wss = new WebSocketServer({ port: this.port });
    this.wss.on('connection', this.handleConnection.bind(this));
    this.emit('start', { port: this.port, authToken: this.authToken });
  }

  loadData() {
    try {
      if (fs.existsSync(this.filePath)) {
        const buffer = fs.readFileSync(this.filePath);
        return this.isRDB ? unpack(buffer) : JSON.parse(buffer.toString());
      }
    } catch (e) {
      console.error('Error loading data:', e);
    }
    return {};
  }

  saveData() {
    try {
      const buffer = this.isRDB ? pack(this.data) : Buffer.from(JSON.stringify(this.data, null, 2));
      fs.writeFileSync(this.filePath, buffer);
    } catch (e) {
      console.error('Error saving data:', e);
    }
  }

  handleConnection(ws) {
    ws.on('message', (message) => {
      try {
        const msg = unpack(message);
        if (msg.token !== this.authToken) {
          ws.send(pack({ type: 'error', error: 'Unauthorized' }));
          return;
        }
        this.handleMessage(ws, msg);
      } catch (e) {
        ws.send(pack({ type: 'error', error: e.message }));
      }
    });
  }

  handleMessage(ws, msg) {
    switch (msg.type) {
      case 'getData':
        ws.send(pack({ type: 'response', id: msg.id, value: this.data }));
        break;
      case 'put':
        let obj = this.data;
        for (let i = 0; i < msg.path.length - 1; i++) {
          if (typeof obj[msg.path[i]] !== 'object' || obj[msg.path[i]] === null) obj[msg.path[i]] = {};
          obj = obj[msg.path[i]];
        }
        obj[msg.path[msg.path.length - 1]] = msg.value;
        this.saveData();
        ws.send(pack({ type: 'response', id: msg.id, success: true }));
        break;
      case 'delete':
        obj = this.data;
        for (let i = 0; i < msg.path.length - 1; i++) {
          obj = obj[msg.path[i]];
          if (typeof obj !== 'object' || obj === null) break;
        }
        if (obj) delete obj[msg.path[msg.path.length - 1]];
        this.saveData();
        ws.send(pack({ type: 'response', id: msg.id, success: true }));
        break;
      default:
        ws.send(pack({ type: 'error', error: 'Unknown message type' }));
    }
  }
}

export { Server };
