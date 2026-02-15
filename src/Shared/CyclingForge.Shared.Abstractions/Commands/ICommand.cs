using MediatR;

namespace CyclingForge.Shared.Abstractions.Commands;

public interface ICommand : IRequest
{
}

public interface ICommand<out TResult> : IRequest<TResult>
{
}
