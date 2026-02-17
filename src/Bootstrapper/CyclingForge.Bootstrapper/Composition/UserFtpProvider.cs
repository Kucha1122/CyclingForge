using CyclingForge.Modules.Activities.Application.Services;
using CyclingForge.Modules.Activities.Domain.Entities;
using CyclingForge.Modules.Activities.Domain.Repositories;
using CyclingForge.Modules.Users.Domain.Repositories;
using CyclingForge.Modules.Users.Domain.ValueObjects;
using Microsoft.Extensions.Options;

namespace CyclingForge.Bootstrapper.Composition;

internal sealed class UserFtpProvider : IUserFtpProvider
{
    private const float EFtpMultiplier = 0.95f;
    private const string SourceManual = "Manual";
    private const string SourceEstimatedFromActivity = "EstimatedFromActivity";

    private readonly IUserRepository _userRepository;
    private readonly IUserFtpChangeRepository _ftpChangeRepository;
    private readonly IActivityRepository _activityRepository;
    private readonly IEftpEstimator _eftpEstimator;
    private readonly FtpEstimationOptions _ftpOptions;

    public UserFtpProvider(
        IUserRepository userRepository,
        IUserFtpChangeRepository ftpChangeRepository,
        IActivityRepository activityRepository,
        IEftpEstimator eftpEstimator,
        IOptions<FtpEstimationOptions> ftpOptions)
    {
        _userRepository = userRepository;
        _ftpChangeRepository = ftpChangeRepository;
        _activityRepository = activityRepository;
        _eftpEstimator = eftpEstimator;
        _ftpOptions = ftpOptions.Value ?? new FtpEstimationOptions();
    }

    private const int DefaultEftpMinDurationSeconds = 300;

    public async Task<int?> GetFtpAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(new UserId(userId), cancellationToken);
        return user?.FunctionalThresholdPower;
    }

    public async Task<(int? lthr, int? maxHr, int? restingHr, string gender)> GetHeartRateZonesAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(new UserId(userId), cancellationToken);
        return (user?.LactateThresholdHeartRate, user?.MaxHeartRate, user?.RestingHeartRate, user?.Gender ?? "male");
    }

    public async Task<int> GetEftpMinDurationSecondsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(new UserId(userId), cancellationToken);
        var value = user?.EftpMinDurationSeconds ?? DefaultEftpMinDurationSeconds;
        return value;
    }

    public async Task<int?> GetFtpForDateAsync(Guid userId, DateTime date, CancellationToken cancellationToken = default)
    {
        var targetDate = date.Date;

        var user = await _userRepository.GetByIdAsync(new UserId(userId), cancellationToken);
        var userEftpMinSec = user?.EftpMinDurationSeconds ?? DefaultEftpMinDurationSeconds;
        int? currentFtp = user?.FunctionalThresholdPower;
        var initialManualFtp = currentFtp;

        var manualChanges = await _ftpChangeRepository.GetByUserIdOnOrBeforeAsync(userId, targetDate, cancellationToken);
        var activities = await _activityRepository.GetByUserIdAsync(userId, 1, 10000, cancellationToken);

        // Process all potential events (manual + eFTP candidates) in chronological order. eFTP recomputed with current min duration.
        var eftpCandidates = activities
            .Where(a => a.StartDate.Date <= targetDate && GetActivityEftp(a, userEftpMinSec).HasValue)
            .Select(a => new
            {
                Date = a.StartDate.Date,
                Ftp = GetActivityEftp(a, userEftpMinSec)!.Value,
                IsManual = false
            });

        var manualEvents = manualChanges
            .Select(c => new
            {
                Date = c.EffectiveDate.Date,
                Ftp = c.FtpValue,
                IsManual = true
            });

        var orderedEvents = manualEvents
            .Concat(eftpCandidates)
            .Where(e => e.Ftp > 0 && e.Date <= targetDate)
            .OrderBy(e => e.Date)
            .ThenByDescending(e => e.IsManual) // manual overrides eFTP on same day
            .ToList();

        foreach (var e in orderedEvents)
        {
            if (e.IsManual)
            {
                // Manual FTP change always overrides.
                currentFtp = e.Ftp;
            }
            else
            {
                // eFTP candidate: accept if meaningful increase, or establish baseline (first activity eFTP when current is still manual).
                if (!currentFtp.HasValue)
                {
                    currentFtp = e.Ftp;
                }
                else if (ShouldAcceptAutomaticChange(currentFtp.Value, e.Ftp))
                {
                    currentFtp = e.Ftp;
                }
                else if (initialManualFtp.HasValue && currentFtp == initialManualFtp.Value && e.Ftp < currentFtp)
                {
                    // Baseline: no prior eFTP accepted yet; accept first activity's eFTP so timeline and chart can show progression.
                    currentFtp = e.Ftp;
                }
            }
        }

        return currentFtp;
    }

    public async Task<IReadOnlyList<FtpChangeDto>> GetFtpChangesForRangeAsync(Guid userId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
    {
        var start = startDate.Date;
        var end = endDate.Date;
        var result = new List<FtpChangeDto>();

        var user = await _userRepository.GetByIdAsync(new UserId(userId), cancellationToken);
        var currentFtp = user?.FunctionalThresholdPower ?? 0;
        var userEftpMinSec = user?.EftpMinDurationSeconds ?? DefaultEftpMinDurationSeconds;

        var manualInRange = await _ftpChangeRepository.GetByUserIdInRangeAsync(userId, start, end, cancellationToken);
        foreach (var c in manualInRange)
        {
            var dayBefore = c.EffectiveDate.Date.AddDays(-1);
            var fromFtp = await GetFtpForDateAsync(userId, dayBefore, cancellationToken) ?? currentFtp;
            result.Add(new FtpChangeDto
            {
                Date = c.EffectiveDate.Date,
                FromFtp = fromFtp,
                ToFtp = c.FtpValue,
                Source = SourceManual
            });
        }

        var activities = await _activityRepository.GetByUserIdAsync(userId, 1, 10000, cancellationToken);
        var eFtpActivities = activities
            .Where(a => GetActivityEftp(a, userEftpMinSec).HasValue && a.StartDate.Date >= start && a.StartDate.Date <= end)
            .OrderBy(a => a.StartDate)
            .ToList();

        foreach (var a in eFtpActivities)
        {
            var toFtp = GetActivityEftp(a, userEftpMinSec)!.Value;
            if (toFtp <= 0) continue;
            var dayBefore = a.StartDate.Date.AddDays(-1);
            var fromFtp = await GetFtpForDateAsync(userId, dayBefore, cancellationToken);
            var fromFtpValue = fromFtp ?? currentFtp;
            var isBaselineDrop = fromFtpValue == currentFtp && currentFtp > 0 && toFtp < fromFtpValue;
            var wouldAccept = fromFtpValue > 0 && fromFtpValue != toFtp && (ShouldAcceptAutomaticChange(fromFtpValue, toFtp) || isBaselineDrop);
            if (wouldAccept)
            {
                result.Add(new FtpChangeDto
                {
                    Date = a.StartDate.Date,
                    FromFtp = fromFtpValue,
                    ToFtp = toFtp,
                    Source = SourceEstimatedFromActivity
                });
            }
        }

        return result.OrderBy(x => x.Date).ToList();
    }

    private bool ShouldAcceptAutomaticChange(int fromFtp, int toFtp)
    {
        if (fromFtp <= 0 || toFtp <= 0 || fromFtp == toFtp)
        {
            return false;
        }

        var delta = toFtp - fromFtp;
        var absDelta = Math.Abs(delta);
        var relativeDelta = absDelta / (double)fromFtp;

        if (delta > 0)
        {
            // Increases: keep default behaviour equivalent to previous version (>= 5 W)
            // but allow configuration via options and optional relative threshold.
            var minWatts = Math.Max(1, _ftpOptions.MinIncreaseWatts);
            var minPercent = _ftpOptions.MinIncreasePercent;

            var meetsWatts = absDelta >= minWatts;
            var meetsPercent = minPercent > 0 && relativeDelta >= minPercent;

            return meetsWatts || meetsPercent;
        }

        // Decreases
        if (!_ftpOptions.AllowDecreases)
        {
            return false;
        }

        var minDecreaseWatts = Math.Max(1, _ftpOptions.MinDecreaseWatts);
        var minDecreasePercent = _ftpOptions.MinDecreasePercent;

        var meetsDecreaseWatts = absDelta >= minDecreaseWatts;
        var meetsDecreasePercent = minDecreasePercent > 0 && relativeDelta >= minDecreasePercent;

        return meetsDecreaseWatts || meetsDecreasePercent;
    }

    /// <summary>Gets eFTP for the activity using current min duration: recomputes from stored 5/20/60 min power when available, else fallback to stored or Best20Min*0.95.</summary>
    private int? GetActivityEftp(Activity a, int minDurationSeconds)
    {
        var profile = new PowerProfile
        {
            FiveMinutePower = a.Best5MinPower,
            TwentyMinutePower = a.Best20MinPower,
            OneHourPower = a.Best60MinPower
        };
        var estimated = _eftpEstimator.EstimateFtpFromPowerProfile(profile, minDurationSeconds);
        if (estimated.HasValue && estimated.Value > 0)
            return (int)Math.Round(estimated.Value);
        if (a.EstimatedFtpFromActivity.HasValue && a.EstimatedFtpFromActivity.Value > 0)
            return a.EstimatedFtpFromActivity.Value;
        if (a.Best20MinPower.HasValue && a.Best20MinPower.Value > 0)
            return (int)Math.Round(a.Best20MinPower.Value * EFtpMultiplier);
        return null;
    }
}
