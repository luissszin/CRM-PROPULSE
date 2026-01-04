import { io, Socket } from 'socket.io-client';

const BASE = import.meta.env.VITE_API_BASE_URL || '/';

class SocketService {
    private socket: Socket | null = null;

    connect(unitId: string) {
        if (this.socket?.connected) {
            if ((this.socket as any).unitId === unitId) return;
            this.socket.disconnect();
        }

        console.log(`[Socket] Connecting to ${BASE} for unit ${unitId}...`);
        this.socket = io(BASE, {
            query: { unitId },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        (this.socket as any).unitId = unitId;

        this.socket.on('connect', () => {
            console.log('[Socket] Connected to server');
        });

        this.socket.on('disconnect', () => {
            console.log('[Socket] Disconnected from server');
        });

        this.socket.on('connect_error', (error) => {
            console.error('[Socket] Connection error:', error);
        });
    }

    on(event: string, callback: (data: any) => void) {
        this.socket?.on(event, callback);
    }

    off(event: string) {
        this.socket?.off(event);
    }

    disconnect() {
        this.socket?.disconnect();
        this.socket = null;
    }
}

export const socketService = new SocketService();
