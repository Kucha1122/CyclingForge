using CyclingForge.Modules.Activities.Application.Services;
using FluentAssertions;
using Xunit;

namespace CyclingForge.Modules.Activities.Application.Tests;

public class TrainingMetricsCalculatorTests
{
    private readonly TrainingMetricsCalculator _sut = new();

    #region Normalized Power Tests

    [Fact]
    public void CalculateNormalizedPower_Returns_Null_When_PowerData_Is_Null()
    {
        var result = _sut.CalculateNormalizedPower(null!);
        result.Should().BeNull();
    }

    [Fact]
    public void CalculateNormalizedPower_Returns_Null_When_PowerData_Is_Empty()
    {
        var result = _sut.CalculateNormalizedPower(new List<float>());
        result.Should().BeNull();
    }

    [Fact]
    public void CalculateNormalizedPower_Returns_Average_When_Less_Than_30_Seconds()
    {
        // Less than 30 seconds of data - should return original data
        var powerData = new List<float> { 200f, 210f, 205f }; // 3 seconds
        var result = _sut.CalculateNormalizedPower(powerData);
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(205f, 3f);
    }

    [Fact]
    public void CalculateNormalizedPower_Steady_State_Equals_Average()
    {
        // For steady-state power, NP ≈ average power
        var powerData = Enumerable.Repeat(200f, 300).ToList(); // 5 minutes at constant 200W
        var result = _sut.CalculateNormalizedPower(powerData);
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(200f, 1f);
    }

    [Fact]
    public void CalculateNormalizedPower_Intervals_Higher_Than_Average()
    {
        // Intervals: 30s @ 300W, 30s @ 100W (average = 200W, NP should be higher)
        var powerData = new List<float>();
        for (int i = 0; i < 10; i++)
        {
            powerData.AddRange(Enumerable.Repeat(300f, 30)); // 30s hard
            powerData.AddRange(Enumerable.Repeat(100f, 30)); // 30s easy
        }
        var result = _sut.CalculateNormalizedPower(powerData);
        result.Should().NotBeNull();
        result!.Value.Should().BeGreaterThan(200f); // NP > average for variable efforts
        result!.Value.Should().BeLessThan(250f); // But not as high as peak
    }

    #endregion

    #region Intensity Factor Tests

    [Fact]
    public void CalculateIntensityFactor_Returns_Null_When_NP_Is_Null()
    {
        var result = _sut.CalculateIntensityFactor(null, 250);
        result.Should().BeNull();
    }

    [Fact]
    public void CalculateIntensityFactor_Returns_Null_When_FTP_Is_Null()
    {
        var result = _sut.CalculateIntensityFactor(200f, null);
        result.Should().BeNull();
    }

    [Fact]
    public void CalculateIntensityFactor_Returns_Null_When_FTP_Is_Zero()
    {
        var result = _sut.CalculateIntensityFactor(200f, 0);
        result.Should().BeNull();
    }

    [Fact]
    public void CalculateIntensityFactor_Calculates_Correctly()
    {
        // IF = NP / FTP
        var result = _sut.CalculateIntensityFactor(200f, 250);
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(0.8f, 0.001f); // 200 / 250 = 0.8
    }

    [Fact]
    public void CalculateIntensityFactor_Example_Easy_Ride()
    {
        // Easy endurance ride: 150W NP with 250W FTP
        var result = _sut.CalculateIntensityFactor(150f, 250);
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(0.6f, 0.001f);
    }

    [Fact]
    public void CalculateIntensityFactor_Example_Threshold_Ride()
    {
        // Threshold ride: NP close to FTP
        var result = _sut.CalculateIntensityFactor(245f, 250);
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(0.98f, 0.001f);
    }

    #endregion

    #region TSS Tests - Intervals.icu Validation

    [Fact]
    public void CalculateTrainingStressScore_Returns_Null_When_NP_Is_Null()
    {
        var result = _sut.CalculateTrainingStressScore(null, 0.8f, 3600, 250);
        result.Should().BeNull();
    }

    [Fact]
    public void CalculateTrainingStressScore_Returns_Null_When_IF_Is_Null()
    {
        var result = _sut.CalculateTrainingStressScore(200f, null, 3600, 250);
        result.Should().BeNull();
    }

    [Fact]
    public void CalculateTrainingStressScore_Returns_Null_When_FTP_Is_Null()
    {
        var result = _sut.CalculateTrainingStressScore(200f, 0.8f, 3600, null);
        result.Should().BeNull();
    }

    [Fact]
    public void CalculateTrainingStressScore_IntervalsIcu_Example_1()
    {
        // Example from Intervals.icu: 60min ride at 200W NP with FTP=250
        // TSS = (3600 × 200 × 0.8 × 100) / (250 × 3600) = 64
        // OR using formula: (seconds * NP * IF) / (FTP * 36) = (3600 * 200 * 0.8) / (250 * 36) = 64
        var np = 200f;
        var ftp = 250;
        var if_ = np / ftp; // 0.8
        var duration = 3600; // 60 minutes

        var result = _sut.CalculateTrainingStressScore(np, if_, duration, ftp);
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(64f, 0.5f);
    }

    [Fact]
    public void CalculateTrainingStressScore_IntervalsIcu_Example_2()
    {
        // Example: 90min endurance ride at 150W NP with FTP=250 (IF=0.6)
        // TSS = (5400 × 150 × 0.6 × 100) / (250 × 3600) ≈ 54
        var np = 150f;
        var ftp = 250;
        var if_ = np / ftp; // 0.6
        var duration = 5400; // 90 minutes

        var result = _sut.CalculateTrainingStressScore(np, if_, duration, ftp);
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(54f, 0.5f);
    }

    [Fact]
    public void CalculateTrainingStressScore_IntervalsIcu_Example_3()
    {
        // Example: 60min threshold ride at 245W NP with FTP=250 (IF=0.98)
        // TSS = (3600 × 245 × 0.98 × 100) / (250 × 3600) ≈ 96.04
        var np = 245f;
        var ftp = 250;
        var if_ = np / ftp; // 0.98
        var duration = 3600; // 60 minutes

        var result = _sut.CalculateTrainingStressScore(np, if_, duration, ftp);
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(96f, 0.5f);
    }

    [Fact]
    public void CalculateTrainingStressScore_One_Hour_At_FTP_Equals_100()
    {
        // Definition: 1 hour at FTP = 100 TSS
        var np = 250f;
        var ftp = 250;
        var if_ = 1.0f;
        var duration = 3600; // 60 minutes

        var result = _sut.CalculateTrainingStressScore(np, if_, duration, ftp);
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(100f, 0.5f);
    }

    [Fact]
    public void CalculateTrainingStressScore_30_Minutes_At_FTP_Equals_50()
    {
        // Half hour at FTP = 50 TSS
        var np = 250f;
        var ftp = 250;
        var if_ = 1.0f;
        var duration = 1800; // 30 minutes

        var result = _sut.CalculateTrainingStressScore(np, if_, duration, ftp);
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(50f, 0.5f);
    }

    [Fact]
    public void CalculateTrainingStressScore_Formula_Verification()
    {
        // Verify our formula (duration * NP * IF) / (FTP * 36) 
        // is equivalent to (duration * NP * IF * 100) / (FTP * 3600)
        // Since 36 = 3600/100, they should be identical
        var np = 200f;
        var ftp = 250;
        var if_ = 0.8f;
        var duration = 3600;

        var result = _sut.CalculateTrainingStressScore(np, if_, duration, ftp);
        
        // Manual calculation using standard formula
        var expectedTss = (duration * np * if_ * 100) / (ftp * 3600);
        
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(expectedTss, 0.01f);
    }

    #endregion

    #region HR-Based TSS Tests

    [Fact]
    public void CalculateHeartRateBasedTss_Returns_Null_When_AvgHR_Is_Null()
    {
        var result = _sut.CalculateHeartRateBasedTss(null, 170f, 3600);
        result.Should().BeNull();
    }

    [Fact]
    public void CalculateHeartRateBasedTss_Returns_Null_When_LTHR_Is_Null()
    {
        var result = _sut.CalculateHeartRateBasedTss(140f, null, 3600);
        result.Should().BeNull();
    }

    [Fact]
    public void CalculateHeartRateBasedTss_Example_Easy_Ride()
    {
        // 60min at 140 bpm with LTHR=170
        // hrTSS = (60 * (140/170)^2 * 100) / 60 ≈ 68
        var result = _sut.CalculateHeartRateBasedTss(140f, 170f, 3600);
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(68f, 1f);
    }

    #endregion

    #region HRSS (TRIMP) Tests

    [Fact]
    public void CalculateHrss_Returns_Null_When_AvgHR_Is_Null()
    {
        var result = _sut.CalculateHrss(null, 3600, 190, 60, 170);
        result.Should().BeNull();
    }

    [Fact]
    public void CalculateHrss_Returns_Null_When_MaxHR_Is_Null()
    {
        var result = _sut.CalculateHrss(140f, 3600, null, 60, 170);
        result.Should().BeNull();
    }

    [Fact]
    public void CalculateHrss_Returns_Null_When_RestingHR_Is_Null()
    {
        var result = _sut.CalculateHrss(140f, 3600, 190, null, 170);
        result.Should().BeNull();
    }

    [Fact]
    public void CalculateHrss_Returns_Null_When_LTHR_Is_Null()
    {
        var result = _sut.CalculateHrss(140f, 3600, 190, 60, null);
        result.Should().BeNull();
    }

    [Fact]
    public void CalculateHrss_Returns_Null_When_MaxHR_LessThanOrEqual_RestingHR()
    {
        var result = _sut.CalculateHrss(140f, 3600, 60, 60, 170);
        result.Should().BeNull();
    }

    [Fact]
    public void CalculateHrss_Male_Example_Moderate_Effort()
    {
        // Male, 60min ride at 150 bpm
        // MaxHR=190, RestingHR=60, LTHR=170
        // HRR = (150-60)/(190-60) = 90/130 ≈ 0.692
        // TRIMP = 60 * 0.692 * 0.64 * exp(1.92 * 0.692)
        // Should produce reasonable HRSS value
        var result = _sut.CalculateHrss(150f, 3600, 190, 60, 170, "male");
        result.Should().NotBeNull();
        result!.Value.Should().BeGreaterThan(0);
        result!.Value.Should().BeLessThan(200); // Sanity check
    }

    [Fact]
    public void CalculateHrss_Female_Example_Moderate_Effort()
    {
        // Female has lower exponential factor (1.67 vs 1.92)
        // Same conditions as male test
        var result = _sut.CalculateHrss(150f, 3600, 190, 60, 170, "female");
        result.Should().NotBeNull();
        result!.Value.Should().BeGreaterThan(0);
        result!.Value.Should().BeLessThan(200);
    }

    [Fact]
    public void CalculateHrss_Gender_Differences()
    {
        // Male and female use different exponential factors (y=1.92 vs y=1.67)
        // This affects TRIMP calculation. Both should produce valid results.
        var male = _sut.CalculateHrss(150f, 3600, 190, 60, 170, "male");
        var female = _sut.CalculateHrss(150f, 3600, 190, 60, 170, "female");
        
        male.Should().NotBeNull();
        female.Should().NotBeNull();
        
        // Both should be positive and reasonable
        male!.Value.Should().BeGreaterThan(0);
        female!.Value.Should().BeGreaterThan(0);
        
        // Values should be different due to different exponential factors
        male!.Value.Should().NotBe(female!.Value);
    }

    [Fact]
    public void CalculateHrss_One_Hour_At_LTHR_Should_Be_100()
    {
        // By definition, 1 hour at LTHR should produce HRSS ≈ 100
        // This is the normalization point
        var result = _sut.CalculateHrss(170f, 3600, 190, 60, 170, "male");
        result.Should().NotBeNull();
        result!.Value.Should().BeApproximately(100f, 5f); // Allow 5% tolerance
    }

    [Fact]
    public void CalculateHrss_Easy_Walk_Low_HR()
    {
        // Easy walk at 100 bpm for 30 minutes
        // MaxHR=190, RestingHR=60, LTHR=170
        // HRR = (100-60)/(190-60) = 40/130 ≈ 0.308
        // Should produce low HRSS
        var result = _sut.CalculateHrss(100f, 1800, 190, 60, 170, "male");
        result.Should().NotBeNull();
        result!.Value.Should().BeGreaterThan(0);
        result!.Value.Should().BeLessThan(30); // Low effort = low HRSS
    }

    [Fact]
    public void CalculateHrss_Handles_Negative_HRR()
    {
        // Edge case: avgHR below restingHR (shouldn't happen but test robustness)
        // HRR should be clamped to 0
        var result = _sut.CalculateHrss(50f, 1800, 190, 60, 170, "male");
        result.Should().NotBeNull();
        result!.Value.Should().BeGreaterOrEqualTo(0);
    }

    #endregion

    #region Integration Tests - Full Flow

    [Fact]
    public void Full_Power_Based_TSS_Calculation_Flow()
    {
        // Simulate real activity: 60min ride with variable power
        var powerData = new List<float>();
        
        // Warmup: 15min at 150W
        powerData.AddRange(Enumerable.Repeat(150f, 900));
        
        // Main set: 30min at 220W
        powerData.AddRange(Enumerable.Repeat(220f, 1800));
        
        // Cooldown: 15min at 140W
        powerData.AddRange(Enumerable.Repeat(140f, 900));

        var ftp = 250;
        var totalDuration = 3600;

        // Calculate metrics
        var np = _sut.CalculateNormalizedPower(powerData);
        var if_ = _sut.CalculateIntensityFactor(np, ftp);
        var tss = _sut.CalculateTrainingStressScore(np, if_, totalDuration, ftp);

        // Verify all metrics calculated
        np.Should().NotBeNull();
        if_.Should().NotBeNull();
        tss.Should().NotBeNull();

        // NP should be around 180-190W (weighted toward harder efforts)
        np!.Value.Should().BeInRange(170f, 200f);
        
        // IF should be 0.7-0.8
        if_!.Value.Should().BeInRange(0.65f, 0.85f);
        
        // TSS should be reasonable (50-80 for this effort)
        tss!.Value.Should().BeInRange(40f, 90f);
    }

    #endregion
}
