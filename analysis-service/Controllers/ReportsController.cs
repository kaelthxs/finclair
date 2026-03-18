using System.Text.Json;
using analysis_service.Application.Contracts;
using analysis_service.Application.Models;
using analysis_service.Contracts.Reports;
using analysis_service.Domain.Entities;
using analysis_service.Domain.Enums;
using analysis_service.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace analysis_service.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;
    private readonly IFileStorageService _fileStorage;
    private readonly IAuditAlgorithmService _auditAlgorithm;

    public ReportsController(
        AppDbContext dbContext,
        ICurrentUserService currentUser,
        IFileStorageService fileStorage,
        IAuditAlgorithmService auditAlgorithm)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _fileStorage = fileStorage;
        _auditAlgorithm = auditAlgorithm;
    }

    [HttpPost("teams/{teamId:guid}/reports/upload")]
    [Authorize(Roles = "CLIENT")]
    [RequestSizeLimit(25_000_000)]
    public async Task<ActionResult<ReportResponse>> Upload(
        [FromRoute] Guid teamId,
        [FromForm] IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest("Файл обязателен.");
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension is not ".xlsx" and not ".xls")
        {
            return BadRequest("Поддерживаются только Excel-файлы (.xlsx, .xls).");
        }

        var team = await _dbContext.Teams.FirstOrDefaultAsync(x => x.Id == teamId, cancellationToken);
        if (team is null)
        {
            return NotFound("Команда не найдена.");
        }

        await using var parseStream = file.OpenReadStream();
        var parsed = await _auditAlgorithm.ParseExcelAsync(parseStream, cancellationToken);

        if (!parsed.IsValid)
        {
            return BadRequest(new { message = "Структура Excel не соответствует ожидаемому формату.", errors = parsed.Errors });
        }

        var storedPath = await _fileStorage.SaveAsync(file, cancellationToken);

        var report = new ReportFile
        {
            Id = Guid.NewGuid(),
            TeamId = teamId,
            ClientUserId = _currentUser.UserId,
            OriginalFileName = file.FileName,
            StoredFilePath = storedPath,
            UploadedAtUtc = DateTime.UtcNow,
            Status = ReportStatus.Submitted,
            Data = new FinancialReportData
            {
                Id = Guid.NewGuid(),
                OrganizationName = parsed.OrganizationName,
                Inn = parsed.Inn,
                ReportingPeriod = parsed.ReportingPeriod,
                Revenue = parsed.Revenue,
                Expenses = parsed.Expenses,
                NetProfit = parsed.NetProfit,
                Assets = parsed.Assets,
                Liabilities = parsed.Liabilities
            }
        };

        _dbContext.ReportFiles.Add(report);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var loaded = await LoadReportAsync(report.Id, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { reportId = report.Id }, ToResponse(loaded!));
    }

    [HttpGet("teams/{teamId:guid}/reports")]
    [Authorize(Roles = "LEADER,AUDITOR")]
    public async Task<ActionResult<List<ReportResponse>>> ListByTeam([FromRoute] Guid teamId, CancellationToken cancellationToken)
    {
        var team = await _dbContext.Teams
            .Include(x => x.Members)
            .FirstOrDefaultAsync(x => x.Id == teamId, cancellationToken);

        if (team is null)
        {
            return NotFound();
        }

        var currentUserId = _currentUser.UserId;
        if (!team.Members.Any(m => m.UserId == currentUserId))
        {
            return Forbid();
        }

        var reports = await _dbContext.ReportFiles
            .Include(x => x.Data)
            .Include(x => x.AlgorithmResult)
            .Where(x => x.TeamId == teamId)
            .OrderByDescending(x => x.UploadedAtUtc)
            .ToListAsync(cancellationToken);

        return Ok(reports.Select(ToResponse).ToList());
    }

    [HttpGet("reports/mine")]
    [Authorize(Roles = "CLIENT")]
    public async Task<ActionResult<List<ReportResponse>>> Mine(CancellationToken cancellationToken)
    {
        var currentUserId = _currentUser.UserId;
        var reports = await _dbContext.ReportFiles
            .Include(x => x.Data)
            .Include(x => x.AlgorithmResult)
            .Where(x => x.ClientUserId == currentUserId)
            .OrderByDescending(x => x.UploadedAtUtc)
            .ToListAsync(cancellationToken);

        return Ok(reports.Select(ToResponse).ToList());
    }

    [HttpGet("reports/{reportId:guid}")]
    public async Task<ActionResult<ReportResponse>> GetById([FromRoute] Guid reportId, CancellationToken cancellationToken)
    {
        var report = await LoadReportAsync(reportId, cancellationToken);
        if (report is null)
        {
            return NotFound();
        }

        var team = await _dbContext.Teams
            .Include(x => x.Members)
            .FirstAsync(x => x.Id == report.TeamId, cancellationToken);

        var currentUserId = _currentUser.UserId;
        var isLeader = team.HasLeader(currentUserId);
        var isAssignedAuditor = report.AssignedAuditorUserId == currentUserId;
        var isOwnerClient = report.ClientUserId == currentUserId;

        if (!isLeader && !isAssignedAuditor && !isOwnerClient)
        {
            return Forbid();
        }

        return Ok(ToResponse(report));
    }

    [HttpPost("reports/{reportId:guid}/assign")]
    [Authorize(Roles = "LEADER")]
    public async Task<ActionResult<ReportResponse>> AssignAuditor(
        [FromRoute] Guid reportId,
        [FromBody] AssignAuditorRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.AuditorUserId))
        {
            return BadRequest("AuditorUserId обязателен.");
        }

        var report = await LoadReportAsync(reportId, cancellationToken);
        if (report is null)
        {
            return NotFound();
        }

        var team = await _dbContext.Teams
            .Include(x => x.Members)
            .FirstAsync(x => x.Id == report.TeamId, cancellationToken);

        if (!team.HasLeader(_currentUser.UserId))
        {
            return Forbid();
        }

        var isAuditorInTeam = team.Members.Any(m => m.UserId == request.AuditorUserId && m.Role == TeamRole.Auditor);
        if (!isAuditorInTeam)
        {
            return BadRequest("Указанный пользователь не является аудитором этой команды.");
        }

        report.AssignedAuditorUserId = request.AuditorUserId;
        report.AssignedByLeaderUserId = _currentUser.UserId;
        report.AssignedAtUtc = DateTime.UtcNow;
        report.Status = ReportStatus.AssignedToAuditor;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ToResponse(report));
    }

    [HttpPost("reports/{reportId:guid}/run-algorithm")]
    [Authorize(Roles = "AUDITOR")]
    public async Task<ActionResult<object>> RunAlgorithm([FromRoute] Guid reportId, CancellationToken cancellationToken)
    {
        var report = await _dbContext.ReportFiles
            .FirstOrDefaultAsync(x => x.Id == reportId, cancellationToken);
        if (report is null)
        {
            return NotFound();
        }

        if (report.AssignedAuditorUserId != _currentUser.UserId)
        {
            return Forbid();
        }

        var reportData = await _dbContext.FinancialReportData
            .FirstOrDefaultAsync(x => x.ReportFileId == report.Id, cancellationToken);

        ExcelParsingResult parsed;
        try
        {
            await using var stream = await _fileStorage.OpenReadAsync(report.StoredFilePath, cancellationToken);
            parsed = await _auditAlgorithm.ParseExcelAsync(stream, cancellationToken);
        }
        catch (FileNotFoundException)
        {
            if (reportData is null)
            {
                return BadRequest("Исходный Excel-файл недоступен. Попросите клиента загрузить отчет повторно.");
            }

            parsed = new ExcelParsingResult
            {
                OrganizationName = reportData.OrganizationName,
                Inn = reportData.Inn,
                ReportingPeriod = reportData.ReportingPeriod,
                Revenue = reportData.Revenue,
                Expenses = reportData.Expenses,
                NetProfit = reportData.NetProfit,
                Assets = reportData.Assets,
                Liabilities = reportData.Liabilities
            };
        }

        if (!parsed.IsValid)
        {
            return BadRequest(new
            {
                message = "Алгоритм не смог извлечь обязательные поля из Excel.",
                errors = parsed.Errors
            });
        }

        var output = _auditAlgorithm.RunChecks(parsed);

        if (reportData is null)
        {
            reportData = new FinancialReportData
            {
                Id = Guid.NewGuid(),
                ReportFileId = report.Id
            };
            _dbContext.FinancialReportData.Add(reportData);
        }

        reportData.OrganizationName = parsed.OrganizationName;
        reportData.Inn = parsed.Inn;
        reportData.ReportingPeriod = parsed.ReportingPeriod;
        reportData.Revenue = parsed.Revenue;
        reportData.Expenses = parsed.Expenses;
        reportData.NetProfit = parsed.NetProfit;
        reportData.Assets = parsed.Assets;
        reportData.Liabilities = parsed.Liabilities;

        var appropriateJson = JsonSerializer.Serialize(output.AppropriateItems);
        var inappropriateJson = JsonSerializer.Serialize(output.InappropriateItems);

        var algorithmResult = await _dbContext.AuditAlgorithmResults
            .FirstOrDefaultAsync(x => x.ReportFileId == report.Id, cancellationToken);

        if (algorithmResult is null)
        {
            algorithmResult = new AuditAlgorithmResult
            {
                Id = Guid.NewGuid(),
                ReportFileId = report.Id,
                AppropriateJson = appropriateJson,
                InappropriateJson = inappropriateJson,
                Summary = output.Summary,
                GeneratedAtUtc = DateTime.UtcNow
            };
            _dbContext.AuditAlgorithmResults.Add(algorithmResult);
        }
        else
        {
            algorithmResult.AppropriateJson = appropriateJson;
            algorithmResult.InappropriateJson = inappropriateJson;
            algorithmResult.Summary = output.Summary;
            algorithmResult.GeneratedAtUtc = DateTime.UtcNow;
        }

        report.Status = ReportStatus.AlgorithmCompleted;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            reportId = report.Id,
            output.AppropriateItems,
            output.InappropriateItems,
            output.Summary
        });
    }

    [HttpPost("reports/{reportId:guid}/auditor-verdict")]
    [Authorize(Roles = "AUDITOR")]
    public async Task<ActionResult<ReportResponse>> SubmitAuditorVerdict(
        [FromRoute] Guid reportId,
        [FromBody] AuditorVerdictRequest request,
        CancellationToken cancellationToken)
    {
        var report = await LoadReportAsync(reportId, cancellationToken);
        if (report is null)
        {
            return NotFound();
        }

        if (report.AssignedAuditorUserId != _currentUser.UserId)
        {
            return Forbid();
        }

        if (!Enum.TryParse<AuditorVerdictType>(request.Verdict, true, out var verdict))
        {
            return BadRequest("Допустимые значения verdict: Approve, Reject, NeedsFixes.");
        }

        report.AuditorVerdict = verdict;
        report.AuditorVerdictComment = request.Comment?.Trim();
        report.AuditorVerdictUserId = _currentUser.UserId;
        report.AuditorVerdictAtUtc = DateTime.UtcNow;
        report.Status = ReportStatus.AuditorVerdictSubmitted;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ToResponse(report));
    }

    [HttpPost("reports/{reportId:guid}/leader-approve")]
    [Authorize(Roles = "LEADER")]
    public async Task<ActionResult<ReportResponse>> LeaderApprove(
        [FromRoute] Guid reportId,
        [FromBody] LeaderDecisionRequest request,
        CancellationToken cancellationToken)
    {
        var report = await LoadReportAsync(reportId, cancellationToken);
        if (report is null)
        {
            return NotFound();
        }

        var team = await _dbContext.Teams
            .Include(x => x.Members)
            .FirstAsync(x => x.Id == report.TeamId, cancellationToken);

        if (!team.HasLeader(_currentUser.UserId))
        {
            return Forbid();
        }

        if (report.AuditorVerdict is null)
        {
            return BadRequest("Нельзя вынести финальное решение до вердикта аудитора.");
        }

        report.LeaderDecision = request.Approve ? LeaderDecisionType.Approve : LeaderDecisionType.Reject;
        report.LeaderDecisionComment = request.Comment?.Trim();
        report.LeaderDecisionUserId = _currentUser.UserId;
        report.LeaderDecisionAtUtc = DateTime.UtcNow;
        report.Status = request.Approve ? ReportStatus.LeaderApproved : ReportStatus.LeaderRejected;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ToResponse(report));
    }

    private async Task<ReportFile?> LoadReportAsync(Guid reportId, CancellationToken cancellationToken)
    {
        return await _dbContext.ReportFiles
            .Include(x => x.Data)
            .Include(x => x.AlgorithmResult)
            .FirstOrDefaultAsync(x => x.Id == reportId, cancellationToken);
    }

    private static ReportResponse ToResponse(ReportFile report)
    {
        var appropriate = report.AlgorithmResult is null
            ? null
            : JsonSerializer.Deserialize<List<string>>(report.AlgorithmResult.AppropriateJson);

        var inappropriate = report.AlgorithmResult is null
            ? null
            : JsonSerializer.Deserialize<List<string>>(report.AlgorithmResult.InappropriateJson);

        return new ReportResponse
        {
            Id = report.Id,
            TeamId = report.TeamId,
            ClientUserId = report.ClientUserId,
            OriginalFileName = report.OriginalFileName,
            Status = report.Status.ToString(),
            AssignedAuditorUserId = report.AssignedAuditorUserId,
            UploadedAtUtc = report.UploadedAtUtc,

            OrganizationName = report.Data.OrganizationName,
            Inn = report.Data.Inn,
            ReportingPeriod = report.Data.ReportingPeriod,
            Revenue = report.Data.Revenue,
            Expenses = report.Data.Expenses,
            NetProfit = report.Data.NetProfit,
            Assets = report.Data.Assets,
            Liabilities = report.Data.Liabilities,

            AppropriateItems = appropriate,
            InappropriateItems = inappropriate,
            AlgorithmSummary = report.AlgorithmResult?.Summary,

            AuditorVerdict = report.AuditorVerdict?.ToString(),
            AuditorVerdictComment = report.AuditorVerdictComment,
            LeaderDecision = report.LeaderDecision?.ToString(),
            LeaderDecisionComment = report.LeaderDecisionComment
        };
    }
}
