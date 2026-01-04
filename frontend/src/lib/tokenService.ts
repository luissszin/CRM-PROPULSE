// Token storage service
const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const tokenService = {
    getAccessToken: (): string | null => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) return token;
        
        // Fallback or Primary: Try to get from Zustand storage
        try {
            const storage = localStorage.getItem('propulse-crm-storage');
            if (storage) {
                const parsed = JSON.parse(storage);
                return parsed.state?.accessToken || null;
            }
        } catch (e) {}
        return null;
    },

    setAccessToken: (token: string): void => {
        localStorage.setItem(TOKEN_KEY, token);
    },

    getRefreshToken: (): string | null => {
        const token = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (token) return token;

        try {
            const storage = localStorage.getItem('propulse-crm-storage');
            if (storage) {
                const parsed = JSON.parse(storage);
                return parsed.state?.refreshToken || null;
            }
        } catch (e) {}
        return null;
    },

    setRefreshToken: (token: string): void => {
        localStorage.setItem(REFRESH_TOKEN_KEY, token);
    },

    setTokens: (accessToken: string, refreshToken: string): void => {
        tokenService.setAccessToken(accessToken);
        tokenService.setRefreshToken(refreshToken);
    },

    clearTokens: (): void => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
    },

    hasTokens: (): boolean => {
        return !!tokenService.getAccessToken() && !!tokenService.getRefreshToken();
    },
};
