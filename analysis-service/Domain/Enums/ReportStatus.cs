namespace analysis_service.Domain.Enums;

public enum ReportStatus
{
    Submitted = 1,
    AssignedToAuditor = 2,
    AlgorithmCompleted = 3,
    AuditorVerdictSubmitted = 4,
    LeaderApproved = 5,
    LeaderRejected = 6
}
