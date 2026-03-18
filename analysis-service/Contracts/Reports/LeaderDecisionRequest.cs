namespace analysis_service.Contracts.Reports;

public class LeaderDecisionRequest
{
    public bool Approve { get; set; }
    public string? Comment { get; set; }
}
