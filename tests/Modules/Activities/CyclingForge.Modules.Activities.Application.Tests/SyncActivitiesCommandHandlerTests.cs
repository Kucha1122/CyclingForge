using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CyclingForge.Modules.Activities.Application.Commands.SyncActivities;
using CyclingForge.Modules.Activities.Application.Services;
using CyclingForge.Modules.Activities.Domain.Entities;
using CyclingForge.Modules.Activities.Domain.Repositories;
using CyclingForge.Modules.Activities.Domain.ValueObjects;
using CyclingForge.Shared.Abstractions.Time;
using FluentAssertions;
using Moq;
using Xunit;

namespace CyclingForge.Modules.Activities.Application.Tests;

public class SyncActivitiesCommandHandlerTests
{
    [Fact]
    public async Task Handle_Twice_Does_Not_Change_Existing_Activity_Metrics_When_Already_Computed()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var activityId = new ActivityId(Guid.NewGuid());
        var stravaId = 123456789L;
        var startDate = DateTime.UtcNow.Date.AddDays(-1);

        var existingActivity = Activity.Create(
            userId,
            stravaId,
            "Test ride",
            ActivityType.FromString("Ride"),
            startDate,
            new Distance(20000),
            new Duration(3600),
            new Duration(3700),
            200,
            30,
            60,
            140,
            180,
            200,
            DateTime.UtcNow,
            deviceWatts: true);

        existingActivity.UpdateMetrics(
            maxPower: 250,
            normalizedPower: 220,
            intensityFactor: 0.9f,
            trainingStressScore: 80,
            ftpUsed: 240,
            best20MinPower: null,
            best5MinPower: null,
            best60MinPower: null,
            estimatedFtpFromActivity: null);

        var activities = new List<Activity> { existingActivity };

        var activityRepo = new Mock<IActivityRepository>();
        activityRepo
            .Setup(r => r.GetLatestActivityStartDateAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((DateTime?)null);
        activityRepo
            .Setup(r => r.GetByStravaIdAsync(stravaId, userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingActivity);
        activityRepo
            .Setup(r => r.UpdateAsync(existingActivity, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var stravaService = new Mock<IStravaActivitiesService>();
        var dto = new StravaActivityDto(
            StravaId: stravaId,
            Name: "Test ride",
            Type: "Ride",
            StartDate: startDate,
            Distance: 20000,
            MovingTime: 3600,
            ElapsedTime: 3700,
            TotalElevationGain: 200,
            AverageSpeed: 5,
            MaxSpeed: 10,
            AverageHeartRate: 140,
            MaxHeartRate: 180,
            AveragePower: 200,
            DeviceWatts: true,
            StreamsJson: null);

        stravaService
            .Setup(s => s.FetchActivitiesAsync(userId, It.IsAny<DateTime?>(), It.IsAny<DateTime?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<StravaActivityDto> { dto });

        var ftpProvider = new Mock<IUserFtpProvider>();
        ftpProvider
            .Setup(p => p.GetFtpForDateAsync(userId, startDate, It.IsAny<CancellationToken>()))
            .ReturnsAsync(240);
        ftpProvider
            .Setup(p => p.GetFtpAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(240);

        var lthrProvider = new Mock<IUserLthrProvider>();
        lthrProvider
            .Setup(p => p.GetLthrAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((int?)170);

        var metricsCalculator = new Mock<ITrainingMetricsCalculator>();
        var loadCalculator = new Mock<IActivityLoadCalculator>();
        var powerProfileAnalyzer = new Mock<IPowerProfileAnalyzer>();
        var eftpEstimator = new Mock<IEftpEstimator>();

        var clock = new Mock<IClock>();
        clock.Setup(c => c.CurrentDate()).Returns(DateTime.UtcNow.Date);

        var handler = new SyncActivitiesCommandHandler(
            activityRepo.Object,
            stravaService.Object,
            ftpProvider.Object,
            lthrProvider.Object,
            metricsCalculator.Object,
            loadCalculator.Object,
            powerProfileAnalyzer.Object,
            eftpEstimator.Object,
            clock.Object);

        var originalTss = existingActivity.TrainingStressScore;
        var originalNp = existingActivity.NormalizedPower;
        var originalIf = existingActivity.IntensityFactor;
        var originalFtpUsed = existingActivity.FtpUsed;

        var command = new SyncActivitiesCommand(userId, false);

        // Act: first sync
        await handler.Handle(command, CancellationToken.None);

        var afterFirstTss = existingActivity.TrainingStressScore;
        var afterFirstNp = existingActivity.NormalizedPower;
        var afterFirstIf = existingActivity.IntensityFactor;
        var afterFirstFtpUsed = existingActivity.FtpUsed;

        // Act: second sync (should be idempotent for metrics)
        await handler.Handle(command, CancellationToken.None);

        var afterSecondTss = existingActivity.TrainingStressScore;
        var afterSecondNp = existingActivity.NormalizedPower;
        var afterSecondIf = existingActivity.IntensityFactor;
        var afterSecondFtpUsed = existingActivity.FtpUsed;

        // Assert
        originalTss.Should().Be(afterFirstTss).And.Be(afterSecondTss);
        originalNp.Should().Be(afterFirstNp).And.Be(afterSecondNp);
        originalIf.Should().Be(afterFirstIf).And.Be(afterSecondIf);
        originalFtpUsed.Should().Be(afterFirstFtpUsed).And.Be(afterSecondFtpUsed);

        metricsCalculator.Verify(
            m => m.CalculateNormalizedPower(It.IsAny<IEnumerable<float>>()),
            Times.Never);
        metricsCalculator.Verify(
            m => m.CalculateTrainingStressScore(It.IsAny<float?>(), It.IsAny<float?>(), It.IsAny<int>(), It.IsAny<int?>()),
            Times.Never);
    }
}

