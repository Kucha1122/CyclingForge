namespace CyclingForge.Modules.Garmin.Api.Requests;

public sealed record GarminConnectMfaRequest(string SessionId, string MfaCode);

public sealed record GarminMfaRequiredDto(string SessionId);
