FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY analysis-service.csproj ./
RUN dotnet restore analysis-service.csproj

COPY . .
RUN dotnet publish analysis-service.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

EXPOSE 8000
ENV ASPNETCORE_URLS=http://+:8000

ENTRYPOINT ["dotnet", "analysis-service.dll"]
