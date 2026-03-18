namespace analysis_service.Domain.Entities;

public class AuditAlgorithmResult
{
    public Guid Id { get; set; }
    public Guid ReportFileId { get; set; }
    public ReportFile ReportFile { get; set; } = null!;

    public string AppropriateJson { get; set; } = "[]";
    public string InappropriateJson { get; set; } = "[]";
    public string Summary { get; set; } = string.Empty;
    public DateTime GeneratedAtUtc { get; set; } = DateTime.UtcNow;
}
