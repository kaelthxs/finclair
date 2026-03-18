namespace analysis_service.Application.Models;

public class ExcelParsingResult
{
    public bool IsValid => Errors.Count == 0;
    public List<string> Errors { get; } = new();

    public string OrganizationName { get; set; } = string.Empty;
    public string Inn { get; set; } = string.Empty;
    public string ReportingPeriod { get; set; } = string.Empty;

    public decimal Revenue { get; set; }
    public decimal Expenses { get; set; }
    public decimal NetProfit { get; set; }
    public decimal Assets { get; set; }
    public decimal Liabilities { get; set; }
}
