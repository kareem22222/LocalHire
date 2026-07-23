using Amazon;
using LocalHire.Api.Utilities;
using Xunit;

namespace LocalHire.Api.Tests;

public sealed class S3ConfigFactoryTests
{
    [Fact]
    public void Build_with_service_url_uses_path_style_endpoint()
    {
        var config = S3ConfigFactory.Build("http://localstack:4566", "ap-south-2");

        // The SDK normalizes ServiceURL (it may append a trailing slash).
        Assert.StartsWith("http://localstack:4566", config.ServiceURL);
        Assert.True(config.ForcePathStyle);
        // ServiceURL and a region endpoint are mutually exclusive.
        Assert.Null(config.RegionEndpoint);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Build_without_service_url_uses_regional_endpoint(string? serviceUrl)
    {
        var config = S3ConfigFactory.Build(serviceUrl, "ap-south-2");

        Assert.Equal(RegionEndpoint.APSouth2, config.RegionEndpoint);
        Assert.False(config.ForcePathStyle);
        Assert.True(string.IsNullOrEmpty(config.ServiceURL));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Build_without_region_falls_back_to_default_region(string? region)
    {
        var config = S3ConfigFactory.Build(serviceUrl: null, region);

        Assert.Equal(
            RegionEndpoint.GetBySystemName(S3ConfigFactory.DefaultRegion),
            config.RegionEndpoint);
    }
}
