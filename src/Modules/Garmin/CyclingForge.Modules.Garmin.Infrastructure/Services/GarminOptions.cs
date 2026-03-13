namespace CyclingForge.Modules.Garmin.Infrastructure.Services;

public sealed class GarminOptions
{
    public const string SectionName = "Garmin";

    public string ConsumerKey { get; set; } = string.Empty;
    public string ConsumerSecret { get; set; } = string.Empty;
    public string CallbackUrl { get; set; } = string.Empty;
    public string RequestTokenUrl { get; set; } = "https://connectapi.garmin.com/oauth-service/oauth/request_token";
    public string AuthorizeUrl { get; set; } = "https://connect.garmin.com/oauthConfirm";
    public string AccessTokenUrl { get; set; } = "https://connectapi.garmin.com/oauth-service/oauth/access_token";
}
