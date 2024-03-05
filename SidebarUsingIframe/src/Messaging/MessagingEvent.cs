using System;
using JsBind.Net;

namespace SidebarUsingIframe.Messaging
{
    public class MessagingEvent : ObjectBindingBase
    {
        const string ExtensionAppId = "abc";
        private WindowParent parent;

        public MessagingEvent(IJsRuntimeAdapter jsRuntime)
        {
            SetAccessPath("window");
            Initialize(jsRuntime);
        }

        public void Listen(Action<PostRequest> handler)
            => SetProperty("onmessage", (MessageEventArgs args) =>
            {
                if (args.Data?.ExtensionAppId == ExtensionAppId)
                {
                    handler?.Invoke(args.Data);
                }
            });

        public void Post(PostRequest data)
        {
            parent ??= new(JsRuntime);
            data.ExtensionAppId = ExtensionAppId;
            parent.Post(data, "*");
        }

        private sealed class WindowParent : ObjectBindingBase
        {
            public WindowParent(IJsRuntimeAdapter jsRuntime)
            {
                SetAccessPath("parent");
                Initialize(jsRuntime);
            }

            public void Post(object data, string targetOrigin)
                => InvokeVoid("postMessage", data, targetOrigin);
        }

        [BindDeclaredProperties]
        private sealed class MessageEventArgs
        {
            public PostRequest Data { get; set; }
            public string Origin { get; set; }
        }
    }
}
