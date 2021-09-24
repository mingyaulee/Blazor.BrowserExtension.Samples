using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Microsoft.Extensions.DependencyInjection;
using System.Threading.Tasks;

namespace SidebarUsingContentScripts
{
    public static class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebAssemblyHostBuilder.CreateDefault(args);
            builder.RootComponents.Add<App>("#SidebarUsingContentScriptsSampleApp");
            builder.Services.AddBrowserExtensionServices();
            await builder.Build().RunAsync();
        }
    }
}
