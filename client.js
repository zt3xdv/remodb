import WebSocket from 'ws';
import { pack, unpack } from 'msgpackr';
import { EventEmitter } from 'events';

class Client extends EventEmitter {
  constructor(host = 'ws://localhost:8080', authToken) {
    super();
    this.host = host;
    this.authToken = authToken;
    this.ws = null;
    this.requests = new Map();
    this.requestId = 0;
    this.localData = {};
    this.messageQueue = [];
    this.connected = false;
    this.connect();
    this.data = this.createProxy(this.localData);
  }

  async connect() {
    this.ws = new WebSocket(this.host);
    this.ws.on('open', async () => {
      this.connected = true;
      await this.loadData();
      this.processQueue();
      this.emit('connect');
    });
    this.ws.on('message', (message) => {
      const msg = unpack(message);
      if (msg.type === 'response' && this.requests.has(msg.id)) {
        const { resolve, reject } = this.requests.get(msg.id);
        this.requests.delete(msg.id);
        if (msg.error) reject(new Error(msg.error));
        else resolve(msg.value || msg.success);
      }
    });
    this.ws.on('error', (err) => {
      console.error('WebSocket error:', err);
      this.emit('error', err);
    });
    this.ws.on('close', () => {
      this.connected = false;
      this.emit('disconnect');
    });
  }

  async loadData() {
    try {
      this.localData = await this.sendMessage('getData');
      this.data = this.createProxy(this.localData);
    } catch (e) {
      console.error('Error loading data:', e);
      this.localData = {};
      this.data = this.createProxy(this.localData);
    }
  }

  createProxy(target, path = []) {
    return new Proxy(target, {
      get: (target, key) => {
        const val = target[key];
        if (typeof val === 'object' && val !== null) {
          return this.createProxy(val, [...path, key]);
        }
        return val;
      },
      set: (target, key, value) => {
        target[key] = value;
        this.put([...path, key], value);
        return true;
      },
      ownKeys: () => Object.keys(target),
      getOwnPropertyDescriptor: (target, key) => ({
        enumerable: true,
        configurable: true,
        value: target[key]
      })
    });
  }

  processQueue() {
    while (this.messageQueue.length > 0 && this.connected) {
      const { type, data, resolve, reject } = this.messageQueue.shift();
      this.sendMessage(type, data).then(resolve).catch(reject);
    }
  }

  sendMessage(type, data) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        this.messageQueue.push({ type, data, resolve, reject });
        return;
      }
      const id = ++this.requestId;
      this.requests.set(id, { resolve, reject });
      this.ws.send(pack({ ...data, type, id, token: this.authToken }));
    });
  }

  put(path, value) {
    this.sendMessage('put', { path, value }).catch(console.error);
  }

  delete(path) {
    this.sendMessage('delete', { path }).then(() => {
      let obj = this.localData;
      for (let i = 0; i < path.length - 1; i++) {
        obj = obj[path[i]];
        if (typeof obj !== 'object' || obj === null) return;
      }
      if (obj) delete obj[path[path.length - 1]];
    }).catch(console.error);
  }

  get database() {
    return this.data;
  }
}

export { Client };
