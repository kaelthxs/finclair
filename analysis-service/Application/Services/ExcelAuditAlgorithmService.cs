using System.Globalization;
using System.Text.RegularExpressions;
using analysis_service.Application.Contracts;
using analysis_service.Application.Models;
using ClosedXML.Excel;

namespace analysis_service.Application.Services;

public class ExcelAuditAlgorithmService : IAuditAlgorithmService
{
    private static readonly Dictionary<string, string[]> FieldAliases = new(StringComparer.OrdinalIgnoreCase)
    {
        ["OrganizationName"] = ["Название организации", "Организация", "OrganizationName", "CompanyName"],
        ["Inn"] = ["ИНН", "Inn", "INN"],
        ["ReportingPeriod"] = ["Отчетный период", "Период", "ReportingPeriod"],
        ["Revenue"] = ["Выручка", "Доходы", "Revenue"],
        ["Expenses"] = ["Расходы", "Затраты", "Expenses"],
        ["NetProfit"] = ["Чистая прибыль", "Прибыль", "NetProfit"],
        ["Assets"] = ["Активы", "Assets"],
        ["Liabilities"] = ["Обязательства", "Пассивы", "Liabilities"]
    };

    public Task<ExcelParsingResult> ParseExcelAsync(Stream fileStream, CancellationToken cancellationToken = default)
    {
        var result = new ExcelParsingResult();

        if (fileStream.CanSeek)
        {
            fileStream.Seek(0, SeekOrigin.Begin);
        }

        using var workbook = new XLWorkbook(fileStream);
        var worksheet = workbook.Worksheets.FirstOrDefault();
        if (worksheet is null)
        {
            result.Errors.Add("В файле не найден ни один лист.");
            return Task.FromResult(result);
        }

        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        FillMapFromTwoColumnLayout(worksheet, map);
        FillMapFromHeaderLayout(worksheet, map);

        result.OrganizationName = GetValue("OrganizationName", map, result.Errors);
        result.Inn = GetValue("Inn", map, result.Errors);
        result.ReportingPeriod = GetValue("ReportingPeriod", map, result.Errors);

        result.Revenue = GetDecimal("Revenue", map, result.Errors);
        result.Expenses = GetDecimal("Expenses", map, result.Errors);
        result.NetProfit = GetDecimal("NetProfit", map, result.Errors);
        result.Assets = GetDecimal("Assets", map, result.Errors);
        result.Liabilities = GetDecimal("Liabilities", map, result.Errors);

        return Task.FromResult(result);
    }

    public AuditAlgorithmOutput RunChecks(ExcelParsingResult parsed)
    {
        var appropriate = new List<string>();
        var inappropriate = new List<string>();

        if (!Regex.IsMatch(parsed.Inn, @"^\d{10}(\d{2})?$") )
        {
            inappropriate.Add("ИНН должен содержать 10 или 12 цифр.");
        }
        else
        {
            appropriate.Add("ИНН соответствует формату.");
        }

        ValidateNonNegative(parsed.Revenue, "Выручка", appropriate, inappropriate);
        ValidateNonNegative(parsed.Expenses, "Расходы", appropriate, inappropriate);
        ValidateNonNegative(parsed.NetProfit, "Чистая прибыль", appropriate, inappropriate);
        ValidateNonNegative(parsed.Assets, "Активы", appropriate, inappropriate);
        ValidateNonNegative(parsed.Liabilities, "Обязательства", appropriate, inappropriate);

        var expectedProfit = parsed.Revenue - parsed.Expenses;
        if (Math.Abs(expectedProfit - parsed.NetProfit) <= 1m)
        {
            appropriate.Add("Чистая прибыль согласуется с разницей выручки и расходов.");
        }
        else
        {
            inappropriate.Add("Чистая прибыль не совпадает с формулой: выручка - расходы.");
        }

        if (parsed.Assets >= parsed.Liabilities)
        {
            appropriate.Add("Активы не меньше обязательств.");
        }
        else
        {
            inappropriate.Add("Обязательства превышают активы.");
        }

        if (Regex.IsMatch(parsed.ReportingPeriod, @"^\d{4}(-Q[1-4]|[-/]\d{2})$"))
        {
            appropriate.Add("Отчетный период имеет ожидаемый формат.");
        }
        else
        {
            inappropriate.Add("Отчетный период в нестандартном формате.");
        }

        var summary = inappropriate.Count == 0
            ? "Автопроверка завершена: существенных несоответствий не найдено."
            : $"Автопроверка завершена: найдено несоответствий - {inappropriate.Count}.";

        return new AuditAlgorithmOutput
        {
            AppropriateItems = appropriate,
            InappropriateItems = inappropriate,
            Summary = summary
        };
    }

    private static void FillMapFromTwoColumnLayout(IXLWorksheet worksheet, IDictionary<string, string> map)
    {
        var range = worksheet.RangeUsed();
        if (range is null)
        {
            return;
        }

        var lastRow = range.LastRow().RowNumber();

        for (var row = 1; row <= lastRow; row++)
        {
            var key = worksheet.Cell(row, 1).GetString().Trim();
            if (string.IsNullOrWhiteSpace(key))
            {
                continue;
            }

            var value = worksheet.Cell(row, 2).GetFormattedString().Trim();
            if (!string.IsNullOrWhiteSpace(value))
            {
                map[key] = value;
            }
        }
    }

    private static void FillMapFromHeaderLayout(IXLWorksheet worksheet, IDictionary<string, string> map)
    {
        var range = worksheet.RangeUsed();
        if (range is null)
        {
            return;
        }

        var lastColumn = range.LastColumn().ColumnNumber();

        for (var column = 1; column <= lastColumn; column++)
        {
            var header = worksheet.Cell(1, column).GetString().Trim();
            if (string.IsNullOrWhiteSpace(header))
            {
                continue;
            }

            var value = worksheet.Cell(2, column).GetFormattedString().Trim();
            if (!string.IsNullOrWhiteSpace(value))
            {
                map[header] = value;
            }
        }
    }

    private static string GetValue(string key, IDictionary<string, string> map, ICollection<string> errors)
    {
        foreach (var alias in FieldAliases[key])
        {
            if (map.TryGetValue(alias, out var value) && !string.IsNullOrWhiteSpace(value))
            {
                return value.Trim();
            }
        }

        errors.Add($"Отсутствует обязательное поле: {FieldAliases[key][0]}.");
        return string.Empty;
    }

    private static decimal GetDecimal(string key, IDictionary<string, string> map, ICollection<string> errors)
    {
        var value = GetValue(key, map, errors);
        if (string.IsNullOrWhiteSpace(value))
        {
            return 0m;
        }

        if (TryParseDecimal(value, out var result))
        {
            return result;
        }

        errors.Add($"Поле {FieldAliases[key][0]} должно быть числом.");
        return 0m;
    }

    private static bool TryParseDecimal(string input, out decimal result)
    {
        var normalized = input.Replace(" ", string.Empty).Replace(",", ".");

        if (decimal.TryParse(normalized, NumberStyles.Any, CultureInfo.InvariantCulture, out result))
        {
            return true;
        }

        if (decimal.TryParse(input, NumberStyles.Any, new CultureInfo("ru-RU"), out result))
        {
            return true;
        }

        return false;
    }

    private static void ValidateNonNegative(decimal value, string fieldName, ICollection<string> appropriate, ICollection<string> inappropriate)
    {
        if (value >= 0)
        {
            appropriate.Add($"{fieldName}: значение корректно (неотрицательное).");
        }
        else
        {
            inappropriate.Add($"{fieldName}: найдено отрицательное значение.");
        }
    }
}
