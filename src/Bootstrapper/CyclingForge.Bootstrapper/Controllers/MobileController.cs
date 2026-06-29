using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CyclingForge.Bootstrapper.Controllers;

/// <summary>
/// Serves the self-distributed Android app: a version manifest and the signed APK.
/// Both files live in a directory backed by a persistent volume (see Mobile:DistPath),
/// written by the mobile-build CI workflow. Anonymous on purpose — the web QR page and the
/// app's pre-login update check both need to reach these without a token.
/// </summary>
[ApiController]
[Route("api/mobile")]
[AllowAnonymous]
public sealed class MobileController : ControllerBase
{
    private const string ManifestFileName = "latest.json";
    private const string ApkFileName = "app-release.apk";

    private readonly string _distPath;

    public MobileController(IConfiguration configuration)
    {
        _distPath = configuration["Mobile:DistPath"] ?? "/app/mobile-dist";
    }

    /// <summary>Returns the published version manifest (version, versionCode, apkUrl, notes, releasedAt).</summary>
    [HttpGet("version")]
    public IActionResult GetVersion()
    {
        var manifestPath = Path.Combine(_distPath, ManifestFileName);
        if (!System.IO.File.Exists(manifestPath))
            return NotFound(new { message = "No mobile build has been published yet." });

        var json = System.IO.File.ReadAllText(manifestPath);
        return Content(json, "application/json");
    }

    /// <summary>Streams the latest signed APK for sideload install / in-app update.</summary>
    [HttpGet("download")]
    public IActionResult Download()
    {
        var apkPath = Path.Combine(_distPath, ApkFileName);
        if (!System.IO.File.Exists(apkPath))
            return NotFound(new { message = "No mobile build has been published yet." });

        var stream = System.IO.File.OpenRead(apkPath);
        return File(stream, "application/vnd.android.package-archive", "cyclingforge.apk");
    }
}
