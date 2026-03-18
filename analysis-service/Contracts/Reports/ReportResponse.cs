namespace analysis_service.Contracts.Reports;

public class ReportResponse
{
    public Guid Id { get; set; }
    public Guid TeamId { get; set; }
    public string ClientUserId { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? AssignedAuditorUserId { get; set; }
    public DateTime UploadedAtUtc { get; set; }

    public string OrganizationName { get; set; } = string.Empty;
    public string Inn { get; set; } = string.Empty;
    public string ReportingPeriod { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public decimal Expenses { get; set; }
    public decimal NetProfit { get; set; }
    public decimal Assets { get; set; }
    public decimal Liabilities { get; set; }

    public List<string>? AppropriateItems { get; set; }
    public List<string>? InappropriateItems { get; set; }
    public string? AlgorithmSummary { get; set; }

    public string? AuditorVerdict { get; set; }
    public string? AuditorVerdictComment { get; set; }
    public string? LeaderDecision { get; set; }
    public string? LeaderDecisionComment { get; set; }
}
