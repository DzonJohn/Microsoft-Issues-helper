// Resolve the static files root (Index.html + res/) from the repository root.
// The default points four levels up from the binary output directory
// (bin/Debug/net10.0/../../..) so the repo root is used when run with `dotnet run`.
// Override via appsettings.json "StaticFilesRoot" or the STATICFILESROOT environment variable.
var tempConfig = new ConfigurationBuilder()
    .AddJsonFile("appsettings.json", optional: true)
    .AddEnvironmentVariables()
    .Build();

var staticFilesRootRelative = tempConfig["StaticFilesRoot"] ?? "../../../../";
var staticFilesRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, staticFilesRootRelative));

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    WebRootPath = staticFilesRoot
});

var app = builder.Build();

// Resolve the sample data directory.
// The default is "../SampleData" relative to the project content root (i.e., the SampleDataService
// project directory), placing it at the repository root's SampleData/ folder.
// Override via appsettings.json "SampleDataDirectory" or the SAMPLEDATADIRECTORY environment variable.
string sampleDataDirRelative = app.Configuration["SampleDataDirectory"] ?? "../SampleData";
string sampleDataDir = Path.GetFullPath(
    Path.Combine(app.Environment.ContentRootPath, sampleDataDirRelative));

app.UseDefaultFiles();
app.UseStaticFiles();

// GET /api/files — returns the list of file names in the sample data directory
app.MapGet("/api/files", () =>
{
    if (!Directory.Exists(sampleDataDir))
    {
        return Results.Ok(Array.Empty<string>());
    }

    var files = Directory.EnumerateFiles(sampleDataDir)
        .Select(Path.GetFileName)
        .Where(name => name is not null)
        .OrderBy(name => name)
        .ToArray();

    return Results.Ok(files);
});

// GET /api/files/{fileName} — returns the content of the requested file
app.MapGet("/api/files/{fileName}", (string fileName) =>
{
    // Reject names that attempt directory traversal or contain path separators
    if (string.IsNullOrWhiteSpace(fileName)
        || fileName.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0
        || fileName.Contains('/')
        || fileName.Contains('\\'))
    {
        return Results.BadRequest("Invalid file name.");
    }

    var filePath = Path.Combine(sampleDataDir, fileName);
    var resolvedPath = Path.GetFullPath(filePath);

    // Confirm the resolved path still lives inside sampleDataDir
    if (!resolvedPath.StartsWith(sampleDataDir + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
    {
        return Results.BadRequest("Invalid file name.");
    }

    if (!File.Exists(resolvedPath))
    {
        return Results.NotFound($"File '{fileName}' not found.");
    }

    var content = File.ReadAllText(resolvedPath);
    return Results.Text(content, "text/plain");
});

app.Run();
