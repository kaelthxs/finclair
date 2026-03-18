namespace analysis_service.Domain.Entities;

public class FinancialReportData
{
    public Guid Id { get; set; }
    public Guid ReportFileId { get; set; }
    public ReportFile ReportFile { get; set; } = null!;

    public string OrganizationName { get; set; } = string.Empty;
    public string Inn { get; set; } = string.Empty;
    public string ReportingPeriod { get; set; } = string.Empty;

    public decimal Revenue { get; set; }
    public decimal Expenses { get; set; }
    public decimal NetProfit { get; set; }
    public decimal Assets { get; set; }
    public decimal Liabilities { get; set; }
}
