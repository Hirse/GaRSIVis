using System;
using Tobii.Interaction;
using WebSocketSharp;
using WebSocketSharp.Server;

namespace GazeServer
{
  internal class GazeServerBehavior : WebSocketBehavior
    {
        protected override void OnMessage(MessageEventArgs e)
        { }
    }

  internal class GazeServer
    {
        private const string DEFAULT_WEBSOCKET_HOST = "localhost";
        private const string DEFAULT_WEBSOCKET_PORT = "8887";

        private const string GAZE_PATH = "/gaze";
        private const string HEAD_PATH = "/head";
        private const string FIXATION_PATH = "/fixation";

        private WebSocketServer _server;

        private void Start(string url)
        {
            _server = new WebSocketServer(url);
            _server.AddWebSocketService<GazeServerBehavior>(GAZE_PATH);
            _server.AddWebSocketService<GazeServerBehavior>(HEAD_PATH);
            _server.AddWebSocketService<GazeServerBehavior>(FIXATION_PATH);
            _server.Start();

            var host = new Host();
            host.Streams.CreateGazePointDataStream().GazePoint(OnGaze);
            host.Streams.CreateHeadPoseStream().HeadPose(OnHeadPose);
            host.Streams.CreateFixationDataStream().Begin(OnFixationBegin);
            host.Streams.CreateFixationDataStream().Data(OnFixationData);
            host.Streams.CreateFixationDataStream().End(OnFixationEnd);
        }

        private void OnGaze(double x, double y, double timestamp)
        {
            var scale = DPIHelper.GetScreenScale();
            var coordString = $"{x / scale:0.00},{y / scale:0.00}";
            _server.WebSocketServices[GAZE_PATH].Sessions.Broadcast(coordString);
        }

        private void OnHeadPose(double timestamp, Vector3 position, Vector3 rotation)
        {
            var coordString = $"{position.X:0.00},{position.Y:0.00},{position.Z:0.00};{rotation.X:0.00},{rotation.Y:0.00},{rotation.Z:0.00}";
            _server.WebSocketServices[HEAD_PATH].Sessions.Broadcast(coordString);
        }

        private void OnFixationBegin(double x, double y, double timestamp)
        {
            var scale = DPIHelper.GetScreenScale();
            var coordString = $"FS: {x / scale:0.00},{y / scale:0.00}";
            _server.WebSocketServices[FIXATION_PATH].Sessions.Broadcast(coordString);
        }
    
        private void OnFixationData(double x, double y, double timestamp)
        {
            var scale = DPIHelper.GetScreenScale();
            var coordString = $"FD: {x / scale:0.00},{y / scale:0.00}";
            _server.WebSocketServices[FIXATION_PATH].Sessions.Broadcast(coordString);
        }

        private void OnFixationEnd(double x, double y, double timestamp)
        {
            var scale = DPIHelper.GetScreenScale();
            var coordString = $"FE: {x / scale:0.00},{y / scale:0.00}";
            _server.WebSocketServices[FIXATION_PATH].Sessions.Broadcast(coordString);
        }

        public static void Main(string[] args)
        {
            var host = DEFAULT_WEBSOCKET_HOST;
            var port = DEFAULT_WEBSOCKET_PORT;
            for (var i = 0; i < args.Length; i++)
            {
                switch (args[i].Trim().ToUpper())
                {
                    case "/H":
                        i++;
                        host = args.Length > i ? args[i] : "";
                        break;
                    case "/P":
                        i++;
                        port = args.Length > i ? args[i] : "";
                        break;
                }
            }
            var url = string.Empty;
            try
            {
                url = GetValidUrl(host, port);
            }
            catch (FormatException)
            {
                Console.Error.WriteLine($"Error: Host ('{host}') and Port ('{port}') parameter do not form a valid URL.");
                Console.Read();
                Environment.Exit(1);
            }
            Console.WriteLine($"Starting GazeServer at {url}");
            var gazeServer = new GazeServer();
            gazeServer.Start(url);
            Console.Read();
        }

        private static string GetValidUrl(string host, string port)
        {
            var url = $"ws://{host}:{port}";
            if (!Uri.IsWellFormedUriString(url, UriKind.Absolute))
            {
                throw new FormatException();
            }
            return url;
        }
    }
}
