WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

WebApplication app = builder.Build();
app.UseStaticFiles();
app.UseDefaultFiles();
app.MapGet("/", () => "js13k2026 is running!");
app.Run();
