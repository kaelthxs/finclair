using analysis_service.Domain.Enums;

namespace analysis_service.Domain.Entities;

public class TeamMember
{
    public Guid Id { get; set; }
    public Guid TeamId { get; set; }
    public Team Team { get; set; } = null!;

    public string UserId { get; set; } = string.Empty;
    public TeamRole Role { get; set; }
    public DateTime AddedAtUtc { get; set; } = DateTime.UtcNow;
}
