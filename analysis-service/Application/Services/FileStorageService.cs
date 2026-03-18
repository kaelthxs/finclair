using analysis_service.Application.Contracts;
using analysis_service.Common;
using Microsoft.Extensions.Options;

namespace analysis_service.Application.Services;

public class FileStorageService : IFileStorageService
{
    private readonly string _rootPath;

    public FileStorageService(IOptions<FileStorageOptions> options)
    {
        _rootPath = options.Value.RootPath;
    }

    public async Task<string> SaveAsync(IFormFile file, CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(_rootPath);

        var extension = Path.GetExtension(file.FileName);
        var safeExtension = string.IsNullOrWhiteSpace(extension) ? ".xlsx" : extension;
        var fileName = $"{Guid.NewGuid():N}{safeExtension}";
        var fullPath = Path.Combine(_rootPath, fileName);

        await using var fileStream = new FileStream(fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        await file.CopyToAsync(fileStream, cancellationToken);

        return fullPath;
    }

    public Task<Stream> OpenReadAsync(string storedPath, CancellationToken cancellationToken = default)
    {
        Stream stream = new FileStream(storedPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult(stream);
    }
}
