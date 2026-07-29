using LocalHire.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace LocalHire.Api.Services;

public interface ICandidateAccessPolicy
{
    Task<bool> CanViewAsync(Guid employerId, Guid workerId, CancellationToken ct);
}

public sealed class CandidateAccessPolicy(LocalHireDbContext db) : ICandidateAccessPolicy
{
    public Task<bool> CanViewAsync(Guid employerId, Guid workerId, CancellationToken ct) =>
        db.JobApplications.AnyAsync(
            application => application.WorkerId == workerId
                && application.JobPost.EmployerId == employerId,
            ct);
}
