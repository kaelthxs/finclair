using analysis_service.Domain.Entities;
using analysis_service.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace analysis_service.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Team> Teams => Set<Team>();
    public DbSet<TeamMember> TeamMembers => Set<TeamMember>();
    public DbSet<ReportFile> ReportFiles => Set<ReportFile>();
    public DbSet<FinancialReportData> FinancialReportData => Set<FinancialReportData>();
    public DbSet<AuditAlgorithmResult> AuditAlgorithmResults => Set<AuditAlgorithmResult>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Team>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(200).IsRequired();
            entity.Property(x => x.LeaderUserId).HasMaxLength(64).IsRequired();
            entity.HasIndex(x => x.LeaderUserId);
        });

        modelBuilder.Entity<TeamMember>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.UserId).HasMaxLength(64).IsRequired();
            entity.Property(x => x.Role).HasConversion<string>().IsRequired();

            entity.HasOne(x => x.Team)
                .WithMany(x => x.Members)
                .HasForeignKey(x => x.TeamId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => new { x.TeamId, x.UserId }).IsUnique();
        });

        modelBuilder.Entity<ReportFile>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.ClientUserId).HasMaxLength(64).IsRequired();
            entity.Property(x => x.OriginalFileName).HasMaxLength(255).IsRequired();
            entity.Property(x => x.StoredFilePath).HasMaxLength(1024).IsRequired();
            entity.Property(x => x.Status).HasConversion<string>().IsRequired();
            entity.Property(x => x.AssignedAuditorUserId).HasMaxLength(64);
            entity.Property(x => x.AssignedByLeaderUserId).HasMaxLength(64);
            entity.Property(x => x.AuditorVerdictUserId).HasMaxLength(64);
            entity.Property(x => x.LeaderDecisionUserId).HasMaxLength(64);
            entity.Property(x => x.AuditorVerdict).HasConversion<string>();
            entity.Property(x => x.LeaderDecision).HasConversion<string>();

            entity.HasOne(x => x.Team)
                .WithMany(x => x.Reports)
                .HasForeignKey(x => x.TeamId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Data)
                .WithOne(x => x.ReportFile)
                .HasForeignKey<FinancialReportData>(x => x.ReportFileId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.AlgorithmResult)
                .WithOne(x => x.ReportFile)
                .HasForeignKey<AuditAlgorithmResult>(x => x.ReportFileId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => x.TeamId);
            entity.HasIndex(x => x.ClientUserId);
            entity.HasIndex(x => x.AssignedAuditorUserId);
        });

        modelBuilder.Entity<FinancialReportData>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.OrganizationName).HasMaxLength(255).IsRequired();
            entity.Property(x => x.Inn).HasMaxLength(16).IsRequired();
            entity.Property(x => x.ReportingPeriod).HasMaxLength(64).IsRequired();
            entity.Property(x => x.Revenue).HasPrecision(18, 2);
            entity.Property(x => x.Expenses).HasPrecision(18, 2);
            entity.Property(x => x.NetProfit).HasPrecision(18, 2);
            entity.Property(x => x.Assets).HasPrecision(18, 2);
            entity.Property(x => x.Liabilities).HasPrecision(18, 2);
        });

        modelBuilder.Entity<AuditAlgorithmResult>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.AppropriateJson).HasColumnType("jsonb").IsRequired();
            entity.Property(x => x.InappropriateJson).HasColumnType("jsonb").IsRequired();
            entity.Property(x => x.Summary).HasMaxLength(2000).IsRequired();
        });
    }
}
