namespace analysis_service.Application.Contracts;

public interface IFileStorageService
{
    Task<string> SaveAsync(IFormFile file, CancellationToken cancellationToken = default);
    Task<Stream> OpenReadAsync(string storedPath, CancellationToken cancellationToken = default);
}
