using MediatR;

namespace CyclingForge.Shared.Abstractions.Queries;

public interface IQuery<out TResult> : IRequest<TResult>
{
}
