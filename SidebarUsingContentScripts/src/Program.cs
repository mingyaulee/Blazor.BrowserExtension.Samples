using Blazor.BrowserExtension;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using SidebarUsingContentScripts.Pages;
using System.Threading.Tasks;

namespace SidebarUsingContentScripts
{
    public static class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebAssemblyHostBuilder.CreateDefault(args);
            builder.UseBrowserExtension(browserExtension =>
            {
                if (browserExtension.Mode == BrowserExtensionMode.ContentScript)
                {
                    builder.RootComponents.Add<ContentScript>("#SidebarUsingContentScriptsSampleApp");
                }
                else
                {
                    builder.RootComponents.Add<App>("#app");
                    builder.RootComponents.Add<HeadOutlet>("head::after");
                }
            });
            await builder.Build().RunAsync();
        }
    }
}
