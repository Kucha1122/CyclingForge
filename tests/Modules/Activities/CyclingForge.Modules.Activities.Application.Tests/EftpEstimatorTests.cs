using CyclingForge.Modules.Activities.Application.Services;
using FluentAssertions;
using Xunit;

namespace CyclingForge.Modules.Activities.Application.Tests;

public class EftpEstimatorTests
{
    private readonly EftpEstimator _sut = new();

    // Standard power-duration curve factors (anchored so 20 min -> 0.95):
    //   5 min  (300 s)  -> ~0.890
    //   20 min (1200 s) -> 0.95
    //   60 min (3600 s) -> 1.0
    private const float FiveMinFactor = 0.8905f;

    [Fact]
    public void EstimateFtpFromPowerProfile_Returns_Null_When_Profile_Is_Null()
    {
        var result = _sut.EstimateFtpFromPowerProfile(null!);
        result.Should().BeNull();
    }

    [Fact]
    public void EstimateFtpFromPowerProfile_Returns_Null_When_No_Valid_Intervals()
    {
        var profile = new PowerProfile();
        var result = _sut.EstimateFtpFromPowerProfile(profile);
        result.Should().BeNull();
    }

    [Fact]
    public void EstimateFtpFromPowerProfile_20Min_Uses_0_95_Correction()
    {
        // Regression: the classic "FTP = 95% of best 20 min" rule must be preserved.
        var profile = new PowerProfile { TwentyMinutePower = 200f };
        var result = _sut.EstimateFtpFromPowerProfile(profile);
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(190f, 0.5f);
    }

    [Fact]
    public void EstimateFtpFromPowerProfile_60Min_Maps_To_Reference_Power()
    {
        // A 1-hour effort is already at the reference duration -> factor 1.0.
        var profile = new PowerProfile { OneHourPower = 200f };
        var result = _sut.EstimateFtpFromPowerProfile(profile);
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(200f, 0.5f);
    }

    [Fact]
    public void EstimateFtpFromPowerProfile_5Min_Projected_Onto_Curve()
    {
        var profile = new PowerProfile { FiveMinutePower = 300f };
        var result = _sut.EstimateFtpFromPowerProfile(profile);
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(300f * FiveMinFactor, 0.5f); // ~267 W
    }

    [Fact]
    public void EstimateFtpFromPowerProfile_RampTest_Detects_Bump_From_Strong_Short_Effort()
    {
        // Ramp test: a strong 5-min peak but only a sub-maximal 20-min window (includes the ramp-up).
        // The strong short effort, projected independently onto the curve, lifts eFTP above what the
        // weak 20-min effort alone would give. The old flat-factor model (5 min x 0.75) would have
        // produced only ~242 W and missed the increase.
        var profile = new PowerProfile { FiveMinutePower = 320f, TwentyMinutePower = 255f };

        var result = _sut.EstimateFtpFromPowerProfile(profile);

        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(320f * FiveMinFactor, 1f); // ~285 W, driven by the 5-min effort
        result.Value.Should().BeGreaterThan(255f * 0.95f); // higher than the 20-min-only estimate (~242 W)
        result.Value.Should().BeGreaterThan(320f * 0.75f); // higher than the old flat 5-min factor (240 W)
    }

    [Fact]
    public void EstimateFtpFromPowerProfile_Picks_Best_Candidate_Across_Durations()
    {
        // 20 min 250 W -> 237.5; 60 min 230 W -> 230. Best is 20 min.
        var profile = new PowerProfile { TwentyMinutePower = 250f, OneHourPower = 230f };
        var result = _sut.EstimateFtpFromPowerProfile(profile);
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(237.5f, 0.5f);
    }

    [Fact]
    public void EstimateFtpFromPowerProfile_With_MinDuration_600_Rejects_5Min_Only()
    {
        // User sets min duration 10 min; profile has only 5 min power -> no valid candidate.
        var profile = new PowerProfile { FiveMinutePower = 300f };
        var result = _sut.EstimateFtpFromPowerProfile(profile, 600);
        result.Should().BeNull();
    }

    [Fact]
    public void EstimateFtpFromPowerProfile_With_MinDuration_180_Accepts_5Min()
    {
        var profile = new PowerProfile { FiveMinutePower = 300f };
        var result = _sut.EstimateFtpFromPowerProfile(profile, 180);
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(300f * FiveMinFactor, 0.5f);
    }
}
