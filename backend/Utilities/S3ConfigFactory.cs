using Amazon;
using Amazon.S3;

namespace LocalHire.Api.Utilities;

/// <summary>
/// Builds the <see cref="AmazonS3Config"/> used by the S3 client. A custom
/// <c>AWS:ServiceUrl</c> (e.g. LocalStack) switches the client to a path-style
/// endpoint; otherwise the real regional endpoint is used. The SDK rejects
/// setting both <see cref="AmazonS3Config.ServiceURL"/> and a region, so the two
/// are mutually exclusive.
/// </summary>
public static class S3ConfigFactory
{
    public const string DefaultRegion = "ap-south-1";

    public static AmazonS3Config Build(string? serviceUrl, string? region)
    {
        var config = new AmazonS3Config();

        if (!string.IsNullOrWhiteSpace(serviceUrl))
        {
            config.ServiceURL = serviceUrl;
            config.ForcePathStyle = true;
        }
        else
        {
            config.RegionEndpoint = RegionEndpoint.GetBySystemName(
                string.IsNullOrWhiteSpace(region) ? DefaultRegion : region);
        }

        return config;
    }
}
