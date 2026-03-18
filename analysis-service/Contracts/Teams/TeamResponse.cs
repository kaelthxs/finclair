namespace analysis_service.Contracts.Teams;

public class TeamResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string LeaderUserId { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public List<TeamMemberDto> Members { get; set; } = new();
}
