using System.Text.RegularExpressions;
using CyclingForge.Shared.Abstractions.Domain;
using CyclingForge.Modules.Users.Domain.Exceptions;

namespace CyclingForge.Modules.Users.Domain.ValueObjects;

public sealed partial class Email : ValueObject
{
    public string Value { get; }

    public Email(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || !EmailRegex().IsMatch(value))
            throw new InvalidEmailException(value);

        Value = value.ToLowerInvariant();
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public static implicit operator string(Email email) => email.Value;
    public static implicit operator Email(string email) => new(email);

    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
    private static partial Regex EmailRegex();
}
