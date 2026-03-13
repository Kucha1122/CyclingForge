namespace CyclingForge.Modules.Garmin.Api.Requests;

public sealed record GarminAuthorizeRequest(string OAuthToken, string OAuthVerifier);
