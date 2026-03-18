namespace analysis_service.Common;

public class FileStorageOptions
{
    public const string SectionName = "FileStorage";
    public string RootPath { get; set; } = "storage/uploads";
}
