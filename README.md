# Microsoft-Issues-helper

A regex matching and validation tool with a .NET 10 C# backend service that provides selectable sample data files to the frontend.

## Architecture

```
Microsoft-Issues-helper/
├── index.html              # Frontend — regex UI with file selector
├── res/
│   ├── css/style.css       # Styles
│   └── js/main.js          # Client-side regex logic + API integration
├── SampleData/             # Sample text files served by the API
│   ├── emails.txt
│   ├── phone-numbers.txt
│   └── urls.txt
└── SampleDataService/      # .NET 10 ASP.NET Core backend
    ├── Program.cs
    ├── appsettings.json
    └── SampleDataService.csproj
```

## Quick Start

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)

### Run the service

```bash
cd SampleDataService
dotnet run
```

Then open **http://localhost:5102** in your browser.

The service:
- Serves `index.html` and the `res/` static assets at the root.
- Exposes the file-list and file-content API endpoints (see below).

---

## Configuration

All settings live in `SampleDataService/appsettings.json` and can be overridden with environment variables.

| Key | Default | Description |
|-----|---------|-------------|
| `SampleDataDirectory` | `../SampleData` | Path to the folder containing sample data files, relative to the **project directory** (`SampleDataService/`). |
| `StaticFilesRoot` | `../../../../` | Path to the folder containing `index.html`, relative to the **binary output directory**. Change this when deploying a published build. |

### Example — point to a custom data directory

**appsettings.json**
```json
{
  "SampleDataDirectory": "C:/my-data-files"
}
```

**Environment variable (Linux/macOS)**
```bash
export SampleDataDirectory=/var/data/samples
dotnet run
```

**Environment variable (Windows)**
```cmd
set SampleDataDirectory=C:\my-data-files
dotnet run
```

### Example — published build

When you publish with `dotnet publish`, the binary lives in `publish/` and the static files need to be copied alongside it or the path adjusted:

```bash
dotnet publish -c Release -o publish
cp -r ../index.html ../res publish/wwwroot/   # or set StaticFilesRoot
```

Or set `StaticFilesRoot` to point at the repo root from wherever the binary runs.

---

## API Reference

Base URL: `http://localhost:5102` (configurable via `launchSettings.json` or `--urls`).

### `GET /api/files`

Returns a JSON array of file names available in the configured `SampleDataDirectory`.

**Response**
```json
["emails.txt", "phone-numbers.txt", "urls.txt"]
```

Returns an empty array `[]` if the directory does not exist.

---

### `GET /api/files/{fileName}`

Returns the plain-text content of the named file.

| Parameter | Description |
|-----------|-------------|
| `fileName` | Name of the file (e.g. `emails.txt`). Path separators and traversal sequences are rejected. |

**Success — 200 OK**
```
alice@example.com
bob.smith@contoso.org
...
```

**Error responses**

| Status | Reason |
|--------|--------|
| 400 Bad Request | `fileName` contains path separators or invalid characters. |
| 404 Not Found | File does not exist in the data directory. |

---

## Adding New Sample Files

1. Place any plain-text file in `SampleData/` (or your configured directory).
2. Reload the page — the file selector is populated on each page load.

No service restart is required; the file list is read from disk on every request.

---

## Extending the Service

- **Additional endpoints** — add `app.MapGet(...)` / `app.MapPost(...)` calls in `Program.cs`.
- **Subdirectory support** — update the directory enumeration in `Program.cs` to use `SearchOption.AllDirectories` and include relative paths in the response.
- **Authentication** — add `builder.Services.AddAuthentication(...)` and `app.UseAuthentication()` before the `MapGet` calls.
- **CORS** (if hosting the API separately from the frontend) — add `builder.Services.AddCors(...)` and `app.UseCors(...)`.
