namespace analysis_service.Contracts.Teams;

public class CreateTeamRequest
{
    public string Name { get; set; } = string.Empty;
    public List<string> AuditorUserIds { get; set; } = new();
}
