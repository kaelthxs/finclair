using analysis_service.Domain.Enums;

namespace analysis_service.Domain.Entities;

public class ReportFile
{
    public Guid Id { get; set; }
    public Guid TeamId { get; set; }
    public Team Team { get; set; } = null!;

    public string ClientUserId { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string StoredFilePath { get; set; } = string.Empty;
    public DateTime UploadedAtUtc { get; set; } = DateTime.UtcNow;

    public ReportStatus Status { get; set; } = ReportStatus.Submitted;

    public string? AssignedAuditorUserId { get; set; }
    public string? AssignedByLeaderUserId { get; set; }
    public DateTime? AssignedAtUtc { get; set; }

    public AuditorVerdictType? AuditorVerdict { get; set; }
    public string? AuditorVerdictComment { get; set; }
    public string? AuditorVerdictUserId { get; set; }
    public DateTime? AuditorVerdictAtUtc { get; set; }

    public LeaderDecisionType? LeaderDecision { get; set; }
    public string? LeaderDecisionComment { get; set; }
    public string? LeaderDecisionUserId { get; set; }
    public DateTime? LeaderDecisionAtUtc { get; set; }

    public FinancialReportData Data { get; set; } = null!;
    public AuditAlgorithmResult? AlgorithmResult { get; set; }
}
