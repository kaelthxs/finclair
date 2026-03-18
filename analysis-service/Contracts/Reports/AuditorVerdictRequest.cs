namespace analysis_service.Contracts.Reports;

public class AuditorVerdictRequest
{
    public string Verdict { get; set; } = string.Empty;
    public string? Comment { get; set; }
}
