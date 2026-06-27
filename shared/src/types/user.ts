export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  isActive: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  isActive: boolean;
  functionalThresholdPower: number | null;
  weightKg: number | null;
  lactateThresholdHeartRate: number | null;
  maxHeartRate: number | null;
  restingHeartRate: number | null;
  gender: string | null;
  eftpMinDurationSeconds: number | null;
  enableRpeFeedback: boolean;
}
