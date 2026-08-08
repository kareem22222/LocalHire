using System.Text.Json;
using LocalHire.Api.DTOs;
using Xunit;

namespace LocalHire.Api.Tests;

public sealed class PagingTests
{
    [Fact]
    public void Paging_defaults_bounds_and_metadata_are_consistent()
    {
        Assert.Empty(PagingRequest.Validate(null, null, out var defaults));
        Assert.Equal(new PagingRequest(1, 20), defaults);
        Assert.Empty(PagingRequest.Validate(1, 100, out var boundary));
        Assert.Equal(0, boundary.Skip);
        Assert.Contains("page", PagingRequest.Validate(0, 20, out _));
        Assert.Contains("pageSize", PagingRequest.Validate(1, 101, out _));

        Assert.Equal(0, PagedResponse<int>.Create([], defaults, 0).TotalPages);
        Assert.Equal(2, PagedResponse<int>.Create([1], defaults, 21).TotalPages);
        Assert.Equal(1, PagedResponse<int>.Create([1], defaults, 20).TotalPages);
    }

    [Fact]
    public void Paging_serializes_with_the_web_camel_case_contract()
    {
        var response = PagedResponse<int>.Create([1], new PagingRequest(1, 20), 1);
        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions(JsonSerializerDefaults.Web));

        Assert.Equal(
            "{\"items\":[1],\"page\":1,\"pageSize\":20,\"totalCount\":1,\"totalPages\":1}",
            json);
    }
}
