using CyclingForge.Modules.Users.Application.Commands.Register;

namespace CyclingForge.Modules.Users.Infrastructure.Services;

internal sealed class BcryptPasswordHasher : IPasswordHasher
{
    public string Hash(string password)
        => BCrypt.Net.BCrypt.HashPassword(password, BCrypt.Net.BCrypt.GenerateSalt(12));

    public bool Verify(string password, string hash)
        => BCrypt.Net.BCrypt.Verify(password, hash);
}
