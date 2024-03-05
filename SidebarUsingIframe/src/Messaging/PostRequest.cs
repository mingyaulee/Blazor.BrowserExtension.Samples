using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace SidebarUsingIframe.Messaging
{
    public class PostRequest
    {
        public string ExtensionAppId { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public bool? IsCollapsed { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public bool? RequestForData { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public IEnumerable<HeadersData> HeadersData { get; set; }
    }
}
