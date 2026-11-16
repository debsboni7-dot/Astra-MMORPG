import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';

const MAX_MESSAGE_BYTES = 4 * 1024;
const MAX_INPUTS_PER_SECOND = 20;
const TICKET_TTL_MS = 30_000;
const STEP_SECONDS = 0.05;
const MOVE_SPEED = 4;
const ACCEPTED_PATH = '/realtime/v1';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function encodeFrame(value, opcode = 0x1) {
  const payload = Buffer.isBuffer(value) ? value : Buffer.from(value);
  let header;
  if (payload.length < 126) {
    header = Buffer.from([0x80 | opcode, payload.length]);
  } else if (payload.length <= 0xffff) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  return Buffer.concat([header, payload]);
}

function decodeClientFrames(buffer, onFrame) {
  let offset = 0;
  while (buffer.length - offset >= 2) {
    const first = buffer[offset];
    const second = buffer[offset + 1];
    const fin = (first & 0x80) !== 0;
    const opcode = first & 0x0f;
    const masked = (second & 0x80) !== 0;
    let length = second & 0x7f;
    let headerLength = 2;
    if (!fin || !masked || (first & 0x70) !== 0) throw new Error('INVALID_FRAME');
    if (length === 126) {
      if (buffer.length - offset < 4) break;
      length = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (length === 127) {
      if (buffer.length - offset < 10) break;
      const extended = buffer.readBigUInt64BE(offset + 2);
      if (extended > BigInt(MAX_MESSAGE_BYTES)) throw new Error('MESSAGE_TOO_LARGE');
      length = Number(extended);
      headerLength = 10;
    }
    if (length > MAX_MESSAGE_BYTES) throw new Error('MESSAGE_TOO_LARGE');
    if (buffer.length - offset < headerLength + 4 + length) break;
    const maskOffset = offset + headerLength;
    const mask = buffer.subarray(maskOffset, maskOffset + 4);
    const payloadOffset = maskOffset + 4;
    const payload = Buffer.allocUnsafe(length);
    for (let i = 0; i < length; i += 1) payload[i] = buffer[payloadOffset + i] ^ mask[i & 3];
    onFrame(opcode, payload);
    offset = payloadOffset + length;
  }
  return buffer.subarray(offset);
}

export function createNodeWebSocketPrototypeServer({ now = Date.now } = {}) {
  const tickets = new Map();
  const rooms = new Map();
  let serverTick = 0;

  function issueTicket({ accountId, characterId, sessionId, playerId }) {
    if (![accountId, characterId, sessionId, playerId].every(value => typeof value === 'string' && value.length > 0 && value.length <= 128)) {
      throw new TypeError('Ticket identity fields must be non-empty strings of at most 128 characters');
    }
    const token = randomBytes(32).toString('base64url');
    tickets.set(sha256(token), { accountId, characterId, sessionId, playerId, expiresAt: now() + TICKET_TTL_MS });
    return token;
  }

  function send(socket, message) {
    if (!socket.destroyed && socket.writable) socket.write(encodeFrame(JSON.stringify(message)));
  }

  function sendReject(connection, code, sequence = null) {
    send(connection.socket, { version: 1, type: 'REJECT', code, sequence });
  }

  function roomSnapshot(room) {
    return {
      version: 1,
      type: 'SNAPSHOT',
      serverTick,
      players: [...room.values()]
        .sort((a, b) => a.playerId.localeCompare(b.playerId))
        .map(player => ({
          playerId: player.playerId,
          characterId: player.characterId,
          position: { x: player.x, z: player.z },
          lastSequence: player.lastSequence,
        })),
    };
  }

  function broadcast(room) {
    const snapshot = roomSnapshot(room);
    for (const player of room.values()) if (player.socket) send(player.socket, snapshot);
  }

  function authenticate(connection, message) {
    if (message.version !== 1 || message.type !== 'AUTH' || typeof message.ticket !== 'string' || message.ticket.length < 32 || message.ticket.length > 128) {
      sendReject(connection, 'UNAUTHENTICATED');
      connection.socket.end(encodeFrame(Buffer.from([0x03, 0xf0]), 0x8));
      return;
    }
    const digest = sha256(message.ticket);
    const ticket = tickets.get(digest);
    tickets.delete(digest);
    if (!ticket || ticket.expiresAt <= now()) {
      sendReject(connection, 'INVALID_OR_EXPIRED_TICKET');
      connection.socket.end(encodeFrame(Buffer.from([0x03, 0xf0]), 0x8));
      return;
    }
    let room = rooms.get(ticket.sessionId);
    if (!room) {
      room = new Map();
      rooms.set(ticket.sessionId, room);
    }
    let player = room.get(ticket.playerId);
    if (player && player.accountId !== ticket.accountId) {
      sendReject(connection, 'PLAYER_IDENTITY_CONFLICT');
      connection.socket.end(encodeFrame(Buffer.from([0x03, 0xf0]), 0x8));
      return;
    }
    if (!player) {
      player = {
        accountId: ticket.accountId,
        characterId: ticket.characterId,
        playerId: ticket.playerId,
        x: 0,
        z: 0,
        lastSequence: 0,
        inputTimes: [],
        socket: null,
      };
      room.set(ticket.playerId, player);
    }
    if (player.socket && player.socket !== connection.socket) {
      sendReject(connection, 'PLAYER_ALREADY_CONNECTED');
      connection.socket.end(encodeFrame(Buffer.from([0x03, 0xf0]), 0x8));
      return;
    }
    player.socket = connection.socket;
    connection.player = player;
    connection.room = room;
    connection.authenticated = true;
    clearTimeout(connection.authTimer);
    send(connection.socket, {
      version: 1,
      type: 'WELCOME',
      playerId: player.playerId,
      characterId: player.characterId,
      serverTick,
    });
    broadcast(room);
  }

  function handleMessage(connection, raw) {
    let message;
    try { message = JSON.parse(raw.toString('utf8')); }
    catch { sendReject(connection, 'INVALID_JSON'); return; }
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      sendReject(connection, 'INVALID_MESSAGE');
      return;
    }
    if (!connection.authenticated) {
      authenticate(connection, message);
      return;
    }
    if (message.version !== 1) {
      sendReject(connection, 'UNSUPPORTED_VERSION', Number.isSafeInteger(message.sequence) ? message.sequence : null);
      return;
    }
    if (message.type === 'PING') {
      send(connection.socket, { version: 1, type: 'PONG', nonce: message.nonce ?? null, serverTime: now() });
      return;
    }
    if (message.type !== 'INPUT') {
      sendReject(connection, 'UNSUPPORTED_MESSAGE', Number.isSafeInteger(message.sequence) ? message.sequence : null);
      return;
    }
    const { player, room } = connection;
    const sequence = message.sequence;
    const payload = message.payload;
    if (!Number.isSafeInteger(sequence) || sequence <= player.lastSequence) {
      sendReject(connection, 'INVALID_SEQUENCE', Number.isSafeInteger(sequence) ? sequence : null);
      return;
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)
      || Object.keys(payload).some(key => key !== 'x' && key !== 'z')
      || !Number.isFinite(payload.x) || !Number.isFinite(payload.z)
      || Math.abs(payload.x) > 1 || Math.abs(payload.z) > 1) {
      sendReject(connection, 'INVALID_INPUT', sequence);
      return;
    }
    const currentTime = now();
    player.inputTimes = player.inputTimes.filter(time => currentTime - time < 1000);
    if (player.inputTimes.length >= MAX_INPUTS_PER_SECOND) {
      sendReject(connection, 'INPUT_RATE_LIMITED', sequence);
      return;
    }
    player.inputTimes.push(currentTime);
    player.lastSequence = sequence;
    player.x += payload.x * MOVE_SPEED * STEP_SECONDS;
    player.z += payload.z * MOVE_SPEED * STEP_SECONDS;
    serverTick += 1;
    broadcast(room);
  }

  const server = createServer((_request, response) => {
    response.writeHead(404, { 'cache-control': 'no-store' });
    response.end();
  });

  server.on('upgrade', (request, socket) => {
    const key = request.headers['sec-websocket-key'];
    const version = request.headers['sec-websocket-version'];
    if (request.url !== ACCEPTED_PATH || version !== '13' || typeof key !== 'string' || Buffer.from(key, 'base64').length !== 16) {
      socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    const accept = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write([
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '\r\n',
    ].join('\r\n'));

    const connection = { socket, authenticated: false, player: null, room: null, buffer: Buffer.alloc(0), authTimer: null };
    connection.authTimer = setTimeout(() => {
      if (connection.authenticated || socket.destroyed) return;
      sendReject(connection, 'AUTH_TIMEOUT');
      socket.end(encodeFrame(Buffer.from([0x03, 0xf0]), 0x8));
    }, 10_000);
    connection.authTimer.unref();
    socket.on('data', chunk => {
      connection.buffer = Buffer.concat([connection.buffer, chunk]);
      try {
        connection.buffer = decodeClientFrames(connection.buffer, (opcode, payload) => {
          if (opcode === 0x8) {
            socket.end(encodeFrame(payload, 0x8));
            return;
          }
          if (opcode === 0x9) {
            socket.write(encodeFrame(payload, 0xA));
            return;
          }
          if (opcode !== 0x1) {
            sendReject(connection, 'TEXT_FRAMES_REQUIRED');
            return;
          }
          handleMessage(connection, payload);
        });
      } catch (error) {
        const code = error.message === 'MESSAGE_TOO_LARGE' ? 'MESSAGE_TOO_LARGE' : 'INVALID_FRAME';
        sendReject(connection, code);
        socket.end(encodeFrame(Buffer.from([0x03, 0xf0]), 0x8));
      }
    });
    socket.on('close', () => {
      clearTimeout(connection.authTimer);
      if (connection.player?.socket === socket) connection.player.socket = null;
    });
    socket.on('error', () => {
      clearTimeout(connection.authTimer);
      if (connection.player?.socket === socket) connection.player.socket = null;
    });
  });

  return {
    server,
    issueTicket,
    get address() { return server.address(); },
    close() { return new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); },
  };
}
