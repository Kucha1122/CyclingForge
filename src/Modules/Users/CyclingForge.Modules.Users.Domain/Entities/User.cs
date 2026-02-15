using CyclingForge.Shared.Abstractions.Domain;
using CyclingForge.Modules.Users.Domain.ValueObjects;
using CyclingForge.Modules.Users.Domain.Events;

namespace CyclingForge.Modules.Users.Domain.Entities;

public sealed class User : AggregateRoot<UserId>
{
    public Email Email { get; private set; } = default!;
    public string PasswordHash { get; private set; } = string.Empty;
    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;
    public DateTime CreatedAt { get; private set; }
    public DateTime? LastLoginAt { get; private set; }
    public bool IsActive { get; private set; }

    private User() { }

    public static User Create(Email email, string passwordHash, string firstName, string lastName, DateTime createdAt)
    {
        var user = new User
        {
            Id = new UserId(Guid.NewGuid()),
            Email = email,
            PasswordHash = passwordHash,
            FirstName = firstName,
            LastName = lastName,
            CreatedAt = createdAt,
            IsActive = true
        };

        user.AddDomainEvent(new UserRegisteredEvent(user.Id, user.Email));
        return user;
    }

    public void UpdateLastLogin(DateTime loginDate)
    {
        LastLoginAt = loginDate;
    }
}
