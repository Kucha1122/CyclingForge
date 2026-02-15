export interface StravaCallbackRequest {
  code: string;
}

export interface AthleteProfileDto {
  stravaAthleteId: number;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  city?: string;
  country?: string;
}
