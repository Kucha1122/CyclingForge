using CyclingForge.Modules.Activities.Application.Services;
using FluentAssertions;
using Xunit;

namespace CyclingForge.Modules.Activities.Application.Tests;

public class EftpEstimatorTests
{
    private readonly EftpEstimator _sut = new();

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
        // 20 min = 1200 s -> factor 0.95. So 200 W * 0.95 = 190 W eFTP
        var profile = new PowerProfile { TwentyMinutePower = 200f };
        var result = _sut.EstimateFtpFromPowerProfile(profile);
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(190f, 0.5f);
    }

    [Fact]
    public void EstimateFtpFromPowerProfile_60Min_Uses_0_98_Correction()
    {
        var profile = new PowerProfile { OneHourPower = 200f };
        var result = _sut.EstimateFtpFromPowerProfile(profile);
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(196f, 0.5f); // 200 * 0.98
    }

    [Fact]
    public void EstimateFtpFromPowerProfile_5Min_Uses_0_75_Correction()
    {
        // Intervals.icu-style: min duration 5 min; 5 min power * 0.75 = eFTP.
        var profile = new PowerProfile { FiveMinutePower = 300f };
        var result = _sut.EstimateFtpFromPowerProfile(profile);
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(225f, 0.5f); // 300 * 0.75
    }

    [Fact]
    public void EstimateFtpFromPowerProfile_Picks_Best_Candidate_Across_Durations()
    {
        // 20 min 250 W -> 237.5; 60 min 230 W -> 225.4. Best is 20 min.
        var profile = new PowerProfile
        {
            TwentyMinutePower = 250f,
            OneHourPower = 230f
        };
        var result = _sut.EstimateFtpFromPowerProfile(profile);
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(237.5f, 0.5f);
    }

    [Fact]
    public void EstimateFtpFromPowerProfile_Long_Effort_Can_Beat_Short_When_Higher_Adjusted()
    {
        // 60 min 240 W -> 235.2; 20 min 245 W -> 232.75. Best is 60 min.
        var profile = new PowerProfile
        {
            TwentyMinutePower = 245f,
            OneHourPower = 240f
        };
        var result = _sut.EstimateFtpFromPowerProfile(profile);
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(235.2f, 0.5f);
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
        // User sets min duration 3 min; 5 min effort qualifies -> 0.75 * power.
        var profile = new PowerProfile { FiveMinutePower = 300f };
        var result = _sut.EstimateFtpFromPowerProfile(profile, 180);
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(225f, 0.5f);
    }
}
