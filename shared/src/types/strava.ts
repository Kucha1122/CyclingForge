export interface ActivitySyncFilterDto {
  id: string;
  activityType: string;
  excludedDevicePattern: string;
}

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

export interface ZoneRangeDto {
  min: number;
  max: number;
}

export interface AthleteZonesDto {
  heartRateZones: ZoneRangeDto[];
  powerZones: ZoneRangeDto[];
}
