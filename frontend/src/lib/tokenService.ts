// Token storage service
const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const tokenService = {
    getAccessToken: (): string | null => {
        return localStorage.getItem(TOKEN_KEY);
    },

    setAccessToken: (token: string): void => {
        localStorage.setItem(TOKEN_KEY, token);
    },

    getRefreshToken: (): string | null => {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
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
