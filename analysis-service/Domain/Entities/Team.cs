using analysis_service.Domain.Enums;

namespace analysis_service.Domain.Entities;

public class Team
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string LeaderUserId { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<TeamMember> Members { get; set; } = new List<TeamMember>();
    public ICollection<ReportFile> Reports { get; set; } = new List<ReportFile>();

    public bool HasLeader(string userId)
    {
        return LeaderUserId == userId || Members.Any(m => m.UserId == userId && m.Role == TeamRole.Leader);
    }
}
