namespace LocalHire.Api.DTOs;

public sealed record PagingRequest(int Page, int PageSize)
{
    public int Skip => (int)Math.Min((long)(Page - 1) * PageSize, int.MaxValue);

    public int TotalPages(int totalCount) =>
        totalCount == 0 ? 0 : (totalCount - 1) / PageSize + 1;

    public static Dictionary<string, string[]> Validate(
        int? page, int? pageSize, out PagingRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (page is < 1)
            errors["page"] = ["Page must be at least 1."];
        if (pageSize is < 1 or > 100)
            errors["pageSize"] = ["Page size must be between 1 and 100."];

        request = new PagingRequest(page ?? 1, pageSize ?? 20);
        return errors;
    }
}

public sealed record PagedResponse<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages)
{
    public static PagedResponse<T> Create(
        IReadOnlyList<T> items, PagingRequest paging, int totalCount) =>
        new(items, paging.Page, paging.PageSize, totalCount,
            paging.TotalPages(totalCount));
}

public enum JobStatusFilter
{
    Open,
    Closed
}

public sealed record NotificationPagedResponse(
    IReadOnlyList<NotificationResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages,
    int UnreadCount,
    int ReadCount);

public sealed record ApplicationPagedResponse(
    IReadOnlyList<JobApplicationResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages,
    int ShortlistedCount,
    int HiredCount);
