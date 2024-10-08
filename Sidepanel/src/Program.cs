﻿using System.Threading.Tasks;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;

namespace Sidepanel
{
    public static class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebAssemblyHostBuilder.CreateDefault(args);

            builder.UseBrowserExtension(browserExtension =>
            {
                builder.RootComponents.Add<App>("#app");
                builder.RootComponents.Add<HeadOutlet>("head::after");
            });

            await builder.Build().RunAsync();
        }
    }
}
