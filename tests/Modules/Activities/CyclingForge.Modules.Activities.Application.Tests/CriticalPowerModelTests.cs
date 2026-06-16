using CyclingForge.Modules.Activities.Application.Services;
using FluentAssertions;
using Xunit;

namespace CyclingForge.Modules.Activities.Application.Tests;

public class CriticalPowerModelTests
{
    [Fact]
    public void Estimate_Matches_The_Closed_Form_Used_By_PowerCurve()
    {
        // Same inputs and math the power-curve handler used before extraction:
        // W' = (P5 - P20) / (1/300 - 1/1200); CP = P20 - W'/1200.
        const float p5 = 320f, p20 = 280f;
        var expectedWPrime = (p5 - p20) / (1f / 300f - 1f / 1200f);
        var expectedCp = p20 - expectedWPrime / 1200f;

        var fit = CriticalPowerModel.Estimate(300, p5, 1200, p20);

        fit.Should().NotBeNull();
        fit!.Value.WPrime.Should().BeApproximately(expectedWPrime, 0.1f);
        fit.Value.CriticalPower.Should().BeApproximately(expectedCp, 0.1f);
    }

    [Fact]
    public void Estimate_Returns_Null_When_Short_Power_Not_Greater_Than_Long()
    {
        // A non-decaying curve is degenerate (CP undefined).
        CriticalPowerModel.Estimate(300, 280f, 1200, 280f).Should().BeNull();
        CriticalPowerModel.Estimate(300, 270f, 1200, 280f).Should().BeNull();
    }

    [Fact]
    public void Estimate_Returns_Null_For_Invalid_Durations_Or_Power()
    {
        CriticalPowerModel.Estimate(1200, 280f, 300, 320f).Should().BeNull(); // short >= long
        CriticalPowerModel.Estimate(300, 0f, 1200, 280f).Should().BeNull();
        CriticalPowerModel.Estimate(0, 320f, 1200, 280f).Should().BeNull();
    }
}
