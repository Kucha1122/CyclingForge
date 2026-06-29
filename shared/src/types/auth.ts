export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResultDto {
  token: string;
  refreshToken: string;
  userId: string;
  email: string;
  accessTokenExpiresAtUtc: string;
}
