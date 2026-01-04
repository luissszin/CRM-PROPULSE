import { Server } from 'socket.io';

let io;

export function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: '*', // In production, restrict this to your frontend URL
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        const { unitId } = socket.handshake.query;
        if (unitId) {
            socket.join(`unit_${unitId}`);
            console.log(`[Socket] Client connected to unit: ${unitId}`);
        } else {
            console.log('[Socket] Client connected without unitId');
        }

        socket.on('disconnect', () => {
            console.log('[Socket] Client disconnected');
        });
    });

    return io;
}

export function emitToUnit(unitId, event, data) {
    if (io) {
        io.to(`unit_${unitId}`).emit(event, data);
    }
}

export function emitToAll(event, data) {
    if (io) {
        io.emit(event, data);
    }
}

export { io };
