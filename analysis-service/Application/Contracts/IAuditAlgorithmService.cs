using analysis_service.Application.Models;

namespace analysis_service.Application.Contracts;

public interface IAuditAlgorithmService
{
    Task<ExcelParsingResult> ParseExcelAsync(Stream fileStream, CancellationToken cancellationToken = default);
    AuditAlgorithmOutput RunChecks(ExcelParsingResult parsed);
}
