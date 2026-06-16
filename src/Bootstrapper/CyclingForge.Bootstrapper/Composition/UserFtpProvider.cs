using CyclingForge.Modules.Activities.Application.Services;
using CyclingForge.Modules.Activities.Domain.Entities;
using CyclingForge.Modules.Activities.Domain.Repositories;
using CyclingForge.Modules.Users.Domain.Repositories;
using CyclingForge.Modules.Users.Domain.Entities;
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

    // Per-instance caches. UserFtpProvider is registered scoped, so during a single sync request
    // (which processes many activities) the user row and the FTP-change timeline are read from the
    // database only once instead of several times per activity. This removes the N+1 query storm.
    private Guid? _cachedUserId;
    private User? _cachedUser;
    private Guid? _cachedChangesUserId;
    private List<UserFtpChange>? _cachedChanges;

    private async Task<User?> GetUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        if (_cachedUserId == userId)
            return _cachedUser;

        _cachedUser = await _userRepository.GetByIdAsync(new UserId(userId), cancellationToken);
        _cachedUserId = userId;
        return _cachedUser;
    }

    // Loads the full FTP-change timeline for the user once, then serves all reads from memory.
    // RegisterEftpChangeIfNeededAsync keeps this list in sync by appending newly persisted changes.
    private async Task<List<UserFtpChange>> GetAllChangesAsync(Guid userId, CancellationToken cancellationToken)
    {
        if (_cachedChangesUserId == userId && _cachedChanges is not null)
            return _cachedChanges;

        var all = await _ftpChangeRepository.GetByUserIdOnOrBeforeAsync(userId, DateTime.MaxValue, cancellationToken);
        _cachedChanges = all.ToList();
        _cachedChangesUserId = userId;
        return _cachedChanges;
    }

    public async Task<int?> GetFtpAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await GetUserAsync(userId, cancellationToken);
        return user?.FunctionalThresholdPower;
    }

    public async Task<(int? lthr, int? maxHr, int? restingHr, string gender)> GetHeartRateZonesAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await GetUserAsync(userId, cancellationToken);
        return (user?.LactateThresholdHeartRate, user?.MaxHeartRate, user?.RestingHeartRate, user?.Gender ?? "male");
    }

    public async Task<float?> GetWeightKgAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await GetUserAsync(userId, cancellationToken);
        return user?.WeightKg;
    }

    public async Task<int> GetEftpMinDurationSecondsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await GetUserAsync(userId, cancellationToken);
        var value = user?.EftpMinDurationSeconds ?? DefaultEftpMinDurationSeconds;
        return value;
    }

    public async Task<int?> GetFtpForDateAsync(Guid userId, DateTime date, CancellationToken cancellationToken = default)
    {
        var targetDate = date.Date;

        // Calendar FTP is driven solely by persisted changes in UserFtpChanges (manual and eFTP).
        // Manual changes always have priority over eFTP: for any date on or after the first manual FTP,
        // we use the latest manual value; before that we use the latest eFTP (if any).
        var all = await GetAllChangesAsync(userId, cancellationToken);
        var changes = all.Where(c => c.EffectiveDate <= targetDate).ToList();
        if (changes.Count == 0)
            return null;

        var lastManual = changes
            .Where(c => c.Source == SourceManual)
            .OrderBy(c => c.EffectiveDate)
            .LastOrDefault();
        if (lastManual is not null)
            return lastManual.FtpValue;

        var lastAny = changes
            .OrderBy(c => c.EffectiveDate)
            .LastOrDefault();
        return lastAny?.FtpValue;
    }

    public async Task<IReadOnlyList<FtpChangeDto>> GetFtpChangesForRangeAsync(Guid userId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
    {
        var start = startDate.Date;
        var end = endDate.Date;
        var result = new List<FtpChangeDto>();

        var all = await GetAllChangesAsync(userId, cancellationToken);
        var changesInRange = all.Where(c => c.EffectiveDate >= start && c.EffectiveDate <= end).ToList();

        // Track last known eFTP value before each EstimatedFromActivity change so that
        // chart deltas for eFTP are computed vs previous eFTP, not vs manual FTP.
        foreach (var c in changesInRange.OrderBy(x => x.EffectiveDate))
        {
            if (c.Source == SourceEstimatedFromActivity)
            {
                var dayBefore = c.EffectiveDate.Date.AddDays(-1);
                var lastEftpChange = all.Where(x => x.EffectiveDate <= dayBefore)
                    .Where(x => x.Source == SourceEstimatedFromActivity)
                    .OrderBy(x => x.EffectiveDate)
                    .LastOrDefault();

                var fromEftp = lastEftpChange?.FtpValue ?? 0;

                // Only show eFTP points that are improvements vs previous eFTP (if any),
                // but do not compare against manual FTP so that eFTP dots are still visible
                // even when manual FTP is higher.
                if (lastEftpChange is not null && c.FtpValue <= fromEftp)
                {
                    continue;
                }

                result.Add(new FtpChangeDto
                {
                    Date = c.EffectiveDate.Date,
                    FromFtp = fromEftp,
                    ToFtp = c.FtpValue,
                    Source = c.Source
                });
            }
            else
            {
                var dayBefore = c.EffectiveDate.Date.AddDays(-1);
                var fromFtp = await GetFtpForDateAsync(userId, dayBefore, cancellationToken) ?? 0;

                result.Add(new FtpChangeDto
                {
                    Date = c.EffectiveDate.Date,
                    FromFtp = fromFtp,
                    ToFtp = c.FtpValue,
                    Source = c.Source
                });
            }
        }

        return result;
    }

    public async Task RegisterEftpChangeIfNeededAsync(Guid userId, DateTime activityDate, int estimatedFtp, CancellationToken cancellationToken = default)
    {
        if (estimatedFtp <= 0)
            return;

        var date = activityDate.Date;

        var all = await GetAllChangesAsync(userId, cancellationToken);

        // Avoid duplicate eFTP changes for the same day and value.
        if (all.Any(c => c.EffectiveDate.Date == date && c.FtpValue == estimatedFtp && c.Source == SourceEstimatedFromActivity))
            return;

        // Bierzemy pod uwagę WYŁĄCZNIE poprzednie wpisy EstimatedFromActivity (manual idzie swoją ścieżką).
        var lastEftpChange = all.Where(c => c.EffectiveDate <= date)
            .Where(c => c.Source == SourceEstimatedFromActivity)
            .OrderBy(c => c.EffectiveDate)
            .LastOrDefault();
        int? lastEftp = lastEftpChange?.FtpValue;

        var shouldAdd = false;

        if (!lastEftp.HasValue)
        {
            // Pierwszy punkt eFTP – zawsze zapisujemy.
            shouldAdd = true;
        }
        else
        {
            // TWARDY ZAKAZ: EstimatedFromActivity nigdy nie może wprowadzić FtpValue <= ostatniego eFTP.
            // eFTP może tylko rosnąć względem poprzedniego eFTP; spadki są możliwe wyłącznie z wpisów manualnych.
            if (estimatedFtp <= lastEftp.Value)
            {
                return;
            }

            // Dla prawdziwych wzrostów korzystamy z istniejących progów (MinIncreaseWatts / MinIncreasePercent).
            shouldAdd = ShouldAcceptAutomaticChange(lastEftp.Value, estimatedFtp);
        }

        if (!shouldAdd)
            return;

        var change = UserFtpChange.Create(userId, date, estimatedFtp, SourceEstimatedFromActivity);
        await _ftpChangeRepository.AddAsync(change, cancellationToken);

        // Keep the in-memory timeline consistent so later activities in the same sync see this change.
        if (_cachedChangesUserId == userId && _cachedChanges is not null)
            _cachedChanges.Add(change);
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

    /// <summary>
    /// Gets eFTP for the activity using current min duration for cycling rides only (Ride/VirtualRide):
    /// recomputes from stored 5/20/60 min power when available, else fallback to stored or Best20Min*0.95.
    /// Non-cycling activities never contribute eFTP to the FTP timeline.
    /// </summary>
    private int? GetActivityEftp(Activity a, int minDurationSeconds)
    {
        // Limit eFTP candidates strictly to cycling activities so that FTP timeline and PMC markers
        // are driven only by rides, matching the intended \"calendar FTP\" behaviour.
        var sport = a.Type?.Value;
        if (!string.Equals(sport, "Ride", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(sport, "VirtualRide", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

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
