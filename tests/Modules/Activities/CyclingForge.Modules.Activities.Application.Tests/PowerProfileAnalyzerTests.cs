using System.Collections.Generic;
using CyclingForge.Modules.Activities.Application.Services;
using FluentAssertions;
using Xunit;

namespace CyclingForge.Modules.Activities.Application.Tests;

public class PowerProfileAnalyzerTests
{
    [Fact]
    public void AnalyzePowerProfile_Should_Return_Null_TwentyMinutePower_When_Data_Shorter_Than_20_Minutes()
    {
        // Arrange: 10 minutes of constant power
        var powerData = CreateConstantPowerSeries(200f, 600);
        var analyzer = new PowerProfileAnalyzer();

        // Act
        var profile = analyzer.AnalyzePowerProfile(powerData, weightKg: null);

        // Assert
        profile.TwentyMinutePower.Should().BeNull();
    }

    [Fact]
    public void AnalyzePowerProfile_Should_Return_Correct_TwentyMinutePower_For_Constant_Power()
    {
        // Arrange: 30 minutes of constant power
        var powerData = CreateConstantPowerSeries(250f, 1800);
        var analyzer = new PowerProfileAnalyzer();

        // Act
        var profile = analyzer.AnalyzePowerProfile(powerData, weightKg: null);

        // Assert
        profile.TwentyMinutePower.Should().NotBeNull();
        profile.TwentyMinutePower!.Value.Should().BeApproximately(250f, 0.001f);
    }

    private static IEnumerable<float> CreateConstantPowerSeries(float value, int count)
    {
        for (var i = 0; i < count; i++)
        {
            yield return value;
        }
    }
}

