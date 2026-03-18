using analysis_service.Application.Contracts;
using analysis_service.Contracts.Teams;
using analysis_service.Domain.Entities;
using analysis_service.Domain.Enums;
using analysis_service.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace analysis_service.Controllers;

[ApiController]
[Route("api/teams")]
[Authorize]
public class TeamsController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;

    public TeamsController(AppDbContext dbContext, ICurrentUserService currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    [HttpGet]
    [Authorize(Roles = "CLIENT,LEADER,AUDITOR")]
    public Task<ActionResult<List<TeamCatalogItemResponse>>> List(CancellationToken cancellationToken)
    {
        return Catalog(cancellationToken);
    }

    [HttpPost]
    [Authorize(Roles = "LEADER")]
    public async Task<ActionResult<TeamResponse>> Create([FromBody] CreateTeamRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Название команды обязательно.");
        }

        var leaderUserId = _currentUser.UserId;
        if (string.IsNullOrWhiteSpace(leaderUserId))
        {
            return Unauthorized();
        }

        var team = new Team
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            LeaderUserId = leaderUserId,
            CreatedAtUtc = DateTime.UtcNow,
            Members = new List<TeamMember>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    UserId = leaderUserId,
                    Role = TeamRole.Leader,
                    AddedAtUtc = DateTime.UtcNow
                }
            }
        };

        foreach (var auditorId in request.AuditorUserIds.Where(x => !string.IsNullOrWhiteSpace(x)).Distinct())
        {
            if (auditorId == leaderUserId)
            {
                continue;
            }

            team.Members.Add(new TeamMember
            {
                Id = Guid.NewGuid(),
                UserId = auditorId,
                Role = TeamRole.Auditor,
                AddedAtUtc = DateTime.UtcNow
            });
        }

        _dbContext.Teams.Add(team);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetById), new { teamId = team.Id }, ToResponse(team));
    }

    [HttpGet("{teamId:guid}")]
    public async Task<ActionResult<TeamResponse>> GetById([FromRoute] Guid teamId, CancellationToken cancellationToken)
    {
        var team = await _dbContext.Teams
            .Include(x => x.Members)
            .FirstOrDefaultAsync(x => x.Id == teamId, cancellationToken);

        if (team is null)
        {
            return NotFound();
        }

        var currentUserId = _currentUser.UserId;
        if (!team.Members.Any(x => x.UserId == currentUserId))
        {
            return Forbid();
        }

        return Ok(ToResponse(team));
    }

    [HttpGet("mine")]
    public async Task<ActionResult<List<TeamResponse>>> Mine(CancellationToken cancellationToken)
    {
        var currentUserId = _currentUser.UserId;
        var currentRole = (_currentUser.Role ?? string.Empty).Trim();

        IQueryable<Team> query = _dbContext.Teams
            .Include(x => x.Members);

        if (!string.Equals(currentRole, "CLIENT", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(x => x.Members.Any(m => m.UserId == currentUserId));
        }

        var teams = await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return Ok(teams.Select(ToResponse).ToList());
    }

    [HttpGet("catalog")]
    [Authorize(Roles = "CLIENT,LEADER,AUDITOR")]
    public async Task<ActionResult<List<TeamCatalogItemResponse>>> Catalog(CancellationToken cancellationToken)
    {
        var teams = await _dbContext.Teams
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new TeamCatalogItemResponse
            {
                Id = x.Id,
                Name = x.Name,
                LeaderUserId = x.LeaderUserId,
                CreatedAtUtc = x.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        return Ok(teams);
    }

    [HttpPost("{teamId:guid}/auditors")]
    [Authorize(Roles = "LEADER")]
    public async Task<ActionResult<TeamResponse>> AddAuditor([FromRoute] Guid teamId, [FromBody] AddAuditorRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.AuditorUserId))
        {
            return BadRequest("AuditorUserId обязателен.");
        }

        var team = await _dbContext.Teams
            .FirstOrDefaultAsync(x => x.Id == teamId, cancellationToken);

        if (team is null)
        {
            return NotFound();
        }

        var currentUserId = _currentUser.UserId;
        var isLeaderMember = await _dbContext.TeamMembers
            .AnyAsync(x => x.TeamId == teamId && x.UserId == currentUserId && x.Role == TeamRole.Leader, cancellationToken);

        if (team.LeaderUserId != currentUserId && !isLeaderMember)
        {
            return Forbid();
        }

        var auditorUserId = request.AuditorUserId.Trim();

        var alreadyInTeam = await _dbContext.TeamMembers
            .AnyAsync(x => x.TeamId == teamId && x.UserId == auditorUserId, cancellationToken);

        if (alreadyInTeam)
        {
            return Conflict("Пользователь уже состоит в команде.");
        }

        _dbContext.TeamMembers.Add(new TeamMember
        {
            Id = Guid.NewGuid(),
            TeamId = team.Id,
            UserId = auditorUserId,
            Role = TeamRole.Auditor,
            AddedAtUtc = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        var updatedTeam = await _dbContext.Teams
            .Include(x => x.Members)
            .FirstAsync(x => x.Id == teamId, cancellationToken);

        return Ok(ToResponse(updatedTeam));
    }

    private static TeamResponse ToResponse(Team team)
    {
        return new TeamResponse
        {
            Id = team.Id,
            Name = team.Name,
            LeaderUserId = team.LeaderUserId,
            CreatedAtUtc = team.CreatedAtUtc,
            Members = team.Members
                .OrderByDescending(x => x.Role == TeamRole.Leader)
                .Select(x => new TeamMemberDto
                {
                    UserId = x.UserId,
                    Role = x.Role.ToString()
                })
                .ToList()
        };
    }
}
