using System.Text.Json;
using System.Text.Json.Serialization;
using WebExtensions.Net;

namespace Messaging.Messages
{
    public class Message
    {
        [JsonPropertyName("target")]
        [JsonConverter(typeof(EnumStringConverter<MessageTarget>))]
        public MessageTarget Target { get; set; }

        [JsonPropertyName("content")]
        public string Content { get; set; }

        public static bool IsForTarget(MessageTarget intendedTarget, object msg, out Message message)
        {
            message = null;
            if (msg is JsonElement jsonMessage)
            {
                message = jsonMessage.Deserialize<Message>();
                return message is not null && (message.Target == intendedTarget || message.Target == MessageTarget.All);
            }

            return false;
        }
    }
}
