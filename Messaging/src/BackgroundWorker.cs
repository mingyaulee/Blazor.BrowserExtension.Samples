using System;
using System.Threading.Tasks;
using Blazor.BrowserExtension;
using Messaging.Messages;
using WebExtensions.Net.Runtime;

namespace Messaging
{
    public partial class BackgroundWorker : BackgroundWorkerBase
    {
        [BackgroundWorkerMain]
        public override void Main()
        {
            WebExtensions.Runtime.OnInstalled.AddListener(OnInstalled);
            WebExtensions.Runtime.OnMessage.AddListener(OnMessage);
        }

        async Task OnInstalled()
        {
            var indexPageUrl = await WebExtensions.Runtime.GetURL("index.html");
            await WebExtensions.Tabs.Create(new()
            {
                Url = indexPageUrl
            });
        }

        bool OnMessage(object message, MessageSender sender, Action<object> sendResponse)
        {
            if (!Message.IsForTarget(MessageTarget.Background, message, out var msg))
            {
                return false;
            }

            if (msg.Content == "OPEN_OPTIONS_PAGE")
            {
                WebExtensions.Runtime.OpenOptionsPage();
                sendResponse("Options page opened");
                _ = SayHelloAfter3Seconds();
            }

            return true;
        }

        async Task SayHelloAfter3Seconds()
        {
            await Task.Delay(3000);
            await WebExtensions.Runtime.SendMessage(new Message()
            {
                Target = MessageTarget.All,
                Content = "Hello from background"
            });
        }
    }
}
