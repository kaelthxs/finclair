namespace analysis_service.Application.Models;

public class AuditAlgorithmOutput
{
    public List<string> AppropriateItems { get; init; } = new();
    public List<string> InappropriateItems { get; init; } = new();
    public string Summary { get; init; } = string.Empty;
}
